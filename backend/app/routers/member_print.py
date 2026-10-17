"""
Member portal: "Print bucket" and "Print cards".

Both services are for members with an ACTIVE subscription only. Everything
is private to the calling member — their own uploaded-card library
(UploadedCard.owner_member_id) and their own bucket of generated cards
(PrintBucketItem.owner_member_id); the staff library/bucket (owner NULL)
is never visible here, and vice versa.

Browsing, uploading and the on-screen preview are free. Each downloaded
print-sheet PDF costs settings.PRINT_SHEET_CREDIT_COST credits, charged
through AccessControlService.consume_print_sheet (ledger entry visible in
Credit History). The PDF is built first and only returned once the debit
has succeeded, so a failed/insufficient charge never hands out the file.
"""
import base64

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.database import get_db
from app.middleware.member_auth_middleware import get_current_member
from app.models.member import Member
from app.models.print_bucket_item import PrintBucketItem
from app.schemas.card_type import CardTypeOut
from app.schemas.print_bucket import AddToBucketRequest, PrintBucketItemOut
from app.schemas.uploaded_card import PrintSheetItemRequest, UploadedCardOut
from app.services.aadhaar_letter_extractor import LetterExtractionError
from app.services.access_control_service import AccessControlService, AccessDeniedError
from app.services.card_type_service import CardTypeService
from app.services.print_bucket_service import (
    BucketItemNotFoundError,
    GeneratedCardNotFoundError,
    PrintBucketService,
)
from app.services.print_bucket_service import UnsupportedPaperSizeError as BucketPaperError
from app.services.uploaded_card_service import (
    CardTypeNotFoundForUploadError,
    UploadedCardNotFoundError,
    UploadedCardService,
)
from app.services.uploaded_card_sheet_service import (
    EmptySheetRequestError,
    UploadedCardNotFoundForSheetError,
    UploadedCardSheetService,
)
from app.services.uploaded_card_sheet_service import UnsupportedPaperSizeError as SheetPaperError
from app.utils.file_storage import resolve_stored_path

settings = get_settings()


def require_print_member(member: Member = Depends(get_current_member), db: Session = Depends(get_db)) -> Member:
    """Gate for every endpoint here: the member must have an active,
    in-licence subscription. 403 + reason_code lets the UI show a
    'subscribe / renew' prompt instead of a generic error."""
    try:
        AccessControlService(db).check_print_access(member)
    except AccessDeniedError as exc:
        raise HTTPException(
            status_code=403, detail={"message": exc.message, "reason_code": exc.reason_code}
        ) from exc
    return member


router = APIRouter(prefix="/api/auth/member/print", tags=["member-print"])


class MemberSheetRequest(BaseModel):
    items: list[PrintSheetItemRequest]
    paper_size: str = "a4"
    request_id: str | None = Field(default=None, max_length=36)


class MemberBucketPrintRequest(BaseModel):
    item_ids: list[str]
    paper_size: str = "a4"
    request_id: str | None = Field(default=None, max_length=36)


def _card_out(card) -> UploadedCardOut:
    return UploadedCardOut(
        id=card.id,
        card_type_id=card.card_type_id,
        name=card.name,
        has_back=bool(card.back_image_path),
        width_mm=card.width_mm,
        height_mm=card.height_mm,
    )


def _bucket_out(item: PrintBucketItem) -> PrintBucketItemOut:
    card = item.generated_card
    return PrintBucketItemOut(
        id=item.id,
        generated_card_id=item.generated_card_id,
        customer_id=card.customer_id,
        customer_name=card.customer.name if card.customer else "",
        template_id=card.template_id,
        template_name=card.template.name if card.template else "",
        has_back=bool(card.back_png_path),
        created_at=item.created_at,
    )


def _charge(db: Session, member: Member, cards: int, request_id: str | None) -> None:
    """Debit after the PDF exists; raises 402 (no file handed out) if the
    member can't pay."""
    try:
        AccessControlService(db).consume_print_sheet(
            member, settings.PRINT_SHEET_CREDIT_COST, cards=cards, reference_id=request_id
        )
    except AccessDeniedError as exc:
        raise HTTPException(
            status_code=402, detail={"message": exc.message, "reason_code": exc.reason_code}
        ) from exc


def _precheck_credits(db: Session, member: Member) -> None:
    try:
        AccessControlService(db).check_print_credits(member, settings.PRINT_SHEET_CREDIT_COST)
    except AccessDeniedError as exc:
        raise HTTPException(
            status_code=402, detail={"message": exc.message, "reason_code": exc.reason_code}
        ) from exc


# ------------------------------------------------------------------ access


@router.get("/access")
def print_access(member: Member = Depends(require_print_member)):
    """200 means the member may use both services; the cost lets the UI
    label its download buttons."""
    return {"allowed": True, "credit_cost": settings.PRINT_SHEET_CREDIT_COST}


@router.get("/card-types", response_model=list[CardTypeOut])
def list_card_types(member: Member = Depends(require_print_member), db: Session = Depends(get_db)):
    return CardTypeService(db).list_card_types(include_inactive=False)


# ------------------------------------------------------------- print cards


@router.get("/uploaded-cards", response_model=list[UploadedCardOut])
def list_uploaded_cards(
    card_type_id: str | None = Query(default=None),
    member: Member = Depends(require_print_member),
    db: Session = Depends(get_db),
):
    return [_card_out(c) for c in UploadedCardService(db, member.id).list_uploaded_cards(card_type_id)]


@router.post("/uploaded-cards", response_model=UploadedCardOut, status_code=status.HTTP_201_CREATED)
def create_uploaded_card(
    card_type_id: str = Form(...),
    name: str = Form(...),
    front_file: UploadFile | None = File(default=None),
    back_file: UploadFile | None = File(default=None),
    letter_file: UploadFile | None = File(default=None),
    pdf_password: str | None = Form(default=None),
    member: Member = Depends(require_print_member),
    db: Session = Depends(get_db),
):
    service = UploadedCardService(db, member.id)
    try:
        if letter_file is not None and letter_file.filename:
            card = service.create_uploaded_card_from_letter(card_type_id, name, letter_file, pdf_password, None)
        elif front_file is not None and front_file.filename:
            card = service.create_uploaded_card(card_type_id, name, front_file, back_file, None)
        else:
            raise HTTPException(status_code=400, detail="Upload a front image, or a single letter file.")
    except CardTypeNotFoundForUploadError as exc:
        raise HTTPException(status_code=404, detail="Card type not found") from exc
    except LetterExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _card_out(card)


@router.delete("/uploaded-cards/{uploaded_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_uploaded_card(
    uploaded_card_id: str, member: Member = Depends(require_print_member), db: Session = Depends(get_db)
):
    try:
        UploadedCardService(db, member.id).delete_uploaded_card(uploaded_card_id)
    except UploadedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Uploaded card not found") from exc


@router.get("/uploaded-cards/{uploaded_card_id}/image")
def get_uploaded_card_image(
    uploaded_card_id: str,
    side: str = Query(default="front"),
    member: Member = Depends(require_print_member),
    db: Session = Depends(get_db),
):
    if side not in ("front", "back"):
        raise HTTPException(status_code=400, detail="side must be 'front' or 'back'")
    try:
        card = UploadedCardService(db, member.id).get_uploaded_card(uploaded_card_id)
    except UploadedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Uploaded card not found") from exc
    relative_path = card.front_image_path if side == "front" else card.back_image_path
    if not relative_path:
        raise HTTPException(status_code=404, detail=f"This card has no {side} image")
    path = resolve_stored_path(relative_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path)


def _sheet_errors(exc: Exception) -> HTTPException:
    if isinstance(exc, SheetPaperError):
        return HTTPException(status_code=400, detail=f"Unsupported paper size '{exc}'")
    if isinstance(exc, EmptySheetRequestError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=404, detail=f"Uploaded card(s) not found: {exc}")


_SHEET_ERRORS = (SheetPaperError, EmptySheetRequestError, UploadedCardNotFoundForSheetError)


@router.post("/print-sheet/preview")
def preview_sheet(payload: MemberSheetRequest, member: Member = Depends(require_print_member), db: Session = Depends(get_db)):
    """Free: what will print, as PNG pages."""
    try:
        pages = UploadedCardSheetService(db, member.id).build_preview_images(payload.items, payload.paper_size)
    except _SHEET_ERRORS as exc:
        raise _sheet_errors(exc) from exc
    return {"pages": [base64.b64encode(p).decode("ascii") for p in pages]}


@router.post("/print-sheet")
def download_sheet(payload: MemberSheetRequest, member: Member = Depends(require_print_member), db: Session = Depends(get_db)):
    _precheck_credits(db, member)
    try:
        pdf = UploadedCardSheetService(db, member.id).build_print_sheet(payload.items, payload.paper_size)
    except _SHEET_ERRORS as exc:
        raise _sheet_errors(exc) from exc
    _charge(db, member, sum(i.copies for i in payload.items), payload.request_id)
    return Response(content=pdf, media_type="application/pdf")


# ------------------------------------------------------------ print bucket


@router.get("/bucket", response_model=list[PrintBucketItemOut])
def list_bucket(member: Member = Depends(require_print_member), db: Session = Depends(get_db)):
    return [_bucket_out(i) for i in PrintBucketService(db, member.id).list_all()]


@router.post("/bucket", response_model=PrintBucketItemOut, status_code=201)
def add_to_bucket(
    payload: AddToBucketRequest, member: Member = Depends(require_print_member), db: Session = Depends(get_db)
):
    try:
        item = PrintBucketService(db, member.id).add(payload.generated_card_id, added_by=None)
    except GeneratedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Card not found") from exc
    return _bucket_out(item)


@router.delete("/bucket/{item_id}", status_code=204)
def remove_from_bucket(item_id: str, member: Member = Depends(require_print_member), db: Session = Depends(get_db)):
    try:
        PrintBucketService(db, member.id).remove(item_id)
    except BucketItemNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Bucket item not found") from exc


@router.post("/bucket/print")
def print_bucket(payload: MemberBucketPrintRequest, member: Member = Depends(require_print_member), db: Session = Depends(get_db)):
    _precheck_credits(db, member)
    service = PrintBucketService(db, member.id)
    try:
        pdf = service.build_print_sheet(payload.item_ids, payload.paper_size)
    except BucketPaperError as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported paper size: {exc}") from exc
    except BucketItemNotFoundError as exc:
        raise HTTPException(status_code=404, detail="None of those bucket items could be found") from exc
    _charge(db, member, len(payload.item_ids), payload.request_id)
    return Response(content=pdf, media_type="application/pdf")

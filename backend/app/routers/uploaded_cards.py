"""
The "Print pre-designed cards" module: a reusable library of already-
designed card images (front/back) per card type, and a print-sheet
endpoint that composites a chosen set of them onto A4/A3 pages.
"""
import base64

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.uploaded_card import UploadedCardOut, UploadedCardPrintSheetRequest
from app.services.uploaded_card_service import (
    CardTypeNotFoundForUploadError,
    UploadedCardNotFoundError,
    UploadedCardService,
)
from app.services.uploaded_card_sheet_service import (
    EmptySheetRequestError,
    UnsupportedPaperSizeError,
    UploadedCardNotFoundForSheetError,
    UploadedCardSheetService,
)
from app.utils.file_storage import resolve_stored_path

router = APIRouter(prefix="/api/uploaded-cards", tags=["uploaded-cards"], dependencies=[Depends(get_current_user)])


def _to_out(card) -> UploadedCardOut:
    return UploadedCardOut(
        id=card.id,
        card_type_id=card.card_type_id,
        name=card.name,
        has_back=bool(card.back_image_path),
        width_mm=card.width_mm,
        height_mm=card.height_mm,
    )


@router.get("", response_model=list[UploadedCardOut])
def list_uploaded_cards(card_type_id: str | None = Query(default=None), db: Session = Depends(get_db)):
    cards = UploadedCardService(db).list_uploaded_cards(card_type_id)
    return [_to_out(c) for c in cards]


@router.post("", response_model=UploadedCardOut, status_code=status.HTTP_201_CREATED)
def create_uploaded_card(
    card_type_id: str = Form(...),
    name: str = Form(...),
    front_file: UploadFile = File(...),
    back_file: UploadFile | None = File(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        card = UploadedCardService(db).create_uploaded_card(
            card_type_id, name, front_file, back_file, uploaded_by=current_user.id
        )
    except CardTypeNotFoundForUploadError as exc:
        raise HTTPException(status_code=404, detail="Card type not found") from exc
    return _to_out(card)


@router.delete("/{uploaded_card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_uploaded_card(uploaded_card_id: str, db: Session = Depends(get_db)):
    try:
        UploadedCardService(db).delete_uploaded_card(uploaded_card_id)
    except UploadedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Uploaded card not found") from exc


@router.get("/{uploaded_card_id}/image")
def get_uploaded_card_image(uploaded_card_id: str, side: str = Query(default="front"), db: Session = Depends(get_db)):
    if side not in ("front", "back"):
        raise HTTPException(status_code=400, detail="side must be 'front' or 'back'")
    try:
        card = UploadedCardService(db).get_uploaded_card(uploaded_card_id)
    except UploadedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Uploaded card not found") from exc

    relative_path = card.front_image_path if side == "front" else card.back_image_path
    if not relative_path:
        raise HTTPException(status_code=404, detail=f"This card has no {side} image")

    path = resolve_stored_path(relative_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path)


@router.post("/print-sheet")
def print_uploaded_card_sheet(payload: UploadedCardPrintSheetRequest, db: Session = Depends(get_db)):
    service = UploadedCardSheetService(db)
    try:
        pdf_bytes = service.build_print_sheet(payload.items, payload.paper_size)
    except UnsupportedPaperSizeError as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported paper size '{exc}'") from exc
    except EmptySheetRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UploadedCardNotFoundForSheetError as exc:
        raise HTTPException(status_code=404, detail=f"Uploaded card(s) not found: {exc}") from exc

    return Response(content=pdf_bytes, media_type="application/pdf")


@router.post("/print-sheet/preview")
def preview_uploaded_card_sheet(payload: UploadedCardPrintSheetRequest, db: Session = Depends(get_db)):
    """Same layout as /print-sheet, but returns each page as a PNG (base64,
    JSON) so the UI can show "this is what will print" before the operator
    commits to downloading the PDF."""
    service = UploadedCardSheetService(db)
    try:
        png_pages = service.build_preview_images(payload.items, payload.paper_size)
    except UnsupportedPaperSizeError as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported paper size '{exc}'") from exc
    except EmptySheetRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UploadedCardNotFoundForSheetError as exc:
        raise HTTPException(status_code=404, detail=f"Uploaded card(s) not found: {exc}") from exc

    return {"pages": [base64.b64encode(p).decode("ascii") for p in png_pages]}

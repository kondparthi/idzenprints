"""
Member-facing self-service card generation — upload a document, review
the OCR-extracted (bilingual) details, pick a theme/template, preview,
then generate and download, with credit deduction on success.

Reuses the exact same DocumentService/CardGenerationService/OCR
pipeline the staff-facing routers already use — nothing about how a
card actually gets rendered changes here. What's new is entirely
about *scoping*: every operation resolves to the calling member's own
Customer record (via Customer.owner_member_id, added specifically for
this in the Subscription module's first migration) and refuses to
touch anything that doesn't belong to them.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.member_auth_middleware import get_current_member
from app.models.customer import Customer
from app.models.document import DocumentType
from app.models.member import Member
from app.repositories.customer_details_repository import CustomerDetailsRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.generated_card_repository import GeneratedCardRepository
from app.repositories.template_repository import TemplateRepository
from app.schemas.customer_details import CustomerDetailsOut, CustomerDetailsUpdate
from app.schemas.document import DocumentOut, DocumentProcessRequest
from app.schemas.generated_card import GeneratedCardOut
from app.schemas.template import TemplateOut
from app.services.access_control_service import AccessControlService, AccessDeniedError
from app.services.card_generation_service import CardGenerationService, CustomerNotFoundError, TemplateNotFoundError
from app.services.document_service import DocumentNotFoundError, DocumentService
from app.services.ocr.tesseract_provider import PdfPasswordRequiredError
from app.config.settings import get_settings
from pathlib import Path

router = APIRouter(prefix="/api/auth/member/cards", tags=["member-cards"], dependencies=[Depends(get_current_member)])

settings = get_settings()
_FORMAT_MEDIA_TYPES = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg"}


def _resolve_generated_path(relative_path: str) -> Path:
    return Path(settings.GENERATED_DIR) / relative_path


def _get_or_create_customer(member: Member, db: Session) -> Customer:
    repo = CustomerRepository(db)
    customer = repo.get_by_owner_member_id(member.id)
    if customer:
        return customer
    customer = Customer(name=member.full_name, mobile=member.phone, email=member.email, owner_member_id=member.id)
    return repo.create(customer)


def _assert_owns_document(document_id: str, member: Member, db: Session):
    """Raises 404 (not 403) on a mismatch — a member probing someone
    else's document id shouldn't be able to tell the difference
    between 'not yours' and 'doesn't exist'."""
    document = DocumentRepository(db).get_by_id(document_id)
    customer = _get_or_create_customer(member, db)
    if not document or document.customer_id != customer.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


def _assert_owns_card(card_id: str, member: Member, db: Session):
    card = GeneratedCardRepository(db).get_by_id(card_id)
    customer = _get_or_create_customer(member, db)
    if not card or card.customer_id != customer.id:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.post("/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    back_file: UploadFile | None = File(default=None),
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    customer = _get_or_create_customer(current_member, db)
    return DocumentService(db).upload(customer.id, document_type, file, uploaded_by=None, back_file=back_file)


@router.post("/documents/{document_id}/process", response_model=CustomerDetailsOut)
@router.post("/documents/{document_id}/process", response_model=CustomerDetailsOut)
def process_document(
    document_id: str,
    payload: DocumentProcessRequest | None = None,
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    """Runs OCR and returns the extracted (bilingual) details — the
    member reviews and corrects these in the next step before
    anything is generated; OCR is a starting point, not the source of
    truth."""
    _assert_owns_document(document_id, current_member, db)
    password = payload.password if payload else None
    try:
        return DocumentService(db).process(document_id, password=password)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc
    except PdfPasswordRequiredError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "This PDF is password-protected.", "reason_code": "pdf_password_required"},
        ) from exc


@router.get("/documents/{document_id}/details", response_model=CustomerDetailsOut)
def get_document_details(document_id: str, current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)):
    _assert_owns_document(document_id, current_member, db)
    details = CustomerDetailsRepository(db).get_by_document_id(document_id)
    if not details:
        raise HTTPException(status_code=404, detail="This document hasn't been processed yet")
    return details


@router.patch("/documents/{document_id}/details", response_model=CustomerDetailsOut)
def update_document_details(
    document_id: str,
    payload: CustomerDetailsUpdate,
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    """The member correcting OCR mistakes before generating — is_verified
    is deliberately excluded from what a member can set themselves
    (that's a staff-only concept elsewhere in the app)."""
    _assert_owns_document(document_id, current_member, db)
    details_repo = CustomerDetailsRepository(db)
    details = details_repo.get_by_document_id(document_id)
    if not details:
        raise HTTPException(status_code=404, detail="This document hasn't been processed yet")
    for field, value in payload.model_dump(exclude={"is_verified"}, exclude_unset=True).items():
        setattr(details, field, value)
    return details_repo.save(details)


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(card_type_id: str = Query(...), db: Session = Depends(get_db)):
    """The 'choose a theme' step — active templates only; a member
    never sees a template Super Admin has deactivated."""
    return TemplateRepository(db).list(card_type_id, include_inactive=False)


@router.post("/preview")
def preview_card(
    document_id: str = Query(...),
    template_id: str = Query(...),
    side: str = Query(default="front"),
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    customer = _assert_owns_document(document_id, current_member, db).customer_id
    try:
        png_bytes = CardGenerationService(db).preview_png_bytes(customer, template_id, side=side)
    except (CustomerNotFoundError, TemplateNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Couldn't build a preview — check the template") from exc
    return Response(content=png_bytes, media_type="image/png")


@router.post("/generate", response_model=GeneratedCardOut, status_code=status.HTTP_201_CREATED)
def generate_card(
    document_id: str = Query(...),
    template_id: str = Query(...),
    card_type_id: str = Query(..., description="Which service/card type this counts against for credits"),
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    """Generate, then deduct — in that order, deliberately. A failed
    render should never cost the member a credit; a card that exists
    should always have been paid for. If the debit step itself fails
    (e.g. a concurrent request already spent the last credit), the
    card row stays — it's already rendered and on disk — but the
    member sees the real error rather than a silently-free card."""
    document = _assert_owns_document(document_id, current_member, db)

    try:
        AccessControlService(db).check_access(current_member, card_type_id)
    except AccessDeniedError as exc:
        raise HTTPException(status_code=403, detail={"message": str(exc), "reason_code": "access_denied"}) from exc

    try:
        card = CardGenerationService(db).generate(document.customer_id, template_id, created_by=None)
    except (CustomerNotFoundError, TemplateNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Couldn't generate that card — check the template") from exc

    try:
        AccessControlService(db).consume_service(current_member, card_type_id, reference_id=card.id)
    except AccessDeniedError as exc:
        raise HTTPException(
            status_code=409,
            detail={"message": f"Card generated, but {str(exc)}", "reason_code": "generated_not_charged"},
        ) from exc

    return card


@router.get("/{card_id}/download")
def download_card(
    card_id: str,
    format: str = Query(default="pdf"),
    side: str = Query(default="front"),
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    if format not in _FORMAT_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="format must be one of: pdf, png, jpg")
    card = _assert_owns_card(card_id, current_member, db)
    paths = {
        "front": {"pdf": card.pdf_path, "png": card.png_path, "jpg": card.jpg_path},
        "back": {"pdf": card.pdf_path, "png": card.back_png_path, "jpg": card.back_jpg_path},
    }
    relative_path = paths.get(side, paths["front"])[format]
    if not relative_path:
        raise HTTPException(status_code=404, detail=f"No {format} available for this card")
    path = _resolve_generated_path(relative_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File is missing on disk")
    return FileResponse(path, media_type=_FORMAT_MEDIA_TYPES[format], filename=path.name)

"""
Live preview (nothing persisted) and PDF/PNG/JPG generation + download.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.generated_card import GenerateCardRequest, GeneratedCardOut
from app.services.card_generation_service import (
    CardGenerationService,
    CustomerNotFoundError,
    GeneratedCardNotFoundError,
    TemplateNotFoundError,
)
from app.utils.audit import record as record_audit
from app.config.settings import get_settings
from pathlib import Path

router = APIRouter(prefix="/api/cards", tags=["cards"], dependencies=[Depends(get_current_user)])

_FORMAT_MEDIA_TYPES = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg"}
settings = get_settings()


def _resolve_generated_path(relative_path: str) -> Path:
    return Path(settings.GENERATED_DIR) / relative_path


@router.post("/preview")
def preview_card(payload: GenerateCardRequest, db: Session = Depends(get_db)):
    service = CardGenerationService(db)
    try:
        png_bytes = service.preview_png_bytes(payload.customer_id, payload.template_id)
    except (CustomerNotFoundError, TemplateNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Customer or template not found") from exc
    return Response(content=png_bytes, media_type="image/png")


@router.post("/generate", response_model=GeneratedCardOut, status_code=status.HTTP_201_CREATED)
def generate_card(
    payload: GenerateCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = CardGenerationService(db)
    try:
        card = service.generate(payload.customer_id, payload.template_id, created_by=current_user.id, order_id=payload.order_id)
    except (CustomerNotFoundError, TemplateNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Customer or template not found") from exc
    record_audit(db, current_user.id, "generate", "generated_card", card.id, {"customer_id": payload.customer_id, "template_id": payload.template_id})
    return card


@router.get("", response_model=list[GeneratedCardOut])
def list_generated_cards(customer_id: str = Query(...), db: Session = Depends(get_db)):
    return CardGenerationService(db).list_for_customer(customer_id)


@router.post("/{card_id}/regenerate", response_model=GeneratedCardOut)
def regenerate_card(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return CardGenerationService(db).regenerate(card_id, created_by=current_user.id)
    except GeneratedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Generated card not found") from exc


@router.get("/{card_id}/download")
def download_card(card_id: str, format: str = Query(default="pdf"), db: Session = Depends(get_db)):
    if format not in _FORMAT_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="format must be one of: pdf, png, jpg")

    try:
        card = CardGenerationService(db).get(card_id)
    except GeneratedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Generated card not found") from exc

    relative_path = {"pdf": card.pdf_path, "png": card.png_path, "jpg": card.jpg_path}[format]
    if not relative_path:
        raise HTTPException(status_code=404, detail=f"No {format} has been generated for this card yet")

    path = _resolve_generated_path(relative_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")

    return FileResponse(path, media_type=_FORMAT_MEDIA_TYPES[format], filename=path.name)

"""
Live preview (nothing persisted) and PDF/PNG/JPG generation + download.
"""
import base64
import io
from typing import Literal

from PIL import Image
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.generated_card import BoxImageRequest, GenerateCardRequest, GeneratedCardOut
from app.services.card_generation_service import (
    CardGenerationService,
    CustomerNotFoundError,
    ElementNotFoundError,
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
def preview_card(payload: GenerateCardRequest, side: str = Query(default="front"), db: Session = Depends(get_db)):
    service = CardGenerationService(db)
    try:
        png_bytes = service.preview_png_bytes(
            payload.customer_id, payload.template_id, side=side, field_image_overrides=payload.field_image_overrides
        )
    except (CustomerNotFoundError, TemplateNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Customer or template not found") from exc
    return Response(content=png_bytes, media_type="image/png")


@router.post("/box-image")
def box_image(payload: BoxImageRequest, db: Session = Depends(get_db)):
    """Renders one template element's current content on its own — the
    thumbnail staff drag onto the card preview to confirm (and, once
    dropped, lock in) exactly what that box will print."""
    service = CardGenerationService(db)
    try:
        png_bytes = service.render_box_image(payload.customer_id, payload.template_id, payload.side, payload.element_id)
    except (CustomerNotFoundError, TemplateNotFoundError) as exc:
        raise HTTPException(status_code=404, detail="Customer or template not found") from exc
    except ElementNotFoundError as exc:
        raise HTTPException(status_code=404, detail="That element isn't on this side of the template") from exc
    return Response(content=png_bytes, media_type="image/png")


@router.post("/generate", response_model=GeneratedCardOut, status_code=status.HTTP_201_CREATED)
def generate_card(
    payload: GenerateCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = CardGenerationService(db)
    try:
        card = service.generate(
            payload.customer_id,
            payload.template_id,
            created_by=current_user.id,
            order_id=payload.order_id,
            field_image_overrides=payload.field_image_overrides,
        )
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
def download_card(
    card_id: str,
    format: str = Query(default="pdf"),
    side: str = Query(default="front"),
    db: Session = Depends(get_db),
):
    if format not in _FORMAT_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail="format must be one of: pdf, png, jpg")

    try:
        card = CardGenerationService(db).get(card_id)
    except GeneratedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Generated card not found") from exc

    paths = {
        "front": {"pdf": card.pdf_path, "png": card.png_path, "jpg": card.jpg_path},
        "back": {"pdf": card.pdf_path, "png": card.back_png_path, "jpg": card.back_jpg_path},
    }
    relative_path = paths.get(side, paths["front"])[format]
    if not relative_path:
        raise HTTPException(status_code=404, detail=f"No {format} has been generated for this card yet")

    path = _resolve_generated_path(relative_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")

    return FileResponse(path, media_type=_FORMAT_MEDIA_TYPES[format], filename=path.name)


class PrintSheetRequest(BaseModel):
    layout: str = "a4_5_cards"
    side: Literal["both", "front", "back"] = "both"
    border: bool = False
    mirror: bool = False
    gap_mm: float = Field(default=4.0, ge=0, le=30)
    dx_mm: float = Field(default=0.0, ge=-40, le=40)
    dy_mm: float = Field(default=0.0, ge=-40, le=40)
    zoom: float = Field(default=100.0, ge=50, le=150)
    rotation: float = Field(default=0.0, ge=-180, le=180)
    copies: int = Field(default=1, ge=1, le=10)


def _sheet_pages(card_id: str, payload: PrintSheetRequest, db: Session):
    from app.services import print_layouts as pl

    if payload.layout not in pl.LAYOUTS:
        raise HTTPException(status_code=400, detail="Unknown print layout")
    try:
        card = CardGenerationService(db).get(card_id)
    except GeneratedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Generated card not found") from exc
    if not card.png_path or not _resolve_generated_path(card.png_path).exists():
        raise HTTPException(status_code=404, detail="Card image is missing")
    front = Image.open(_resolve_generated_path(card.png_path))
    back = None
    if card.back_png_path and _resolve_generated_path(card.back_png_path).exists():
        back = Image.open(_resolve_generated_path(card.back_png_path))
    return pl.build_pages(front, back, pl.Options(**payload.model_dump()))


@router.post("/{card_id}/print-sheet/preview")
def print_sheet_preview(card_id: str, payload: PrintSheetRequest, db: Session = Depends(get_db)):
    pages = _sheet_pages(card_id, payload, db)
    out = []
    for page in pages:
        small = page.copy()
        small.thumbnail((1100, 1100))
        buf = io.BytesIO()
        small.save(buf, format="JPEG", quality=80)
        out.append("data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode())
    return {"pages": out}


@router.post("/{card_id}/print-sheet/pdf")
def print_sheet_pdf(card_id: str, payload: PrintSheetRequest, db: Session = Depends(get_db)):
    from app.services import print_layouts as pl

    pdf = pl.to_pdf(_sheet_pages(card_id, payload, db))
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="print-{payload.layout}.pdf"'})

"""
The print bucket: add already-generated cards to a server-side queue, list
what's queued (with a count for the sidebar badge), remove items, and
render the queued cards as one multi-page A4 contact-sheet PDF (4 cards —
front row + back row — per page) for batch printing.
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.print_bucket_item import PrintBucketItem
from app.models.user import User
from app.schemas.print_bucket import AddToBucketRequest, PrintBucketItemOut, PrintSheetRequest
from app.services.print_bucket_service import (
    BucketItemNotFoundError,
    GeneratedCardNotFoundError,
    PrintBucketService,
    UnsupportedPaperSizeError,
)
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/print-bucket", tags=["print-bucket"], dependencies=[Depends(get_current_user)])


def _to_out(item: PrintBucketItem) -> PrintBucketItemOut:
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


@router.get("", response_model=list[PrintBucketItemOut])
def list_bucket(db: Session = Depends(get_db)):
    return [_to_out(item) for item in PrintBucketService(db).list_all()]


@router.post("", response_model=PrintBucketItemOut, status_code=201)
def add_to_bucket(
    payload: AddToBucketRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = PrintBucketService(db)
    try:
        item = service.add(payload.generated_card_id, added_by=current_user.id)
    except GeneratedCardNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Generated card not found") from exc
    record_audit(db, current_user.id, "add", "print_bucket_item", item.id, {"generated_card_id": payload.generated_card_id})
    return _to_out(item)


@router.delete("/{item_id}", status_code=204)
def remove_from_bucket(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = PrintBucketService(db)
    try:
        service.remove(item_id)
    except BucketItemNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Bucket item not found") from exc
    record_audit(db, current_user.id, "remove", "print_bucket_item", item_id, {})


@router.post("/print")
def print_sheet(payload: PrintSheetRequest, db: Session = Depends(get_db)):
    service = PrintBucketService(db)
    try:
        pdf_bytes = service.build_print_sheet(payload.item_ids, payload.paper_size)
    except UnsupportedPaperSizeError as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported paper size: {exc}") from exc
    except BucketItemNotFoundError as exc:
        raise HTTPException(status_code=404, detail="None of those bucket items could be found") from exc
    return Response(content=pdf_bytes, media_type="application/pdf")

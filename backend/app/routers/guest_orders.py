"""Staff-facing guest order management."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.guest_order import OrderStatus
from app.models.user import User
from app.repositories.guest_order_repository import GuestOrderRepository
from app.schemas.storefront import GuestOrderOut, GuestOrderStatusUpdate
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/guest-orders", tags=["guest-orders"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[GuestOrderOut])
def list_guest_orders(status: OrderStatus | None = Query(default=None), db: Session = Depends(get_db)):
    return GuestOrderRepository(db).list(status)


@router.get("/{order_id}", response_model=GuestOrderOut)
def get_guest_order(order_id: str, db: Session = Depends(get_db)):
    order = GuestOrderRepository(db).get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/{order_id}/status", response_model=GuestOrderOut)
def set_guest_order_status(
    order_id: str,
    payload: GuestOrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = GuestOrderRepository(db)
    order = repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        order.status = OrderStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid status") from exc
    order = repo.save(order)
    record_audit(db, current_user.id, "status_update", "guest_order", order_id, {"new_status": payload.status})
    return order

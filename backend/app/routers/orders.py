"""
Order CRUD (create + status transitions; orders aren't edited otherwise —
if the customer/type/template/quantity is wrong, cancel and create a new
one so the audit trail stays honest).
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.order import OrderStatus
from app.models.user import User
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.services.order_service import OrderNotFoundError, OrderService
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/orders", tags=["orders"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[OrderOut])
def list_orders(
    customer_id: str | None = Query(default=None),
    status: OrderStatus | None = Query(default=None),
    card_type_id: str | None = Query(default=None),
    created_by: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return OrderService(db).list_orders(
        customer_id=customer_id,
        status_filter=status,
        card_type_id=card_type_id,
        created_by=created_by,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = OrderService(db).create_order(payload, created_by=current_user.id)
    record_audit(db, current_user.id, "create", "order", order.id, {"status": order.status.value})
    return order


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db)):
    try:
        return OrderService(db).get_order(order_id)
    except OrderNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Order not found") from exc


@router.put("/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        order = OrderService(db).update_status(order_id, payload)
    except OrderNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Order not found") from exc
    record_audit(db, current_user.id, "status_update", "order", order_id, {"new_status": payload.status.value})
    return order

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus


class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, order_id: str) -> Optional[Order]:
        return self.db.query(Order).filter(Order.id == order_id).first()

    def list(
        self,
        customer_id: Optional[str] = None,
        status_filter: Optional[OrderStatus] = None,
        card_type_id: Optional[str] = None,
        created_by: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> list[Order]:
        query = self.db.query(Order)
        if customer_id:
            query = query.filter(Order.customer_id == customer_id)
        if status_filter:
            query = query.filter(Order.status == status_filter)
        if card_type_id:
            query = query.filter(Order.card_type_id == card_type_id)
        if created_by:
            query = query.filter(Order.created_by == created_by)
        if date_from:
            query = query.filter(Order.created_at >= date_from)
        if date_to:
            query = query.filter(Order.created_at <= date_to)
        return query.order_by(Order.created_at.desc()).all()

    def create(self, order: Order) -> Order:
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def save(self, order: Order) -> Order:
        self.db.commit()
        self.db.refresh(order)
        return order

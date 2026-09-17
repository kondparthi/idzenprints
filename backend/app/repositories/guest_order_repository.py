from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.guest_order import GuestOrder, OrderStatus


class GuestOrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(GuestOrder).options(joinedload(GuestOrder.items))

    def get_by_id(self, order_id: str) -> Optional[GuestOrder]:
        return self._base_query().filter(GuestOrder.id == order_id).first()

    def get_by_order_number(self, order_number: str) -> Optional[GuestOrder]:
        return self._base_query().filter(GuestOrder.order_number == order_number).first()

    def list(self, status_filter: Optional[OrderStatus] = None) -> list[GuestOrder]:
        query = self._base_query()
        if status_filter:
            query = query.filter(GuestOrder.status == status_filter)
        return query.order_by(GuestOrder.created_at.desc()).all()

    def create(self, order: GuestOrder) -> GuestOrder:
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def save(self, order: GuestOrder) -> GuestOrder:
        self.db.commit()
        self.db.refresh(order)
        return order

    def count_with_number_prefix(self, prefix: str) -> int:
        return self.db.query(GuestOrder).filter(GuestOrder.order_number.like(f"{prefix}%")).count()

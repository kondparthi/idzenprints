from sqlalchemy.orm import Session

from app.models.order import Order
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderCreate, OrderStatusUpdate


class OrderNotFoundError(Exception):
    pass


class OrderService:
    def __init__(self, db: Session):
        self.repo = OrderRepository(db)

    def get_order(self, order_id: str) -> Order:
        order = self.repo.get_by_id(order_id)
        if not order:
            raise OrderNotFoundError(order_id)
        return order

    def list_orders(self, **filters) -> list[Order]:
        return self.repo.list(**filters)

    def create_order(self, data: OrderCreate, created_by: str) -> Order:
        order = Order(**data.model_dump(), created_by=created_by)
        return self.repo.create(order)

    def update_status(self, order_id: str, data: OrderStatusUpdate) -> Order:
        order = self.get_order(order_id)
        order.status = data.status
        return self.repo.save(order)

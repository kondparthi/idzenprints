"""
Order — a customer's request for N cards of a given type/template.
"""
import enum

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column


class OrderStatus(str, enum.Enum):
    NEW = "new"
    PROCESSING = "processing"
    READY = "ready"
    PRINTED = "printed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = uuid_column()
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    card_type_id = Column(String(36), ForeignKey("card_types.id"), nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("templates.id"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    status = str_enum(OrderStatus, nullable=False, default=OrderStatus.NEW, index=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    # See customer.py's docstring on owner_member_id — same reasoning here.
    owner_member_id = Column(String(36), ForeignKey("members.id"), nullable=True, index=True)

    customer = relationship("Customer", backref="orders")
    card_type = relationship("CardType", backref="orders")
    template = relationship("Template", backref="orders")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Order {self.id} customer={self.customer_id} status={self.status}>"

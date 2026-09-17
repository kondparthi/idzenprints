"""
GuestOrder — a public storefront purchase, deliberately separate from
the existing Order model (which belongs to a staff-managed Customer and
represents a card-generation production job, not a product purchase).
A guest buying a physical/product-catalog item and a staff operator
generating an ID card for a walk-in customer are different business
processes that happen to share the English word "order" — forcing them
into one model would mean a pile of nullable, unrelated columns on
both sides.
"""
import enum

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column


class PaymentMethod(str, enum.Enum):
    COD = "cod"
    PHONEPE = "phonepe"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"  # payment gateway initiated, not yet confirmed
    COD_PENDING = "cod_pending"  # will be collected on delivery
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"  # awaiting payment confirmation (PhonePe) or just placed (COD)
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class GuestOrder(Base, TimestampMixin):
    __tablename__ = "guest_orders"

    id = uuid_column()
    order_number = Column(String(20), nullable=False, unique=True, index=True)

    # Snapshot the guest's details directly on the order — there's no
    # account to join back to, and an order must stay readable even if
    # the same person never orders again.
    guest_name = Column(String(150), nullable=False)
    guest_phone = Column(String(20), nullable=False)
    guest_email = Column(String(255), nullable=False)
    shipping_address = Column(Text, nullable=False)
    billing_address = Column(Text, nullable=True)  # nullable: back-filled for pre-existing orders

    payment_method = str_enum(PaymentMethod, nullable=False)
    payment_status = str_enum(PaymentStatus, nullable=False, default=PaymentStatus.PENDING)
    payment_reference = Column(String(100), nullable=True)  # PhonePe transaction id, once real integration exists

    status = str_enum(OrderStatus, nullable=False, default=OrderStatus.PENDING, index=True)

    subtotal = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)

    items = relationship("GuestOrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<GuestOrder {self.order_number} {self.status}>"


class GuestOrderItem(Base):
    __tablename__ = "guest_order_items"

    id = uuid_column()
    order_id = Column(String(36), ForeignKey("guest_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    variant_id = Column(String(36), ForeignKey("product_variants.id"), nullable=True)

    # Snapshot at time of purchase — a later price/name change on the
    # product must never rewrite what this order actually charged.
    product_name = Column(String(200), nullable=False)
    variant_label = Column(String(200), nullable=True)
    unit_price = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    order = relationship("GuestOrder", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<GuestOrderItem {self.product_name} x{self.quantity}>"

"""
ProductVariant — one SKU-bearing combination of attributes (e.g. Size=M,
Color=Red) for a "variable" product. attribute_values is JSON rather than
a fully normalized attribute/value join — same pragmatic choice already
made for Template.elements elsewhere in this app.

Pricing lives here (mirroring Product's fields) because a variable
product's variants can legitimately have different prices — a large
card might cost more than a small one. Bulk pricing tiers and
customer-specific pricing are deliberately product-level only for now
(see product_bulk_pricing.py / product_customer_price.py) rather than
per-variant, to keep this phase's scope bounded.
"""
from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column
from app.models.product import Backorders, StockStatus, TaxClass, TaxStatus


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    id = uuid_column()
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(80), nullable=False, unique=True)
    # e.g. {"Size": "M", "Color": "Red"}
    attribute_values = Column(JSON, nullable=False, default=dict)
    is_active = Column(Boolean, nullable=False, default=True)

    regular_price = Column(Numeric(12, 2), nullable=True)
    sale_price = Column(Numeric(12, 2), nullable=True)
    sale_start_date = Column(Date, nullable=True)
    sale_end_date = Column(Date, nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=True)
    tax_status = str_enum(TaxStatus, nullable=False, default=TaxStatus.TAXABLE)
    tax_class = str_enum(TaxClass, nullable=False, default=TaxClass.STANDARD)
    min_quantity = Column(Integer, nullable=True)
    max_quantity = Column(Integer, nullable=True)

    manage_stock = Column(Boolean, nullable=False, default=False)
    stock_quantity = Column(Integer, nullable=True)
    stock_status = str_enum(StockStatus, nullable=False, default=StockStatus.IN_STOCK)
    low_stock_threshold = Column(Integer, nullable=True)
    backorders = str_enum(Backorders, nullable=False, default=Backorders.NO)

    product = relationship("Product", back_populates="variants")
    inventory_adjustments = relationship(
        "InventoryAdjustment", back_populates="variant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProductVariant {self.sku} {self.attribute_values}>"

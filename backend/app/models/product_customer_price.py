"""
ProductCustomerPrice — a price override for one specific customer on one
specific product (e.g. a wholesale customer who always pays ₹450 for this
SKU regardless of the regular/sale price). Product-level only for now —
see product.py's docstring on why variant-level pricing overrides aren't
in this phase.
"""
from sqlalchemy import Column, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class ProductCustomerPrice(Base, TimestampMixin):
    __tablename__ = "product_customer_prices"
    __table_args__ = (UniqueConstraint("product_id", "customer_id", name="ux_product_customer_price"),)

    id = uuid_column()
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=False)

    product = relationship("Product", back_populates="customer_prices")
    customer = relationship("Customer")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProductCustomerPrice product={self.product_id} customer={self.customer_id} price={self.price}>"

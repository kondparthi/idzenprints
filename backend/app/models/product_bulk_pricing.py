"""
ProductBulkPricingTier — quantity-based pricing (e.g. 1-9 units at ₹100
each, 10-49 at ₹90, 50+ at ₹80). max_quantity is nullable to mean "and
above" for the top tier.
"""
from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class ProductBulkPricingTier(Base, TimestampMixin):
    __tablename__ = "product_bulk_pricing_tiers"

    id = uuid_column()
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    min_quantity = Column(Integer, nullable=False)
    max_quantity = Column(Integer, nullable=True)  # NULL = "and above"
    price = Column(Numeric(12, 2), nullable=False)

    product = relationship("Product", back_populates="bulk_pricing_tiers")

    def __repr__(self) -> str:  # pragma: no cover
        upper = self.max_quantity if self.max_quantity is not None else "+"
        return f"<ProductBulkPricingTier {self.min_quantity}-{upper} @ {self.price}>"

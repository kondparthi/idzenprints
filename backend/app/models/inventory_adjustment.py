"""
InventoryAdjustment — an append-only log of every stock quantity change,
whether on a Product directly (simple products) or a ProductVariant
(variable products) — product_id is always set (even for a variant-level
entry, so "history for this product" naturally includes its variants'
history too), variant_id is set only for variant-level entries.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from app.database import Base
from app.models.mixins import uuid_column


class InventoryAdjustment(Base):
    __tablename__ = "inventory_adjustments"

    id = uuid_column()
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, index=True)
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    change_quantity = Column(Integer, nullable=False)  # new - previous, stored for a readable history log
    reason = Column(Text, nullable=True)
    adjusted_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    # A plain server_default=func.now() has only 1-second resolution on
    # both SQLite and MySQL's default DATETIME — two adjustments made in
    # quick succession (very plausible: a correction right after an
    # initial entry) would tie on created_at with no way to order them
    # correctly. A Python-side default gives microsecond precision
    # instead, so "most recent first" is always actually correct.
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False
    )

    product = relationship("Product", back_populates="inventory_adjustments")
    variant = relationship("ProductVariant", back_populates="inventory_adjustments")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<InventoryAdjustment {self.previous_quantity}->{self.new_quantity} ({self.change_quantity:+d})>"

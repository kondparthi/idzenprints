"""
ProductImage — one row per uploaded image. is_primary marks the single
"featured" image (shown in listings); every other row is gallery.
Enforcing "exactly one primary" is done in the service layer, not the
database, to keep this migration simple.
"""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class ProductImage(Base, TimestampMixin):
    __tablename__ = "product_images"

    id = uuid_column()
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    # Path relative to settings.UPLOAD_DIR — never a publicly reachable URL
    # (served through an authenticated endpoint, same pattern as documents).
    stored_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="images")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProductImage {self.original_filename} primary={self.is_primary}>"

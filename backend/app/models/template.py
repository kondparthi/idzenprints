"""
Template — a card layout: physical size/DPI plus an ordered list of design
elements (text, image, photo placeholder, logo, QR, barcode, shape). The
element list is stored as JSON rather than normalized tables — it's edited
and read as one document by the designer UI, and its shape will keep
evolving through Phase 4, so JSON avoids a migration for every new element
property.
"""
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class Template(Base, TimestampMixin):
    __tablename__ = "templates"

    id = uuid_column()
    name = Column(String(150), nullable=False)
    card_type_id = Column(String(36), ForeignKey("card_types.id"), nullable=False, index=True)

    width_mm = Column(Float, nullable=False, default=85.60)
    height_mm = Column(Float, nullable=False, default=53.98)
    dpi = Column(Integer, nullable=False, default=300)

    # Path relative to settings.UPLOAD_DIR — never a publicly reachable URL.
    background_path = Column(String(500), nullable=True)

    # List[dict] — see frontend src/designer/types.ts for the element shape
    # each entry is expected to follow.
    elements = Column(JSON, nullable=False, default=list)

    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    card_type = relationship("CardType", backref="templates")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Template {self.name} ({self.width_mm}x{self.height_mm}mm)>"

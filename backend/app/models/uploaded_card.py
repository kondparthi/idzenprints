"""
UploadedCard — a reusable library entry for the "Print pre-designed
cards" module: an already-designed card's front (and optionally back)
image, uploaded once per card type (Aadhaar, FSC/Ration Card, PAN Card,
...) and reused across many print runs, instead of re-uploading the same
image every time staff want to print a sheet.

This is deliberately separate from Template/GeneratedCard: those hold a
*design* (elements bound to {{variable}} tokens) rendered per customer.
An UploadedCard is just a finished image — no customer, no variables —
for cards that were designed and already look exactly as printed
(a finished Aadhaar/Ration/PAN card screenshot or scan).

width_mm/height_mm default to the standard CR80 PVC card size used
elsewhere in the app (see Template) and drive the auto-grid layout in
uploaded_card_sheet_service.py.
"""
from sqlalchemy import Column, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class UploadedCard(Base, TimestampMixin):
    __tablename__ = "uploaded_cards"

    id = uuid_column()
    card_type_id = Column(String(36), ForeignKey("card_types.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    front_image_path = Column(String(500), nullable=False)
    back_image_path = Column(String(500), nullable=True)
    width_mm = Column(Float, nullable=False, default=85.60)
    height_mm = Column(Float, nullable=False, default=53.98)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    card_type = relationship("CardType")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<UploadedCard {self.name}>"

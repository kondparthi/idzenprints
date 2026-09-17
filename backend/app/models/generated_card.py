"""
GeneratedCard — metadata for one rendered card output. order_id links back
to the Order it was generated for (Phase 5); it stays nullable because a
card can still be generated ad hoc, without an order.
"""
from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class GeneratedCard(Base, TimestampMixin):
    __tablename__ = "generated_cards"

    id = uuid_column()
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("templates.id"), nullable=False, index=True)

    # Paths relative to settings.GENERATED_DIR — never publicly reachable URLs.
    pdf_path = Column(String(500), nullable=True)
    png_path = Column(String(500), nullable=True)
    jpg_path = Column(String(500), nullable=True)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    # See customer.py's docstring on owner_member_id — same reasoning here.
    owner_member_id = Column(String(36), ForeignKey("members.id"), nullable=True, index=True)

    customer = relationship("Customer", backref="generated_cards")
    template = relationship("Template", backref="generated_cards")
    order = relationship("Order", backref="generated_cards")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<GeneratedCard customer={self.customer_id} template={self.template_id}>"

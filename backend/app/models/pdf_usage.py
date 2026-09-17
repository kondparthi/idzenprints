"""
PdfUsage — a record per PDF generation, separate from CreditTransaction
because "credits" and "PDF generation limit" are explicitly independent
business rules (spec section 9): a service could theoretically cost 0
credits but still count against the PDF limit, or vice versa. order_id
is nullable because member-initiated generation (this phase) doesn't
go through the staff Order flow — it's populated when/if that
integration happens later.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.mixins import uuid_column


class PdfUsage(Base):
    __tablename__ = "pdf_usage"

    id = uuid_column()
    subscription_id = Column(String(36), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True)
    card_type_id = Column(String(36), ForeignKey("card_types.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    subscription = relationship("Subscription", backref="pdf_usage_records")
    card_type = relationship("CardType")

    @property
    def card_type_name(self) -> str:
        return self.card_type.name

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PdfUsage {self.card_type_id} x{self.quantity}>"

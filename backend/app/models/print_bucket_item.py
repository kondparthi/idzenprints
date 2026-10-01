"""
PrintBucketItem — the "cart" of generated cards staff have queued up for a
batch A4 print run. One row per GeneratedCard added to the bucket; a card
is only ever in the bucket once (see the unique constraint), so re-adding
the same card is a no-op rather than a duplicate row.
"""
from sqlalchemy import Column, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class PrintBucketItem(Base, TimestampMixin):
    __tablename__ = "print_bucket_items"
    __table_args__ = (UniqueConstraint("generated_card_id", name="uq_print_bucket_items_generated_card_id"),)

    id = uuid_column()
    generated_card_id = Column(String(36), ForeignKey("generated_cards.id", ondelete="CASCADE"), nullable=False, index=True)
    added_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    generated_card = relationship("GeneratedCard", backref="bucket_items")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PrintBucketItem card={self.generated_card_id}>"

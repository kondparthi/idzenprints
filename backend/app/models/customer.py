"""
Customer model — the person a card is being printed for.

owner_member_id (added for the Subscription & Package module) is who
this customer record belongs to when a subscribing Member created it
through their own dashboard — nullable because rows created directly by
internal staff (the app's original, single-tenant use) belong to no
member ("house account"), and existing rows predate this column
entirely. Nothing reads or enforces this yet in Phase 1 — that access
scoping lands in a later phase; this is schema-only groundwork so it
doesn't require a second migration + backfill once that logic exists.
"""
from sqlalchemy import Column, ForeignKey, String, Text

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id = uuid_column()
    name = Column(String(150), nullable=False, index=True)
    mobile = Column(String(20), nullable=False, index=True)
    email = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)
    owner_member_id = Column(String(36), ForeignKey("members.id"), nullable=True, index=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Customer {self.name} ({self.mobile})>"

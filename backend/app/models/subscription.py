"""
Subscription — links one Member to one Package for one license period.
This is the record that actually gets checked on every card generation
(see the access-control chain in a later phase); Package itself is just
a reusable template of limits, never checked directly.

member_type_id is a snapshot of the member's type *at subscription
time*, not a live lookup through Member — a member's type could
theoretically change later, and re-deriving old subscriptions' history
through a mutable foreign key would be wrong; this keeps history honest.

Status intentionally has no separate "Pending Payment" vs "Pending
Approval" value — this deployment has no payment gateway yet, so both
cases collapse to PENDING_APPROVAL (a Super Admin manually reviews and
activates). "Automatically considering a subscription expired after its
expiry date" is access-control logic to add in a later phase, not a
background job — it's derived from expiry_date at check-time rather
than needing an exact status transition the moment the clock ticks
over.
"""
import enum

from sqlalchemy import Column, Date, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column


class SubscriptionStatus(str, enum.Enum):
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id = uuid_column()
    member_id = Column(String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    package_id = Column(String(36), ForeignKey("packages.id"), nullable=False, index=True)
    member_type_id = Column(String(36), ForeignKey("member_types.id"), nullable=False)

    start_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)

    credits_allocated = Column(Integer, nullable=False)
    credits_remaining = Column(Integer, nullable=False)
    pdf_limit = Column(Integer, nullable=False)
    pdf_used = Column(Integer, nullable=False, default=0)

    status = str_enum(SubscriptionStatus, nullable=False, default=SubscriptionStatus.PENDING_APPROVAL, index=True)

    member = relationship("Member", backref="subscriptions")
    package = relationship("Package", backref="subscriptions")
    member_type = relationship("MemberType")

    @property
    def member_name(self) -> str:
        return self.member.full_name

    @property
    def member_login_id(self) -> str:
        return self.member.login_id

    @property
    def package_name(self) -> str:
        return self.package.name

    @property
    def member_type_name(self) -> str:
        return self.member_type.name

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Subscription member={self.member_id} package={self.package_id} ({self.status})>"

"""
Member — a self-registered, subscribing customer (Meeseva outlet,
internet cafe, individual, company) who logs in on their own, separate
from the internal staff accounts in models/user.py.

Deliberately NOT the same table as User: a staff account and a member
account have almost nothing in common structurally (member_type, phone,
terms-acceptance timestamp vs. a staff role), and merging them would
mean nullable-everywhere columns and would break the existing
require_roles() dependency, which assumes exactly the 4 staff
UserRole values. This table reuses the *mechanism* — the same
hash_password/create_access_token/decode_access_token utilities in
utils/security.py — just as its own login flow (see the auth router
added in a later phase), matching the "reuse existing auth" instruction
without corrupting the staff model.

is_active mirrors the existing User.is_active convention and gates
login itself (an account-level lock, e.g. "Suspend" from the admin
member list) — separate from Subscription.status, which gates feature
access (credits/services/license) and can change independently (e.g. a
member's account stays active while their subscription expires and
they're just looking at a "please renew" screen).
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class Member(Base, TimestampMixin):
    __tablename__ = "members"

    id = uuid_column()
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False, unique=True, index=True)
    email = Column(String(150), nullable=False, unique=True, index=True)
    # The spec's registration form calls this "User ID" — a chosen login
    # handle distinct from the internal UUID, similar in spirit to email
    # login but explicitly a separate field the member picks themselves.
    login_id = Column(String(50), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    member_type_id = Column(String(36), ForeignKey("member_types.id"), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    terms_accepted_at = Column(DateTime(timezone=True), nullable=True)

    member_type = relationship("MemberType", backref="members")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Member {self.login_id} ({self.full_name})>"

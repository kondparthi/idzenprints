"""
MemberSession — tracks each device a member is logged in on, so the
package's device_limit (spec section 12) can actually be enforced
instead of trusted client-side. device_id is a client-generated
identifier (stored in the browser's localStorage) rather than anything
derived from IP/user-agent, which are both too unstable (roaming
networks, browser updates) to use as the actual identity check.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.mixins import str_enum, uuid_column


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    LOGGED_OUT = "logged_out"
    REVOKED = "revoked"


class MemberSession(Base):
    __tablename__ = "member_sessions"

    id = uuid_column()
    member_id = Column(String(36), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(100), nullable=False)
    device_name = Column(String(150), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    login_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    logout_at = Column(DateTime(timezone=True), nullable=True)
    status = str_enum(SessionStatus, nullable=False, default=SessionStatus.ACTIVE)

    member = relationship("Member", backref="sessions")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MemberSession {self.device_id} ({self.status})>"

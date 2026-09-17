"""
AuditLog — an append-only record of who did what. Instrumented on the
business/security-relevant mutations (auth, orders, card generation,
customer deletion, document deletion) rather than every single write —
see app/utils/audit.py for where it's called from.
"""
from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.sql import func
from sqlalchemy import DateTime

from app.database import Base
from app.models.mixins import uuid_column


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = uuid_column()
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(36), nullable=True, index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuditLog {self.action} {self.entity_type}:{self.entity_id}>"

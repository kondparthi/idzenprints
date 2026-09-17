"""
CreditTransaction — the append-only ledger section 8 of the spec
explicitly requires ("do NOT simply update the balance without
maintaining transaction history"). Every change to
Subscription.credits_remaining must be paired with a row here in the
same DB transaction — see AccessControlService.consume_service.

created_by intentionally has no FK constraint: it can be a staff
user's id (an admin adjustment), a member's own id (self-service credit
spend), or null (the initial grant recorded at registration, which
nothing "did" on anyone's behalf). A single FK to one table would be
wrong for at least two of those three cases — same reasoning already
applied to InventoryAdjustment elsewhere in this app.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.mixins import str_enum, uuid_column


class CreditTransactionType(str, enum.Enum):
    CREDIT = "credit"
    DEBIT = "debit"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"
    EXPIRY = "expiry"


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = uuid_column()
    subscription_id = Column(String(36), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = str_enum(CreditTransactionType, nullable=False)
    amount = Column(Integer, nullable=False)  # signed: +150 for a grant, -1 for a debit
    balance_after = Column(Integer, nullable=False)
    reference_type = Column(String(50), nullable=True)  # e.g. "card_generation", "registration", "admin_adjustment"
    reference_id = Column(String(36), nullable=True)
    description = Column(Text, nullable=True)
    created_by = Column(String(36), nullable=True)
    # Python-side default (not server_default alone) for microsecond
    # precision — see InventoryAdjustment for the bug this avoids: two
    # transactions in the same second need a reliable sort order.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now(), nullable=False)

    subscription = relationship("Subscription", backref="credit_transactions")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CreditTransaction {self.transaction_type} {self.amount:+d} -> {self.balance_after}>"

"""
Subscription management for Super Admin — list/view/status-transitions,
plus (from Phase 6) the credit ledger, PDF usage history, and manual
credit adjustments. Package changes and license extensions with a full
audit trail (subscription_history) remain explicitly out of scope here
— see the Phase 6 delivery notes for why.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.models.subscription import Subscription, SubscriptionStatus
from app.repositories.credit_transaction_repository import CreditTransactionRepository
from app.repositories.pdf_usage_repository import PdfUsageRepository
from app.repositories.subscription_repository import SubscriptionRepository


class SubscriptionNotFoundError(Exception):
    pass


class InvalidAdjustmentError(Exception):
    """Raised when a negative adjustment would take the balance below zero."""


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SubscriptionRepository(db)
        self.credit_txn_repo = CreditTransactionRepository(db)
        self.pdf_usage_repo = PdfUsageRepository(db)

    def list_subscriptions(self, status_filter: Optional[SubscriptionStatus] = None) -> list[Subscription]:
        return self.repo.list(status_filter)

    def get_subscription(self, subscription_id: str) -> Subscription:
        subscription = self.repo.get_by_id(subscription_id)
        if not subscription:
            raise SubscriptionNotFoundError(subscription_id)
        return subscription

    def set_status(self, subscription_id: str, new_status: SubscriptionStatus) -> Subscription:
        subscription = self.get_subscription(subscription_id)
        subscription.status = new_status
        return self.repo.save(subscription)

    def list_credit_transactions(self, subscription_id: str) -> list[CreditTransaction]:
        self.get_subscription(subscription_id)  # 404s if missing
        return self.credit_txn_repo.list_for_subscription(subscription_id)

    def list_pdf_usage(self, subscription_id: str):
        self.get_subscription(subscription_id)
        return self.pdf_usage_repo.list_for_subscription(subscription_id)

    def adjust_credits(
        self, subscription_id: str, amount: int, description: str, adjusted_by: Optional[str]
    ) -> CreditTransaction:
        """A manual Super Admin correction — spec section 23's "Adjust
        Credits" action. Always recorded as its own ledger entry (never a
        silent balance edit), same transactional discipline as the
        member-initiated debits in Phase 5's AccessControlService."""
        subscription = self.get_subscription(subscription_id)
        if amount == 0:
            raise InvalidAdjustmentError("Adjustment amount cannot be zero")
        new_balance = subscription.credits_remaining + amount
        if new_balance < 0:
            raise InvalidAdjustmentError(
                f"This would take the balance to {new_balance} — cannot go below zero."
            )

        try:
            subscription.credits_remaining = new_balance
            transaction = CreditTransaction(
                subscription_id=subscription_id,
                transaction_type=CreditTransactionType.ADJUSTMENT,
                amount=amount,
                balance_after=new_balance,
                reference_type="admin_adjustment",
                reference_id=None,
                description=description,
                created_by=adjusted_by,
            )
            self.db.add(transaction)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(transaction)
        return transaction

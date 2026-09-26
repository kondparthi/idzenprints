"""
Subscription management for Super Admin — list/view/status-transitions,
plus (from Phase 6) the credit ledger, PDF usage history, and manual
credit adjustments. Package changes and license extensions with a full
audit trail (subscription_history) remain explicitly out of scope here
— see the Phase 6 delivery notes for why.
"""
import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.models.subscription import Subscription, SubscriptionStatus
from app.repositories.credit_transaction_repository import CreditTransactionRepository
from app.repositories.member_repository import MemberRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.pdf_usage_repository import PdfUsageRepository
from app.repositories.subscription_repository import SubscriptionRepository


class SubscriptionNotFoundError(Exception):
    pass


class InvalidAdjustmentError(Exception):
    """Raised when a negative adjustment would take the balance below zero."""


class MemberNotFoundError(Exception):
    pass


class InvalidPackageError(Exception):
    pass


class PackageNotAvailableForMemberError(Exception):
    """The package isn't linked to this member's member type — never
    trust the caller's pairing, re-check it server-side, same principle
    registration used to apply before packages moved out of that flow."""


class ActiveSubscriptionExistsError(Exception):
    """A member with an active or pending plan needs that one resolved
    first, rather than silently accumulating a second one."""


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SubscriptionRepository(db)
        self.credit_txn_repo = CreditTransactionRepository(db)
        self.pdf_usage_repo = PdfUsageRepository(db)
        self.member_repo = MemberRepository(db)
        self.package_repo = PackageRepository(db)

    def create_subscription(
        self, member_id: str, package_id: str, status: SubscriptionStatus = SubscriptionStatus.PENDING_APPROVAL
    ) -> Subscription:
        member = self.member_repo.get_by_id(member_id)
        if not member:
            raise MemberNotFoundError(member_id)

        package = self.package_repo.get_by_id(package_id)
        if not package or not package.is_active:
            raise InvalidPackageError(package_id)
        if member.member_type_id not in {mt.id for mt in package.member_types}:
            raise PackageNotAvailableForMemberError((member_id, package_id))

        existing = self.repo.get_latest_for_member(member_id)
        if existing and existing.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_APPROVAL):
            raise ActiveSubscriptionExistsError(member_id)

        today = datetime.date.today()
        subscription = Subscription(
            member_id=member.id,
            package_id=package.id,
            member_type_id=member.member_type_id,
            start_date=today,
            expiry_date=today + datetime.timedelta(days=package.license_days),
            credits_allocated=package.credits,
            credits_remaining=package.credits,
            pdf_limit=package.pdf_generation_limit,
            pdf_used=0,
            status=status,
        )

        try:
            self.db.add(subscription)
            self.db.flush()  # assigns subscription.id, needed by the ledger entry below

            # Same reasoning as the old registration-time grant: the
            # starting balance needs a ledger entry, or credit history
            # starts "in the middle" with no record of where it came from.
            initial_grant = CreditTransaction(
                subscription_id=subscription.id,
                transaction_type=CreditTransactionType.CREDIT,
                amount=package.credits,
                balance_after=package.credits,
                reference_type="subscription_created",
                reference_id=subscription.id,
                description=f"Initial grant — {package.name} package",
                created_by=None,
            )
            self.db.add(initial_grant)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(subscription)
        return subscription

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

"""
The permission chain from spec section 19, and the transactional
credit/PDF-debit flow from section 33. This is the module every future
member-facing generation endpoint should call through — never check
credits or license status ad hoc elsewhere.
"""
import datetime

from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from app.models.card_type import CardType
from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.models.member import Member
from app.models.pdf_usage import PdfUsage
from app.models.subscription import Subscription, SubscriptionStatus
from app.repositories.subscription_repository import SubscriptionRepository


class AccessDeniedError(Exception):
    """reason_code is a stable, machine-readable string the frontend can
    switch on to show the right message/CTA (e.g. "insufficient_credits"
    -> show a "Buy more credits" button) — message is the human-readable
    fallback."""

    def __init__(self, reason_code: str, message: str):
        self.reason_code = reason_code
        self.message = message
        super().__init__(message)


class AccessControlService:
    def __init__(self, db: Session):
        self.db = db
        self.subscription_repo = SubscriptionRepository(db)

    def _get_active_subscription(self, member: Member) -> Subscription:
        """Steps 1-2 of the permission chain: the member's latest
        subscription must be ACTIVE and inside its licence window."""
        subscription = self.subscription_repo.get_latest_for_member(member.id)
        if not subscription:
            raise AccessDeniedError("no_subscription", "No subscription found for this account.")

        # 1. Subscription status
        if subscription.status != SubscriptionStatus.ACTIVE:
            label = subscription.status.value.replace("_", " ")
            raise AccessDeniedError("subscription_not_active", f"Your subscription is {label}, not active.")

        # 2. Licence window — derived at check-time from start/expiry
        # dates, not a separately-maintained status (see Subscription
        # model's docstring from Phase 1: there's no background job
        # flipping this). Covers both an expired licence and one that
        # hasn't started yet (a pre-provisioned future subscription).
        today = datetime.date.today()
        if subscription.start_date > today:
            raise AccessDeniedError(
                "licence_not_yet_active", f"Your licence starts on {subscription.start_date.isoformat()}."
            )
        if subscription.expiry_date < today:
            raise AccessDeniedError("licence_expired", "Your subscription licence has expired.")
        return subscription

    def _get_active_subscription_and_service(
        self, member: Member, card_type_id: str, quantity: int
    ) -> tuple[Subscription, CardType, int]:
        subscription = self._get_active_subscription(member)

        # 3. Service availability — must be enabled for the member's type
        # AND included in their package AND currently active globally.
        # The member-type restriction is easy to miss: member_type_services
        # exists precisely so Super Admin can scope which services a type
        # of member can ever see, independent of any specific package —
        # skipping this check would mean that setting is silently ignored.
        member_type_service_ids = {ct.id for ct in member.member_type.services if ct.is_active}
        if card_type_id not in member_type_service_ids:
            raise AccessDeniedError(
                "service_not_available_for_member_type", "This service isn't available for your member type."
            )

        service = next((ct for ct in subscription.package.services if ct.id == card_type_id and ct.is_active), None)
        if service is None:
            raise AccessDeniedError("service_not_available", "This service isn't included in your package.")

        total_cost = service.credit_cost * quantity

        # 4. Credit balance
        if subscription.credits_remaining < total_cost:
            raise AccessDeniedError(
                "insufficient_credits",
                f"This needs {total_cost} credit{'s' if total_cost != 1 else ''}, but you only have "
                f"{subscription.credits_remaining} remaining.",
            )

        # 5. PDF generation limit
        if subscription.pdf_used + quantity > subscription.pdf_limit:
            remaining = max(subscription.pdf_limit - subscription.pdf_used, 0)
            raise AccessDeniedError(
                "pdf_limit_reached", f"You have {remaining} PDF generation{'s' if remaining != 1 else ''} remaining."
            )

        return subscription, service, total_cost

    def check_access(self, member: Member, card_type_id: str, quantity: int = 1) -> None:
        """Validation only, no side effects — lets the frontend ask 'could
        I do this?' (e.g. to grey out a button) without spending anything."""
        self._get_active_subscription_and_service(member, card_type_id, quantity)

    def consume_service(
        self,
        member: Member,
        card_type_id: str,
        quantity: int = 1,
        reference_id: str | None = None,
    ) -> dict:
        """The section 33 flow: validate -> debit credits -> record the
        ledger entry -> record PDF usage -> commit, all in one
        transaction, or none of it happens.

        Idempotency: if reference_id is provided (the frontend should
        always send a fresh, client-generated id per generation attempt)
        and a transaction already exists for it, this returns that
        transaction's result instead of debiting a second time — the
        guard against "double-click charges twice" the spec calls out
        explicitly.

        Concurrency: the validation above reads the subscription without
        a lock — fine for the "is this even allowed" check, but two truly
        simultaneous requests could both pass it against the same stale
        credits_remaining and both attempt to debit, overdrawing the
        balance. The actual debit below is a single conditional UPDATE
        whose WHERE clause re-checks credits_remaining and pdf_used
        against whatever the database's current values are at the moment
        the statement executes — not the values this function read
        earlier — so only one of two concurrent requests can ever match
        the WHERE clause and update a row; the other affects zero rows
        and is correctly rejected. This works on every backend without
        relying on explicit row-locking support (SELECT ... FOR UPDATE
        is silently a no-op on SQLite — verified directly — which is
        exactly why this statement-level approach is used instead).
        """
        if reference_id:
            existing = (
                self.db.query(CreditTransaction)
                .filter(
                    CreditTransaction.reference_type == "card_generation",
                    CreditTransaction.reference_id == reference_id,
                )
                .first()
            )
            if existing:
                subscription = self.subscription_repo.get_by_id(existing.subscription_id)
                return {
                    "already_processed": True,
                    "credits_remaining": subscription.credits_remaining,
                    "pdf_used": subscription.pdf_used,
                    "transaction_id": existing.id,
                }

        subscription, service, total_cost = self._get_active_subscription_and_service(member, card_type_id, quantity)

        try:
            result = self.db.execute(
                sa_update(Subscription)
                .where(
                    Subscription.id == subscription.id,
                    Subscription.credits_remaining >= total_cost,
                    (Subscription.pdf_used + quantity) <= Subscription.pdf_limit,
                )
                .values(
                    credits_remaining=Subscription.credits_remaining - total_cost,
                    pdf_used=Subscription.pdf_used + quantity,
                )
            )

            if result.rowcount == 0:
                # Either a genuine insufficient-funds/limit case, or we
                # lost a race to a concurrent request that got there
                # first — re-fetch to tell the caller which, honestly.
                self.db.rollback()
                current = self.subscription_repo.get_by_id(subscription.id)
                if current.credits_remaining < total_cost:
                    raise AccessDeniedError(
                        "insufficient_credits",
                        f"This needs {total_cost} credit{'s' if total_cost != 1 else ''}, but you only have "
                        f"{current.credits_remaining} remaining.",
                    )
                remaining = max(current.pdf_limit - current.pdf_used, 0)
                raise AccessDeniedError(
                    "pdf_limit_reached",
                    f"You have {remaining} PDF generation{'s' if remaining != 1 else ''} remaining.",
                )

            new_balance = subscription.credits_remaining

            transaction = CreditTransaction(
                subscription_id=subscription.id,
                transaction_type=CreditTransactionType.DEBIT,
                amount=-total_cost,
                balance_after=new_balance,
                reference_type="card_generation",
                reference_id=reference_id,
                description=f"{service.name} x{quantity}",
                created_by=member.id,
            )
            self.db.add(transaction)

            usage = PdfUsage(subscription_id=subscription.id, card_type_id=service.id, quantity=quantity)
            self.db.add(usage)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(subscription)
        return {
            "already_processed": False,
            "credits_remaining": subscription.credits_remaining,
            "pdf_used": subscription.pdf_used,
            "transaction_id": transaction.id,
        }


    # ------------------------------------------------------------------
    # Print bucket / Print cards (member portal). These are not tied to a
    # card type or the PDF-generation quota: they only need an active
    # subscription, and each downloaded PDF costs a flat number of credits.
    # ------------------------------------------------------------------

    def check_print_access(self, member: Member) -> Subscription:
        """Active subscription + licence window only (no credit check) —
        used to gate the library, bucket and free previews."""
        return self._get_active_subscription(member)

    def check_print_credits(self, member: Member, cost: int) -> None:
        subscription = self._get_active_subscription(member)
        if subscription.credits_remaining < cost:
            raise AccessDeniedError(
                "insufficient_credits",
                f"Downloading this PDF needs {cost} credit{'s' if cost != 1 else ''}, but you only have "
                f"{subscription.credits_remaining} remaining.",
            )

    def consume_print_sheet(
        self, member: Member, cost: int, cards: int, reference_id: str | None = None
    ) -> dict:
        """Debits `cost` credits for one downloaded print-sheet PDF and
        records it in the credit ledger (reference_type 'print_sheet').
        Same guarantees as consume_service: a conditional UPDATE that
        cannot overdraw under concurrency, and idempotency by reference_id
        so a double-click never charges twice. pdf_used is untouched."""
        if reference_id:
            existing = (
                self.db.query(CreditTransaction)
                .filter(
                    CreditTransaction.reference_type == "print_sheet",
                    CreditTransaction.reference_id == reference_id,
                )
                .first()
            )
            if existing:
                subscription = self.subscription_repo.get_by_id(existing.subscription_id)
                return {
                    "already_processed": True,
                    "credits_remaining": subscription.credits_remaining,
                    "transaction_id": existing.id,
                }

        subscription = self._get_active_subscription(member)
        try:
            result = self.db.execute(
                sa_update(Subscription)
                .where(Subscription.id == subscription.id, Subscription.credits_remaining >= cost)
                .values(credits_remaining=Subscription.credits_remaining - cost)
            )
            if result.rowcount == 0:
                self.db.rollback()
                current = self.subscription_repo.get_by_id(subscription.id)
                raise AccessDeniedError(
                    "insufficient_credits",
                    f"Downloading this PDF needs {cost} credit{'s' if cost != 1 else ''}, but you only have "
                    f"{current.credits_remaining} remaining.",
                )
            self.db.refresh(subscription)
            transaction = CreditTransaction(
                subscription_id=subscription.id,
                transaction_type=CreditTransactionType.DEBIT,
                amount=-cost,
                balance_after=subscription.credits_remaining,
                reference_type="print_sheet",
                reference_id=reference_id,
                description=f"Print sheet PDF ({cards} card{'s' if cards != 1 else ''})",
                created_by=member.id,
            )
            self.db.add(transaction)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(subscription)
        return {
            "already_processed": False,
            "credits_remaining": subscription.credits_remaining,
            "transaction_id": transaction.id,
        }

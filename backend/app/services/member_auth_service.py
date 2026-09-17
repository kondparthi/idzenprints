"""
Member self-registration and login — deliberately separate from
app/services/auth_service.py (staff auth), per the Phase 1 architecture
decision: Members and staff Users are different actors with nothing
structurally in common, sharing only the underlying bcrypt/JWT
*mechanism*, not a table or a login endpoint.

Member tokens carry {"actor": "member"} so they can never be presented
to a staff-only endpoint (or vice versa) even though both are signed
with the same JWT_SECRET — see middleware/member_auth_middleware.py for
the corresponding check.
"""
import datetime

from sqlalchemy.orm import Session

from app.models.credit_transaction import CreditTransaction, CreditTransactionType
from app.models.member import Member
from app.models.member_session import MemberSession, SessionStatus
from app.models.subscription import Subscription, SubscriptionStatus
from app.repositories.member_repository import MemberRepository
from app.repositories.member_session_repository import MemberSessionRepository
from app.repositories.member_type_repository import MemberTypeRepository
from app.repositories.package_repository import PackageRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.member_auth import MemberRegisterRequest
from app.utils.security import create_access_token, hash_password, verify_password


class DuplicateLoginIdError(Exception):
    pass


class DuplicateEmailError(Exception):
    pass


class DuplicatePhoneError(Exception):
    pass


class InvalidMemberTypeError(Exception):
    pass


class InvalidPackageError(Exception):
    pass


class PackageNotAvailableForMemberTypeError(Exception):
    """Raised when the frontend sends a package_id/member_type_id pair
    that isn't actually linked — the whole point of section 14/26 of the
    spec: never trust the frontend's filtering, re-check it here."""


class MemberAuthError(Exception):
    pass


class DeviceLimitReachedError(Exception):
    pass


class MemberAuthService:
    def __init__(self, db: Session):
        self.db = db
        self.member_repo = MemberRepository(db)
        self.member_type_repo = MemberTypeRepository(db)
        self.package_repo = PackageRepository(db)

    def register(self, data: MemberRegisterRequest) -> tuple[Member, Subscription]:
        if self.member_repo.get_by_login_id(data.login_id):
            raise DuplicateLoginIdError(data.login_id)
        if self.member_repo.get_by_email(data.email):
            raise DuplicateEmailError(data.email)
        if self.member_repo.get_by_phone(data.phone):
            raise DuplicatePhoneError(data.phone)

        member_type = self.member_type_repo.get_by_id(data.member_type_id)
        if not member_type or not member_type.is_active:
            raise InvalidMemberTypeError(data.member_type_id)

        package = self.package_repo.get_by_id(data.package_id)
        if not package or not package.is_active:
            raise InvalidPackageError(data.package_id)
        # The check the spec repeatedly stresses: the frontend already
        # filtered this, but that's a convenience, not a security
        # boundary — verify the relationship actually exists server-side.
        if member_type.id not in {mt.id for mt in package.member_types}:
            raise PackageNotAvailableForMemberTypeError((data.package_id, data.member_type_id))

        member = Member(
            full_name=data.full_name,
            phone=data.phone,
            email=data.email,
            login_id=data.login_id,
            password_hash=hash_password(data.password),
            member_type_id=member_type.id,
            terms_accepted_at=datetime.datetime.now(datetime.timezone.utc),
        )

        today = datetime.date.today()
        subscription = Subscription(
            member=member,
            package_id=package.id,
            member_type_id=member_type.id,
            start_date=today,
            expiry_date=today + datetime.timedelta(days=package.license_days),
            credits_allocated=package.credits,
            credits_remaining=package.credits,
            pdf_limit=package.pdf_generation_limit,
            pdf_used=0,
            status=SubscriptionStatus.PENDING_APPROVAL,
        )

        # Member and Subscription are created together, in one
        # transaction — a member account with no subscription (or vice
        # versa) would be a broken half-state, so either both commit or
        # neither does.
        try:
            self.db.add(member)
            self.db.add(subscription)
            self.db.flush()  # assigns subscription.id, needed by the ledger entry below

            # The initial grant must appear in the ledger too — otherwise
            # a member's credit history would start "in the middle" with
            # no record of where their starting balance came from, which
            # is exactly what section 8's own example ledger shows as the
            # very first line ("Package Purchase +150").
            initial_grant = CreditTransaction(
                subscription_id=subscription.id,
                transaction_type=CreditTransactionType.CREDIT,
                amount=package.credits,
                balance_after=package.credits,
                reference_type="registration",
                reference_id=subscription.id,
                description=f"Initial grant — {package.name} package",
                created_by=None,
            )
            self.db.add(initial_grant)

            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        self.db.refresh(member)
        self.db.refresh(subscription)
        return member, subscription

    def authenticate(self, login_id: str, password: str) -> Member:
        member = self.member_repo.get_by_login_id(login_id)
        if not member or not verify_password(password, member.password_hash):
            raise MemberAuthError("Invalid user ID or password")
        if not member.is_active:
            raise MemberAuthError("This account has been suspended")
        return member

    def register_device_session(
        self, member: Member, device_id: str, device_name: str | None, ip_address: str | None, user_agent: str | None
    ) -> MemberSession:
        """Enforces the package's device_limit (spec section 12). Logging
        in again from a device already holding an active session doesn't
        count as a new device — only distinct device_ids do — so
        refreshing the page or a token refresh never accidentally locks
        the member out of their own current device."""
        session_repo = MemberSessionRepository(self.db)

        existing = session_repo.get_active_by_device(member.id, device_id)
        if existing:
            existing.last_activity_at = datetime.datetime.now(datetime.timezone.utc)
            return session_repo.save(existing)

        subscription = SubscriptionRepository(self.db).get_latest_for_member(member.id)
        device_limit = subscription.package.device_limit if subscription else 1
        active_other_devices = session_repo.count_active_excluding_device(member.id, device_id)
        if active_other_devices >= device_limit:
            raise DeviceLimitReachedError(
                f"Device limit reached ({device_limit}). Log out from another device before continuing."
            )

        session = MemberSession(
            member_id=member.id, device_id=device_id, device_name=device_name, ip_address=ip_address, user_agent=user_agent
        )
        return session_repo.create(session)

    def logout_device(self, member: Member, device_id: str) -> None:
        session_repo = MemberSessionRepository(self.db)
        existing = session_repo.get_active_by_device(member.id, device_id)
        if existing:
            existing.status = SessionStatus.LOGGED_OUT
            existing.logout_at = datetime.datetime.now(datetime.timezone.utc)
            session_repo.save(existing)

    def issue_token(self, member: Member, device_id: str) -> str:
        return create_access_token(subject=member.id, extra_claims={"actor": "member", "device_id": device_id})

    def get_dashboard(self, member: Member) -> dict:
        subscription = SubscriptionRepository(self.db).get_latest_for_member(member.id)
        if subscription is None:
            return {"member": member, "subscription": None}

        days_remaining = (subscription.expiry_date - datetime.date.today()).days
        return {
            "member": member,
            "subscription": {
                "package_name": subscription.package.name,
                "status": subscription.status.value,
                "start_date": subscription.start_date.isoformat(),
                "expiry_date": subscription.expiry_date.isoformat(),
                "days_remaining": max(days_remaining, 0),
                "credits_allocated": subscription.credits_allocated,
                "credits_remaining": subscription.credits_remaining,
                "pdf_limit": subscription.pdf_limit,
                "pdf_used": subscription.pdf_used,
                "services": [
                    {"id": ct.id, "name": ct.name, "credit_cost": ct.credit_cost}
                    for ct in subscription.package.services
                    if ct.is_active
                ],
            },
        }

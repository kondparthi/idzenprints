from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.member_auth_middleware import get_current_member
from app.models.member import Member
from app.schemas.credit_transaction import CreditTransactionOut, PdfUsageOut
from app.schemas.member_auth import (
    AccessCheckRequest,
    AccessCheckResponse,
    ConsumeServiceRequest,
    ConsumeServiceResponse,
    CurrentMemberResponse,
    MemberDashboardOut,
    MemberLoginRequest,
    MemberLogoutRequest,
    MemberRegisterRequest,
    MemberTokenResponse,
    RegisterResponse,
)
from app.services.access_control_service import AccessControlService, AccessDeniedError
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.subscription import MemberSubscriptionRequest, SubscriptionOut
from app.services.subscription_service import (
    ActiveSubscriptionExistsError,
    InvalidPackageError,
    PackageNotAvailableForMemberError,
    SubscriptionService,
)
from app.services.member_auth_service import (
    DeviceLimitReachedError,
    DuplicateEmailError,
    DuplicateLoginIdError,
    DuplicatePhoneError,
    MemberAuthError,
    MemberAuthService,
    NoDefaultMemberTypeError,
)

router = APIRouter(prefix="/api/auth/member", tags=["member-auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: MemberRegisterRequest, request: Request, db: Session = Depends(get_db)):
    service = MemberAuthService(db)
    try:
        member = service.register(payload)
    except DuplicateLoginIdError as exc:
        raise HTTPException(status_code=409, detail="That User ID is already taken") from exc
    except DuplicateEmailError as exc:
        raise HTTPException(status_code=409, detail="That email is already registered") from exc
    except DuplicatePhoneError as exc:
        raise HTTPException(status_code=409, detail="That phone number is already registered") from exc
    except NoDefaultMemberTypeError as exc:
        raise HTTPException(
            status_code=503, detail="Registration isn't available right now — please try again shortly"
        ) from exc

    # A brand-new member has no prior sessions, so this always succeeds —
    # still goes through the same path as login for consistency (and so
    # this first device is correctly tracked and counted from day one).
    service.register_device_session(
        member,
        device_id=payload.device_id,
        device_name=payload.device_name,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    token = service.issue_token(member, payload.device_id)
    return RegisterResponse(member=member, access_token=token)


@router.post("/login", response_model=MemberTokenResponse)
def login(payload: MemberLoginRequest, request: Request, db: Session = Depends(get_db)):
    service = MemberAuthService(db)
    try:
        member = service.authenticate(payload.login_id, payload.password)
    except MemberAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    try:
        service.register_device_session(
            member,
            device_id=payload.device_id,
            device_name=payload.device_name,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except DeviceLimitReachedError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    token = service.issue_token(member, payload.device_id)
    return MemberTokenResponse(access_token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: MemberLogoutRequest, current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)
):
    MemberAuthService(db).logout_device(current_member, payload.device_id)


@router.get("/me", response_model=CurrentMemberResponse)
def me(current_member: Member = Depends(get_current_member)):
    return current_member


@router.get("/dashboard", response_model=MemberDashboardOut)
def dashboard(current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)):
    return MemberAuthService(db).get_dashboard(current_member)


@router.post("/check-access", response_model=AccessCheckResponse)
def check_access(
    payload: AccessCheckRequest, current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)
):
    try:
        AccessControlService(db).check_access(current_member, payload.card_type_id, payload.quantity)
        return AccessCheckResponse(allowed=True)
    except AccessDeniedError as exc:
        return AccessCheckResponse(allowed=False, reason_code=exc.reason_code, message=exc.message)


@router.post("/consume", response_model=ConsumeServiceResponse)
def consume_service(
    payload: ConsumeServiceRequest, current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)
):
    try:
        result = AccessControlService(db).consume_service(
            current_member, payload.card_type_id, payload.quantity, payload.reference_id
        )
    except AccessDeniedError as exc:
        raise HTTPException(status_code=402, detail={"reason_code": exc.reason_code, "message": exc.message}) from exc
    return ConsumeServiceResponse(**result)


def _get_own_subscription_id(current_member: Member, db: Session) -> str:
    subscription = SubscriptionRepository(db).get_latest_for_member(current_member.id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found for this account")
    return subscription.id


@router.get("/credit-history", response_model=list[CreditTransactionOut])
def credit_history(current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)):
    """A member's own ledger — same underlying data as the staff-only
    /api/subscriptions/{id}/credit-transactions, but scoped strictly to
    the caller's own subscription (there's no subscription_id in the
    URL a member could tamper with to see someone else's history)."""
    subscription_id = _get_own_subscription_id(current_member, db)
    return SubscriptionService(db).list_credit_transactions(subscription_id)


@router.get("/pdf-usage-history", response_model=list[PdfUsageOut])
def pdf_usage_history(current_member: Member = Depends(get_current_member), db: Session = Depends(get_db)):
    subscription_id = _get_own_subscription_id(current_member, db)
    return SubscriptionService(db).list_pdf_usage(subscription_id)


@router.post("/subscription-request", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
def request_subscription(
    payload: MemberSubscriptionRequest,
    current_member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
):
    """A free member requesting a plan for themselves — always starts
    pending_approval no matter what, and the member is always the
    caller (from the auth token), never something the client picks."""
    try:
        subscription = SubscriptionService(db).create_subscription(current_member.id, payload.package_id)
    except InvalidPackageError as exc:
        raise HTTPException(status_code=400, detail="Select a valid, active package") from exc
    except PackageNotAvailableForMemberError as exc:
        raise HTTPException(status_code=400, detail="That package isn't available for your member type") from exc
    except ActiveSubscriptionExistsError as exc:
        raise HTTPException(
            status_code=409, detail="You already have an active or pending subscription"
        ) from exc
    return subscription

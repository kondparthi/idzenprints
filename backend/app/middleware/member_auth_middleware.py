"""
Member authentication dependency — parallel to auth_middleware.py's
get_current_user, but for the Member actor. Both staff and member
tokens are signed with the same JWT_SECRET, so the {"actor": "member"}
claim is what actually keeps them from being interchangeable: a staff
token presented here (no "actor" claim) is rejected, and a member token
presented to a staff-only endpoint is rejected there for the same
reason (get_current_user never checks for "actor", but the member.id it
would look up simply won't exist in the users table, so it 401s anyway
— this claim check just makes the intent explicit and fails fast).

The token also carries the device_id it was issued for, checked against
an ACTIVE MemberSession on every request — not just at login. Without
this, revoking a device from the Super Admin panel would only stop
*future* logins; the JWT itself, being stateless, would keep working
until it naturally expired. This check is what makes "revoke" actually
take effect immediately.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.member import Member
from app.models.member_session import SessionStatus
from app.repositories.member_repository import MemberRepository
from app.repositories.member_session_repository import MemberSessionRepository
from app.utils.security import decode_access_token

member_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/member/login")


def get_current_member(token: str = Depends(member_oauth2_scheme), db: Session = Depends(get_db)) -> Member:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        member_id = payload.get("sub")
        device_id = payload.get("device_id")
        if member_id is None or payload.get("actor") != "member" or device_id is None:
            raise credentials_error
    except ValueError as exc:
        raise credentials_error from exc

    member = MemberRepository(db).get_by_id(member_id)
    if member is None or not member.is_active:
        raise credentials_error

    session = MemberSessionRepository(db).get_active_by_device(member_id, device_id)
    if session is None or session.status != SessionStatus.ACTIVE:
        raise credentials_error

    return member

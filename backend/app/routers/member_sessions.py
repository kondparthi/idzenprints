"""
Staff-facing device/session management — spec section 12: "Super Admin
should be able to view and revoke active devices/sessions."
"""
import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.member_session import SessionStatus
from app.repositories.member_session_repository import MemberSessionRepository
from app.schemas.member_session import MemberSessionOut
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/members", tags=["member-sessions"], dependencies=[Depends(get_current_user)])


@router.get("/{member_id}/sessions", response_model=list[MemberSessionOut])
def list_sessions(member_id: str, db: Session = Depends(get_db)):
    return MemberSessionRepository(db).list_for_member(member_id)


@router.post("/{member_id}/sessions/{session_id}/revoke", response_model=MemberSessionOut)
def revoke_session(member_id: str, session_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    repo = MemberSessionRepository(db)
    session = repo.get_by_id(session_id)
    if not session or session.member_id != member_id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = SessionStatus.REVOKED
    session.logout_at = datetime.datetime.now(datetime.timezone.utc)
    session = repo.save(session)
    record_audit(db, current_user.id, "revoke", "member_session", session_id, {"member_id": member_id})
    return session

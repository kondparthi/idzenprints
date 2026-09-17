from typing import Optional

from sqlalchemy.orm import Session

from app.models.member_session import MemberSession, SessionStatus


class MemberSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_active_by_device(self, member_id: str, device_id: str) -> Optional[MemberSession]:
        return (
            self.db.query(MemberSession)
            .filter(
                MemberSession.member_id == member_id,
                MemberSession.device_id == device_id,
                MemberSession.status == SessionStatus.ACTIVE,
            )
            .first()
        )

    def count_active_excluding_device(self, member_id: str, device_id: str) -> int:
        return (
            self.db.query(MemberSession)
            .filter(
                MemberSession.member_id == member_id,
                MemberSession.device_id != device_id,
                MemberSession.status == SessionStatus.ACTIVE,
            )
            .count()
        )

    def list_for_member(self, member_id: str) -> list[MemberSession]:
        return (
            self.db.query(MemberSession)
            .filter(MemberSession.member_id == member_id)
            .order_by(MemberSession.login_at.desc())
            .all()
        )

    def get_by_id(self, session_id: str) -> Optional[MemberSession]:
        return self.db.query(MemberSession).filter(MemberSession.id == session_id).first()

    def create(self, session: MemberSession) -> MemberSession:
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def save(self, session: MemberSession) -> MemberSession:
        self.db.commit()
        self.db.refresh(session)
        return session

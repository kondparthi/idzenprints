from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.member import Member


class MemberRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(Member).options(joinedload(Member.member_type))

    def get_by_id(self, member_id: str) -> Optional[Member]:
        return self._base_query().filter(Member.id == member_id).first()

    def get_by_login_id(self, login_id: str) -> Optional[Member]:
        return self.db.query(Member).filter(Member.login_id == login_id).first()

    def get_by_email(self, email: str) -> Optional[Member]:
        return self.db.query(Member).filter(Member.email == email).first()

    def get_by_phone(self, phone: str) -> Optional[Member]:
        return self.db.query(Member).filter(Member.phone == phone).first()

    def save(self, member: Member) -> Member:
        self.db.commit()
        self.db.refresh(member)
        return member

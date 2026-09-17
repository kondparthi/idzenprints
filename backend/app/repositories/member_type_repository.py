from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.member_type import MemberType


class MemberTypeRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(MemberType).options(joinedload(MemberType.card_types))

    def get_by_id(self, member_type_id: str) -> Optional[MemberType]:
        return self._base_query().filter(MemberType.id == member_type_id).first()

    def get_by_ids(self, member_type_ids: list[str]) -> list[MemberType]:
        if not member_type_ids:
            return []
        return self.db.query(MemberType).filter(MemberType.id.in_(member_type_ids)).all()

    def get_by_slug(self, slug: str) -> Optional[MemberType]:
        return self.db.query(MemberType).filter(MemberType.slug == slug).first()

    def list(self) -> list[MemberType]:
        return self._base_query().order_by(MemberType.name).all()

    def create(self, member_type: MemberType) -> MemberType:
        self.db.add(member_type)
        self.db.commit()
        self.db.refresh(member_type)
        return member_type

    def save(self, member_type: MemberType) -> MemberType:
        self.db.commit()
        self.db.refresh(member_type)
        return member_type

    def delete(self, member_type: MemberType) -> None:
        self.db.delete(member_type)
        self.db.commit()

    def count_members(self, member_type_id: str) -> int:
        from app.models.member import Member

        return self.db.query(Member).filter(Member.member_type_id == member_type_id).count()

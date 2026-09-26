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

    def get_default(self) -> Optional[MemberType]:
        """The one used automatically at free/open registration, with no
        member-type picker shown to the visitor. Falls back to the
        earliest-created active type if none has been explicitly marked
        default — registration should still work even if Super Admin
        hasn't set one yet, rather than hard-failing."""
        explicit_default = (
            self.db.query(MemberType).filter(MemberType.is_default.is_(True), MemberType.is_active.is_(True)).first()
        )
        if explicit_default:
            return explicit_default
        return (
            self.db.query(MemberType)
            .filter(MemberType.is_active.is_(True))
            .order_by(MemberType.created_at.asc())
            .first()
        )

    def clear_default_flag(self, except_id: Optional[str] = None) -> None:
        """Only one member type should be the default at a time — call
        this before setting a new one so the old default is unset."""
        query = self.db.query(MemberType).filter(MemberType.is_default.is_(True))
        if except_id:
            query = query.filter(MemberType.id != except_id)
        query.update({MemberType.is_default: False})
        self.db.commit()

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

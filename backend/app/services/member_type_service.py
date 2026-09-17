from sqlalchemy.orm import Session

from app.models.member_type import MemberType
from app.repositories.card_type_repository import CardTypeRepository
from app.repositories.member_type_repository import MemberTypeRepository
from app.schemas.member_type import MemberTypeCreate, MemberTypeUpdate
from app.utils.slugify import slugify


class MemberTypeNotFoundError(Exception):
    pass


class MemberTypeInUseError(Exception):
    """Raised on delete when members still belong to this type."""


class MemberTypeService:
    def __init__(self, db: Session):
        self.repo = MemberTypeRepository(db)
        self.card_type_repo = CardTypeRepository(db)

    def list_member_types(self) -> list[MemberType]:
        return self.repo.list()

    def get_member_type(self, member_type_id: str) -> MemberType:
        member_type = self.repo.get_by_id(member_type_id)
        if not member_type:
            raise MemberTypeNotFoundError(member_type_id)
        return member_type

    def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        slug = base
        suffix = 2
        while self.repo.get_by_slug(slug):
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def create_member_type(self, data: MemberTypeCreate) -> MemberType:
        member_type = MemberType(
            name=data.name, description=data.description, is_active=data.is_active, slug=self._unique_slug(data.name)
        )
        member_type.card_types = self.card_type_repo.get_by_ids(data.service_ids)
        return self.repo.create(member_type)

    def update_member_type(self, member_type_id: str, data: MemberTypeUpdate) -> MemberType:
        member_type = self.get_member_type(member_type_id)
        payload = data.model_dump(exclude={"service_ids"}, exclude_unset=True)
        if "name" in payload and payload["name"] != member_type.name:
            member_type.slug = self._unique_slug(payload["name"])
        for field, value in payload.items():
            setattr(member_type, field, value)
        if data.service_ids is not None:
            member_type.card_types = self.card_type_repo.get_by_ids(data.service_ids)
        return self.repo.save(member_type)

    def delete_member_type(self, member_type_id: str) -> None:
        member_type = self.get_member_type(member_type_id)
        if self.repo.count_members(member_type_id) > 0:
            raise MemberTypeInUseError(member_type_id)
        self.repo.delete(member_type)

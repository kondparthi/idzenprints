from sqlalchemy.orm import Session

from app.models.package import Package
from app.repositories.card_type_repository import CardTypeRepository
from app.repositories.member_type_repository import MemberTypeRepository
from app.repositories.package_repository import PackageRepository
from app.schemas.package import PackageCreate, PackageUpdate
from app.utils.slugify import slugify


class PackageNotFoundError(Exception):
    pass


class PackageInUseError(Exception):
    """Raised on delete when subscriptions already reference this package —
    deleting it would orphan real member history, so it's blocked; the
    operator deactivates it instead (is_active=False keeps it out of new
    registrations without touching existing subscribers)."""


class PackageService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PackageRepository(db)
        self.member_type_repo = MemberTypeRepository(db)
        self.card_type_repo = CardTypeRepository(db)

    def _attach_subscriber_count(self, package: Package) -> Package:
        package.subscriber_count = self.repo.count_subscriptions(package.id)
        return package

    def list_packages(self) -> list[Package]:
        return [self._attach_subscriber_count(p) for p in self.repo.list()]

    def get_package(self, package_id: str) -> Package:
        package = self.repo.get_by_id(package_id)
        if not package:
            raise PackageNotFoundError(package_id)
        return self._attach_subscriber_count(package)

    def list_for_member_type(self, member_type_id: str) -> list[Package]:
        """Used by the public registration flow (a later phase) — only
        active packages assigned to the given member type."""
        return [self._attach_subscriber_count(p) for p in self.repo.list_for_member_type(member_type_id)]

    def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        slug = base
        suffix = 2
        while self.repo.get_by_slug(slug):
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def create_package(self, data: PackageCreate) -> Package:
        package = Package(
            name=data.name,
            slug=self._unique_slug(data.name),
            price=data.price,
            credits=data.credits,
            license_days=data.license_days,
            device_limit=data.device_limit,
            pdf_generation_limit=data.pdf_generation_limit,
            is_active=data.is_active,
        )
        package.member_types = self.member_type_repo.get_by_ids(data.member_type_ids)
        package.card_types = self.card_type_repo.get_by_ids(data.service_ids)
        return self._attach_subscriber_count(self.repo.create(package))

    def update_package(self, package_id: str, data: PackageUpdate) -> Package:
        package = self.repo.get_by_id(package_id)
        if not package:
            raise PackageNotFoundError(package_id)
        payload = data.model_dump(exclude={"member_type_ids", "service_ids"}, exclude_unset=True)
        if "name" in payload and payload["name"] != package.name:
            package.slug = self._unique_slug(payload["name"])
        for field, value in payload.items():
            setattr(package, field, value)
        if data.member_type_ids is not None:
            package.member_types = self.member_type_repo.get_by_ids(data.member_type_ids)
        if data.service_ids is not None:
            package.card_types = self.card_type_repo.get_by_ids(data.service_ids)
        return self._attach_subscriber_count(self.repo.save(package))

    def delete_package(self, package_id: str) -> None:
        package = self.repo.get_by_id(package_id)
        if not package:
            raise PackageNotFoundError(package_id)
        if self.repo.count_subscriptions(package_id) > 0:
            raise PackageInUseError(package_id)
        self.repo.delete(package)

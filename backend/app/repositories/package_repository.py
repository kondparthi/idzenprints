from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.member_type import MemberType
from app.models.package import Package
from app.models.subscription import Subscription


class PackageRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(Package).options(
            joinedload(Package.member_types).joinedload(MemberType.card_types), joinedload(Package.card_types)
        )

    def get_by_id(self, package_id: str) -> Optional[Package]:
        return self._base_query().filter(Package.id == package_id).first()

    def get_by_slug(self, slug: str) -> Optional[Package]:
        return self.db.query(Package).filter(Package.slug == slug).first()

    def list(self) -> list[Package]:
        return self._base_query().order_by(Package.name).all()

    def list_for_member_type(self, member_type_id: str, active_only: bool = True) -> list[Package]:
        query = self._base_query().join(Package.member_types).filter(
            Package.member_types.any(id=member_type_id)
        )
        if active_only:
            query = query.filter(Package.is_active.is_(True))
        return query.order_by(Package.price).all()

    def create(self, package: Package) -> Package:
        self.db.add(package)
        self.db.commit()
        self.db.refresh(package)
        return package

    def save(self, package: Package) -> Package:
        self.db.commit()
        self.db.refresh(package)
        return package

    def delete(self, package: Package) -> None:
        self.db.delete(package)
        self.db.commit()

    def count_subscriptions(self, package_id: str) -> int:
        return self.db.query(Subscription).filter(Subscription.package_id == package_id).count()

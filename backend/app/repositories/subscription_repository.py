from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.package import Package
from app.models.subscription import Subscription, SubscriptionStatus


class SubscriptionRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(Subscription).options(
            joinedload(Subscription.member),
            joinedload(Subscription.package).joinedload(Package.card_types),
            joinedload(Subscription.member_type),
        )

    def get_by_id(self, subscription_id: str) -> Optional[Subscription]:
        return self._base_query().filter(Subscription.id == subscription_id).first()

    def get_latest_for_member(self, member_id: str) -> Optional[Subscription]:
        return (
            self._base_query()
            .filter(Subscription.member_id == member_id)
            .order_by(Subscription.created_at.desc())
            .first()
        )

    def list(self, status_filter: Optional[SubscriptionStatus] = None) -> list[Subscription]:
        query = self._base_query()
        if status_filter:
            query = query.filter(Subscription.status == status_filter)
        return query.order_by(Subscription.created_at.desc()).all()

    def create(self, subscription: Subscription) -> Subscription:
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def save(self, subscription: Subscription) -> Subscription:
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

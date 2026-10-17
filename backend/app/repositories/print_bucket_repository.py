from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.print_bucket_item import PrintBucketItem


class PrintBucketRepository:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _scope(query, owner_member_id: Optional[str]):
        """None = the staff bucket; a member id = that member's own bucket."""
        if owner_member_id is None:
            return query.filter(PrintBucketItem.owner_member_id.is_(None))
        return query.filter(PrintBucketItem.owner_member_id == owner_member_id)

    def get_by_id(self, item_id: str, owner_member_id: Optional[str] = None) -> Optional[PrintBucketItem]:
        query = self._scope(self.db.query(PrintBucketItem), owner_member_id)
        return query.filter(PrintBucketItem.id == item_id).first()

    def get_by_generated_card_id(self, generated_card_id: str) -> Optional[PrintBucketItem]:
        return (
            self.db.query(PrintBucketItem)
            .filter(PrintBucketItem.generated_card_id == generated_card_id)
            .first()
        )

    def list_all(self, owner_member_id: Optional[str] = None) -> list[PrintBucketItem]:
        return (
            self._scope(self.db.query(PrintBucketItem), owner_member_id)
            .options(joinedload(PrintBucketItem.generated_card))
            .order_by(PrintBucketItem.created_at.desc())
            .all()
        )

    def list_by_ids(self, item_ids: list[str], owner_member_id: Optional[str] = None) -> list[PrintBucketItem]:
        return (
            self._scope(self.db.query(PrintBucketItem), owner_member_id)
            .options(joinedload(PrintBucketItem.generated_card))
            .filter(PrintBucketItem.id.in_(item_ids))
            .all()
        )

    def create(self, item: PrintBucketItem) -> PrintBucketItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete(self, item: PrintBucketItem) -> None:
        self.db.delete(item)
        self.db.commit()

    def count(self, owner_member_id: Optional[str] = None) -> int:
        return self._scope(self.db.query(PrintBucketItem), owner_member_id).count()

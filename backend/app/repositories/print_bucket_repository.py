from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.print_bucket_item import PrintBucketItem


class PrintBucketRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, item_id: str) -> Optional[PrintBucketItem]:
        return self.db.query(PrintBucketItem).filter(PrintBucketItem.id == item_id).first()

    def get_by_generated_card_id(self, generated_card_id: str) -> Optional[PrintBucketItem]:
        return (
            self.db.query(PrintBucketItem)
            .filter(PrintBucketItem.generated_card_id == generated_card_id)
            .first()
        )

    def list_all(self) -> list[PrintBucketItem]:
        return (
            self.db.query(PrintBucketItem)
            .options(joinedload(PrintBucketItem.generated_card))
            .order_by(PrintBucketItem.created_at.desc())
            .all()
        )

    def list_by_ids(self, item_ids: list[str]) -> list[PrintBucketItem]:
        return (
            self.db.query(PrintBucketItem)
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

    def count(self) -> int:
        return self.db.query(PrintBucketItem).count()

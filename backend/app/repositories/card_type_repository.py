from typing import Optional

from sqlalchemy.orm import Session

from app.models.card_type import CardType


class CardTypeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, card_type_id: str) -> Optional[CardType]:
        return self.db.query(CardType).filter(CardType.id == card_type_id).first()

    def get_by_ids(self, card_type_ids: list[str]) -> list[CardType]:
        if not card_type_ids:
            return []
        return self.db.query(CardType).filter(CardType.id.in_(card_type_ids)).all()

    def list(self, include_inactive: bool = True) -> list[CardType]:
        query = self.db.query(CardType)
        if not include_inactive:
            query = query.filter(CardType.is_active.is_(True))
        return query.order_by(CardType.name).all()

    def create(self, card_type: CardType) -> CardType:
        self.db.add(card_type)
        self.db.commit()
        self.db.refresh(card_type)
        return card_type

    def save(self, card_type: CardType) -> CardType:
        self.db.commit()
        self.db.refresh(card_type)
        return card_type

    def delete(self, card_type: CardType) -> None:
        self.db.delete(card_type)
        self.db.commit()

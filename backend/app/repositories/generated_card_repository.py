from typing import Optional

from sqlalchemy.orm import Session

from app.models.generated_card import GeneratedCard


class GeneratedCardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, card_id: str) -> Optional[GeneratedCard]:
        return self.db.query(GeneratedCard).filter(GeneratedCard.id == card_id).first()

    def list_for_customer(self, customer_id: str) -> list[GeneratedCard]:
        return (
            self.db.query(GeneratedCard)
            .filter(GeneratedCard.customer_id == customer_id)
            .order_by(GeneratedCard.created_at.desc())
            .all()
        )

    def create(self, card: GeneratedCard) -> GeneratedCard:
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def save(self, card: GeneratedCard) -> GeneratedCard:
        self.db.commit()
        self.db.refresh(card)
        return card

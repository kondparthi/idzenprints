from sqlalchemy.orm import Session

from app.models.card_type import CardType
from app.repositories.card_type_repository import CardTypeRepository
from app.schemas.card_type import CardTypeCreate, CardTypeUpdate


class CardTypeNotFoundError(Exception):
    pass


class CardTypeService:
    def __init__(self, db: Session):
        self.repo = CardTypeRepository(db)

    def list_card_types(self, include_inactive: bool = True) -> list[CardType]:
        return self.repo.list(include_inactive)

    def get_card_type(self, card_type_id: str) -> CardType:
        card_type = self.repo.get_by_id(card_type_id)
        if not card_type:
            raise CardTypeNotFoundError(card_type_id)
        return card_type

    def create_card_type(self, data: CardTypeCreate) -> CardType:
        return self.repo.create(CardType(**data.model_dump()))

    def update_card_type(self, card_type_id: str, data: CardTypeUpdate) -> CardType:
        card_type = self.get_card_type(card_type_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(card_type, field, value)
        return self.repo.save(card_type)

    def delete_card_type(self, card_type_id: str) -> None:
        self.repo.delete(self.get_card_type(card_type_id))

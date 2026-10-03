from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.card_type import CardType
from app.models.uploaded_card import UploadedCard
from app.repositories.uploaded_card_repository import UploadedCardRepository
from app.utils.file_storage import delete_stored_file, save_upload_file


class UploadedCardNotFoundError(Exception):
    pass


class CardTypeNotFoundForUploadError(Exception):
    pass


class UploadedCardService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UploadedCardRepository(db)

    def list_uploaded_cards(self, card_type_id: Optional[str] = None) -> list[UploadedCard]:
        return self.repo.list_all(card_type_id)

    def get_uploaded_card(self, uploaded_card_id: str) -> UploadedCard:
        card = self.repo.get_by_id(uploaded_card_id)
        if not card:
            raise UploadedCardNotFoundError(uploaded_card_id)
        return card

    def create_uploaded_card(
        self,
        card_type_id: str,
        name: str,
        front_file: UploadFile,
        back_file: Optional[UploadFile],
        uploaded_by: Optional[str],
    ) -> UploadedCard:
        card_type = self.db.query(CardType).filter(CardType.id == card_type_id).first()
        if not card_type:
            raise CardTypeNotFoundForUploadError(card_type_id)

        front_relative_path, _size, _mime = save_upload_file(front_file, subdir=f"uploaded_cards/{card_type_id}")
        back_relative_path = None
        if back_file is not None and back_file.filename:
            back_relative_path, _size, _mime = save_upload_file(back_file, subdir=f"uploaded_cards/{card_type_id}")

        card = UploadedCard(
            card_type_id=card_type_id,
            name=name,
            front_image_path=front_relative_path,
            back_image_path=back_relative_path,
            uploaded_by=uploaded_by,
        )
        return self.repo.create(card)

    def delete_uploaded_card(self, uploaded_card_id: str) -> None:
        card = self.get_uploaded_card(uploaded_card_id)
        delete_stored_file(card.front_image_path)
        if card.back_image_path:
            delete_stored_file(card.back_image_path)
        self.repo.delete(card)

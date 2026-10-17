from typing import Optional

from sqlalchemy.orm import Session

from app.models.uploaded_card import UploadedCard


class UploadedCardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, uploaded_card_id: str, owner_member_id: Optional[str] = None) -> Optional[UploadedCard]:
        query = self._scope(self.db.query(UploadedCard), owner_member_id)
        return query.filter(UploadedCard.id == uploaded_card_id).first()

    @staticmethod
    def _scope(query, owner_member_id: Optional[str]):
        """None = the staff library; a member id = that member's private one."""
        if owner_member_id is None:
            return query.filter(UploadedCard.owner_member_id.is_(None))
        return query.filter(UploadedCard.owner_member_id == owner_member_id)

    def list_all(self, card_type_id: Optional[str] = None, owner_member_id: Optional[str] = None) -> list[UploadedCard]:
        query = self._scope(self.db.query(UploadedCard), owner_member_id)
        if card_type_id:
            query = query.filter(UploadedCard.card_type_id == card_type_id)
        return query.order_by(UploadedCard.created_at.desc()).all()

    def list_by_ids(self, uploaded_card_ids: list[str], owner_member_id: Optional[str] = None) -> list[UploadedCard]:
        query = self._scope(self.db.query(UploadedCard), owner_member_id)
        return query.filter(UploadedCard.id.in_(uploaded_card_ids)).all()

    def create(self, uploaded_card: UploadedCard) -> UploadedCard:
        self.db.add(uploaded_card)
        self.db.commit()
        self.db.refresh(uploaded_card)
        return uploaded_card

    def save(self, uploaded_card: UploadedCard) -> UploadedCard:
        self.db.commit()
        self.db.refresh(uploaded_card)
        return uploaded_card

    def delete(self, uploaded_card: UploadedCard) -> None:
        self.db.delete(uploaded_card)
        self.db.commit()

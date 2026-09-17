from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.schemas.card_type import CardTypeCreate, CardTypeOut, CardTypeUpdate
from app.services.card_type_service import CardTypeNotFoundError, CardTypeService

router = APIRouter(prefix="/api/card-types", tags=["card-types"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CardTypeOut])
def list_card_types(db: Session = Depends(get_db)):
    return CardTypeService(db).list_card_types()


@router.post("", response_model=CardTypeOut, status_code=status.HTTP_201_CREATED)
def create_card_type(payload: CardTypeCreate, db: Session = Depends(get_db)):
    return CardTypeService(db).create_card_type(payload)


@router.put("/{card_type_id}", response_model=CardTypeOut)
def update_card_type(card_type_id: str, payload: CardTypeUpdate, db: Session = Depends(get_db)):
    try:
        return CardTypeService(db).update_card_type(card_type_id, payload)
    except CardTypeNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Card type not found") from exc


@router.delete("/{card_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card_type(card_type_id: str, db: Session = Depends(get_db)):
    try:
        CardTypeService(db).delete_card_type(card_type_id)
    except CardTypeNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Card type not found") from exc

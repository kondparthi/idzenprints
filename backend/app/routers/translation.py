"""English -> Telugu conversion for names and addresses (offline), plus
"learn from my correction" so the same word is fixed automatically next time."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.services.telugu_service import TeluguService

router = APIRouter(prefix="/api/translation", tags=["translation"], dependencies=[Depends(get_current_user)])


class ConvertRequest(BaseModel):
    name: str | None = Field(default=None, max_length=300)
    address: str | None = Field(default=None, max_length=2000)


class ConvertResponse(BaseModel):
    name_local: str
    address_local: str


class LearnRequest(BaseModel):
    name: str | None = None
    name_local: str | None = None
    address: str | None = None
    address_local: str | None = None


@router.post("/telugu", response_model=ConvertResponse)
def to_telugu(payload: ConvertRequest, db: Session = Depends(get_db)):
    service = TeluguService(db)
    return ConvertResponse(name_local=service.convert(payload.name), address_local=service.convert(payload.address))


@router.post("/telugu/learn")
def learn(payload: LearnRequest, db: Session = Depends(get_db)):
    service = TeluguService(db)
    learned = service.learn(payload.name, payload.name_local) + service.learn(payload.address, payload.address_local)
    return {"learned": learned}

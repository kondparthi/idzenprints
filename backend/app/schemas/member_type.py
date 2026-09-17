from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.card_type import CardTypeOut


class MemberTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True
    service_ids: list[str] = Field(default_factory=list)


class MemberTypeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    service_ids: Optional[list[str]] = None


class MemberTypeOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    is_active: bool
    services: list[CardTypeOut]

    class Config:
        from_attributes = True

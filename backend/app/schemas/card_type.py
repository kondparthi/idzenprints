from typing import Optional

from pydantic import BaseModel, Field


class CardTypeBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: bool = True
    # credit_cost (added for the Subscription & Package module) is how
    # many credits a member's subscription is debited for generating one
    # of this card type — see app/models/card_type.py's docstring.
    credit_cost: int = Field(default=1, ge=0)


class CardTypeCreate(CardTypeBase):
    pass


class CardTypeUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    credit_cost: Optional[int] = Field(default=None, ge=0)


class CardTypeOut(CardTypeBase):
    id: str

    class Config:
        from_attributes = True

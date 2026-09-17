from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.card_type import CardTypeOut
from app.schemas.member_type import MemberTypeOut


class PackageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: Decimal = Field(ge=0)
    credits: int = Field(ge=0)
    license_days: int = Field(gt=0)
    device_limit: int = Field(default=1, ge=1)
    pdf_generation_limit: int = Field(ge=0)
    is_active: bool = True
    member_type_ids: list[str] = Field(default_factory=list)
    service_ids: list[str] = Field(default_factory=list)


class PackageUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(default=None, ge=0)
    credits: Optional[int] = Field(default=None, ge=0)
    license_days: Optional[int] = Field(default=None, gt=0)
    device_limit: Optional[int] = Field(default=None, ge=1)
    pdf_generation_limit: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    member_type_ids: Optional[list[str]] = None
    service_ids: Optional[list[str]] = None


class PackageOut(BaseModel):
    id: str
    name: str
    slug: str
    price: Decimal
    credits: int
    license_days: int
    device_limit: int
    pdf_generation_limit: int
    is_active: bool
    member_types: list[MemberTypeOut]
    services: list[CardTypeOut]
    subscriber_count: int = 0

    class Config:
        from_attributes = True

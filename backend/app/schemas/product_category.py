from typing import Optional

from pydantic import BaseModel, Field


class ProductCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: bool = True


class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None


class ProductCategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

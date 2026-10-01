from typing import Any, Optional

from pydantic import BaseModel, Field


class TemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    card_type_id: str
    width_mm: float = Field(default=85.60, gt=0)
    height_mm: float = Field(default=53.98, gt=0)
    dpi: int = Field(default=300, gt=0)
    elements: list[dict[str, Any]] = Field(default_factory=list)
    # Optional back side — empty list means "no back design yet / front-only".
    back_elements: list[dict[str, Any]] = Field(default_factory=list)


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    card_type_id: Optional[str] = None
    width_mm: Optional[float] = Field(default=None, gt=0)
    height_mm: Optional[float] = Field(default=None, gt=0)
    dpi: Optional[int] = Field(default=None, gt=0)
    elements: Optional[list[dict[str, Any]]] = None
    back_elements: Optional[list[dict[str, Any]]] = None
    is_active: Optional[bool] = None


class TemplateOut(TemplateBase):
    id: str
    background_path: Optional[str]
    back_background_path: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

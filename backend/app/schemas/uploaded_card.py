from typing import Optional

from pydantic import BaseModel, Field


class UploadedCardOut(BaseModel):
    id: str
    card_type_id: str
    name: str
    has_back: bool = False
    width_mm: float
    height_mm: float

    class Config:
        from_attributes = True


class PrintSheetItemRequest(BaseModel):
    uploaded_card_id: str
    copies: int = Field(default=1, ge=1, le=100)


class UploadedCardPrintSheetRequest(BaseModel):
    items: list[PrintSheetItemRequest]
    paper_size: str = Field(default="a4")

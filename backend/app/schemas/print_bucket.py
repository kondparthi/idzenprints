from datetime import datetime

from pydantic import BaseModel


class AddToBucketRequest(BaseModel):
    generated_card_id: str


class PrintBucketItemOut(BaseModel):
    id: str
    generated_card_id: str
    customer_id: str
    customer_name: str
    template_id: str
    template_name: str
    has_back: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PrintSheetRequest(BaseModel):
    item_ids: list[str]
    paper_size: str = "a4"

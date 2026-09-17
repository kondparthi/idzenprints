from typing import Optional

from pydantic import BaseModel, Field

from app.models.order import OrderStatus


class OrderCreate(BaseModel):
    customer_id: str
    card_type_id: str
    template_id: Optional[str] = None
    quantity: int = Field(default=1, gt=0)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderOut(BaseModel):
    id: str
    customer_id: str
    card_type_id: str
    template_id: Optional[str]
    quantity: int
    status: OrderStatus
    created_by: Optional[str]

    class Config:
        from_attributes = True

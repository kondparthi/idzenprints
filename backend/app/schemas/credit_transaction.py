import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.credit_transaction import CreditTransactionType


class CreditTransactionOut(BaseModel):
    id: str
    subscription_id: str
    transaction_type: CreditTransactionType
    amount: int
    balance_after: int
    reference_type: Optional[str]
    reference_id: Optional[str]
    description: Optional[str]
    created_by: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class CreditAdjustmentRequest(BaseModel):
    amount: int  # signed: positive to add credits, negative to remove
    description: str = Field(min_length=1, max_length=500)


class PdfUsageOut(BaseModel):
    id: str
    subscription_id: str
    order_id: Optional[str]
    card_type_id: str
    card_type_name: str
    quantity: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

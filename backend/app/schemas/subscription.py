import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.subscription import SubscriptionStatus


class SubscriptionStatusUpdate(BaseModel):
    status: SubscriptionStatus


class SubscriptionOut(BaseModel):
    id: str
    member_id: str
    member_name: str
    member_login_id: str
    package_id: str
    package_name: str
    member_type_id: str
    member_type_name: str
    start_date: datetime.date
    expiry_date: datetime.date
    credits_allocated: int
    credits_remaining: int
    pdf_limit: int
    pdf_used: int
    status: SubscriptionStatus

    class Config:
        from_attributes = True

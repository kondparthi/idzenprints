import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.subscription import SubscriptionStatus


class SubscriptionStatusUpdate(BaseModel):
    status: SubscriptionStatus


class SubscriptionCreateRequest(BaseModel):
    """Staff-initiated — picks the member explicitly."""

    member_id: str
    package_id: str
    status: SubscriptionStatus = SubscriptionStatus.PENDING_APPROVAL


class MemberSubscriptionRequest(BaseModel):
    """Member self-service — the member is always the caller
    themselves (from the auth token), never a client-supplied id, and
    the result always starts pending_approval regardless of what's
    passed — a member can request a plan, not grant themselves one."""

    package_id: str


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

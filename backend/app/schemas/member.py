import datetime
from typing import Optional

from pydantic import BaseModel


class MemberTypeBrief(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class MemberListOut(BaseModel):
    id: str
    full_name: str
    login_id: str
    email: str
    phone: str
    member_type: MemberTypeBrief
    is_active: bool
    created_at: datetime.datetime
    has_subscription: bool
    subscription_status: Optional[str] = None

    class Config:
        from_attributes = True


class MemberTypeReassign(BaseModel):
    member_type_id: str


class MemberStatusUpdate(BaseModel):
    is_active: bool

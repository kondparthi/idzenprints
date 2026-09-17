import datetime
from typing import Optional

from pydantic import BaseModel


class MemberSessionOut(BaseModel):
    id: str
    member_id: str
    device_id: str
    device_name: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    login_at: datetime.datetime
    last_activity_at: Optional[datetime.datetime]
    logout_at: Optional[datetime.datetime]
    status: str

    class Config:
        from_attributes = True

import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.member_type import MemberTypeOut

_PHONE_PATTERN = re.compile(r"^\+?\d{10,15}$")


class MemberRegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    phone: str
    email: EmailStr
    login_id: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    member_type_id: str
    package_id: str
    agree_terms: bool
    agree_privacy: bool
    device_id: str
    device_name: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        cleaned = value.strip()
        if not _PHONE_PATTERN.match(cleaned):
            raise ValueError("Enter a valid phone number (10-15 digits, optional leading +)")
        return cleaned

    @field_validator("login_id")
    @classmethod
    def _validate_login_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.match(r"^[a-zA-Z0-9_.-]+$", cleaned):
            raise ValueError("User ID can only contain letters, numbers, dots, hyphens, and underscores")
        return cleaned

    @model_validator(mode="after")
    def _validate_terms(self) -> "MemberRegisterRequest":
        if not self.agree_terms:
            raise ValueError("You must agree to the Terms & Conditions")
        if not self.agree_privacy:
            raise ValueError("You must agree to the Privacy Policy")
        return self


class MemberLoginRequest(BaseModel):
    login_id: str
    password: str
    device_id: str
    device_name: Optional[str] = None


class MemberTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MemberLogoutRequest(BaseModel):
    device_id: str


class CurrentMemberResponse(BaseModel):
    id: str
    full_name: str
    phone: str
    email: EmailStr
    login_id: str
    is_active: bool
    member_type: MemberTypeOut

    class Config:
        from_attributes = True


class RegisterResponse(BaseModel):
    member: CurrentMemberResponse
    subscription_status: str
    access_token: str
    token_type: str = "bearer"


class DashboardServiceOut(BaseModel):
    id: str
    name: str
    credit_cost: int


class DashboardSubscriptionOut(BaseModel):
    package_name: str
    status: str
    start_date: str
    expiry_date: str
    days_remaining: int
    credits_allocated: int
    credits_remaining: int
    pdf_limit: int
    pdf_used: int
    services: list[DashboardServiceOut]


class MemberDashboardOut(BaseModel):
    member: CurrentMemberResponse
    subscription: Optional[DashboardSubscriptionOut]


class ConsumeServiceRequest(BaseModel):
    card_type_id: str
    quantity: int = Field(default=1, ge=1)
    reference_id: Optional[str] = None


class ConsumeServiceResponse(BaseModel):
    already_processed: bool
    credits_remaining: int
    pdf_used: int
    transaction_id: str


class AccessCheckRequest(BaseModel):
    card_type_id: str
    quantity: int = Field(default=1, ge=1)


class AccessCheckResponse(BaseModel):
    allowed: bool
    reason_code: Optional[str] = None
    message: Optional[str] = None

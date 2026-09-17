from typing import Optional

from pydantic import BaseModel


class CustomerDetailsOut(BaseModel):
    id: str
    customer_id: str
    document_id: Optional[str]
    name: Optional[str]
    name_local: Optional[str]
    dob: Optional[str]
    gender: Optional[str]
    address: Optional[str]
    address_local: Optional[str]
    document_number: Optional[str]
    vid_number: Optional[str]
    photo_path: Optional[str]
    is_verified: bool

    class Config:
        from_attributes = True


class CustomerDetailsUpdate(BaseModel):
    name: Optional[str] = None
    name_local: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    address_local: Optional[str] = None
    document_number: Optional[str] = None
    vid_number: Optional[str] = None
    is_verified: Optional[bool] = None

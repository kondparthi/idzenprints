from typing import Optional

from pydantic import BaseModel

from app.models.document import DocumentStatus, DocumentType


class DocumentOut(BaseModel):
    id: str
    customer_id: str
    document_type: DocumentType
    status: DocumentStatus
    original_filename: str
    mime_type: Optional[str]
    file_size: int
    has_back: bool = False
    back_mime_type: Optional[str] = None
    processing_error: Optional[str] = None
    ocr_raw_text: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentProcessRequest(BaseModel):
    """Only needed for a password-protected PDF — every other file type
    ignores this entirely."""

    password: Optional[str] = None

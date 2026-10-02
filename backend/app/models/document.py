"""
Document model — an uploaded source file (Aadhaar, FSC, ID card, etc.)
belonging to a customer, waiting for or having gone through OCR.
"""
import enum

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column


class DocumentType(str, enum.Enum):
    AADHAAR = "aadhaar"
    FSC = "fsc"
    EMPLOYEE_ID = "employee_id"
    STUDENT_ID = "student_id"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id = uuid_column()
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = str_enum(DocumentType, nullable=False, default=DocumentType.OTHER)
    status = str_enum(DocumentStatus, nullable=False, default=DocumentStatus.UPLOADED)

    original_filename = Column(String(255), nullable=False)
    # Path relative to settings.UPLOAD_DIR — never a publicly reachable URL.
    stored_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=False)

    # Optional second side (e.g. the back of an Aadhaar card) — address and
    # other fields often only appear on the back, so OCR runs on both sides
    # and merges the text before extracting fields.
    back_original_filename = Column(String(255), nullable=True)
    back_stored_path = Column(String(500), nullable=True)
    back_mime_type = Column(String(100), nullable=True)
    back_file_size = Column(Integer, nullable=True)

    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    processing_error = Column(Text, nullable=True)
    # The raw, unparsed OCR text (front+back merged) from the most recent
    # "Run OCR" — kept so staff (and whoever is debugging a bad extraction)
    # can see exactly what Tesseract actually read, without needing a
    # screenshot of the card to reconstruct it.
    ocr_raw_text = Column(Text, nullable=True)

    customer = relationship("Customer", backref="documents")

    @property
    def has_back(self) -> bool:
        return bool(self.back_stored_path)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Document {self.original_filename} ({self.status})>"

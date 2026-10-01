"""
CustomerDetails — the (initially OCR-extracted, always operator-verifiable)
identity fields for a customer, sourced from one uploaded Document.

dob and gender are stored as free-text rather than typed date/enum columns
on purpose: OCR output is messy (partial dates, inconsistent gender labels)
and the operator must be able to save a correction without the form
rejecting an in-progress edit.
"""
from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class CustomerDetails(Base, TimestampMixin):
    __tablename__ = "customer_details"

    id = uuid_column()
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(150), nullable=True)
    name_local = Column(String(150), nullable=True)
    dob = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    address_local = Column(Text, nullable=True)
    document_number = Column(String(50), nullable=True)
    vid_number = Column(String(50), nullable=True)
    # "Aadhaar no. issued: <date>" (front) / "Details as on: <date>" (back)
    # — free-text like dob, for the same reason: OCR output is messy and
    # an operator must be able to save a partial correction.
    issue_date = Column(String(20), nullable=True)
    details_as_on = Column(String(20), nullable=True)
    # Path relative to settings.UPLOAD_DIR — never a publicly reachable URL.
    photo_path = Column(String(500), nullable=True)

    is_verified = Column(Boolean, nullable=False, default=False)
    verified_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    customer = relationship("Customer", backref="details")
    document = relationship("Document", backref="extracted_details")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CustomerDetails for customer={self.customer_id} verified={self.is_verified}>"

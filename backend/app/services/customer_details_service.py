"""
Business logic for the operator's manual-correction step on OCR output.
"""
from sqlalchemy.orm import Session

from app.models.customer_details import CustomerDetails
from app.repositories.customer_details_repository import CustomerDetailsRepository
from app.schemas.customer_details import CustomerDetailsUpdate


class CustomerDetailsNotFoundError(Exception):
    pass


class CustomerDetailsService:
    def __init__(self, db: Session):
        self.repo = CustomerDetailsRepository(db)

    def get(self, details_id: str) -> CustomerDetails:
        details = self.repo.get_by_id(details_id)
        if not details:
            raise CustomerDetailsNotFoundError(details_id)
        return details

    def list_for_customer(self, customer_id: str) -> list[CustomerDetails]:
        return self.repo.list_for_customer(customer_id)

    def update(self, details_id: str, data: CustomerDetailsUpdate, verified_by: str) -> CustomerDetails:
        details = self.get(details_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(details, field, value)
        if data.is_verified:
            details.verified_by = verified_by
        return self.repo.save(details)

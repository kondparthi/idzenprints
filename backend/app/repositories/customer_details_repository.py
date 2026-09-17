from typing import Optional

from sqlalchemy.orm import Session

from app.models.customer_details import CustomerDetails


class CustomerDetailsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, details_id: str) -> Optional[CustomerDetails]:
        return self.db.query(CustomerDetails).filter(CustomerDetails.id == details_id).first()

    def get_by_document_id(self, document_id: str) -> Optional[CustomerDetails]:
        return self.db.query(CustomerDetails).filter(CustomerDetails.document_id == document_id).first()

    def list_for_customer(self, customer_id: str) -> list[CustomerDetails]:
        return (
            self.db.query(CustomerDetails)
            .filter(CustomerDetails.customer_id == customer_id)
            .order_by(CustomerDetails.created_at.desc())
            .all()
        )

    def create(self, details: CustomerDetails) -> CustomerDetails:
        self.db.add(details)
        self.db.commit()
        self.db.refresh(details)
        return details

    def save(self, details: CustomerDetails) -> CustomerDetails:
        self.db.commit()
        self.db.refresh(details)
        return details

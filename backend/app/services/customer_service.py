"""
Business logic for customers — thin for now, but this is where rules like
duplicate-mobile checks or order-history assembly will live as the app grows.
"""
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerNotFoundError(Exception):
    pass


class CustomerService:
    def __init__(self, db: Session):
        self.repo = CustomerRepository(db)

    def list_customers(self, search: str | None, page: int, page_size: int):
        return self.repo.list(search=search, page=page, page_size=page_size)

    def get_customer(self, customer_id: str) -> Customer:
        customer = self.repo.get_by_id(customer_id)
        if not customer:
            raise CustomerNotFoundError(customer_id)
        return customer

    def create_customer(self, data: CustomerCreate) -> Customer:
        customer = Customer(**data.model_dump())
        return self.repo.create(customer)

    def update_customer(self, customer_id: str, data: CustomerUpdate) -> Customer:
        customer = self.get_customer(customer_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(customer, field, value)
        return self.repo.update(customer)

    def delete_customer(self, customer_id: str) -> None:
        customer = self.get_customer(customer_id)
        self.repo.delete(customer)

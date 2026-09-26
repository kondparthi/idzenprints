"""
Data-access layer for Customer — CRUD + simple name/mobile search.
"""
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.customer import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, customer_id: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_by_owner_member_id(self, member_id: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.owner_member_id == member_id).first()

    def list(self, search: Optional[str], page: int, page_size: int) -> tuple[list[Customer], int]:
        query = self.db.query(Customer)
        if search:
            like = f"%{search}%"
            query = query.filter(or_(Customer.name.ilike(like), Customer.mobile.ilike(like)))
        total = query.count()
        items = (
            query.order_by(Customer.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def update(self, customer: Customer) -> Customer:
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def delete(self, customer: Customer) -> None:
        self.db.delete(customer)
        self.db.commit()

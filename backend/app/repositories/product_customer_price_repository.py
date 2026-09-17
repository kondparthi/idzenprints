from typing import Optional

from sqlalchemy.orm import Session

from app.models.product_customer_price import ProductCustomerPrice


class ProductCustomerPriceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, price_id: str) -> Optional[ProductCustomerPrice]:
        return self.db.query(ProductCustomerPrice).filter(ProductCustomerPrice.id == price_id).first()

    def get_for_product_and_customer(self, product_id: str, customer_id: str) -> Optional[ProductCustomerPrice]:
        return (
            self.db.query(ProductCustomerPrice)
            .filter(ProductCustomerPrice.product_id == product_id, ProductCustomerPrice.customer_id == customer_id)
            .first()
        )

    def list_for_product(self, product_id: str) -> list[ProductCustomerPrice]:
        return self.db.query(ProductCustomerPrice).filter(ProductCustomerPrice.product_id == product_id).all()

    def create(self, price: ProductCustomerPrice) -> ProductCustomerPrice:
        self.db.add(price)
        self.db.commit()
        self.db.refresh(price)
        return price

    def save(self, price: ProductCustomerPrice) -> ProductCustomerPrice:
        self.db.commit()
        self.db.refresh(price)
        return price

    def delete(self, price: ProductCustomerPrice) -> None:
        self.db.delete(price)
        self.db.commit()

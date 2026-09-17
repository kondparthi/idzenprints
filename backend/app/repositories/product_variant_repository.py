from typing import Optional

from sqlalchemy.orm import Session

from app.models.product_variant import ProductVariant


class ProductVariantRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, variant_id: str) -> Optional[ProductVariant]:
        return self.db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()

    def get_by_sku(self, sku: str) -> Optional[ProductVariant]:
        return self.db.query(ProductVariant).filter(ProductVariant.sku == sku).first()

    def list_for_product(self, product_id: str) -> list[ProductVariant]:
        return self.db.query(ProductVariant).filter(ProductVariant.product_id == product_id).all()

    def create(self, variant: ProductVariant) -> ProductVariant:
        self.db.add(variant)
        self.db.commit()
        self.db.refresh(variant)
        return variant

    def save(self, variant: ProductVariant) -> ProductVariant:
        self.db.commit()
        self.db.refresh(variant)
        return variant

    def delete(self, variant: ProductVariant) -> None:
        self.db.delete(variant)
        self.db.commit()

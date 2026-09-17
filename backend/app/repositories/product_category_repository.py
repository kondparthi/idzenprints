from typing import Optional

from sqlalchemy.orm import Session

from app.models.product_category import ProductCategory


class ProductCategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, category_id: str) -> Optional[ProductCategory]:
        return self.db.query(ProductCategory).filter(ProductCategory.id == category_id).first()

    def get_by_slug(self, slug: str) -> Optional[ProductCategory]:
        return self.db.query(ProductCategory).filter(ProductCategory.slug == slug).first()

    def list(self) -> list[ProductCategory]:
        return self.db.query(ProductCategory).order_by(ProductCategory.name).all()

    def create(self, category: ProductCategory) -> ProductCategory:
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def save(self, category: ProductCategory) -> ProductCategory:
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category: ProductCategory) -> None:
        self.db.delete(category)
        self.db.commit()

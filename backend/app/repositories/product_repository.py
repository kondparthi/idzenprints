from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.product import Product, ProductStatus, ProductVisibility


class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def _base_query(self):
        return self.db.query(Product).options(
            joinedload(Product.tags), joinedload(Product.images), joinedload(Product.variants)
        )

    def get_by_id(self, product_id: str) -> Optional[Product]:
        return self._base_query().filter(Product.id == product_id).first()

    def get_by_sku(self, sku: str) -> Optional[Product]:
        return self.db.query(Product).filter(Product.sku == sku).first()

    def list(
        self,
        search: Optional[str] = None,
        status_filter: Optional[ProductStatus] = None,
        category_id: Optional[str] = None,
        brand_id: Optional[str] = None,
        visibility_in: Optional[list[ProductVisibility]] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Product], int]:
        query = self._base_query()
        if search:
            like = f"%{search}%"
            query = query.filter((Product.name.ilike(like)) | (Product.sku.ilike(like)))
        if status_filter:
            query = query.filter(Product.status == status_filter)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if brand_id:
            query = query.filter(Product.brand_id == brand_id)
        if visibility_in:
            query = query.filter(Product.visibility.in_(visibility_in))
        total = query.distinct().count()
        items = (
            query.order_by(Product.created_at.desc())
            .distinct()
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def create(self, product: Product) -> Product:
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def save(self, product: Product) -> Product:
        self.db.commit()
        self.db.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        self.db.delete(product)
        self.db.commit()

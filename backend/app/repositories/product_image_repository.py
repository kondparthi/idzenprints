from typing import Optional

from sqlalchemy.orm import Session

from app.models.product_image import ProductImage


class ProductImageRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, image_id: str) -> Optional[ProductImage]:
        return self.db.query(ProductImage).filter(ProductImage.id == image_id).first()

    def list_for_product(self, product_id: str) -> list[ProductImage]:
        return (
            self.db.query(ProductImage)
            .filter(ProductImage.product_id == product_id)
            .order_by(ProductImage.sort_order)
            .all()
        )

    def create(self, image: ProductImage) -> ProductImage:
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def save(self, image: ProductImage) -> ProductImage:
        self.db.commit()
        self.db.refresh(image)
        return image

    def delete(self, image: ProductImage) -> None:
        self.db.delete(image)
        self.db.commit()

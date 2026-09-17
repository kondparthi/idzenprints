from typing import Optional

from sqlalchemy.orm import Session

from app.models.brand import Brand


class BrandRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, brand_id: str) -> Optional[Brand]:
        return self.db.query(Brand).filter(Brand.id == brand_id).first()

    def get_by_slug(self, slug: str) -> Optional[Brand]:
        return self.db.query(Brand).filter(Brand.slug == slug).first()

    def list(self) -> list[Brand]:
        return self.db.query(Brand).order_by(Brand.name).all()

    def create(self, brand: Brand) -> Brand:
        self.db.add(brand)
        self.db.commit()
        self.db.refresh(brand)
        return brand

    def save(self, brand: Brand) -> Brand:
        self.db.commit()
        self.db.refresh(brand)
        return brand

    def delete(self, brand: Brand) -> None:
        self.db.delete(brand)
        self.db.commit()

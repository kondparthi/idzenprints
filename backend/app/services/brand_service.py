from sqlalchemy.orm import Session

from app.models.brand import Brand
from app.repositories.brand_repository import BrandRepository
from app.schemas.brand import BrandCreate, BrandUpdate
from app.utils.slugify import slugify


class BrandNotFoundError(Exception):
    pass


class BrandService:
    def __init__(self, db: Session):
        self.repo = BrandRepository(db)

    def list_brands(self) -> list[Brand]:
        return self.repo.list()

    def get_brand(self, brand_id: str) -> Brand:
        brand = self.repo.get_by_id(brand_id)
        if not brand:
            raise BrandNotFoundError(brand_id)
        return brand

    def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        slug = base
        suffix = 2
        while self.repo.get_by_slug(slug):
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def create_brand(self, data: BrandCreate) -> Brand:
        brand = Brand(**data.model_dump(), slug=self._unique_slug(data.name))
        return self.repo.create(brand)

    def update_brand(self, brand_id: str, data: BrandUpdate) -> Brand:
        brand = self.get_brand(brand_id)
        payload = data.model_dump(exclude_unset=True)
        if "name" in payload and payload["name"] != brand.name:
            brand.slug = self._unique_slug(payload["name"])
        for field, value in payload.items():
            setattr(brand, field, value)
        return self.repo.save(brand)

    def delete_brand(self, brand_id: str) -> None:
        self.repo.delete(self.get_brand(brand_id))

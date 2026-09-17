from sqlalchemy.orm import Session

from app.models.product_category import ProductCategory
from app.repositories.product_category_repository import ProductCategoryRepository
from app.schemas.product_category import ProductCategoryCreate, ProductCategoryUpdate
from app.utils.slugify import slugify


class ProductCategoryNotFoundError(Exception):
    pass


class ProductCategoryService:
    def __init__(self, db: Session):
        self.repo = ProductCategoryRepository(db)

    def list_categories(self) -> list[ProductCategory]:
        return self.repo.list()

    def get_category(self, category_id: str) -> ProductCategory:
        category = self.repo.get_by_id(category_id)
        if not category:
            raise ProductCategoryNotFoundError(category_id)
        return category

    def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        slug = base
        suffix = 2
        while self.repo.get_by_slug(slug):
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def create_category(self, data: ProductCategoryCreate) -> ProductCategory:
        category = ProductCategory(**data.model_dump(), slug=self._unique_slug(data.name))
        return self.repo.create(category)

    def update_category(self, category_id: str, data: ProductCategoryUpdate) -> ProductCategory:
        category = self.get_category(category_id)
        payload = data.model_dump(exclude_unset=True)
        if "name" in payload and payload["name"] != category.name:
            category.slug = self._unique_slug(payload["name"])
        for field, value in payload.items():
            setattr(category, field, value)
        return self.repo.save(category)

    def delete_category(self, category_id: str) -> None:
        self.repo.delete(self.get_category(category_id))

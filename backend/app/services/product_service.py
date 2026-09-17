"""
Business logic for products: CRUD, publish/unpublish, duplicate, and the
image/variant sub-resources.
"""
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.product import Product, ProductStatus, StockStatus
from app.services.inventory_service import derive_stock_status
from app.models.product_bulk_pricing import ProductBulkPricingTier
from app.models.product_image import ProductImage
from app.models.product_variant import ProductVariant
from app.repositories.product_image_repository import ProductImageRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.product_variant_repository import ProductVariantRepository
from app.repositories.tag_repository import TagRepository
from app.schemas.product import ProductCreate, ProductUpdate, ProductVariantCreate
from app.utils.file_storage import delete_stored_file, save_upload_file


class ProductNotFoundError(Exception):
    pass


class DuplicateSkuError(Exception):
    pass


class ImageNotFoundError(Exception):
    pass


class VariantNotFoundError(Exception):
    pass


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductRepository(db)
        self.image_repo = ProductImageRepository(db)
        self.variant_repo = ProductVariantRepository(db)
        self.tag_repo = TagRepository(db)

    def list_products(self, **filters) -> tuple[list[Product], int]:
        return self.repo.list(**filters)

    def get_product(self, product_id: str) -> Product:
        product = self.repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundError(product_id)
        return product

    def create_product(self, data: ProductCreate, created_by: Optional[str]) -> Product:
        if self.repo.get_by_sku(data.sku):
            raise DuplicateSkuError(data.sku)
        payload = data.model_dump(exclude={"tag_ids"})
        product = Product(**payload, created_by=created_by)
        product.tags = self.tag_repo.get_by_ids(data.tag_ids)
        return self.repo.create(product)

    def update_product(self, product_id: str, data: ProductUpdate) -> Product:
        product = self.get_product(product_id)
        payload = data.model_dump(exclude={"tag_ids"}, exclude_unset=True)
        if "sku" in payload and payload["sku"] != product.sku:
            if self.repo.get_by_sku(payload["sku"]):
                raise DuplicateSkuError(payload["sku"])
        for field, value in payload.items():
            setattr(product, field, value)
        if data.tag_ids is not None:
            product.tags = self.tag_repo.get_by_ids(data.tag_ids)
        return self.repo.save(product)

    def set_status(self, product_id: str, status: ProductStatus) -> Product:
        product = self.get_product(product_id)
        product.status = status
        return self.repo.save(product)

    def duplicate_product(self, product_id: str, created_by: Optional[str]) -> Product:
        """Copies the product's fields, category/brand, and tags. Images
        aren't copied (avoids either duplicating files on disk or two
        products silently sharing — and risking breaking — the same
        stored file); the operator re-uploads for the copy."""
        source = self.get_product(product_id)
        base_sku = f"{source.sku}-copy"
        sku = base_sku
        suffix = 2
        while self.repo.get_by_sku(sku):
            sku = f"{base_sku}-{suffix}"
            suffix += 1

        copy = Product(
            name=f"{source.name} (copy)",
            sku=sku,
            description=source.description,
            short_description=source.short_description,
            category_id=source.category_id,
            brand_id=source.brand_id,
            product_type=source.product_type,
            status=ProductStatus.DRAFT,
            visibility=source.visibility,
            is_featured=False,
            created_by=created_by,
            regular_price=source.regular_price,
            sale_price=source.sale_price,
            sale_start_date=source.sale_start_date,
            sale_end_date=source.sale_end_date,
            cost_price=source.cost_price,
            tax_status=source.tax_status,
            tax_class=source.tax_class,
            min_quantity=source.min_quantity,
            max_quantity=source.max_quantity,
            # Inventory policy carries over; actual stock state does not —
            # a duplicated product hasn't got any real stock yet, so it
            # starts at 0 (auto-deriving to out_of_stock/on_backorder) even
            # if the source had 40 units sitting in a warehouse.
            manage_stock=source.manage_stock,
            stock_quantity=0 if source.manage_stock else None,
            stock_status=derive_stock_status(0, source.backorders) if source.manage_stock else StockStatus.IN_STOCK,
            low_stock_threshold=source.low_stock_threshold,
            backorders=source.backorders,
        )
        copy.tags = list(source.tags)
        created = self.repo.create(copy)

        # Bulk pricing tiers are general pricing policy, so they carry
        # over; customer-specific price overrides deliberately do NOT —
        # those are tied to a negotiated relationship on the *original*
        # SKU, not something to silently extend to a new one.
        for tier in source.bulk_pricing_tiers:
            self.db.add(
                ProductBulkPricingTier(
                    product_id=created.id,
                    min_quantity=tier.min_quantity,
                    max_quantity=tier.max_quantity,
                    price=tier.price,
                )
            )
        self.db.commit()
        self.db.refresh(created)
        return created

    def delete_product(self, product_id: str) -> None:
        product = self.get_product(product_id)
        for image in list(product.images):
            delete_stored_file(image.stored_path)
        self.repo.delete(product)

    # ---------- Images ----------

    def add_image(self, product_id: str, file: UploadFile, is_primary: bool) -> ProductImage:
        product = self.get_product(product_id)
        relative_path, _size, mime_type = save_upload_file(file, subdir=f"products/{product_id}")

        if is_primary:
            for existing in self.image_repo.list_for_product(product_id):
                if existing.is_primary:
                    existing.is_primary = False
                    self.image_repo.save(existing)

        existing_count = len(self.image_repo.list_for_product(product_id))
        image = ProductImage(
            product_id=product.id,
            stored_path=relative_path,
            original_filename=file.filename,
            mime_type=mime_type,
            is_primary=is_primary or existing_count == 0,  # first image is primary by default
            sort_order=existing_count,
        )
        return self.image_repo.create(image)

    def set_primary_image(self, product_id: str, image_id: str) -> ProductImage:
        target = self.image_repo.get_by_id(image_id)
        if not target or target.product_id != product_id:
            raise ImageNotFoundError(image_id)
        for existing in self.image_repo.list_for_product(product_id):
            if existing.is_primary and existing.id != image_id:
                existing.is_primary = False
                self.image_repo.save(existing)
        target.is_primary = True
        return self.image_repo.save(target)

    def delete_image(self, product_id: str, image_id: str) -> None:
        image = self.image_repo.get_by_id(image_id)
        if not image or image.product_id != product_id:
            raise ImageNotFoundError(image_id)
        delete_stored_file(image.stored_path)
        was_primary = image.is_primary
        self.image_repo.delete(image)
        if was_primary:
            remaining = self.image_repo.list_for_product(product_id)
            if remaining:
                remaining[0].is_primary = True
                self.image_repo.save(remaining[0])

    # ---------- Variants ----------

    def add_variant(self, product_id: str, data: ProductVariantCreate) -> ProductVariant:
        self.get_product(product_id)  # 404s if missing
        if self.variant_repo.get_by_sku(data.sku):
            raise DuplicateSkuError(data.sku)
        variant = ProductVariant(product_id=product_id, **data.model_dump())
        return self.variant_repo.create(variant)

    def update_variant(self, product_id: str, variant_id: str, data: ProductVariantCreate) -> ProductVariant:
        variant = self.variant_repo.get_by_id(variant_id)
        if not variant or variant.product_id != product_id:
            raise VariantNotFoundError(variant_id)
        if data.sku != variant.sku and self.variant_repo.get_by_sku(data.sku):
            raise DuplicateSkuError(data.sku)
        for field, value in data.model_dump().items():
            setattr(variant, field, value)
        return self.variant_repo.save(variant)

    def delete_variant(self, product_id: str, variant_id: str) -> None:
        variant = self.variant_repo.get_by_id(variant_id)
        if not variant or variant.product_id != product_id:
            raise VariantNotFoundError(variant_id)
        self.variant_repo.delete(variant)

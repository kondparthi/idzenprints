"""
Product CRUD, publish/unpublish, duplicate, and the image/variant
sub-resources.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.product import ProductStatus
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    EffectivePriceOut,
    InventoryAdjustmentOut,
    ProductBulkPricingTierCreate,
    ProductBulkPricingTierOut,
    ProductCreate,
    ProductCustomerPriceCreate,
    ProductCustomerPriceOut,
    ProductImageOut,
    ProductOut,
    ProductStatusUpdate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantOut,
    StockAdjustmentRequest,
)
from app.services.inventory_service import (
    InventoryService,
    NegativeStockError,
    StockNotManagedError,
)
from app.services.inventory_service import ProductNotFoundError as InventoryProductNotFoundError
from app.services.inventory_service import VariantNotFoundError as InventoryVariantNotFoundError
from app.services.product_pricing_service import (
    BulkPricingTierNotFoundError,
    CustomerPriceNotFoundError,
    ProductPricingService,
)
from app.services.product_service import (
    DuplicateSkuError,
    ImageNotFoundError,
    ProductNotFoundError,
    ProductService,
    VariantNotFoundError,
)
from app.utils.audit import record as record_audit
from app.utils.file_storage import resolve_stored_path

router = APIRouter(prefix="/api/products", tags=["products"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PaginatedResponse[ProductOut])
def list_products(
    search: str | None = Query(default=None),
    status: ProductStatus | None = Query(default=None),
    category_id: str | None = Query(default=None),
    brand_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = ProductService(db)
    items, total = service.list_products(
        search=search, status_filter=status, category_id=category_id, brand_id=brand_id, page=page, page_size=page_size
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        product = ProductService(db).create_product(payload, created_by=current_user.id)
    except DuplicateSkuError as exc:
        raise HTTPException(status_code=409, detail=f"SKU '{exc}' is already in use") from exc
    record_audit(db, current_user.id, "create", "product", product.id)
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    try:
        return ProductService(db).get_product(product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        product = ProductService(db).update_product(product_id, payload)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    except DuplicateSkuError as exc:
        raise HTTPException(status_code=409, detail=f"SKU '{exc}' is already in use") from exc
    record_audit(db, current_user.id, "update", "product", product_id)
    return product


@router.put("/{product_id}/status", response_model=ProductOut)
def set_product_status(
    product_id: str,
    payload: ProductStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        product = ProductService(db).set_status(product_id, payload.status)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    record_audit(db, current_user.id, "status_update", "product", product_id, {"new_status": payload.status.value})
    return product


@router.post("/{product_id}/duplicate", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def duplicate_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        copy = ProductService(db).duplicate_product(product_id, created_by=current_user.id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    record_audit(db, current_user.id, "duplicate", "product", copy.id, {"source_product_id": product_id})
    return copy


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        ProductService(db).delete_product(product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    record_audit(db, current_user.id, "delete", "product", product_id)


# ---------- Images ----------

@router.post("/{product_id}/images", response_model=ProductImageOut, status_code=status.HTTP_201_CREATED)
def add_product_image(
    product_id: str,
    file: UploadFile = File(...),
    is_primary: bool = False,
    db: Session = Depends(get_db),
):
    try:
        return ProductService(db).add_image(product_id, file, is_primary)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc


@router.get("/{product_id}/images/{image_id}/file")
def get_product_image_file(product_id: str, image_id: str, db: Session = Depends(get_db)):
    service = ProductService(db)
    try:
        product = service.get_product(product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    image = next((img for img in product.images if img.id == image_id), None)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    path = resolve_stored_path(image.stored_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path, media_type=image.mime_type, filename=image.original_filename)


@router.put("/{product_id}/images/{image_id}/primary", response_model=ProductImageOut)
def set_primary_image(product_id: str, image_id: str, db: Session = Depends(get_db)):
    try:
        return ProductService(db).set_primary_image(product_id, image_id)
    except ImageNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Image not found") from exc


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(product_id: str, image_id: str, db: Session = Depends(get_db)):
    try:
        ProductService(db).delete_image(product_id, image_id)
    except ImageNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Image not found") from exc


# ---------- Variants ----------

@router.post("/{product_id}/variants", response_model=ProductVariantOut, status_code=status.HTTP_201_CREATED)
def add_variant(product_id: str, payload: ProductVariantCreate, db: Session = Depends(get_db)):
    try:
        return ProductService(db).add_variant(product_id, payload)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    except DuplicateSkuError as exc:
        raise HTTPException(status_code=409, detail=f"SKU '{exc}' is already in use") from exc


@router.put("/{product_id}/variants/{variant_id}", response_model=ProductVariantOut)
def update_variant(product_id: str, variant_id: str, payload: ProductVariantCreate, db: Session = Depends(get_db)):
    try:
        return ProductService(db).update_variant(product_id, variant_id, payload)
    except VariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Variant not found") from exc
    except DuplicateSkuError as exc:
        raise HTTPException(status_code=409, detail=f"SKU '{exc}' is already in use") from exc


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(product_id: str, variant_id: str, db: Session = Depends(get_db)):
    try:
        ProductService(db).delete_variant(product_id, variant_id)
    except VariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Variant not found") from exc


# ---------- Customer-specific pricing ----------

@router.get("/{product_id}/customer-prices", response_model=list[ProductCustomerPriceOut])
def list_customer_prices(product_id: str, db: Session = Depends(get_db)):
    return ProductPricingService(db).list_customer_prices(product_id)


@router.put("/{product_id}/customer-prices", response_model=ProductCustomerPriceOut)
def set_customer_price(
    product_id: str,
    payload: ProductCustomerPriceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = ProductPricingService(db).set_customer_price(product_id, payload)
    record_audit(db, current_user.id, "set_customer_price", "product", product_id, {"customer_id": payload.customer_id})
    return result


@router.delete("/{product_id}/customer-prices/{price_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_price(product_id: str, price_id: str, db: Session = Depends(get_db)):
    try:
        ProductPricingService(db).delete_customer_price(product_id, price_id)
    except CustomerPriceNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Customer price not found") from exc


# ---------- Bulk pricing tiers ----------

@router.get("/{product_id}/bulk-pricing", response_model=list[ProductBulkPricingTierOut])
def list_bulk_tiers(product_id: str, db: Session = Depends(get_db)):
    return ProductPricingService(db).list_bulk_tiers(product_id)


@router.post("/{product_id}/bulk-pricing", response_model=ProductBulkPricingTierOut, status_code=status.HTTP_201_CREATED)
def add_bulk_tier(product_id: str, payload: ProductBulkPricingTierCreate, db: Session = Depends(get_db)):
    return ProductPricingService(db).add_bulk_tier(product_id, payload)


@router.delete("/{product_id}/bulk-pricing/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bulk_tier(product_id: str, tier_id: str, db: Session = Depends(get_db)):
    try:
        ProductPricingService(db).delete_bulk_tier(product_id, tier_id)
    except BulkPricingTierNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Bulk pricing tier not found") from exc


# ---------- Effective price ----------

@router.get("/{product_id}/effective-price", response_model=EffectivePriceOut)
def get_effective_price(
    product_id: str,
    customer_id: str | None = Query(default=None),
    quantity: int = Query(default=1, ge=1),
    variant_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    product_service = ProductService(db)
    try:
        product = product_service.get_product(product_id)
    except ProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc

    sellable = product
    if variant_id:
        sellable = next((v for v in product.variants if v.id == variant_id), None)
        if not sellable:
            raise HTTPException(status_code=404, detail="Variant not found")

    return ProductPricingService(db).resolve_effective_price(
        sellable, customer_id=customer_id, quantity=quantity, product_id_for_lookups=product_id
    )


# ---------- Inventory / stock ----------

@router.post("/{product_id}/stock/adjust", response_model=InventoryAdjustmentOut, status_code=status.HTTP_201_CREATED)
def adjust_stock(
    product_id: str,
    payload: StockAdjustmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        adjustment = InventoryService(db).adjust_stock(product_id, payload, adjusted_by=current_user.id)
    except InventoryProductNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc
    except InventoryVariantNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Variant not found") from exc
    except StockNotManagedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NegativeStockError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    record_audit(
        db,
        current_user.id,
        "stock_adjust",
        "product",
        product_id,
        {"variant_id": payload.variant_id, "change": adjustment.change_quantity, "reason": payload.reason},
    )
    return adjustment


@router.get("/{product_id}/inventory-history", response_model=list[InventoryAdjustmentOut])
def get_inventory_history(product_id: str, db: Session = Depends(get_db)):
    return InventoryService(db).list_history(product_id)

"""
Public, unauthenticated storefront endpoints — product catalog and
guest checkout. No login required anywhere in this file, by design.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.storefront import (
    GuestOrderCreate,
    GuestOrderLookup,
    GuestOrderOut,
    PublicProductDetailOut,
    PublicProductListItemOut,
    PublicVariantOut,
)
from app.services.storefront_service import OutOfStockError, ProductNotAvailableError, StorefrontService

router = APIRouter(prefix="/api/storefront", tags=["storefront"])


def _list_item_from_product(product: Product, service: StorefrontService) -> PublicProductListItemOut:
    primary_image = next((img for img in product.images if img.is_primary), None)
    if product.product_type == "variable" and product.variants:
        # Show the cheapest variant's price as the "from" price on the
        # listing card — the detail page shows each variant's own price.
        prices = [service.effective_price(v, product.id) for v in product.variants]
        sale_price = min(prices) if prices else None
        regular_price = sale_price
        in_stock = any(service.is_in_stock(v) for v in product.variants)
    else:
        sale_price = service.effective_price(product, product.id) if product.regular_price is not None else None
        regular_price = product.regular_price
        in_stock = service.is_in_stock(product)

    return PublicProductListItemOut(
        id=product.id,
        name=product.name,
        short_description=product.short_description,
        regular_price=regular_price,
        sale_price=sale_price if sale_price != regular_price else None,
        primary_image_id=primary_image.id if primary_image else None,
        in_stock=in_stock,
        is_featured=product.is_featured,
        category_id=product.category_id,
        brand_id=product.brand_id,
    )


@router.get("/products", response_model=list[PublicProductListItemOut])
def list_products(
    search: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    brand_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = StorefrontService(db)
    items, _total = service.list_products(search, category_id, brand_id, page, page_size)
    return [_list_item_from_product(p, service) for p in items]


@router.get("/products/{product_id}", response_model=PublicProductDetailOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    service = StorefrontService(db)
    try:
        product = service.get_product(product_id)
    except ProductNotAvailableError as exc:
        raise HTTPException(status_code=404, detail="Product not found") from exc

    variants_out = [
        PublicVariantOut(
            id=v.id,
            sku=v.sku,
            attribute_values=v.attribute_values,
            regular_price=v.regular_price,
            sale_price=service.effective_price(v, product.id) if v.regular_price is not None else None,
            in_stock=service.is_in_stock(v),
        )
        for v in product.variants
        if v.is_active
    ]

    return PublicProductDetailOut(
        id=product.id,
        name=product.name,
        description=product.description,
        short_description=product.short_description,
        sku=product.sku,
        regular_price=product.regular_price,
        sale_price=service.effective_price(product, product.id) if product.regular_price is not None else None,
        product_type=product.product_type.value,
        in_stock=service.is_in_stock(product),
        category_id=product.category_id,
        brand_id=product.brand_id,
        images=[{"id": img.id, "is_primary": img.is_primary} for img in product.images],
        variants=variants_out,
    )


@router.get("/products/{product_id}/images/{image_id}/file")
def get_product_image(product_id: str, image_id: str, db: Session = Depends(get_db)):
    from app.utils.file_storage import resolve_stored_path
    from fastapi.responses import FileResponse
    from app.repositories.product_image_repository import ProductImageRepository

    image = ProductImageRepository(db).get_by_id(image_id)
    if not image or image.product_id != product_id:
        raise HTTPException(status_code=404, detail="Image not found")
    path = resolve_stored_path(image.stored_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path, media_type=image.mime_type, filename=image.original_filename)


@router.post("/orders", response_model=GuestOrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: GuestOrderCreate, db: Session = Depends(get_db)):
    service = StorefrontService(db)
    try:
        order = service.create_order(payload)
    except ProductNotAvailableError as exc:
        raise HTTPException(status_code=400, detail="One of the items in your cart is no longer available") from exc
    except OutOfStockError as exc:
        raise HTTPException(status_code=409, detail=f"{exc.product_name} just went out of stock") from exc
    return order


@router.post("/orders/lookup", response_model=GuestOrderOut)
def lookup_order(payload: GuestOrderLookup, db: Session = Depends(get_db)):
    order = StorefrontService(db).get_order_for_receipt(payload.order_number, payload.guest_phone)
    if not order:
        raise HTTPException(status_code=404, detail="No matching order found")
    return order

from datetime import date
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator

from app.models.product import Backorders, ProductStatus, ProductType, ProductVisibility, StockStatus, TaxClass, TaxStatus
from app.schemas.tag import TagOut


class ProductStatusUpdate(BaseModel):
    status: ProductStatus


class PricingFields(BaseModel):
    """Shared by Product and ProductVariant — same field set, same
    validation, so both schemas stay in sync automatically."""

    regular_price: Optional[Decimal] = Field(default=None, ge=0)
    sale_price: Optional[Decimal] = Field(default=None, ge=0)
    sale_start_date: Optional[date] = None
    sale_end_date: Optional[date] = None
    cost_price: Optional[Decimal] = Field(default=None, ge=0)
    tax_status: TaxStatus = TaxStatus.TAXABLE
    tax_class: TaxClass = TaxClass.STANDARD
    min_quantity: Optional[int] = Field(default=None, ge=1)
    max_quantity: Optional[int] = Field(default=None, ge=1)

    @model_validator(mode="after")
    def _validate_ranges(self) -> "PricingFields":
        if self.regular_price is not None and self.sale_price is not None and self.sale_price > self.regular_price:
            raise ValueError("Sale price cannot be higher than the regular price")
        if self.sale_start_date and self.sale_end_date and self.sale_start_date > self.sale_end_date:
            raise ValueError("Sale start date must be before the sale end date")
        if self.min_quantity is not None and self.max_quantity is not None and self.min_quantity > self.max_quantity:
            raise ValueError("Minimum quantity cannot be greater than the maximum quantity")
        return self


class InventoryFields(BaseModel):
    """Shared by Product and ProductVariant, same reasoning as
    PricingFields above. stock_quantity/stock_status only mean something
    once manage_stock is on — see InventoryService for how they interact."""

    manage_stock: bool = False
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    stock_status: StockStatus = StockStatus.IN_STOCK
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)
    backorders: Backorders = Backorders.NO


class ProductVariantCreate(PricingFields, InventoryFields):
    sku: str = Field(min_length=1, max_length=80)
    attribute_values: dict[str, str] = Field(default_factory=dict)
    is_active: bool = True


class ProductVariantOut(PricingFields, InventoryFields):
    id: str
    product_id: str
    sku: str
    attribute_values: dict[str, Any]
    is_active: bool

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: str
    product_id: str
    original_filename: str
    mime_type: Optional[str]
    is_primary: bool
    sort_order: int

    class Config:
        from_attributes = True


class ProductCustomerPriceCreate(BaseModel):
    customer_id: str
    price: Decimal = Field(ge=0)


class ProductCustomerPriceOut(BaseModel):
    id: str
    product_id: str
    customer_id: str
    price: Decimal

    class Config:
        from_attributes = True


class ProductBulkPricingTierCreate(BaseModel):
    min_quantity: int = Field(ge=1)
    max_quantity: Optional[int] = Field(default=None, ge=1)
    price: Decimal = Field(ge=0)

    @model_validator(mode="after")
    def _validate_range(self) -> "ProductBulkPricingTierCreate":
        if self.max_quantity is not None and self.min_quantity > self.max_quantity:
            raise ValueError("Minimum quantity cannot be greater than the maximum quantity")
        return self


class ProductBulkPricingTierOut(BaseModel):
    id: str
    product_id: str
    min_quantity: int
    max_quantity: Optional[int]
    price: Decimal

    class Config:
        from_attributes = True


class EffectivePriceOut(BaseModel):
    """What a customer actually pays — resolved from customer-specific
    pricing, bulk tiers, an active sale, or the plain regular price, in
    that priority order."""

    price: Decimal
    source: str  # "customer_specific" | "bulk_tier" | "sale" | "regular"


class ProductCreate(PricingFields, InventoryFields):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=80)
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    product_type: ProductType = ProductType.SIMPLE
    status: ProductStatus = ProductStatus.DRAFT
    visibility: ProductVisibility = ProductVisibility.VISIBLE
    is_featured: bool = False
    tag_ids: list[str] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    sku: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = None
    short_description: Optional[str] = None
    category_id: Optional[str] = None
    brand_id: Optional[str] = None
    product_type: Optional[ProductType] = None
    status: Optional[ProductStatus] = None
    visibility: Optional[ProductVisibility] = None
    is_featured: Optional[bool] = None
    tag_ids: Optional[list[str]] = None

    regular_price: Optional[Decimal] = Field(default=None, ge=0)
    sale_price: Optional[Decimal] = Field(default=None, ge=0)
    sale_start_date: Optional[date] = None
    sale_end_date: Optional[date] = None
    cost_price: Optional[Decimal] = Field(default=None, ge=0)
    tax_status: Optional[TaxStatus] = None
    tax_class: Optional[TaxClass] = None
    min_quantity: Optional[int] = Field(default=None, ge=1)
    max_quantity: Optional[int] = Field(default=None, ge=1)

    manage_stock: Optional[bool] = None
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    stock_status: Optional[StockStatus] = None
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)
    backorders: Optional[Backorders] = None


class ProductOut(PricingFields, InventoryFields):
    id: str
    name: str
    sku: str
    description: Optional[str]
    short_description: Optional[str]
    category_id: Optional[str]
    brand_id: Optional[str]
    product_type: ProductType
    status: ProductStatus
    visibility: ProductVisibility
    is_featured: bool
    tags: list[TagOut]
    images: list[ProductImageOut]
    variants: list[ProductVariantOut]

    class Config:
        from_attributes = True


class StockAdjustmentRequest(BaseModel):
    """Exactly one of quantity (set to this absolute value) or delta
    (add/subtract from the current value) must be provided."""

    variant_id: Optional[str] = None
    quantity: Optional[int] = Field(default=None, ge=0)
    delta: Optional[int] = None
    reason: Optional[str] = None

    @model_validator(mode="after")
    def _validate_exactly_one(self) -> "StockAdjustmentRequest":
        if (self.quantity is None) == (self.delta is None):
            raise ValueError("Provide exactly one of quantity or delta")
        return self


class InventoryAdjustmentOut(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str]
    previous_quantity: int
    new_quantity: int
    change_quantity: int
    reason: Optional[str]
    adjusted_by: Optional[str]

    class Config:
        from_attributes = True

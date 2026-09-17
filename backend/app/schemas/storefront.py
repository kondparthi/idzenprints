"""
Public storefront schemas — deliberately separate from the admin
product schemas (app/schemas/product.py): the storefront should never
leak internal-only fields (cost_price, bulk pricing tiers, subscriber-
style admin metadata) to an anonymous shopper.
"""
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models.guest_order import PaymentMethod


class PublicProductImageOut(BaseModel):
    id: str
    is_primary: bool

    class Config:
        from_attributes = True


class PublicVariantOut(BaseModel):
    id: str
    sku: str
    attribute_values: dict[str, str]
    regular_price: Optional[Decimal]
    sale_price: Optional[Decimal]
    in_stock: bool

    class Config:
        from_attributes = True


class PublicProductListItemOut(BaseModel):
    id: str
    name: str
    short_description: Optional[str]
    regular_price: Optional[Decimal]
    sale_price: Optional[Decimal]
    primary_image_id: Optional[str]
    in_stock: bool
    is_featured: bool
    category_id: Optional[str]
    brand_id: Optional[str]


class PublicProductDetailOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    short_description: Optional[str]
    sku: str
    regular_price: Optional[Decimal]
    sale_price: Optional[Decimal]
    product_type: str
    in_stock: bool
    category_id: Optional[str]
    brand_id: Optional[str]
    images: list[PublicProductImageOut]
    variants: list[PublicVariantOut]


class CartItemInput(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(ge=1, le=99)


class GuestOrderCreate(BaseModel):
    guest_name: str = Field(min_length=1, max_length=150)
    guest_phone: str
    guest_email: EmailStr
    billing_address: str = Field(min_length=5, max_length=1000)
    shipping_address: str = Field(min_length=5, max_length=1000)
    payment_method: PaymentMethod
    items: list[CartItemInput] = Field(min_length=1)

    @field_validator("guest_phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        cleaned = value.strip()
        digits = cleaned.lstrip("+")
        if not digits.isdigit() or not (10 <= len(digits) <= 15):
            raise ValueError("Enter a valid phone number (10-15 digits, optional leading +)")
        return cleaned


class GuestOrderItemOut(BaseModel):
    id: str
    product_id: str
    variant_id: Optional[str]
    product_name: str
    variant_label: Optional[str]
    unit_price: Decimal
    quantity: int
    line_total: Decimal

    class Config:
        from_attributes = True


class GuestOrderOut(BaseModel):
    id: str
    order_number: str
    guest_name: str
    guest_phone: str
    guest_email: str
    billing_address: Optional[str]
    shipping_address: str
    payment_method: str
    payment_status: str
    status: str
    subtotal: Decimal
    total: Decimal
    items: list[GuestOrderItemOut]

    class Config:
        from_attributes = True


class GuestOrderLookup(BaseModel):
    """Order-number lookups for the receipt page must also match the
    phone the order was placed under — otherwise anyone who guesses or
    brute-forces an order number could read someone else's name,
    address, and phone number back."""

    order_number: str
    guest_phone: str


class GuestOrderStatusUpdate(BaseModel):
    status: str

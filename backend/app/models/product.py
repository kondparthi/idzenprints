"""
Product — the core catalog entry. Pricing lives directly on this row for
simple products; for variable products these same fields exist on
ProductVariant instead (see product_variant.py) — one Product row itself
carries no meaningful regular_price for a variable product; the UI shows
a price range derived from its variants.
"""
import enum

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, Numeric, String, Table, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column


class ProductType(str, enum.Enum):
    SIMPLE = "simple"
    VARIABLE = "variable"


class ProductStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    PRIVATE = "private"
    OUT_OF_STOCK = "out_of_stock"


class ProductVisibility(str, enum.Enum):
    VISIBLE = "visible"  # shown in catalog listings and search
    CATALOG_ONLY = "catalog_only"  # shown in listings, excluded from search
    SEARCH_ONLY = "search_only"  # excluded from listings, findable by search
    HIDDEN = "hidden"  # not shown anywhere publicly (direct link only)


class TaxStatus(str, enum.Enum):
    TAXABLE = "taxable"
    SHIPPING_ONLY = "shipping_only"
    NONE = "none"


class TaxClass(str, enum.Enum):
    STANDARD = "standard"
    REDUCED_RATE = "reduced_rate"
    ZERO_RATE = "zero_rate"


class StockStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    OUT_OF_STOCK = "out_of_stock"
    ON_BACKORDER = "on_backorder"


class Backorders(str, enum.Enum):
    NO = "no"  # can't be purchased once stock hits 0
    NOTIFY = "notify"  # can be purchased, customer is told it's on backorder
    YES = "yes"  # can be purchased with no notice


product_tags = Table(
    "product_tags",
    Base.metadata,
    Column("product_id", String(36), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(36), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id = uuid_column()
    name = Column(String(200), nullable=False)
    sku = Column(String(80), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    short_description = Column(Text, nullable=True)

    category_id = Column(String(36), ForeignKey("product_categories.id"), nullable=True, index=True)
    brand_id = Column(String(36), ForeignKey("brands.id"), nullable=True, index=True)

    product_type = str_enum(ProductType, nullable=False, default=ProductType.SIMPLE)
    status = str_enum(ProductStatus, nullable=False, default=ProductStatus.DRAFT, index=True)
    visibility = str_enum(ProductVisibility, nullable=False, default=ProductVisibility.VISIBLE)
    is_featured = Column(Boolean, nullable=False, default=False)

    # ---------- Pricing (simple products only — see module docstring) ----------
    regular_price = Column(Numeric(12, 2), nullable=True)
    sale_price = Column(Numeric(12, 2), nullable=True)
    sale_start_date = Column(Date, nullable=True)
    sale_end_date = Column(Date, nullable=True)
    cost_price = Column(Numeric(12, 2), nullable=True)
    tax_status = str_enum(TaxStatus, nullable=False, default=TaxStatus.TAXABLE)
    tax_class = str_enum(TaxClass, nullable=False, default=TaxClass.STANDARD)
    min_quantity = Column(Integer, nullable=True)
    max_quantity = Column(Integer, nullable=True)

    # ---------- Inventory (simple products only — variants track their own, see product_variant.py) ----------
    manage_stock = Column(Boolean, nullable=False, default=False)
    stock_quantity = Column(Integer, nullable=True)
    stock_status = str_enum(StockStatus, nullable=False, default=StockStatus.IN_STOCK)
    low_stock_threshold = Column(Integer, nullable=True)
    backorders = str_enum(Backorders, nullable=False, default=Backorders.NO)

    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    category = relationship("ProductCategory", backref="products")
    brand = relationship("Brand", backref="products")
    tags = relationship("Tag", secondary=product_tags, backref="products")
    images = relationship(
        "ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order"
    )
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    customer_prices = relationship("ProductCustomerPrice", back_populates="product", cascade="all, delete-orphan")
    bulk_pricing_tiers = relationship(
        "ProductBulkPricingTier",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductBulkPricingTier.min_quantity",
    )
    inventory_adjustments = relationship(
        "InventoryAdjustment",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="InventoryAdjustment.created_at.desc()",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Product {self.sku} {self.name} ({self.status})>"

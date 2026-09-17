"""
Customer-specific pricing, bulk pricing tiers, and resolving what a
customer actually pays for a given quantity.
"""
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_bulk_pricing import ProductBulkPricingTier
from app.models.product_customer_price import ProductCustomerPrice
from app.models.product_variant import ProductVariant
from app.repositories.product_bulk_pricing_repository import ProductBulkPricingRepository
from app.repositories.product_customer_price_repository import ProductCustomerPriceRepository
from app.schemas.product import EffectivePriceOut, ProductBulkPricingTierCreate, ProductCustomerPriceCreate


class CustomerPriceNotFoundError(Exception):
    pass


class BulkPricingTierNotFoundError(Exception):
    pass


class DuplicateCustomerPriceError(Exception):
    pass


class ProductPricingService:
    def __init__(self, db: Session):
        self.db = db
        self.customer_price_repo = ProductCustomerPriceRepository(db)
        self.bulk_tier_repo = ProductBulkPricingRepository(db)

    # ---------- Customer-specific pricing ----------

    def list_customer_prices(self, product_id: str) -> list[ProductCustomerPrice]:
        return self.customer_price_repo.list_for_product(product_id)

    def set_customer_price(self, product_id: str, data: ProductCustomerPriceCreate) -> ProductCustomerPrice:
        existing = self.customer_price_repo.get_for_product_and_customer(product_id, data.customer_id)
        if existing:
            existing.price = data.price
            return self.customer_price_repo.save(existing)
        price = ProductCustomerPrice(product_id=product_id, customer_id=data.customer_id, price=data.price)
        return self.customer_price_repo.create(price)

    def delete_customer_price(self, product_id: str, price_id: str) -> None:
        price = self.customer_price_repo.get_by_id(price_id)
        if not price or price.product_id != product_id:
            raise CustomerPriceNotFoundError(price_id)
        self.customer_price_repo.delete(price)

    # ---------- Bulk pricing tiers ----------

    def list_bulk_tiers(self, product_id: str) -> list[ProductBulkPricingTier]:
        return self.bulk_tier_repo.list_for_product(product_id)

    def add_bulk_tier(self, product_id: str, data: ProductBulkPricingTierCreate) -> ProductBulkPricingTier:
        tier = ProductBulkPricingTier(product_id=product_id, **data.model_dump())
        return self.bulk_tier_repo.create(tier)

    def delete_bulk_tier(self, product_id: str, tier_id: str) -> None:
        tier = self.bulk_tier_repo.get_by_id(tier_id)
        if not tier or tier.product_id != product_id:
            raise BulkPricingTierNotFoundError(tier_id)
        self.bulk_tier_repo.delete(tier)

    # ---------- Effective price resolution ----------

    def resolve_effective_price(
        self,
        sellable: Product | ProductVariant,
        customer_id: Optional[str] = None,
        quantity: int = 1,
        product_id_for_lookups: Optional[str] = None,
    ) -> EffectivePriceOut:
        """
        Priority order: a customer-specific override price wins outright;
        otherwise a matching bulk-quantity tier; otherwise an active sale
        price (respecting sale_start_date/sale_end_date if set); otherwise
        the plain regular price. Customer-specific pricing and bulk tiers
        are product-level only (see the models' docstrings), so for a
        variant, `product_id_for_lookups` is the parent product's id.
        """
        lookup_product_id = product_id_for_lookups or (
            sellable.id if isinstance(sellable, Product) else sellable.product_id
        )

        if customer_id:
            override = self.customer_price_repo.get_for_product_and_customer(lookup_product_id, customer_id)
            if override:
                return EffectivePriceOut(price=override.price, source="customer_specific")

        tiers = self.bulk_tier_repo.list_for_product(lookup_product_id)
        for tier in tiers:
            if quantity >= tier.min_quantity and (tier.max_quantity is None or quantity <= tier.max_quantity):
                return EffectivePriceOut(price=tier.price, source="bulk_tier")

        if sellable.sale_price is not None:
            today = date.today()
            starts_ok = sellable.sale_start_date is None or sellable.sale_start_date <= today
            ends_ok = sellable.sale_end_date is None or sellable.sale_end_date >= today
            if starts_ok and ends_ok:
                return EffectivePriceOut(price=sellable.sale_price, source="sale")

        return EffectivePriceOut(price=sellable.regular_price or Decimal("0"), source="regular")

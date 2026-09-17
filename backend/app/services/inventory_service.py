"""
Stock adjustments (with a full history log) and the derived stock_status
that keeps itself in sync with the quantity + backorder policy.
"""
from typing import Optional, Union

from sqlalchemy.orm import Session

from app.models.inventory_adjustment import InventoryAdjustment
from app.models.product import Backorders, Product, StockStatus
from app.models.product_variant import ProductVariant
from app.repositories.inventory_adjustment_repository import InventoryAdjustmentRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.product_variant_repository import ProductVariantRepository
from app.schemas.product import StockAdjustmentRequest


class ProductNotFoundError(Exception):
    pass


class VariantNotFoundError(Exception):
    pass


class StockNotManagedError(Exception):
    """Raised when trying to adjust a quantity for a product/variant that
    hasn't got "Stock management" turned on — there's nothing to adjust;
    the operator sets stock_status directly instead in that case."""


class NegativeStockError(Exception):
    pass


def derive_stock_status(quantity: int, backorders: Backorders) -> StockStatus:
    if quantity > 0:
        return StockStatus.IN_STOCK
    if backorders != Backorders.NO:
        return StockStatus.ON_BACKORDER
    return StockStatus.OUT_OF_STOCK


class InventoryService:
    def __init__(self, db: Session):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.variant_repo = ProductVariantRepository(db)
        self.adjustment_repo = InventoryAdjustmentRepository(db)

    def list_history(self, product_id: str) -> list[InventoryAdjustment]:
        return self.adjustment_repo.list_for_product(product_id)

    def adjust_stock(
        self, product_id: str, data: StockAdjustmentRequest, adjusted_by: Optional[str]
    ) -> InventoryAdjustment:
        product = self.product_repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundError(product_id)

        sellable: Union[Product, ProductVariant] = product
        if data.variant_id:
            variant = self.variant_repo.get_by_id(data.variant_id)
            if not variant or variant.product_id != product_id:
                raise VariantNotFoundError(data.variant_id)
            sellable = variant

        if not sellable.manage_stock:
            raise StockNotManagedError(
                "Stock management is off for this product — turn it on before adjusting quantity."
            )

        previous_quantity = sellable.stock_quantity or 0
        new_quantity = data.quantity if data.quantity is not None else previous_quantity + data.delta
        if new_quantity < 0:
            raise NegativeStockError(f"Stock cannot go below zero (would be {new_quantity})")

        sellable.stock_quantity = new_quantity
        sellable.stock_status = derive_stock_status(new_quantity, sellable.backorders)
        if isinstance(sellable, Product):
            self.product_repo.save(sellable)
        else:
            self.variant_repo.save(sellable)

        adjustment = InventoryAdjustment(
            product_id=product_id,
            variant_id=data.variant_id,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            change_quantity=new_quantity - previous_quantity,
            reason=data.reason,
            adjusted_by=adjusted_by,
        )
        return self.adjustment_repo.create(adjustment)

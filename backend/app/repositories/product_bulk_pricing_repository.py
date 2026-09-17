from typing import Optional

from sqlalchemy.orm import Session

from app.models.product_bulk_pricing import ProductBulkPricingTier


class ProductBulkPricingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, tier_id: str) -> Optional[ProductBulkPricingTier]:
        return self.db.query(ProductBulkPricingTier).filter(ProductBulkPricingTier.id == tier_id).first()

    def list_for_product(self, product_id: str) -> list[ProductBulkPricingTier]:
        return (
            self.db.query(ProductBulkPricingTier)
            .filter(ProductBulkPricingTier.product_id == product_id)
            .order_by(ProductBulkPricingTier.min_quantity)
            .all()
        )

    def create(self, tier: ProductBulkPricingTier) -> ProductBulkPricingTier:
        self.db.add(tier)
        self.db.commit()
        self.db.refresh(tier)
        return tier

    def delete(self, tier: ProductBulkPricingTier) -> None:
        self.db.delete(tier)
        self.db.commit()

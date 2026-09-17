from sqlalchemy.orm import Session

from app.models.inventory_adjustment import InventoryAdjustment


class InventoryAdjustmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_product(self, product_id: str) -> list[InventoryAdjustment]:
        return (
            self.db.query(InventoryAdjustment)
            .filter(InventoryAdjustment.product_id == product_id)
            .order_by(InventoryAdjustment.created_at.desc())
            .all()
        )

    def create(self, adjustment: InventoryAdjustment) -> InventoryAdjustment:
        self.db.add(adjustment)
        self.db.commit()
        self.db.refresh(adjustment)
        return adjustment

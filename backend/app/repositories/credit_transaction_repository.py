from sqlalchemy.orm import Session

from app.models.credit_transaction import CreditTransaction


class CreditTransactionRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_subscription(self, subscription_id: str) -> list[CreditTransaction]:
        return (
            self.db.query(CreditTransaction)
            .filter(CreditTransaction.subscription_id == subscription_id)
            .order_by(CreditTransaction.created_at.desc())
            .all()
        )

    def create(self, transaction: CreditTransaction) -> CreditTransaction:
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

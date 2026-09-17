from sqlalchemy.orm import Session, joinedload

from app.models.pdf_usage import PdfUsage


class PdfUsageRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_subscription(self, subscription_id: str) -> list[PdfUsage]:
        return (
            self.db.query(PdfUsage)
            .options(joinedload(PdfUsage.card_type))
            .filter(PdfUsage.subscription_id == subscription_id)
            .order_by(PdfUsage.created_at.desc())
            .all()
        )

"""
Aggregation queries backing the Reports screen: orders broken down by day,
status, card type, and operator, plus a cards-generated count — all over
an optional date range. A single flexible summary rather than seven
separate hard-coded report endpoints, so the frontend can slice the same
data multiple ways.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.card_type import CardType
from app.models.generated_card import GeneratedCard
from app.models.order import Order
from app.models.user import User


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def _date_filtered(self, query, date_from: Optional[datetime], date_to: Optional[datetime]):
        if date_from:
            query = query.filter(Order.created_at >= date_from)
        if date_to:
            query = query.filter(Order.created_at <= date_to)
        return query

    def summary(self, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None) -> dict:
        base = self._date_filtered(self.db.query(Order), date_from, date_to)
        total_orders = base.count()

        by_status = dict(
            self._date_filtered(
                self.db.query(Order.status, func.count(Order.id)).group_by(Order.status), date_from, date_to
            ).all()
        )
        by_status = {status.value: count for status, count in by_status.items()}

        by_card_type_rows = self._date_filtered(
            self.db.query(CardType.name, func.count(Order.id))
            .join(Order, Order.card_type_id == CardType.id)
            .group_by(CardType.name),
            date_from,
            date_to,
        ).all()
        by_card_type = [{"card_type": name, "count": count} for name, count in by_card_type_rows]

        by_operator_rows = self._date_filtered(
            self.db.query(User.name, func.count(Order.id))
            .join(Order, Order.created_by == User.id)
            .group_by(User.name),
            date_from,
            date_to,
        ).all()
        by_operator = [{"operator": name, "count": count} for name, count in by_operator_rows]

        daily_rows = self._date_filtered(
            self.db.query(func.date(Order.created_at), func.count(Order.id)).group_by(func.date(Order.created_at)),
            date_from,
            date_to,
        ).order_by(func.date(Order.created_at)).all()
        daily_orders = [{"date": str(day), "count": count} for day, count in daily_rows]

        cards_query = self.db.query(GeneratedCard)
        if date_from:
            cards_query = cards_query.filter(GeneratedCard.created_at >= date_from)
        if date_to:
            cards_query = cards_query.filter(GeneratedCard.created_at <= date_to)
        cards_generated = cards_query.count()

        return {
            "total_orders": total_orders,
            "orders_by_status": by_status,
            "orders_by_card_type": by_card_type,
            "orders_by_operator": by_operator,
            "daily_orders": daily_orders,
            "cards_generated": cards_generated,
        }

"""
Dashboard summary endpoint — counts used by the admin dashboard cards.
"""
from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.customer import Customer
from app.models.generated_card import GeneratedCard
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    total_customers = db.query(Customer).count()

    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc)
    todays_orders = db.query(Order).filter(Order.created_at >= today_start).count()

    pending_statuses = [OrderStatus.NEW, OrderStatus.PROCESSING, OrderStatus.READY, OrderStatus.PRINTED]
    pending_orders = db.query(Order).filter(Order.status.in_(pending_statuses)).count()
    completed_orders = db.query(Order).filter(Order.status == OrderStatus.COMPLETED).count()

    total_cards_generated = db.query(GeneratedCard).count()

    recent_orders = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_customers": total_customers,
        "todays_orders": todays_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_cards_generated": total_cards_generated,
        "recent_orders": [
            {
                "id": o.id,
                "customer_id": o.customer_id,
                "status": o.status.value,
                "quantity": o.quantity,
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ],
    }

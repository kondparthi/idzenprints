"""
Reports: an aggregated summary (daily/status/card-type/operator breakdowns
+ cards-generated count) and a raw order list with CSV export.
"""
import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.order import OrderStatus
from app.services.order_service import OrderService
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def report_summary(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return ReportService(db).summary(date_from, date_to)


@router.get("/orders")
def report_orders(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    status: OrderStatus | None = Query(default=None),
    card_type_id: str | None = Query(default=None),
    created_by: str | None = Query(default=None),
    format: str = Query(default="json"),
    db: Session = Depends(get_db),
):
    orders = OrderService(db).list_orders(
        status_filter=status,
        card_type_id=card_type_id,
        created_by=created_by,
        date_from=date_from,
        date_to=date_to,
    )

    if format != "csv":
        return [
            {
                "id": o.id,
                "customer_id": o.customer_id,
                "card_type_id": o.card_type_id,
                "template_id": o.template_id,
                "quantity": o.quantity,
                "status": o.status.value,
                "created_by": o.created_by,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Order ID", "Customer ID", "Card Type ID", "Template ID", "Quantity", "Status", "Created By", "Created At"])
    for o in orders:
        writer.writerow([o.id, o.customer_id, o.card_type_id, o.template_id or "", o.quantity, o.status.value, o.created_by or "", o.created_at.isoformat()])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders_report.csv"},
    )

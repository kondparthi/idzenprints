from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.subscription import SubscriptionStatus
from app.models.user import User
from app.schemas.credit_transaction import CreditAdjustmentRequest, CreditTransactionOut, PdfUsageOut
from app.schemas.subscription import SubscriptionOut, SubscriptionStatusUpdate
from app.services.subscription_service import (
    InvalidAdjustmentError,
    SubscriptionNotFoundError,
    SubscriptionService,
)
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[SubscriptionOut])
def list_subscriptions(status: SubscriptionStatus | None = Query(default=None), db: Session = Depends(get_db)):
    return SubscriptionService(db).list_subscriptions(status)


@router.get("/{subscription_id}", response_model=SubscriptionOut)
def get_subscription(subscription_id: str, db: Session = Depends(get_db)):
    try:
        return SubscriptionService(db).get_subscription(subscription_id)
    except SubscriptionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Subscription not found") from exc


@router.put("/{subscription_id}/status", response_model=SubscriptionOut)
def set_subscription_status(
    subscription_id: str,
    payload: SubscriptionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        subscription = SubscriptionService(db).set_status(subscription_id, payload.status)
    except SubscriptionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Subscription not found") from exc
    record_audit(db, current_user.id, "status_update", "subscription", subscription_id, {"new_status": payload.status.value})
    return subscription


@router.get("/{subscription_id}/credit-transactions", response_model=list[CreditTransactionOut])
def get_credit_transactions(subscription_id: str, db: Session = Depends(get_db)):
    try:
        return SubscriptionService(db).list_credit_transactions(subscription_id)
    except SubscriptionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Subscription not found") from exc


@router.get("/{subscription_id}/pdf-usage", response_model=list[PdfUsageOut])
def get_pdf_usage(subscription_id: str, db: Session = Depends(get_db)):
    try:
        return SubscriptionService(db).list_pdf_usage(subscription_id)
    except SubscriptionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Subscription not found") from exc


@router.post("/{subscription_id}/credit-adjustment", response_model=CreditTransactionOut, status_code=status.HTTP_201_CREATED)
def adjust_credits(
    subscription_id: str,
    payload: CreditAdjustmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        transaction = SubscriptionService(db).adjust_credits(
            subscription_id, payload.amount, payload.description, current_user.id
        )
    except SubscriptionNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Subscription not found") from exc
    except InvalidAdjustmentError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    record_audit(
        db, current_user.id, "credit_adjustment", "subscription", subscription_id,
        {"amount": payload.amount, "reason": payload.description},
    )
    return transaction

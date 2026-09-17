"""
Endpoints for viewing and correcting OCR-extracted customer details.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.customer_details import CustomerDetailsOut, CustomerDetailsUpdate
from app.services.customer_details_service import CustomerDetailsNotFoundError, CustomerDetailsService

router = APIRouter(
    prefix="/api/customer-details",
    tags=["customer-details"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/{details_id}", response_model=CustomerDetailsOut)
def get_details(details_id: str, db: Session = Depends(get_db)):
    try:
        return CustomerDetailsService(db).get(details_id)
    except CustomerDetailsNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Customer details not found") from exc


@router.get("/by-customer/{customer_id}", response_model=list[CustomerDetailsOut])
def list_details_for_customer(customer_id: str, db: Session = Depends(get_db)):
    return CustomerDetailsService(db).list_for_customer(customer_id)


@router.put("/{details_id}", response_model=CustomerDetailsOut)
def update_details(
    details_id: str,
    payload: CustomerDetailsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return CustomerDetailsService(db).update(details_id, payload, verified_by=current_user.id)
    except CustomerDetailsNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Customer details not found") from exc

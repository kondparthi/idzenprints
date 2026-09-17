from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.schemas.brand import BrandCreate, BrandOut, BrandUpdate
from app.services.brand_service import BrandNotFoundError, BrandService

router = APIRouter(prefix="/api/brands", tags=["brands"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[BrandOut])
def list_brands(db: Session = Depends(get_db)):
    return BrandService(db).list_brands()


@router.post("", response_model=BrandOut, status_code=status.HTTP_201_CREATED)
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)):
    return BrandService(db).create_brand(payload)


@router.put("/{brand_id}", response_model=BrandOut)
def update_brand(brand_id: str, payload: BrandUpdate, db: Session = Depends(get_db)):
    try:
        return BrandService(db).update_brand(brand_id, payload)
    except BrandNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Brand not found") from exc


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: str, db: Session = Depends(get_db)):
    try:
        BrandService(db).delete_brand(brand_id)
    except BrandNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Brand not found") from exc

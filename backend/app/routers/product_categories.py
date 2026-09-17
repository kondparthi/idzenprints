from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.schemas.product_category import ProductCategoryCreate, ProductCategoryOut, ProductCategoryUpdate
from app.services.product_category_service import ProductCategoryNotFoundError, ProductCategoryService

router = APIRouter(prefix="/api/product-categories", tags=["product-categories"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ProductCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return ProductCategoryService(db).list_categories()


@router.post("", response_model=ProductCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: ProductCategoryCreate, db: Session = Depends(get_db)):
    return ProductCategoryService(db).create_category(payload)


@router.put("/{category_id}", response_model=ProductCategoryOut)
def update_category(category_id: str, payload: ProductCategoryUpdate, db: Session = Depends(get_db)):
    try:
        return ProductCategoryService(db).update_category(category_id, payload)
    except ProductCategoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Category not found") from exc


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, db: Session = Depends(get_db)):
    try:
        ProductCategoryService(db).delete_category(category_id)
    except ProductCategoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Category not found") from exc

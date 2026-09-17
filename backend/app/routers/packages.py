from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.package import PackageCreate, PackageOut, PackageUpdate
from app.services.package_service import PackageInUseError, PackageNotFoundError, PackageService
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/packages", tags=["packages"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[PackageOut])
def list_packages(db: Session = Depends(get_db)):
    return PackageService(db).list_packages()


@router.post("", response_model=PackageOut, status_code=status.HTTP_201_CREATED)
def create_package(payload: PackageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    package = PackageService(db).create_package(payload)
    record_audit(db, current_user.id, "create", "package", package.id)
    return package


@router.get("/by-member-type/{member_type_id}", response_model=list[PackageOut])
def list_packages_for_member_type(member_type_id: str, db: Session = Depends(get_db)):
    """Used by the public registration flow (later phase): only active
    packages actually assigned to this member type — never trust a
    package_id the frontend sends without checking this same
    relationship server-side at registration time."""
    return PackageService(db).list_for_member_type(member_type_id)


@router.get("/{package_id}", response_model=PackageOut)
def get_package(package_id: str, db: Session = Depends(get_db)):
    try:
        return PackageService(db).get_package(package_id)
    except PackageNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Package not found") from exc


@router.put("/{package_id}", response_model=PackageOut)
def update_package(
    package_id: str, payload: PackageUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        package = PackageService(db).update_package(package_id, payload)
    except PackageNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Package not found") from exc
    record_audit(db, current_user.id, "update", "package", package_id)
    return package


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(package_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        PackageService(db).delete_package(package_id)
    except PackageNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Package not found") from exc
    except PackageInUseError as exc:
        raise HTTPException(
            status_code=409, detail="Members are already subscribed to this package — deactivate it instead"
        ) from exc
    record_audit(db, current_user.id, "delete", "package", package_id)

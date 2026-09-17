"""
Unauthenticated, public-facing endpoints — specifically what the
registration page needs before a visitor has any account at all.
Deliberately separate from routers/member_types.py and routers/packages.py,
which require staff auth on every endpoint (they expose the full admin
CRUD surface, including inactive records for management purposes).
These only ever return active records, and only the fields a
registration form actually needs.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.member_type import MemberTypeOut
from app.schemas.package import PackageOut
from app.services.member_type_service import MemberTypeService
from app.services.package_service import PackageService

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/member-types", response_model=list[MemberTypeOut])
def list_active_member_types(db: Session = Depends(get_db)):
    return [mt for mt in MemberTypeService(db).list_member_types() if mt.is_active]


@router.get("/packages/by-member-type/{member_type_id}", response_model=list[PackageOut])
def list_available_packages(member_type_id: str, db: Session = Depends(get_db)):
    """Same underlying query as the staff-only
    /api/packages/by-member-type/{id} — already active-only — exposed
    here without requiring a staff login, since this is exactly what
    the registration page's dynamic package display needs."""
    return PackageService(db).list_for_member_type(member_type_id)

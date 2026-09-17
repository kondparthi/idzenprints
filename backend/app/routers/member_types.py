from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.member_type import MemberTypeCreate, MemberTypeOut, MemberTypeUpdate
from app.services.member_type_service import MemberTypeInUseError, MemberTypeNotFoundError, MemberTypeService
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/member-types", tags=["member-types"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[MemberTypeOut])
def list_member_types(db: Session = Depends(get_db)):
    return MemberTypeService(db).list_member_types()


@router.post("", response_model=MemberTypeOut, status_code=status.HTTP_201_CREATED)
def create_member_type(
    payload: MemberTypeCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    member_type = MemberTypeService(db).create_member_type(payload)
    record_audit(db, current_user.id, "create", "member_type", member_type.id)
    return member_type


@router.get("/{member_type_id}", response_model=MemberTypeOut)
def get_member_type(member_type_id: str, db: Session = Depends(get_db)):
    try:
        return MemberTypeService(db).get_member_type(member_type_id)
    except MemberTypeNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Member type not found") from exc


@router.put("/{member_type_id}", response_model=MemberTypeOut)
def update_member_type(
    member_type_id: str,
    payload: MemberTypeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        member_type = MemberTypeService(db).update_member_type(member_type_id, payload)
    except MemberTypeNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Member type not found") from exc
    record_audit(db, current_user.id, "update", "member_type", member_type_id)
    return member_type


@router.delete("/{member_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member_type(
    member_type_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        MemberTypeService(db).delete_member_type(member_type_id)
    except MemberTypeNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Member type not found") from exc
    except MemberTypeInUseError as exc:
        raise HTTPException(
            status_code=409, detail="Members are still registered under this type — deactivate it instead"
        ) from exc
    record_audit(db, current_user.id, "delete", "member_type", member_type_id)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.repositories.member_repository import MemberRepository
from app.repositories.member_type_repository import MemberTypeRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.schemas.member import MemberListOut, MemberStatusUpdate, MemberTypeReassign
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/members", tags=["members"], dependencies=[Depends(get_current_user)])


def _to_list_out(member, subscription_repo: SubscriptionRepository) -> MemberListOut:
    subscription = subscription_repo.get_latest_for_member(member.id)
    return MemberListOut(
        id=member.id,
        full_name=member.full_name,
        login_id=member.login_id,
        email=member.email,
        phone=member.phone,
        member_type={"id": member.member_type.id, "name": member.member_type.name},
        is_active=member.is_active,
        created_at=member.created_at,
        has_subscription=subscription is not None,
        subscription_status=subscription.status.value if subscription else None,
    )


@router.get("", response_model=list[MemberListOut])
def list_members(db: Session = Depends(get_db)):
    member_repo = MemberRepository(db)
    subscription_repo = SubscriptionRepository(db)
    return [_to_list_out(m, subscription_repo) for m in member_repo.list_all()]


@router.patch("/{member_id}/member-type", response_model=MemberListOut)
def reassign_member_type(
    member_id: str,
    payload: MemberTypeReassign,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member_repo = MemberRepository(db)
    member = member_repo.get_by_id(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    new_type = MemberTypeRepository(db).get_by_id(payload.member_type_id)
    if not new_type:
        raise HTTPException(status_code=400, detail="That member type doesn't exist")

    member.member_type_id = new_type.id
    member_repo.save(member)
    record_audit(db, current_user.id, "reassign_member_type", "member", member_id)
    return _to_list_out(member, SubscriptionRepository(db))


@router.patch("/{member_id}/status", response_model=MemberListOut)
def update_member_status(
    member_id: str,
    payload: MemberStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member_repo = MemberRepository(db)
    member = member_repo.get_by_id(member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.is_active = payload.is_active
    member_repo.save(member)
    record_audit(db, current_user.id, "deactivate" if not payload.is_active else "activate", "member", member_id)
    return _to_list_out(member, SubscriptionRepository(db))

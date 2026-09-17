"""
Authentication endpoints: login, logout, current-user.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUserResponse,
    LoginRequest,
    TokenResponse,
    UpdateProfileRequest,
)
from app.services.auth_service import (
    AuthError,
    AuthService,
    EmailAlreadyInUseError,
    IncorrectPasswordError,
)
from app.utils.audit import record as record_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    try:
        user = service.authenticate(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    token = service.issue_token(user)
    record_audit(db, user.id, "login", "user", user.id)
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout():
    # JWTs are stateless; the frontend simply discards the token.
    # A token-blocklist can be added later if immediate server-side revocation is required.
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=CurrentUserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    try:
        updated = service.update_profile(current_user, payload)
    except EmailAlreadyInUseError as exc:
        raise HTTPException(status_code=409, detail="That email is already in use") from exc
    record_audit(db, current_user.id, "update_profile", "user", current_user.id)
    return updated


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    try:
        service.change_password(current_user, payload.current_password, payload.new_password)
    except IncorrectPasswordError as exc:
        raise HTTPException(status_code=400, detail="Current password is incorrect") from exc
    record_audit(db, current_user.id, "change_password", "user", current_user.id)
    return {"message": "Password changed successfully"}

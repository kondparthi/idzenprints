"""
Business logic for authentication: verifying credentials and issuing tokens,
plus a user's own profile and password management.
"""
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UpdateProfileRequest
from app.utils.security import create_access_token, hash_password, verify_password


class AuthError(Exception):
    """Raised on bad credentials or an inactive account."""


class EmailAlreadyInUseError(Exception):
    pass


class IncorrectPasswordError(Exception):
    pass


class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def authenticate(self, email: str, password: str) -> User:
        user = self.repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise AuthError("Invalid email or password")
        if not user.is_active:
            raise AuthError("This account has been deactivated")
        return user

    def issue_token(self, user: User) -> str:
        return create_access_token(subject=user.id, extra_claims={"role": user.role.value})

    def update_profile(self, user: User, data: UpdateProfileRequest) -> User:
        if data.email != user.email:
            existing = self.repo.get_by_email(data.email)
            if existing and existing.id != user.id:
                raise EmailAlreadyInUseError(data.email)
        user.name = data.name
        user.email = data.email
        return self.repo.save(user)

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise IncorrectPasswordError()
        user.password_hash = hash_password(new_password)
        self.repo.save(user)

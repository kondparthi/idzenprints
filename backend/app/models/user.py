"""
User model — staff accounts (Super Admin / Admin / Operator / Designer).
Passwords are always stored as bcrypt hashes, never plain text.
"""
import enum

from sqlalchemy import Boolean, Column, String

from app.database import Base
from app.models.mixins import TimestampMixin, str_enum, uuid_column


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"
    DESIGNER = "designer"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = uuid_column()
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = str_enum(UserRole, nullable=False, default=UserRole.OPERATOR)
    is_active = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email} ({self.role})>"

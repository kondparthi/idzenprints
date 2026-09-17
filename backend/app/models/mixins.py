"""
Shared model mixins so every table gets consistent audit columns.
"""
import uuid

from sqlalchemy import Column, DateTime, Enum, String
from sqlalchemy.sql import func


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


def generate_uuid() -> str:
    return str(uuid.uuid4())


def uuid_column():
    return Column(String(36), primary_key=True, default=generate_uuid)


def str_enum(enum_cls, **kwargs):
    """
    Build an Enum column for a `class Foo(str, enum.Enum)`.

    SQLAlchemy's Enum type, by default, persists a Python enum's *member
    name* (e.g. "SUPER_ADMIN"), not its `.value` ("super_admin") — even for
    str-mixed-in enums. Our migrations define the underlying MySQL ENUM
    using the lowercase `.value`s, so every enum column must use
    values_callable to keep the ORM's read/write strings aligned with what
    is actually stored. Always use this helper instead of Enum(...) directly.
    """
    return Column(Enum(enum_cls, values_callable=lambda obj: [member.value for member in obj]), **kwargs)

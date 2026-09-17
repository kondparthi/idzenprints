from sqlalchemy import Column, String

from app.database import Base
from app.models.mixins import uuid_column


class Tag(Base):
    __tablename__ = "tags"

    id = uuid_column()
    name = Column(String(80), nullable=False, unique=True)
    slug = Column(String(90), nullable=False, unique=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Tag {self.name}>"

from sqlalchemy import Boolean, Column, String

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class Brand(Base, TimestampMixin):
    __tablename__ = "brands"

    id = uuid_column()
    name = Column(String(150), nullable=False)
    slug = Column(String(170), nullable=False, unique=True)
    is_active = Column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Brand {self.name}>"

"""
ProductCategory — self-referential so "Category" and "Sub Category" are
just parent/child rows of the same table (a category with parent_id=NULL
is top-level; one with a parent_id is a sub-category of it).
"""
from sqlalchemy import Boolean, Column, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class ProductCategory(Base, TimestampMixin):
    __tablename__ = "product_categories"

    id = uuid_column()
    name = Column(String(150), nullable=False)
    slug = Column(String(170), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    parent_id = Column(String(36), ForeignKey("product_categories.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    parent = relationship("ProductCategory", remote_side=[id], backref="children")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<ProductCategory {self.name}>"

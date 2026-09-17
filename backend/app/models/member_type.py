"""
MemberType — what kind of subscriber a Member is (Meeseva, Internet
Cafe, Individual, Company, ...). Admin-configurable, not a hard-coded
enum, since the spec explicitly calls for new member types to be
addable without a code change.
"""
from sqlalchemy import Boolean, Column, ForeignKey, String, Table, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column

# A member type can further restrict which services (card_types) are
# even offered to it, independent of what a specific package includes —
# e.g. "Company" might never see "Student ID" regardless of package.
member_type_services = Table(
    "member_type_services",
    Base.metadata,
    Column("member_type_id", String(36), ForeignKey("member_types.id", ondelete="CASCADE"), primary_key=True),
    Column("card_type_id", String(36), ForeignKey("card_types.id", ondelete="CASCADE"), primary_key=True),
)


class MemberType(Base, TimestampMixin):
    __tablename__ = "member_types"

    id = uuid_column()
    name = Column(String(100), nullable=False)
    slug = Column(String(120), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    card_types = relationship("CardType", secondary=member_type_services, backref="member_types")

    @property
    def services(self) -> list:
        """Alias so the API can call this field 'services' (matching the
        spec's terminology) while the relationship itself stays named
        after the model it actually points to."""
        return self.card_types

    def __repr__(self) -> str:  # pragma: no cover
        return f"<MemberType {self.name}>"

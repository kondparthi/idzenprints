"""
Package — a subscription tier (Basic/Medium/Premium/...). Every limit
(price, credits, license length, device count, PDF cap) is admin-set,
not hard-coded, per the spec.

package_member_types and package_services are plain association tables
(no extra columns needed beyond the two foreign keys), so they're
declared as sa.Table rather than full mapped classes — same pattern
already used for product_tags elsewhere in this app.
"""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Table
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column

package_member_types = Table(
    "package_member_types",
    Base.metadata,
    Column("package_id", String(36), ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True),
    Column("member_type_id", String(36), ForeignKey("member_types.id", ondelete="CASCADE"), primary_key=True),
)

# "Services" (section 7 of the spec) are deliberately the existing
# card_types table with a credit_cost column added, not a new parallel
# table — see the Phase 1 planning note on avoiding duplicate structures.
package_services = Table(
    "package_services",
    Base.metadata,
    Column("package_id", String(36), ForeignKey("packages.id", ondelete="CASCADE"), primary_key=True),
    Column("card_type_id", String(36), ForeignKey("card_types.id", ondelete="CASCADE"), primary_key=True),
)


class Package(Base, TimestampMixin):
    __tablename__ = "packages"

    id = uuid_column()
    name = Column(String(100), nullable=False)
    slug = Column(String(120), nullable=False, unique=True)
    price = Column(Numeric(12, 2), nullable=False)
    credits = Column(Integer, nullable=False)
    license_days = Column(Integer, nullable=False)
    device_limit = Column(Integer, nullable=False, default=1)
    pdf_generation_limit = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    member_types = relationship("MemberType", secondary=package_member_types, backref="packages")
    card_types = relationship("CardType", secondary=package_services, backref="packages")

    @property
    def services(self) -> list:
        """Same alias reasoning as MemberType.services — see that model."""
        return self.card_types

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Package {self.name} ₹{self.price}>"

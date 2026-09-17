"""
CardType — an admin-configurable category of card the shop prints
(Aadhaar PVC, FSC, Employee ID, ...). Admins can add new ones at any time,
so this is a table, not a hard-coded enum.

credit_cost (added for the Subscription & Package module) doubles this
table as the "Service" entity from that spec's section 7, rather than
creating a separate services table that would just duplicate this one —
a card type a member generates IS the service they're spending credits
on. Defaults to 1 so existing rows (created before this column existed)
have a sane, non-zero cost rather than silently being free.
"""
from sqlalchemy import Boolean, Column, Integer, String, Text

from app.database import Base
from app.models.mixins import TimestampMixin, uuid_column


class CardType(Base, TimestampMixin):
    __tablename__ = "card_types"

    id = uuid_column()
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    credit_cost = Column(Integer, nullable=False, default=1)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CardType {self.name}>"

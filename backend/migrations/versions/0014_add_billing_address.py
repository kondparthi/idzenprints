"""add billing_address to guest_orders (separate from shipping_address)

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable, and backfilled from the existing shipping_address — every
    # order placed before this migration only ever collected one address,
    # so treating it as also having been the billing address is the only
    # sensible default (never leave existing orders with a blank billing
    # address that never actually applied).
    op.add_column("guest_orders", sa.Column("billing_address", sa.Text, nullable=True))
    op.execute("UPDATE guest_orders SET billing_address = shipping_address WHERE billing_address IS NULL")


def downgrade() -> None:
    op.drop_column("guest_orders", "billing_address")

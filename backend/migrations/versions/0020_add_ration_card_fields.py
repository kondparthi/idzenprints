"""add fp_shop_no/village/mandal/district to customer_details

Revision ID: 0020
Revises: 0019
Create Date: 2026-10-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customer_details", sa.Column("fp_shop_no", sa.String(length=50), nullable=True))
    op.add_column("customer_details", sa.Column("village", sa.String(length=100), nullable=True))
    op.add_column("customer_details", sa.Column("mandal", sa.String(length=100), nullable=True))
    op.add_column("customer_details", sa.Column("district", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("customer_details", "district")
    op.drop_column("customer_details", "mandal")
    op.drop_column("customer_details", "village")
    op.drop_column("customer_details", "fp_shop_no")

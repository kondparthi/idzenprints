"""add name_local, address_local, vid_number to customer_details

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("customer_details") as batch_op:
        batch_op.add_column(sa.Column("name_local", sa.String(150), nullable=True))
        batch_op.add_column(sa.Column("address_local", sa.Text, nullable=True))
        batch_op.add_column(sa.Column("vid_number", sa.String(50), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("customer_details") as batch_op:
        batch_op.drop_column("vid_number")
        batch_op.drop_column("address_local")
        batch_op.drop_column("name_local")

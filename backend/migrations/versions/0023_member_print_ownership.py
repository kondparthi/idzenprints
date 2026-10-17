"""member-owned uploaded cards and print bucket items

Revision ID: 0023
Revises: 0022
Create Date: 2026-10-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("uploaded_cards", "print_bucket_items"):
        op.add_column(table, sa.Column("owner_member_id", sa.String(length=36), nullable=True))
        op.create_index(f"ix_{table}_owner_member_id", table, ["owner_member_id"])
        op.create_foreign_key(
            f"fk_{table}_owner_member_id", table, "members", ["owner_member_id"], ["id"], ondelete="CASCADE"
        )


def downgrade() -> None:
    for table in ("uploaded_cards", "print_bucket_items"):
        op.drop_constraint(f"fk_{table}_owner_member_id", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_owner_member_id", table_name=table)
        op.drop_column(table, "owner_member_id")

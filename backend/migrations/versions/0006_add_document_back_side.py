"""add optional back-side file columns to documents

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.add_column(sa.Column("back_original_filename", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("back_stored_path", sa.String(500), nullable=True))
        batch_op.add_column(sa.Column("back_mime_type", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("back_file_size", sa.Integer, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("documents") as batch_op:
        batch_op.drop_column("back_file_size")
        batch_op.drop_column("back_mime_type")
        batch_op.drop_column("back_stored_path")
        batch_op.drop_column("back_original_filename")

"""add is_default flag to member_types (supports free/open registration)

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("member_types", sa.Column("is_default", sa.Boolean, nullable=False, server_default=sa.false()))
    # Not a unique index — "only one default at a time" is enforced at the
    # application level (see MemberTypeService.set_default), not the DB;
    # this index just speeds up the "find the default" lookup at registration.
    op.create_index("ix_member_types_is_default", "member_types", ["is_default"])


def downgrade() -> None:
    op.drop_index("ix_member_types_is_default", table_name="member_types")
    op.drop_column("member_types", "is_default")

"""Expand notary department fields to preserve legacy catalog values.

Revision ID: 20261105_0005
Revises: 20261104_0004
"""
from alembic import op
import sqlalchemy as sa

revision = "20261105_0005"
down_revision = "20261104_0004"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "ctn_notarios",
        "departamento_cancelaciones",
        existing_type=sa.String(length=150),
        type_=sa.String(length=255),
        existing_nullable=True,
    )
    op.alter_column(
        "ctn_notarios",
        "departamento_copias",
        existing_type=sa.String(length=150),
        type_=sa.String(length=255),
        existing_nullable=True,
    )
    op.alter_column(
        "ctn_notarios",
        "otros_departamentos",
        existing_type=sa.String(length=150),
        type_=sa.String(length=255),
        existing_nullable=True,
    )


def downgrade():
    bind = op.get_bind()
    overlong = bind.execute(sa.text(
        """
        SELECT EXISTS (
            SELECT 1 FROM ctn_notarios
            WHERE length(departamento_cancelaciones) > 150
               OR length(departamento_copias) > 150
               OR length(otros_departamentos) > 150
        )
        """
    )).scalar()
    if overlong:
        raise RuntimeError(
            "Downgrade cancelled: ctn_notarios contains department values "
            "longer than 150 characters; shortening would lose data."
        )
    op.alter_column(
        "ctn_notarios",
        "departamento_cancelaciones",
        existing_type=sa.String(length=255),
        type_=sa.String(length=150),
        existing_nullable=True,
    )
    op.alter_column(
        "ctn_notarios",
        "departamento_copias",
        existing_type=sa.String(length=255),
        type_=sa.String(length=150),
        existing_nullable=True,
    )
    op.alter_column(
        "ctn_notarios",
        "otros_departamentos",
        existing_type=sa.String(length=255),
        type_=sa.String(length=150),
        existing_nullable=True,
    )

"""
Alembic environment — reads DATABASE_URL from app settings (not from
alembic.ini) so migrations always use the same env-driven config as the app.
"""
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.config.settings import get_settings  # noqa: E402
from app.database import Base  # noqa: E402
from app.models import (  # noqa: E402,F401
    AuditLog,
    Brand,
    CardType,
    CreditTransaction,
    Customer,
    CustomerDetails,
    Document,
    GeneratedCard,
    GuestOrder,
    GuestOrderItem,
    InventoryAdjustment,
    Member,
    MemberSession,
    MemberType,
    Order,
    Package,
    PdfUsage,
    Product,
    ProductBulkPricingTier,
    ProductCategory,
    ProductCustomerPrice,
    ProductImage,
    ProductVariant,
    Subscription,
    Tag,
    Template,
    User,
)

config = context.config
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

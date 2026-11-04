"""Alembic environment for controlled ERP-Molsan schema migrations."""
from logging.config import fileConfig
import os

from alembic import context
from sqlalchemy import JSON, create_engine, pool
from sqlalchemy.dialects.postgresql import JSONB

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importing the application registers models declared in routers and model files.
# The import builds an engine but does not connect or execute schema statements.
from backend.app.main import app  # noqa: F401,E402
from backend.app.database import Base  # noqa: E402

target_metadata = Base.metadata

# Estas tablas se administran mediante revisiones SQL auxiliares revisadas.
# Se excluyen del autogenerate ORM para no intentar recrearlas ni borrarlas.
AUXILIARY_TABLE_NAMES = {
    "absis_postfirma_cargas",
    "absis_postfirma_registros",
    "alta_expediente_contadores",
    "catalogo_oficinas",
    "catalogos_absis",
    "catalogos_absis_categorias",
    "correspondencia_configuracion",
    "correspondencia_plantillas",
    "ctn_portal_accesos_historial",
    "datos_molsan_config",
    "encargagest_notaria_gestor",
    "expediente_absis_solicitudes",
    "expediente_documentacion_previa_absis",
    "expediente_gasto_pagos",
    "expediente_gestor_historial",
    "expediente_hipotecas",
    "expediente_sla_actividad",
    "expediente_traspasos_saldo",
    "expediente_traspasos_saldo_origenes",
    "expediente_visibilidad_config",
    "facturas_honorarios_gestoria",
    "mensajeria_servicios",
    "mensajeria_solicitudes",
    "mensajeria_albaranes",
    "mensajeria_comunicaciones",
    "mensajeria_facturas",
    "mensajeria_factura_albaran",
    "mensajeria_proveedores",
    "notargest_avisos_leidos",
    "notargest_historial_actividad",
    "plantilla_factura_concepto_gasto",
    "provisiones_email_envios",
    "tipos_impositivos",
}


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and reflected and name in AUXILIARY_TABLE_NAMES:
        return False
    return True


def compare_server_default(context, connection, inspected_column, metadata_column, rendered_metadata_default, rendered_inspected_default):
    # PostgreSQL json no implementa igualdad; el comparador automático de Alembic
    # intenta ejecutar SELECT '{}'::json = '{}' y falla. Los defaults JSON se
    # mantienen en las revisiones y se revisan explícitamente.
    if isinstance(metadata_column.type, (JSON, JSONB)):
        return False
    return None


def require_explicit_migration_mode():
    enabled = os.getenv(
        "MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", ""
    ).strip().lower() in {"1", "true", "yes"}
    if not enabled:
        raise RuntimeError(
            "Migraciones bloqueadas. Define "
            "MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS=true "
            "solo en un proceso de migración aislado y autorizado."
        )


def run_migrations_offline():
    require_explicit_migration_mode()
    url = (os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url") or "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL no está definida para generar SQL de migración.")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=compare_server_default,
                include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    require_explicit_migration_mode()
    url = (os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url") or "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL no está definida para ejecutar migraciones.")
    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
        pool_pre_ping=True,
    )
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=compare_server_default,
                transaction_per_migration=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

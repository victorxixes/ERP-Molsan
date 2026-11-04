"""Guardas para impedir DDL desde los servicios web.

El esquema se modifica exclusivamente mediante revisiones Alembic ejecutadas
por un proceso de migración aislado. La variable de habilitación, por sí sola,
nunca permite DDL en el proceso web.
"""
import os


def runtime_schema_migrations_enabled() -> bool:
    enabled = os.getenv(
        "MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", "false"
    ).strip().lower() in {"1", "true", "yes"}
    role = os.getenv("MOLSAN_PROCESS_ROLE", "web").strip().lower()
    return enabled and role == "migration"

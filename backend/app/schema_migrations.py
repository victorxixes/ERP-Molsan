"""Control central de DDL ejecutado por el proceso web.

Las modificaciones de esquema se ejecutan mediante migraciones versionadas,
no durante el arranque ni como efecto secundario de una petición.
"""
import os


def runtime_schema_migrations_enabled() -> bool:
    return os.getenv(
        "MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", "false"
    ).strip().lower() in {"1", "true", "yes"}

"""Desactiva las migraciones heredadas ejecutadas durante el arranque.

El esquema se administra exclusivamente mediante revisiones Alembic ejecutadas
por un comando/proceso de migración explícito. Esta función se conserva como
compatibilidad temporal para los hooks antiguos, pero siempre devuelve False.
"""
def runtime_schema_migrations_enabled() -> bool:
    return False

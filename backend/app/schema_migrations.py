"""Control central de migraciones automáticas durante el arranque.

Las modificaciones de esquema deben ejecutarse mediante un proceso explícito
revisado. Por defecto, el arranque de la API nunca altera la base de datos.
"""

def runtime_schema_migrations_enabled() -> bool:
    return False

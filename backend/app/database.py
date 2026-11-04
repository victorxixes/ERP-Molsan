from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import re

from backend.app.schema_migrations import runtime_schema_migrations_enabled


# Validar la configuración aquí, antes de construir el engine. main.py importa
# este módulo antes de que todos los módulos de configuración estén cargados;
# sin esta comprobación, una variable ausente produce un error poco claro de
# SQLAlchemy durante el arranque.
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no está definida. Configura la conexión a la base de datos "
        "en el entorno antes de iniciar el backend."
    )

# Compatibilidad con URLs PostgreSQL antiguas usadas por algunos proveedores.
# SQLAlchemy 1.4 acepta postgresql:// y evita depender del alias postgres://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]

# Supabase Free dispone de un presupuesto de conexiones más ajustado.
# Render es un backend persistente en IPv4: se conectará mediante Supavisor
# en modo sesión (puerto 5432), no mediante el pooler transaccional.
# Los valores siguen siendo configurables y el pool histórico de Render
# PostgreSQL se conserva sin cambios.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    parsed_url = make_url(DATABASE_URL)
    database_host = (parsed_url.host or "").lower()
    is_supabase = (
        database_host.endswith(".supabase.co")
        or database_host.endswith(".pooler.supabase.com")
    )
    default_pool_size = "3" if is_supabase else "10"
    default_max_overflow = "2" if is_supabase else "20"
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=int(os.getenv("DB_POOL_SIZE", default_pool_size)),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", default_max_overflow)),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "15")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    )


# Defensa central: el backend web no puede modificar el esquema por accidente.
# Si una sentencia idempotente ya quedó aplicada por Alembic, se convierte en
# SELECT 1. Si falta el objeto, la petición falla y exige una migración versionada.
_SCHEMA_DDL = re.compile(
    r"^\s*(?:CREATE|ALTER|DROP|TRUNCATE|DO)\s+"
    r"(?:TEMP(?:ORARY)?\s+)?"
    r"(?:(?:TABLE|INDEX|SEQUENCE|TYPE|SCHEMA|VIEW|MATERIALIZED\s+VIEW|"
    r"FUNCTION|TRIGGER|EXTENSION|DOMAIN)\b|\$\$)",
    re.IGNORECASE,
)
_IDENTIFIER = r'(?:[A-Za-z_][A-Za-z0-9_$]*|"[^"]+")'
_QUALIFIED_IDENTIFIER = rf'(?:{_IDENTIFIER}\s*\.\s*)?{_IDENTIFIER}'


def _split_schema_name(value):
    parts = [part.strip().strip('"') for part in value.split(".")]
    if len(parts) == 1:
        return "public", parts[0]
    if len(parts) == 2:
        return parts[0], parts[1]
    raise RuntimeError(f"Identificador SQL no admitido por el control DDL: {value!r}")


def _table_exists(cursor, dialect, schema, table):
    if dialect == "postgresql":
        qualified = f'"{schema}"."{table}"'
        cursor.execute("SELECT to_regclass(%s)", (qualified,))
        row = cursor.fetchone()
        return bool(row and row[0])
    if dialect == "sqlite":
        cursor.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?", (table,))
        return cursor.fetchone() is not None
    return False


def _column_exists(cursor, dialect, schema, table, column):
    if dialect == "postgresql":
        cursor.execute(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = %s AND column_name = %s",
            (schema, table, column),
        )
        return cursor.fetchone() is not None
    if dialect == "sqlite":
        cursor.execute(f'PRAGMA table_info("{table.replace(chr(34), chr(34) * 2)}")')
        return any(row[1] == column for row in cursor.fetchall())
    return False


def _index_exists(cursor, dialect, schema, index):
    if dialect == "postgresql":
        cursor.execute(
            "SELECT 1 FROM pg_indexes WHERE schemaname = %s AND indexname = %s",
            (schema, index),
        )
        return cursor.fetchone() is not None
    if dialect == "sqlite":
        cursor.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name = ?", (index,))
        return cursor.fetchone() is not None
    return False


def _constraint_exists(cursor, dialect, schema, table, constraint):
    if dialect == "postgresql":
        qualified = f'"{schema}"."{table}"'
        cursor.execute(
            "SELECT 1 FROM pg_constraint WHERE conname = %s AND conrelid = to_regclass(%s)",
            (constraint, qualified),
        )
        return cursor.fetchone() is not None
    return False


def _ddl_is_already_applied(connection, cursor, statement):
    dialect = connection.dialect.name
    table_create = re.match(
        rf"^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?({_QUALIFIED_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if table_create:
        schema, table = _split_schema_name(table_create.group(1))
        return _table_exists(cursor, dialect, schema, table)

    index_create = re.match(
        rf"^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?({_IDENTIFIER})\s+ON\s+({_QUALIFIED_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if index_create:
        schema, _ = _split_schema_name(index_create.group(2))
        return _index_exists(cursor, dialect, schema, index_create.group(1).strip('"'))

    alter_add_column = re.match(
        rf"^\s*ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?({_QUALIFIED_IDENTIFIER})\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?({_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if alter_add_column:
        schema, table = _split_schema_name(alter_add_column.group(1))
        column = alter_add_column.group(2).strip('"')
        return _column_exists(cursor, dialect, schema, table, column)

    constraint_add = re.search(
        rf"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?({_QUALIFIED_IDENTIFIER})\s+ADD\s+CONSTRAINT\s+({_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if constraint_add:
        schema, table = _split_schema_name(constraint_add.group(1))
        constraint = constraint_add.group(2).strip('"')
        return _constraint_exists(cursor, dialect, schema, table, constraint)

    constraint_drop = re.match(
        rf"^\s*ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?({_QUALIFIED_IDENTIFIER})\s+DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?({_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if constraint_drop:
        schema, table = _split_schema_name(constraint_drop.group(1))
        constraint = constraint_drop.group(2).strip('"')
        return not _constraint_exists(cursor, dialect, schema, table, constraint)

    table_drop = re.match(
        rf"^\s*DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?({_QUALIFIED_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if table_drop:
        schema, table = _split_schema_name(table_drop.group(1))
        return not _table_exists(cursor, dialect, schema, table)

    index_drop = re.match(
        rf"^\s*DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?({_QUALIFIED_IDENTIFIER})",
        statement,
        re.IGNORECASE,
    )
    if index_drop:
        schema, index = _split_schema_name(index_drop.group(1))
        return not _index_exists(cursor, dialect, schema, index)

    # DO $ ... ALTER TABLE ... ADD CONSTRAINT ... $$ solo se considera no-op
    # cuando la restricción ya existe; nunca se permite crearla desde una petición.
    if re.match(r"^\s*DO\b", statement, re.IGNORECASE):
        return bool(constraint_add)

    return False


@event.listens_for(engine, "before_cursor_execute", retval=True)
def _bloquear_ddl_fuera_de_migraciones(
    conexion, cursor, statement, parametros, contexto, executemany
):
    if not _SCHEMA_DDL.match(statement) or runtime_schema_migrations_enabled():
        return statement, parametros

    if cursor is not None and _ddl_is_already_applied(conexion, cursor, statement):
        return "SELECT 1", ()

    raise RuntimeError(
        "DDL bloqueado: el objeto no está provisionado. "
        "Crea o modifica el esquema mediante una migración Alembic versionada."
    )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

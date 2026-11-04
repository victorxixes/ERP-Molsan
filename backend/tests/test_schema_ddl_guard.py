import os
import sqlite3
from types import SimpleNamespace

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./schema-ddl-guard-test.db")

from backend.app.database import _bloquear_ddl_fuera_de_migraciones


def _ejecutar_guard(statement):
    return _bloquear_ddl_fuera_de_migraciones(
        None, None, statement, None, None, False
    )


def _ejecutar_guard_sqlite(cursor, statement):
    connection = SimpleNamespace(dialect=SimpleNamespace(name="sqlite"))
    return _bloquear_ddl_fuera_de_migraciones(
        connection, cursor, statement, None, None, False
    )


@pytest.mark.parametrize(
    "statement",
    [
        "CREATE TABLE public.prueba (id INTEGER)",
        "ALTER TABLE public.expedientes ADD COLUMN prueba TEXT",
        "DROP INDEX IF EXISTS ix_prueba",
        "TRUNCATE TABLE public.prueba",
    ],
)
def test_bloquea_ddl_sin_modo_migracion(monkeypatch, statement):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    with pytest.raises(RuntimeError, match="DDL bloqueado"):
        _ejecutar_guard(statement)


def test_permite_consultas_normales_sin_modo_migracion(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    assert _ejecutar_guard("SELECT 1") == ("SELECT 1", None)


def test_permite_ddl_en_proceso_de_migracion(monkeypatch):
    monkeypatch.setenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", "true")
    statement = "CREATE TABLE public.prueba (id INTEGER)"
    assert _ejecutar_guard(statement) == (statement, None)


def test_convierte_create_table_existente_en_noop(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    database = sqlite3.connect(":memory:")
    cursor = database.cursor()
    cursor.execute("CREATE TABLE prueba (id INTEGER)")
    assert _ejecutar_guard_sqlite(cursor, "CREATE TABLE IF NOT EXISTS prueba (id INTEGER)") == ("SELECT 1", ())


def test_convierte_create_index_existente_en_noop(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    database = sqlite3.connect(":memory:")
    cursor = database.cursor()
    cursor.execute("CREATE TABLE prueba (id INTEGER)")
    cursor.execute("CREATE INDEX ix_prueba ON prueba (id)")
    assert _ejecutar_guard_sqlite(cursor, "CREATE INDEX IF NOT EXISTS ix_prueba ON prueba (id)") == ("SELECT 1", ())


def test_convierte_add_column_existente_en_noop(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    database = sqlite3.connect(":memory:")
    cursor = database.cursor()
    cursor.execute("CREATE TABLE prueba (id INTEGER, nombre TEXT)")
    statement = "ALTER TABLE prueba ADD COLUMN IF NOT EXISTS nombre TEXT"
    assert _ejecutar_guard_sqlite(cursor, statement) == ("SELECT 1", ())


def test_bloquea_add_column_que_no_existe(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    database = sqlite3.connect(":memory:")
    cursor = database.cursor()
    cursor.execute("CREATE TABLE prueba (id INTEGER)")
    with pytest.raises(RuntimeError, match="DDL bloqueado"):
        _ejecutar_guard_sqlite(cursor, "ALTER TABLE prueba ADD COLUMN nombre TEXT")


def test_drop_de_objeto_ausente_es_noop(monkeypatch):
    monkeypatch.delenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", raising=False)
    database = sqlite3.connect(":memory:")
    cursor = database.cursor()
    cursor.execute("CREATE TABLE prueba (id INTEGER)")
    assert _ejecutar_guard_sqlite(cursor, "DROP INDEX IF EXISTS ix_ausente") == ("SELECT 1", ())

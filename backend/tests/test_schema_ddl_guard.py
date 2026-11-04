import os

import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./schema-ddl-guard-test.db")

from backend.app.database import _bloquear_ddl_fuera_de_migraciones


def _ejecutar_guard(statement):
    return _bloquear_ddl_fuera_de_migraciones(
        None, None, statement, None, None, False
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
    assert _ejecutar_guard("SELECT 1") is None


def test_permite_ddl_en_proceso_de_migracion(monkeypatch):
    monkeypatch.setenv("MOLSAN_ENABLE_RUNTIME_SCHEMA_MIGRATIONS", "true")
    assert _ejecutar_guard("CREATE TABLE public.prueba (id INTEGER)") is None

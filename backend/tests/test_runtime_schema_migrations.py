import pytest

from backend.app.database import _SCHEMA_DDL
from backend.app.schema_migrations import runtime_schema_migrations_enabled


def test_runtime_schema_migrations_are_disabled_by_default():
    assert runtime_schema_migrations_enabled() is False


@pytest.mark.parametrize(
    "statement",
    [
        "CREATE TABLE public.example (id integer)",
        "ALTER TABLE public.example ADD COLUMN enabled boolean",
        "DROP TABLE public.example",
        "TRUNCATE TABLE public.example",
        "DO $$ BEGIN PERFORM 1; END $$",
    ],
)
def test_database_guard_recognizes_schema_ddl(statement):
    assert _SCHEMA_DDL.match(statement)


@pytest.mark.parametrize(
    "statement",
    [
        "SELECT 1",
        "INSERT INTO public.example (id) VALUES (1)",
        "UPDATE public.example SET id = 2",
        "DELETE FROM public.example WHERE id = 1",
    ],
)
def test_database_guard_does_not_block_regular_data_queries(statement):
    assert not _SCHEMA_DDL.match(statement)

import unittest

from backend.app.database import _SCHEMA_DDL
from backend.app.schema_migrations import runtime_schema_migrations_enabled


class RuntimeSchemaMigrationTests(unittest.TestCase):
    def test_runtime_schema_migrations_are_disabled_by_default(self):
        self.assertFalse(runtime_schema_migrations_enabled())

    def test_database_guard_recognizes_schema_ddl(self):
        statements = [
            "CREATE TABLE public.example (id integer)",
            "ALTER TABLE public.example ADD COLUMN enabled boolean",
            "DROP TABLE public.example",
            "TRUNCATE TABLE public.example",
            "DO $$ BEGIN PERFORM 1; END $$",
        ]
        for statement in statements:
            with self.subTest(statement=statement):
                self.assertIsNotNone(_SCHEMA_DDL.match(statement))

    def test_database_guard_does_not_block_regular_data_queries(self):
        statements = [
            "SELECT 1",
            "INSERT INTO public.example (id) VALUES (1)",
            "UPDATE public.example SET id = 2",
            "DELETE FROM public.example WHERE id = 1",
        ]
        for statement in statements:
            with self.subTest(statement=statement):
                self.assertIsNone(_SCHEMA_DDL.match(statement))


if __name__ == "__main__":
    unittest.main()

"""Regression checks for safe, migration-free web startup.

These tests inspect the registered startup hooks without importing the application
or opening a database connection. Schema changes and business-data repair must be
run explicitly, never as a side effect of starting a web worker.
"""
import ast
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / "backend" / "app" / "main.py"
SCHEMA_MIGRATIONS = ROOT / "backend" / "app" / "schema_migrations.py"


def _call_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


class CleanStartupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.main_tree = ast.parse(MAIN.read_text(encoding="utf-8"))
        cls.schema_tree = ast.parse(SCHEMA_MIGRATIONS.read_text(encoding="utf-8"))
        cls.functions = {
            node.name: node
            for node in ast.walk(cls.main_tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

    def test_legacy_auxiliary_startup_is_guarded_before_database_work(self):
        function = self.functions["inicializar_tablas_auxiliares"]
        decorators = [_call_name(item.func) for item in function.decorator_list]
        self.assertIn("on_event", decorators)
        self.assertNotIn("_serializar_inicializacion_startup", decorators)
        guard = function.body[0]
        self.assertIsInstance(guard, ast.Expr)
        self.assertIsInstance(guard.value, ast.Constant)
        self.assertIsInstance(guard.value.value, str)
        guard = function.body[1]
        self.assertIsInstance(guard, ast.If)
        self.assertIsInstance(guard.test, ast.UnaryOp)
        self.assertIsInstance(guard.test.op, ast.Not)
        self.assertEqual(_call_name(guard.test.operand.func), "runtime_schema_migrations_enabled")
        self.assertTrue(any(isinstance(item, ast.Return) for item in guard.body))

    def test_automatic_business_reassignment_is_guarded(self):
        function = self.functions["asignar_gestores_pendientes_al_iniciar"]
        guard = function.body[0]
        self.assertIsInstance(guard, ast.If)
        self.assertIsInstance(guard.test, ast.UnaryOp)
        self.assertIsInstance(guard.test.op, ast.Not)
        self.assertEqual(_call_name(guard.test.operand.func), "runtime_schema_migrations_enabled")
        self.assertTrue(any(isinstance(item, ast.Return) for item in guard.body))

    def test_runtime_schema_migrations_remain_disabled(self):
        function = next(
            node for node in ast.walk(self.schema_tree)
            if isinstance(node, ast.FunctionDef)
            and node.name == "runtime_schema_migrations_enabled"
        )
        self.assertIsInstance(function.body[0], ast.Return)
        self.assertIsInstance(function.body[0].value, ast.Constant)
        self.assertIs(function.body[0].value.value, False)


if __name__ == "__main__":
    unittest.main()

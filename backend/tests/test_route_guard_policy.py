"""Regression tests for centralized API authorization policy."""
import unittest

from backend.app.auth.route_guard import _resolver_accion, _resolver_modulo


class RouteGuardPolicyTests(unittest.TestCase):
    def test_employee_blocking_uses_employee_module(self):
        for suffix in ("bloquear", "desbloquear"):
            path = f"/api/seguridad/asignar/empleado/17/{suffix}"
            self.assertEqual(_resolver_modulo(path), "empleados")
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_employee_permission_management_remains_security_module(self):
        self.assertEqual(
            _resolver_modulo("/api/empleados/17/permisos"),
            "seguridad",
        )

    def test_delete_is_always_delete_permission(self):
        self.assertEqual(
            _resolver_accion("/api/expedientes/17", {"DELETE"}),
            "eliminar",
        )

    def test_unknown_api_path_is_not_silently_mapped(self):
        self.assertIsNone(_resolver_modulo("/api/new-unclassified-module"))


if __name__ == "__main__":
    unittest.main()

"""Regression tests for centralized API authorization policy."""
import hashlib
import unittest

from backend.app.auth.route_guard import _resolver_accion, _resolver_modulo
from backend.app.empleados.service import hash_password, verificar_hash_password


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

    def test_other_security_assignment_routes_remain_security_module(self):
        for path in (
            "/api/seguridad/asignar/empleado/17/password",
            "/api/seguridad/asignar/empleado/17/rol/3",
            "/api/seguridad/asignar/empleado/17/permisos",
            "/api/seguridad/asignar/empleado/17/modulos",
        ):
            self.assertEqual(_resolver_modulo(path), "seguridad")
        for path in (
            "/api/seguridad/asignar/empleado/17/password",
            "/api/seguridad/asignar/empleado/17/rol/3",
            "/api/seguridad/asignar/empleado/17/modulos",
            "/api/seguridad/asignar/empleado/17/permisos",
        ):
            self.assertEqual(_resolver_accion(path, {"POST"}), "editar")

    def test_delete_is_always_delete_permission(self):
        self.assertEqual(
            _resolver_accion("/api/expedientes/17", {"DELETE"}),
            "eliminar",
        )

    def test_payment_void_is_an_edit_not_a_create(self):
        self.assertEqual(
            _resolver_accion(
                "/api/expedientes/17/gastos/3/pagos/9/anular",
                {"POST"},
            ),
            "editar",
        )

    def test_unknown_api_path_is_not_silently_mapped(self):
        self.assertIsNone(_resolver_modulo("/api/new-unclassified-module"))

    def test_new_password_hash_uses_pbkdf2_and_round_trips(self):
        hashed = hash_password("Prueba-segura-123!")
        self.assertTrue(hashed.startswith("pbkdf2_sha256$"))
        self.assertTrue(verificar_hash_password("Prueba-segura-123!", hashed))
        self.assertFalse(verificar_hash_password("otra-clave", hashed))

    def test_legacy_sha256_hash_remains_verifiable_for_login_migration(self):
        legacy = hashlib.sha256("Clave-antigua-123!".encode("utf-8")).hexdigest()
        self.assertTrue(verificar_hash_password("Clave-antigua-123!", legacy))
        self.assertFalse(verificar_hash_password("incorrecta", legacy))


if __name__ == "__main__":
    unittest.main()

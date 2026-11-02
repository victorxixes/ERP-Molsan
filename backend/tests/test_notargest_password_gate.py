"""Pruebas de la barrera de cambio de contraseña provisional de NotarGest."""
import unittest
from types import SimpleNamespace

from backend.app.notargest.router import (
    _accion_requerida_notargest,
    _requiere_cambio_password_notargest,
    _ruta_permitida_durante_cambio_password,
    _es_administrador_notargest,
    _registrar_password_inicial_notargest,
    _validar_password_login_notargest,
    hash_password,
    normalizar_nif,
    verificar_password,
)


class NotarGestPasswordGateTests(unittest.TestCase):
    def test_initial_nif_password_requires_a_password_change(self):
        notaria = SimpleNamespace(
            notargest_cambiar_password=True,
            notargest_password_provisional=True,
            notargest_password_hash=None,
        )
        nif = "12345678Z"
        _registrar_password_inicial_notargest(notaria, nif)
        self.assertTrue(_requiere_cambio_password_notargest(notaria))
        self.assertTrue(verificar_password(nif, notaria.notargest_password_hash))
        self.assertTrue(notaria.notargest_password_provisional)

    def test_nif_normalization_accepts_uppercase_letter_and_separators(self):
        self.assertEqual(normalizar_nif(" 12345678z "), "12345678Z")
        self.assertEqual(normalizar_nif("12-345-678-Z"), "12345678Z")

    def test_reset_to_nif_keeps_the_forced_password_change(self):
        nif = "12345678Z"
        notaria = SimpleNamespace(
            notargest_cambiar_password=True,
            notargest_password_provisional=True,
            notargest_password_hash=hash_password(nif),
        )
        self.assertTrue(_validar_password_login_notargest(notaria, nif, nif))
        self.assertTrue(_requiere_cambio_password_notargest(notaria))

    def test_changed_password_does_not_require_change(self):
        notaria = SimpleNamespace(
            notargest_cambiar_password=False,
            notargest_password_provisional=False,
        )
        self.assertFalse(_requiere_cambio_password_notargest(notaria))

    def test_only_profile_and_password_change_routes_are_allowed(self):
        self.assertTrue(_ruta_permitida_durante_cambio_password("/api/notargest/me"))
        self.assertTrue(_ruta_permitida_durante_cambio_password("/api/notargest/cambiar-password"))
        self.assertFalse(_ruta_permitida_durante_cambio_password("/api/notargest/expedientes"))
        self.assertFalse(_ruta_permitida_durante_cambio_password("/notargest/me"))

    def test_admin_only_guard_recognizes_admin_roles(self):
        self.assertTrue(_es_administrador_notargest(SimpleNamespace(usuario="admin", rol=None)))
        self.assertTrue(_es_administrador_notargest(SimpleNamespace(usuario="cuenta-tecnica", rol_id=0)))
        self.assertTrue(_es_administrador_notargest(SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Administrador"))))
        self.assertTrue(_es_administrador_notargest(SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Superadministrador"))))
        self.assertTrue(_es_administrador_notargest(SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Administrador del sistema"))))
        self.assertFalse(_es_administrador_notargest(SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Gestor"))))

    def test_internal_notargest_writes_require_correct_permission(self):
        self.assertEqual(_accion_requerida_notargest("GET", "/api/notargest/expedientes"), "ver")
        self.assertEqual(_accion_requerida_notargest("POST", "/api/notargest/seleccion/notaria/2"), "ver")
        self.assertEqual(_accion_requerida_notargest("PATCH", "/api/notargest/expedientes/2/firma"), "editar")
        self.assertEqual(_accion_requerida_notargest("POST", "/api/notargest/expedientes/2/estado"), "editar")
        self.assertEqual(_accion_requerida_notargest("DELETE", "/api/notargest/expedientes/2"), "eliminar")


if __name__ == "__main__":
    unittest.main()

"""Pruebas de la barrera de cambio de contraseña provisional de NotarGest."""
import unittest
from types import SimpleNamespace

from backend.app.notargest.router import (
    _requiere_cambio_password_notargest,
    _ruta_permitida_durante_cambio_password,
)


class NotarGestPasswordGateTests(unittest.TestCase):
    def test_provisional_password_requires_change(self):
        notaria = SimpleNamespace(
            notargest_cambiar_password=True,
            notargest_password_provisional=True,
        )
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


if __name__ == "__main__":
    unittest.main()

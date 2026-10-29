"""Pruebas de la barrera de contraseña provisional de EncargaGest."""
import unittest

from backend.app.encargagest.router import _ruta_permitida_durante_cambio_password_encargagest


class EncargaGestPasswordGateTests(unittest.TestCase):
    def test_only_profile_and_password_change_routes_are_allowed(self):
        self.assertTrue(_ruta_permitida_durante_cambio_password_encargagest("/api/encargagest/me"))
        self.assertTrue(_ruta_permitida_durante_cambio_password_encargagest("/api/encargagest/cambiar-password"))
        self.assertFalse(_ruta_permitida_durante_cambio_password_encargagest("/api/encargagest/encargos"))
        self.assertFalse(_ruta_permitida_durante_cambio_password_encargagest("/encargagest/me"))


if __name__ == "__main__":
    unittest.main()

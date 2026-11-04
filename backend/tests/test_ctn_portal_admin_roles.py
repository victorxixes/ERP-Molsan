"""Los roles administradores deben ser coherentes en la gestión CTN de portales."""
import unittest
from types import SimpleNamespace

from backend.app.ctn.router import _es_administrador_portales


class CtnPortalAdminRoleTests(unittest.TestCase):
    def test_supported_administrator_roles(self):
        for role in (
            "Administrador",
            "Administradora",
            "Admin",
            "Superadmin",
            "Superadministrador",
            "Administrador del sistema",
        ):
            usuario = SimpleNamespace(rol=SimpleNamespace(nombre=role))
            self.assertTrue(_es_administrador_portales(usuario), role)

    def test_technical_admin_account_is_recognized(self):
        self.assertTrue(_es_administrador_portales(SimpleNamespace(usuario="admin", rol_id=0)))
        self.assertTrue(_es_administrador_portales(SimpleNamespace(usuario="cuenta-tecnica", rol_id=0)))

    def test_non_admin_role_is_not_elevated(self):
        usuario = SimpleNamespace(usuario="gestor", rol_id=4, rol=SimpleNamespace(nombre="Gestor"))
        self.assertFalse(_es_administrador_portales(usuario))


if __name__ == "__main__":
    unittest.main()

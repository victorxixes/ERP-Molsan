"""Mensajería Gestión reconoce solo administradores explícitos y el rol técnico raíz."""

import unittest
from types import SimpleNamespace

from backend.app.mensajeria_molsan.router import _es_administrador_mensajeria


class MensajeriaAdminRoleTests(unittest.TestCase):
    def test_supported_administrator_roles(self):
        for role in (
            "Admin", "Administrador", "Administradora", "Superadmin",
            "Superadministrador", "Administrador del sistema", "Administrador general",
        ):
            usuario = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre=role), rol_id=4)
            self.assertTrue(_es_administrador_mensajeria(usuario), role)

    def test_root_role_id_and_explicit_admin_account_are_recognized(self):
        self.assertTrue(_es_administrador_mensajeria(SimpleNamespace(usuario="tecnico", rol_id=0, rol=None)))
        self.assertTrue(_es_administrador_mensajeria(SimpleNamespace(usuario="admin", rol_id=4, rol=None)))

    def test_administrative_job_title_is_not_an_admin_role(self):
        usuario = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Administrativo"), rol_id=4)
        self.assertFalse(_es_administrador_mensajeria(usuario))


if __name__ == "__main__":
    unittest.main()

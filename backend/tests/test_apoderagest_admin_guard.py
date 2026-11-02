"""Los privilegios de administración de ApoderaGest no se conceden por coincidencias parciales."""

import unittest
from types import SimpleNamespace

from backend.app.apoderagest.encargos.router import _es_administrador_apoderagest
from backend.app.apoderagest.liquidaciones import _es_admin


class ApoderaGestAdminGuardTests(unittest.TestCase):
    def test_exact_administrator_roles_are_accepted(self):
        for role in (
            "Admin",
            "Administrador",
            "Administradora",
            "Superadmin",
            "Superadministrador",
            "Administrador del sistema",
            "Administrador general",
        ):
            usuario = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre=role), rol_id=4)
            self.assertTrue(_es_administrador_apoderagest(usuario), role)
            self.assertTrue(_es_admin(usuario), role)

    def test_administrative_job_title_is_not_an_admin_role(self):
        usuario = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Administrativo"), rol_id=4)
        self.assertFalse(_es_administrador_apoderagest(usuario))
        self.assertFalse(_es_admin(usuario))

    def test_generic_utilities_edit_permission_does_not_grant_liquidation_admin(self):
        usuario = SimpleNamespace(
            usuario="operador",
            rol=SimpleNamespace(nombre="Gestor"),
            rol_id=4,
            permisos_modulo_dict={"utilidades": {"editar": True}, "seguridad": {"editar": True}},
        )
        self.assertFalse(_es_admin(usuario))

    def test_explicit_admin_identity_is_accepted(self):
        usuario = SimpleNamespace(usuario="admin", rol=SimpleNamespace(nombre="Gestor"), rol_id=4)
        self.assertTrue(_es_administrador_apoderagest(usuario))
        self.assertTrue(_es_admin(usuario))

    def test_global_explicit_apoderagest_admin_permission_is_accepted(self):
        usuario = {
            "usuario": "operador",
            "permisos_modulo_dict": {"apoderagest": {"administrar": True}},
        }
        self.assertTrue(_es_administrador_apoderagest(usuario))


if __name__ == "__main__":
    unittest.main()

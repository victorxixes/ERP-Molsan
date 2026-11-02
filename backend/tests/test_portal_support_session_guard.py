"""Las sesiones delegadas de soporte deben seguir vinculadas al administrador vigente."""
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from backend.app.notargest.router import _validar_admin_soporte_notargest
from backend.app.encargagest.router import _validar_admin_soporte_encargagest


class FakeQuery:
    def __init__(self, actor):
        self.actor = actor

    def filter(self, *_args):
        return self

    def first(self):
        return self.actor


class FakeDB:
    def __init__(self, actor):
        self.actor = actor

    def query(self, _model):
        return FakeQuery(self.actor)


class PortalSupportSessionGuardTests(unittest.TestCase):
    def setUp(self):
        self.admin = SimpleNamespace(
            id=4,
            usuario="operador",
            rol=SimpleNamespace(nombre="Administrador"),
            activo=True,
            modulos_visibles_list=["notargest", "encargagest"],
        )

    def test_notargest_support_session_requires_current_active_admin(self):
        with patch("backend.app.notargest.router.require_perm_modulo") as permiso:
            actor = _validar_admin_soporte_notargest(
                {"empleado_admin_id": 4}, FakeDB(self.admin)
            )
        self.assertIs(actor, self.admin)
        permiso.assert_called_once_with(self.admin, "notargest", "ver")

    def test_notargest_support_session_is_revoked_when_admin_is_inactive(self):
        admin = SimpleNamespace(**{**self.admin.__dict__, "activo": False})
        with self.assertRaises(HTTPException) as error:
            _validar_admin_soporte_notargest({"empleado_admin_id": 4}, FakeDB(admin))
        self.assertEqual(error.exception.status_code, 401)

    def test_encargagest_support_session_requires_current_active_admin(self):
        with patch("backend.app.encargagest.router.require_perm_modulo") as permiso:
            actor = _validar_admin_soporte_encargagest(
                {"empleado_admin_id": 4}, FakeDB(self.admin)
            )
        self.assertIs(actor, self.admin)
        permiso.assert_called_once_with(self.admin, "encargagest", "ver")

    def test_encargagest_support_session_is_revoked_when_role_is_demoted(self):
        admin = SimpleNamespace(**{
            **self.admin.__dict__,
            "rol": SimpleNamespace(nombre="Gestor"),
        })
        with self.assertRaises(HTTPException) as error:
            _validar_admin_soporte_encargagest({"empleado_admin_id": 4}, FakeDB(admin))
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()

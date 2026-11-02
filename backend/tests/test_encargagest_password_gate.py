"""Pruebas de la barrera de contraseña provisional de EncargaGest."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.encargagest.router import (
    _ruta_permitida_durante_cambio_password_encargagest,
    _es_administrador_encargagest,
    _exigir_admin_encargagest,
    _observacion_ctn_visible_encargagest,
    _notaria_permitida,
)


class EncargaGestPasswordGateTests(unittest.TestCase):

    def test_access_administration_is_restricted_to_explicit_admin_roles(self):
        admin = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Administrador"))
        empleado = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Gestor"))
        self.assertTrue(_es_administrador_encargagest(admin))
        self.assertTrue(_es_administrador_encargagest(SimpleNamespace(usuario="cuenta-tecnica", rol_id=0)))
        for role in ("Superadmin", "Superadministrador", "Administrador del sistema"):
            usuario = SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre=role))
            self.assertTrue(_es_administrador_encargagest(usuario), role)
        self.assertFalse(_es_administrador_encargagest(empleado))
        self.assertIs(_exigir_admin_encargagest(admin), admin)
        with self.assertRaises(HTTPException) as error:
            _exigir_admin_encargagest(empleado)
        self.assertEqual(error.exception.status_code, 403)

    def test_external_actor_cannot_administer_external_accounts(self):
        externo = {"tipo": "externo", "notaria_id": 7}
        with self.assertRaises(HTTPException) as error:
            _exigir_admin_encargagest(externo)
        self.assertEqual(error.exception.status_code, 403)

    def test_only_profile_and_password_change_routes_are_allowed(self):
        self.assertTrue(_ruta_permitida_durante_cambio_password_encargagest("/api/encargagest/me"))
        self.assertTrue(_ruta_permitida_durante_cambio_password_encargagest("/api/encargagest/cambiar-password"))
        self.assertFalse(_ruta_permitida_durante_cambio_password_encargagest("/api/encargagest/encargos"))
        self.assertFalse(_ruta_permitida_durante_cambio_password_encargagest("/encargagest/me"))

    def test_external_actor_is_scoped_to_its_own_notary(self):
        externo = {"tipo": "externo", "notaria_id": 7}
        self.assertTrue(_notaria_permitida(externo, 7))
        self.assertFalse(_notaria_permitida(externo, 8))

    def test_internal_employee_is_scoped_to_assigned_notaries(self):
        empleado = SimpleNamespace(
            usuario="gestor",
            rol=SimpleNamespace(nombre="Gestor"),
            rol_id=4,
            notarias_encargagest_ids=[7, "9"],
        )
        self.assertTrue(_notaria_permitida(empleado, 7))
        self.assertTrue(_notaria_permitida(empleado, 9))
        self.assertFalse(_notaria_permitida(empleado, 8))

    def test_administrator_can_access_notary_scope(self):
        admin = SimpleNamespace(usuario="admin", rol=SimpleNamespace(nombre="Administrador"), rol_id=0)
        self.assertTrue(_notaria_permitida(admin, 7))
        self.assertTrue(_notaria_permitida(admin, 999))

    def test_internal_ctn_observation_hidden_from_external_encargagest(self):
        notaria = SimpleNamespace(observacion="Nota interna")
        usuario = {"tipo": "externo", "sesion_soporte": False}
        self.assertIsNone(_observacion_ctn_visible_encargagest(notaria, usuario))

    def test_internal_ctn_observation_visible_in_admin_support_session(self):
        notaria = SimpleNamespace(observacion="Nota interna")
        usuario = {"tipo": "externo", "sesion_soporte": True}
        self.assertEqual(_observacion_ctn_visible_encargagest(notaria, usuario), "Nota interna")


if __name__ == "__main__":
    unittest.main()

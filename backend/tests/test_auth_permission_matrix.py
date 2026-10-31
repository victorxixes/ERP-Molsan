"""Contrato HTTP de autenticación y matriz de permisos por perfil."""
import unittest
from types import SimpleNamespace

import jwt
from fastapi import HTTPException

from backend.app.auth.dependencies import (
    bearer_scheme,
    get_current_user,
    obtener_token_bearer,
)
from backend.app.auth.permissions import require_perm_modulo
from backend.app.config import settings


class _FakeQuery:
    def __init__(self, empleado):
        self.empleado = empleado

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self.empleado


class _FakeDb:
    def __init__(self, empleado):
        self.empleado = empleado

    def query(self, *_args, **_kwargs):
        return _FakeQuery(self.empleado)


class AuthPermissionMatrixTests(unittest.TestCase):
    def token(self, empleado_id=12):
        return jwt.encode(
            {"id": empleado_id},
            settings.JWT_SECRET,
            algorithm=settings.ALGORITHM,
        )

    def test_missing_bearer_credentials_returns_401_not_403(self):
        self.assertFalse(bearer_scheme.auto_error)
        with self.assertRaises(HTTPException) as caught:
            obtener_token_bearer(None)
        self.assertEqual(caught.exception.status_code, 401)
        self.assertEqual(caught.exception.headers["WWW-Authenticate"], "Bearer")

    def test_invalid_token_returns_401(self):
        with self.assertRaises(HTTPException) as caught:
            get_current_user("token-no-valido", _FakeDb(None))
        self.assertEqual(caught.exception.status_code, 401)

    def test_inactive_employee_returns_401(self):
        empleado = SimpleNamespace(id=12, activo=False)
        with self.assertRaises(HTTPException) as caught:
            get_current_user(self.token(), _FakeDb(empleado))
        self.assertEqual(caught.exception.status_code, 401)

    def test_valid_employee_without_module_permission_gets_403(self):
        empleado = SimpleNamespace(
            id=12,
            activo=True,
            rol=SimpleNamespace(nombre="Técnico"),
            permisos_modulo_dict={"agenda": ["ver"]},
        )
        autenticado = get_current_user(self.token(), _FakeDb(empleado))
        self.assertIs(autenticado, empleado)
        with self.assertRaises(HTTPException) as caught:
            require_perm_modulo(autenticado, "ctn", "ver")
        self.assertEqual(caught.exception.status_code, 403)

    def test_valid_employee_with_explicit_module_permission_is_authorized(self):
        empleado = SimpleNamespace(
            id=12,
            activo=True,
            rol=SimpleNamespace(nombre="Técnico"),
            permisos_modulo_dict={"ctn": ["ver"]},
        )
        autenticado = get_current_user(self.token(), _FakeDb(empleado))
        self.assertIs(autenticado, empleado)
        self.assertTrue(require_perm_modulo(autenticado, "ctn", "ver"))

    def test_profile_name_does_not_grant_permissions_implicitly(self):
        perfiles = (
            ("Administrador", {}),
            ("Técnico", {}),
            ("Colaborador", {}),
        )
        for nombre_rol, permisos in perfiles:
            with self.subTest(perfil=nombre_rol):
                usuario = SimpleNamespace(
                    rol=SimpleNamespace(nombre=nombre_rol),
                    permisos_modulo_dict=permisos,
                )
                with self.assertRaises(HTTPException) as caught:
                    require_perm_modulo(usuario, "seguridad", "editar")
                self.assertEqual(caught.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()

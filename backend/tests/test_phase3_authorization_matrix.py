"""Smoke contract for the Phase 3 authorization matrix."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.auth.permissions import require_perm_modulo
from backend.app.auth.route_guard import (
    _RUTAS_CON_AUTORIZACION_INTERNA,
    _resolver_accion,
    _resolver_modulo,
)


class Phase3AuthorizationMatrixTests(unittest.TestCase):
    def test_ui_modules_are_mapped_to_their_api_permission_keys(self):
        expected = {
            "/api/ctn/notarias": "ctn",
            "/api/catalogos-absis": "catalogos",
            "/api/informes": "informes",
            "/api/fusiones": "fusiones",
        }
        for path, module in expected.items():
            with self.subTest(path=path):
                self.assertEqual(_resolver_modulo(path, {"GET"}), module)

    def test_shared_catalog_routes_use_endpoint_level_authorization(self):
        expected = {
            "/api/ctn/notarias",
            "/api/ctn/notarias/{notaria_id}",
            "/api/entidades-bancarias",
            "/api/entidades-bancarias/auditoria-sucesiones",
            "/api/entidades-bancarias/importar-excel",
            "/api/entidades-bancarias/{entidad_id}",
        }
        self.assertTrue(expected.issubset(set(_RUTAS_CON_AUTORIZACION_INTERNA)))

    def test_write_actions_are_not_misclassified_as_create(self):
        self.assertEqual(
            _resolver_accion("/api/ctn/notarias/12/datos-bancarios", {"PUT"}),
            "editar",
        )
        self.assertEqual(
            _resolver_accion("/api/entidades-bancarias/12", {"DELETE"}),
            "eliminar",
        )

    def test_authorized_profile_receives_permission_and_disallowed_profile_gets_403(self):
        allowed = SimpleNamespace(permisos_modulo_dict={"ctn": ["ver"]})
        self.assertTrue(require_perm_modulo(allowed, "ctn", "ver"))

        denied = SimpleNamespace(permisos_modulo_dict={"agenda": ["ver"]})
        with self.assertRaises(HTTPException) as error:
            require_perm_modulo(denied, "ctn", "ver")
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()

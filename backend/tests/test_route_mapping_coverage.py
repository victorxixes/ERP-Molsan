"""Cobertura del mapeo granular del guard global de rutas API."""
import unittest

from fastapi.routing import APIRoute

from backend.app.auth.route_guard import (
    RUTAS_PUBLICAS_EXACTAS,
    _normalizar_path,
    _resolver_modulo,
    _ya_tiene_visibilidad_expediente,
)
from backend.app.main import app


class RouteMappingCoverageTests(unittest.TestCase):
    def test_all_case_id_routes_have_visibility_guard(self):
        missing = []
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            path = _normalizar_path(getattr(route, "path", ""))
            if not path.startswith("/api/"):
                continue
            if path.startswith("/api/notargest/") or path.startswith("/api/encargagest/"):
                continue
            path_format = getattr(route, "path_format", route.path)
            if "{expediente_id}" not in path_format and "{id_expediente}" not in path_format:
                continue
            if not _ya_tiene_visibilidad_expediente(route.dependant):
                missing.append(f"{sorted(route.methods or [])} {path_format}")

        self.assertEqual(
            missing,
            [],
            "Hay rutas de expediente sin comprobación del ámbito de reparto.",
        )

    def test_all_protected_api_routes_have_a_module_mapping(self):
        unmapped = []
        for route in app.routes:
            if not isinstance(route, APIRoute):
                continue
            path = _normalizar_path(getattr(route, "path", ""))
            if not path.startswith("/api/"):
                continue
            if path in RUTAS_PUBLICAS_EXACTAS:
                continue
            # Estos módulos autentican y autorizan con dependencias propias.
            if path.startswith("/api/notargest/") or path.startswith("/api/encargagest/"):
                continue
            if _resolver_modulo(path, getattr(route, "methods", None)) is None:
                unmapped.append(f"{sorted(route.methods or [])} {path}")

        self.assertEqual(
            unmapped,
            [],
            "Hay rutas API protegidas solo por JWT sin módulo de permiso granular.",
        )


if __name__ == "__main__":
    unittest.main()

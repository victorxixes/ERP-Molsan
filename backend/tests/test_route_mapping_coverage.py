"""Cobertura del mapeo granular del guard global de rutas API."""
import unittest

from fastapi.routing import APIRoute

from backend.app.auth.route_guard import (
    RUTAS_PUBLICAS_EXACTAS,
    _normalizar_path,
    _resolver_modulo,
)
from backend.app.main import app


class RouteMappingCoverageTests(unittest.TestCase):
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

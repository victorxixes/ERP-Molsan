"""Contrato de ruta del exportador administrativo de Fichajes."""

import unittest
from types import SimpleNamespace

from backend.app.fichajes.router import router, _es_admin


class FichajesExportRouteTests(unittest.TestCase):
    def test_admin_guard_accepts_only_explicit_administrator_roles(self):
        self.assertTrue(_es_admin(SimpleNamespace(usuario="admin", rol=None)))
        self.assertTrue(_es_admin(SimpleNamespace(usuario="tecnico", rol_id=0, rol=None)))
        self.assertTrue(_es_admin(SimpleNamespace(usuario="operador", rol=SimpleNamespace(nombre="Administrador del sistema"))))
        self.assertFalse(_es_admin(SimpleNamespace(usuario="operador", rol_id=4, rol=SimpleNamespace(nombre="Administrativo"))))

    def test_admin_export_route_is_registered_as_get(self):
        ruta = next(
            (
                item for item in router.routes
                if getattr(item, "path", None) == "/fichajes/admin/marcajes/exportar"
            ),
            None,
        )
        self.assertIsNotNone(ruta, "El frontend necesita la ruta de exportación CSV.")
        self.assertIn("GET", ruta.methods)


if __name__ == "__main__":
    unittest.main()

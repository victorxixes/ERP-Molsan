"""Contrato de ruta del exportador administrativo de Fichajes."""

import unittest

from backend.app.fichajes.router import router


class FichajesExportRouteTests(unittest.TestCase):
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

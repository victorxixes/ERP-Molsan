"""La inicialización de Mensajería se ejecuta en el arranque y prepara sus tablas."""

import unittest

from sqlalchemy import inspect

from backend.app.database import engine
from backend.app.mensajeria_molsan.router import inicializar_tablas_mensajeria


class MensajeriaSchemaStartupTests(unittest.TestCase):
    def test_startup_initializes_required_tables(self):
        inicializar_tablas_mensajeria()
        inspector = inspect(engine)
        for table in (
            "mensajeria_servicios",
            "mensajeria_solicitudes",
            "mensajeria_albaranes",
            "mensajeria_facturas",
            "mensajeria_factura_albaran",
            "mensajeria_proveedores",
            "mensajeria_comunicaciones",
        ):
            self.assertTrue(inspector.has_table(table), f"Falta la tabla {table}")


if __name__ == "__main__":
    unittest.main()

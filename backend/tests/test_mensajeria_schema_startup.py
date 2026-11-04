"""La inicialización de Mensajería queda registrada en el ciclo de arranque."""

import unittest

from backend.app.mensajeria_molsan.router import inicializar_tablas_mensajeria, router


class MensajeriaSchemaStartupTests(unittest.TestCase):
    def test_schema_initializer_is_registered_for_startup(self):
        self.assertIn(inicializar_tablas_mensajeria, router.on_startup)


if __name__ == "__main__":
    unittest.main()

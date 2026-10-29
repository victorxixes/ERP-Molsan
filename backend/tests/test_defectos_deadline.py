"""Pruebas de la regla de vencimiento de defectos registrales."""
import unittest
from datetime import date

from backend.app.expedientes.defectos.router import _calcular_vencimiento_presentacion


class DefectosDeadlineTests(unittest.TestCase):
    def test_vencimiento_is_60_calendar_days_after_qualification(self):
        self.assertEqual(
            _calcular_vencimiento_presentacion(date(2026, 1, 1)),
            date(2026, 3, 2),
        )

    def test_missing_qualification_has_no_derived_deadline(self):
        self.assertIsNone(_calcular_vencimiento_presentacion(None))


if __name__ == "__main__":
    unittest.main()

"""Pruebas de la regla de vencimiento de defectos registrales."""
import unittest
from datetime import date
from types import SimpleNamespace

from backend.app.expedientes.defectos.router import (
    _calcular_vencimiento_presentacion,
    datos_defecto,
)


class DefectosDeadlineTests(unittest.TestCase):
    def test_vencimiento_is_60_calendar_days_after_qualification(self):
        self.assertEqual(
            _calcular_vencimiento_presentacion(date(2026, 1, 1)),
            date(2026, 3, 2),
        )

    def test_missing_qualification_has_no_derived_deadline(self):
        self.assertIsNone(_calcular_vencimiento_presentacion(None))

    def test_historical_serialization_uses_derived_deadline_without_db_write(self):
        defecto = SimpleNamespace(
            id=1,
            fecha_calificacion=date(2026, 1, 1),
            fecha_vencimiento_presentacion=date(2026, 1, 15),
        )
        resultado = datos_defecto(defecto)
        self.assertEqual(resultado["fecha_vencimiento_presentacion"], "2026-03-02")


if __name__ == "__main__":
    unittest.main()

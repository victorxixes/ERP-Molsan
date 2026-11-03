"""Regression tests for tax-inclusive central management-fee amounts."""
import unittest
from decimal import Decimal

from backend.app.honorarios_gestoria.router import HonorarioPayload


class HonorarioGestoriaCalculationTests(unittest.TestCase):
    def test_iva_is_added_to_taxable_base(self):
        data = HonorarioPayload(
            nombre="Prueba IVA",
            base_imponible=Decimal("69.00"),
            tipo_impuesto="IVA",
            porcentaje_impuesto=Decimal("21"),
        ).datos_con_total()
        self.assertEqual(data["importe"], Decimal("83.49"))

    def test_igic_is_added_to_taxable_base(self):
        data = HonorarioPayload(
            nombre="Prueba IGIC",
            base_imponible=Decimal("69.00"),
            tipo_impuesto="IGIC",
            porcentaje_impuesto=Decimal("7"),
        ).datos_con_total()
        self.assertEqual(data["importe"], Decimal("73.83"))

    def test_exempt_fee_has_no_tax_added(self):
        data = HonorarioPayload(
            nombre="Prueba exenta",
            base_imponible=Decimal("69.00"),
            tipo_impuesto="EXENTO",
            porcentaje_impuesto=Decimal("21"),
        ).datos_con_total()
        self.assertEqual(data["importe"], Decimal("69.00"))

    def test_legacy_total_without_base_is_preserved_as_exempt(self):
        data = HonorarioPayload(
            nombre="Prueba histórica",
            importe=Decimal("111.32"),
        ).datos_con_total()
        self.assertEqual(data["importe"], Decimal("111.32"))
        self.assertEqual(data["tipo_impuesto"], "EXENTO")


if __name__ == "__main__":
    unittest.main()

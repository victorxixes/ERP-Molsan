"""Regression smoke tests for the current Phase 3 payment rules."""
import unittest
from datetime import date
from decimal import Decimal

from backend.app.expedientes.gastos.router import (
    _crear_obligacion_pendiente,
    _estado_pago_desde_totales,
)


class Phase3PaymentRegressionTests(unittest.TestCase):
    def test_invoice_attachment_stays_pending_until_a_real_payment(self):
        obligation = _crear_obligacion_pendiente(
            expediente_id=7,
            tipo="Factura notarial",
            descripcion="Factura.pdf",
            fecha=date(2026, 10, 31),
            documento_carpeta_id=91,
        )
        self.assertEqual(obligation.estado_pago, "Pendiente")
        self.assertIsNone(obligation.fecha_pago)

    def test_partial_payment_does_not_mark_obligation_paid(self):
        self.assertEqual(
            _estado_pago_desde_totales(Decimal("125.00"), Decimal("80.00")),
            "Parcial",
        )

    def test_exact_payment_marks_obligation_paid(self):
        self.assertEqual(
            _estado_pago_desde_totales(Decimal("125.00"), Decimal("125.00")),
            "Pagado",
        )

    def test_no_payment_keeps_obligation_pending(self):
        self.assertEqual(
            _estado_pago_desde_totales(Decimal("125.00"), Decimal("0.00")),
            "Pendiente",
        )


if __name__ == "__main__":
    unittest.main()

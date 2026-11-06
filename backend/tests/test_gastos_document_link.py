"""Regresión de integridad documental y conciliación de pagos de gastos."""
import unittest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.expedientes.gastos.router import (
    _crear_obligacion_pendiente,
    _estado_pago_desde_totales,
    _tipo_gasto_desde_categoria,
    _validar_documento_economico,
    _total_pagado_efectivo,
    _importe_obligacion_gasto,
)


class EconomicDocumentLinkTests(unittest.TestCase):
    def setUp(self):
        self.expediente = SimpleNamespace(id_expediente="EXP-100")
        self.documento = SimpleNamespace(
            id=25,
            expediente_id="EXP-100",
            categoria="Factura registral",
        )

    def test_factura_registro_alias_maps_to_registral_obligation(self):
        self.assertEqual(_tipo_gasto_desde_categoria(" Factura registro "), "Factura registral")
        self.assertEqual(_tipo_gasto_desde_categoria("FACTURA REGISTRAL"), "Factura registral")

    def test_accepts_document_from_same_expediente_and_category(self):
        _validar_documento_economico(self.expediente, self.documento, "Factura registral")

    def test_rejects_document_from_another_expediente_without_disclosing_it(self):
        self.documento.expediente_id = "EXP-200"
        with self.assertRaises(HTTPException) as caught:
            _validar_documento_economico(self.expediente, self.documento, "Factura registral")
        self.assertEqual(caught.exception.status_code, 404)

    def test_accepts_legacy_factura_registro_category_alias(self):
        self.documento.categoria = "Factura registro"
        _validar_documento_economico(self.expediente, self.documento, "Factura registral")

    def test_rejects_category_mismatch(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_documento_economico(self.expediente, self.documento, "Factura notarial")
        self.assertEqual(caught.exception.status_code, 422)

    def test_rejects_missing_document(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_documento_economico(self.expediente, None, "Factura registral")
        self.assertEqual(caught.exception.status_code, 404)

    def test_attaching_invoice_creates_pending_obligation_not_payment(self):
        gasto = _crear_obligacion_pendiente(
            expediente_id=10,
            tipo="Factura notarial",
            descripcion="Factura notaría.pdf",
            fecha=date(2026, 10, 31),
            documento_carpeta_id=25,
        )
        self.assertEqual(gasto.estado_pago, "Pendiente")
        self.assertIsNone(gasto.fecha_pago)
        self.assertEqual(gasto.documento_carpeta_id, 25)

    def test_payment_state_is_derived_from_real_paid_totals(self):
        self.assertEqual(_estado_pago_desde_totales(Decimal("100"), Decimal("0")), "Pendiente")
        self.assertEqual(_estado_pago_desde_totales(Decimal("100"), Decimal("35")), "Parcial")
        self.assertEqual(_estado_pago_desde_totales(Decimal("100"), Decimal("100")), "Pagado")

    def test_zero_obligation_never_becomes_paid_by_default(self):
        self.assertEqual(_estado_pago_desde_totales(Decimal("0"), Decimal("0")), "Pendiente")

    def test_obligation_prefers_net_amount_then_gross_then_legacy_amount(self):
        net = SimpleNamespace(importe_resultante=Decimal("90.00"), importe_total_bruto=Decimal("100.00"), importe=Decimal("95.00"))
        gross = SimpleNamespace(importe_resultante=None, importe_total_bruto=Decimal("100.00"), importe=Decimal("95.00"))
        legacy = SimpleNamespace(importe_resultante=None, importe_total_bruto=None, importe=Decimal("95.00"))
        self.assertEqual(_importe_obligacion_gasto(net), Decimal("90.00"))
        self.assertEqual(_importe_obligacion_gasto(gross), Decimal("100.00"))
        self.assertEqual(_importe_obligacion_gasto(legacy), Decimal("95.00"))

    def test_legacy_paid_without_movements_blocks_additional_payment_balance(self):
        self.assertEqual(_total_pagado_efectivo("Pagado", "100.00", "0.00", 0), Decimal("100.00"))

    def test_partial_payments_use_only_real_payment_movements(self):
        self.assertEqual(_total_pagado_efectivo("Parcial", "100.00", "35.00", 2), Decimal("35.00"))

    def test_annulled_movements_do_not_fall_back_to_legacy_paid_status(self):
        self.assertEqual(_total_pagado_efectivo("Pagado", "100.00", "0.00", 1), Decimal("0.00"))


if __name__ == "__main__":
    unittest.main()

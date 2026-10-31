"""Validación de integridad al vincular documentos económicos."""
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
        self.assertEqual(
            _tipo_gasto_desde_categoria(" Factura registro "),
            "Factura registral",
        )
        self.assertEqual(
            _tipo_gasto_desde_categoria("FACTURA REGISTRAL"),
            "Factura registral",
        )

    def test_accepts_document_from_same_expediente_and_category(self):
        _validar_documento_economico(
            self.expediente,
            self.documento,
            "Factura registral",
        )

    def test_rejects_document_from_another_expediente_without_disclosing_it(self):
        self.documento.expediente_id = "EXP-200"
        with self.assertRaises(HTTPException) as caught:
            _validar_documento_economico(
                self.expediente,
                self.documento,
                "Factura registral",
            )
        self.assertEqual(caught.exception.status_code, 404)

    def test_accepts_legacy_factura_registro_category_alias(self):
        self.documento.categoria = "Factura registro"
        _validar_documento_economico(
            self.expediente,
            self.documento,
            "Factura registral",
        )

    def test_rejects_category_mismatch(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_documento_economico(
                self.expediente,
                self.documento,
                "Factura notarial",
            )
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


if __name__ == "__main__":
    unittest.main()

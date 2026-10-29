"""Validación de integridad al vincular documentos económicos."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.expedientes.gastos.router import _validar_documento_economico


class EconomicDocumentLinkTests(unittest.TestCase):
    def setUp(self):
        self.expediente = SimpleNamespace(id_expediente="EXP-100")
        self.documento = SimpleNamespace(
            id=25,
            expediente_id="EXP-100",
            categoria="Factura registral",
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


if __name__ == "__main__":
    unittest.main()

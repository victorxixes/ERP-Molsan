"""Pruebas de formatos permitidos y entrega segura de la Carpeta Digital."""
import unittest

from fastapi import HTTPException

from backend.app.carpeta_digital.router import (
    _politica_descarga_documento,
    _tipo_mime_documento_seguro,
)


class CarpetaDigitalMimeTests(unittest.TestCase):
    def test_pdf_is_allowed_and_inline(self):
        extension, mime = _tipo_mime_documento_seguro("factura.pdf")
        self.assertEqual(extension, ".pdf")
        self.assertEqual(mime, "application/pdf")
        self.assertEqual(_politica_descarga_documento("factura.pdf")[1], "inline")

    def test_office_document_is_attachment(self):
        extension, mime = _tipo_mime_documento_seguro("hoja.xlsx")
        self.assertEqual(extension, ".xlsx")
        self.assertTrue(mime)
        self.assertEqual(_politica_descarga_documento("hoja.xlsx")[1], "attachment")

    def test_risky_extension_is_rejected(self):
        with self.assertRaises(HTTPException) as caught:
            _tipo_mime_documento_seguro("archivo.html")
        self.assertEqual(caught.exception.status_code, 415)

    def test_legacy_unsupported_extension_downloads_as_attachment(self):
        mime, disposition = _politica_descarga_documento("archivo.html")
        self.assertEqual(mime, "application/octet-stream")
        self.assertEqual(disposition, "attachment")


if __name__ == "__main__":
    unittest.main()

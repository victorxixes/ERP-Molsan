"""Los metadatos MIME de EncargaGest no deben confiar en el navegador."""
import unittest

from backend.app.encargagest.router import _tipo_mime_seguro_encargagest


class EncargaGestFileSecurityTests(unittest.TestCase):
    def test_pdf_mime_is_derived_from_extension(self):
        self.assertEqual(_tipo_mime_seguro_encargagest("factura.pdf"), "application/pdf")

    def test_office_mime_is_derived_from_extension(self):
        self.assertEqual(
            _tipo_mime_seguro_encargagest("solicitud.docx"),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    def test_unapproved_extension_is_served_as_binary(self):
        self.assertEqual(_tipo_mime_seguro_encargagest("archivo.html"), "application/octet-stream")


if __name__ == "__main__":
    unittest.main()

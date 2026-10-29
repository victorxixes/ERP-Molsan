"""Validación de cargas documentales del workflow NotarGest."""
import unittest

from fastapi import HTTPException

from backend.app.notargest.router import (
    MAX_WORKFLOW_UPLOAD_BYTES,
    _politica_descarga_notargest,
    _tipo_mime_notargest_seguro,
    _validar_contenido_workflow,
)


class NotargestUploadValidationTests(unittest.TestCase):
    def test_rejects_active_document_extensions(self):
        with self.assertRaises(HTTPException) as caught:
            _tipo_mime_notargest_seguro("archivo.html")
        self.assertEqual(caught.exception.status_code, 415)

    def test_office_files_download_as_attachments(self):
        extension, mime = _tipo_mime_notargest_seguro("documento.docx")
        self.assertEqual(extension, ".docx")
        self.assertTrue(mime)
        self.assertEqual(_politica_descarga_notargest("documento.docx")[1], "attachment")

    def test_legacy_active_extension_is_forced_to_attachment(self):
        mime, disposition = _politica_descarga_notargest("archivo.html")
        self.assertEqual(mime, "application/octet-stream")
        self.assertEqual(disposition, "attachment")

    def test_accepts_pdf_signature_within_header_window(self):
        _validar_contenido_workflow(b"%PDF-1.7\ncontenido", exigir_pdf=True)
        _validar_contenido_workflow(b" " * 20 + b"%PDF-1.7\ncontenido", exigir_pdf=True)

    def test_rejects_non_pdf_content_when_pdf_is_required(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_contenido_workflow(b"texto plano", exigir_pdf=True)
        self.assertEqual(caught.exception.status_code, 400)

    def test_allows_non_pdf_for_categories_that_accept_other_formats(self):
        _validar_contenido_workflow(b"contenido", exigir_pdf=False)

    def test_rejects_empty_file(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_contenido_workflow(b"", exigir_pdf=True)
        self.assertEqual(caught.exception.status_code, 400)

    def test_rejects_oversized_file(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_contenido_workflow(b"x" * (MAX_WORKFLOW_UPLOAD_BYTES + 1))
        self.assertEqual(caught.exception.status_code, 413)


if __name__ == "__main__":
    unittest.main()

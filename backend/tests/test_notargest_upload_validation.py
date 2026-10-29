"""Validación de cargas documentales del workflow NotarGest."""
import unittest

from fastapi import HTTPException

from backend.app.notargest.router import (
    MAX_WORKFLOW_UPLOAD_BYTES,
    _validar_contenido_workflow,
)


class NotargestUploadValidationTests(unittest.TestCase):
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

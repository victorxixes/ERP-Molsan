import os
import unittest
from unittest.mock import patch

from backend.app.mensajes.adjuntos import adjunto_mensaje_valido


class MensajesAdjuntosTests(unittest.TestCase):
    def test_accepts_new_authenticated_api_reference(self):
        value = "/api/mensajes/archivo/0123456789abcdef0123456789abcdef.pdf"
        with patch.dict(os.environ, {"MOLSAN_STORAGE_BACKEND": "local"}, clear=True):
            self.assertTrue(adjunto_mensaje_valido(value, exigir_existencia=False))

    def test_accepts_legacy_static_reference_format(self):
        value = "/static/mensajes/0123456789abcdef0123456789abcdef.pdf"
        with patch.dict(os.environ, {"MOLSAN_STORAGE_BACKEND": "local"}, clear=True):
            self.assertTrue(adjunto_mensaje_valido(value, exigir_existencia=False))

    def test_rejects_traversal_and_unexpected_url(self):
        with patch.dict(os.environ, {"MOLSAN_STORAGE_BACKEND": "local"}, clear=True):
            self.assertFalse(adjunto_mensaje_valido("/api/mensajes/archivo/../secret.pdf"))
            self.assertFalse(adjunto_mensaje_valido("https://example.com/file.pdf"))

    def test_remote_reference_checks_private_object_existence(self):
        value = "/api/mensajes/archivo/0123456789abcdef0123456789abcdef.pdf"
        with patch.dict(os.environ, {"MOLSAN_STORAGE_BACKEND": "supabase"}, clear=True):
            with patch("backend.app.mensajes.adjuntos.SupabasePrivateStorage") as storage:
                storage.return_value.exists.return_value = True
                self.assertTrue(adjunto_mensaje_valido(value))
                storage.return_value.exists.assert_called_once_with(
                    "mensajes/0123456789abcdef0123456789abcdef.pdf"
                )

    def test_remote_storage_error_fails_closed(self):
        value = "/api/mensajes/archivo/0123456789abcdef0123456789abcdef.pdf"
        with patch.dict(os.environ, {"MOLSAN_STORAGE_BACKEND": "supabase"}, clear=True):
            with patch("backend.app.mensajes.adjuntos.SupabasePrivateStorage") as storage:
                storage.return_value.exists.side_effect = RuntimeError("missing config")
                self.assertFalse(adjunto_mensaje_valido(value))


if __name__ == "__main__":
    unittest.main()

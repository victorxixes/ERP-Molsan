import os
import unittest
from unittest.mock import Mock, patch

from backend.app.supabase_storage import (
    SupabasePrivateStorage,
    SupabaseStorageConfig,
    is_supabase_object,
    parse_object_reference,
    storage_backend_is_supabase,
)


class SupabasePrivateStorageTests(unittest.TestCase):
    def setUp(self):
        self.session = Mock()
        self.config = SupabaseStorageConfig(
            url="https://example.supabase.co",
            service_role_key="server-only-test-key",
            bucket="molsan-private",
        )
        self.storage = SupabasePrivateStorage(self.config, self.session)

    def test_upload_uses_post_private_object_endpoint_and_server_key(self):
        self.session.post.return_value = Mock(status_code=200)
        reference = self.storage.upload("carpeta/123/a b.pdf", b"%PDF", "application/pdf")
        self.assertEqual(reference, "supabase://molsan-private/carpeta/123/a b.pdf")
        args, kwargs = self.session.post.call_args
        self.assertIn("/storage/v1/object/molsan-private/carpeta/123/a%20b.pdf", args[0])
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer server-only-test-key")
        self.assertEqual(kwargs["headers"]["x-upsert"], "false")

    def test_download_returns_bytes(self):
        self.session.get.return_value = Mock(status_code=200, content=b"document")
        self.assertEqual(self.storage.download("mensajes/a.pdf"), b"document")

    def test_missing_object_raises_file_not_found(self):
        self.session.get.return_value = Mock(status_code=404)
        with self.assertRaises(FileNotFoundError):
            self.storage.download("mensajes/missing.pdf")

    def test_exists_checks_headers_without_downloading_body(self):
        response = Mock(status_code=200)
        self.session.get.return_value = response
        self.assertTrue(self.storage.exists("mensajes/a.pdf"))
        kwargs = self.session.get.call_args.kwargs
        self.assertTrue(kwargs["stream"])
        response.close.assert_called_once()

    def test_exists_returns_false_for_missing_object(self):
        response = Mock(status_code=404)
        self.session.get.return_value = response
        self.assertFalse(self.storage.exists("mensajes/missing.pdf"))
        response.close.assert_called_once()

    def test_delete_uses_private_bucket_object_api(self):
        self.session.delete.return_value = Mock(status_code=200)
        self.storage.delete("mensajes/a.pdf")
        args, kwargs = self.session.delete.call_args
        self.assertTrue(args[0].endswith("/storage/v1/object/molsan-private"))
        self.assertEqual(kwargs["json"], {"prefixes": ["mensajes/a.pdf"]})

    def test_exists_returns_true_for_existing_object(self):
        self.session.get.return_value = Mock(status_code=200, close=Mock())
        self.assertTrue(self.storage.exists("mensajes/a.pdf"))

    def test_exists_returns_false_for_missing_object(self):
        self.session.get.return_value = Mock(status_code=404, close=Mock())
        self.assertFalse(self.storage.exists("mensajes/missing.pdf"))

    def test_render_forces_private_storage_even_if_local_is_requested(self):
        with patch.dict(os.environ, {"RENDER_SERVICE_ID": "srv-preview", "MOLSAN_STORAGE_BACKEND": "local"}, clear=True):
            self.assertTrue(storage_backend_is_supabase())

    def test_local_development_defaults_to_local_storage(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(storage_backend_is_supabase())

    def test_explicit_supabase_backend_is_respected_outside_render(self):
        with patch.dict(os.environ, {"MOLSAN_STORAGE_BACKEND": "supabase"}, clear=True):
            self.assertTrue(storage_backend_is_supabase())

    def test_object_reference_round_trip(self):
        ref = "supabase://molsan-private/carpeta/123/a.pdf"
        self.assertTrue(is_supabase_object(ref))
        self.assertEqual(parse_object_reference(ref), ("molsan-private", "carpeta/123/a.pdf"))

    def test_rejects_traversal_and_backslashes(self):
        with self.assertRaises(ValueError):
            self.storage.download("../secrets.txt")
        with self.assertRaises(ValueError):
            self.storage.download(r"mensajes\..\secrets.txt")


if __name__ == "__main__":
    unittest.main()

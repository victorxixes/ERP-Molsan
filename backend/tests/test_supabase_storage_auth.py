"""Regression tests for Supabase Storage API-key authentication."""
import unittest

from app.supabase_storage import SupabasePrivateStorage, SupabaseStorageConfig


class SupabaseStorageAuthHeadersTests(unittest.TestCase):
    def _storage(self, key):
        return SupabasePrivateStorage(
            config=SupabaseStorageConfig(
                url="https://example.supabase.co",
                service_role_key=key,
                bucket="molsan-private",
            )
        )

    def test_new_secret_api_key_is_sent_only_as_apikey(self):
        storage = self._storage("sb_secret_example")
        headers = storage._headers("application/pdf")

        self.assertEqual(headers["apikey"], "sb_secret_example")
        self.assertNotIn("Authorization", headers)
        self.assertEqual(headers["Content-Type"], "application/pdf")

    def test_legacy_service_role_jwt_keeps_bearer_compatibility(self):
        legacy_key = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature"
        storage = self._storage(legacy_key)
        headers = storage._headers()

        self.assertEqual(headers["apikey"], legacy_key)
        self.assertEqual(headers["Authorization"], f"Bearer {legacy_key}")


if __name__ == "__main__":
    unittest.main()

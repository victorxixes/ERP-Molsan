import os
import unittest
from unittest.mock import patch

from backend.scripts.bootstrap_admin import main


class BootstrapAdminGuardTests(unittest.TestCase):
    def test_refuses_production_before_opening_database(self):
        with patch.dict(
            os.environ,
            {
                "MOLSAN_ENVIRONMENT": "production",
                "MOLSAN_BOOTSTRAP_ADMIN_CONFIRM": "CREATE_FIRST_ADMIN_IN_PREVIEW",
                "MOLSAN_BOOTSTRAP_ADMIN_USERNAME": "admin.preview",
                "MOLSAN_BOOTSTRAP_ADMIN_PASSWORD": "a-very-long-test-password",
            },
            clear=True,
        ):
            with patch("backend.scripts.bootstrap_admin.SessionLocal") as session_local:
                self.assertEqual(main(), 2)
                session_local.assert_not_called()

    def test_requires_explicit_preview_confirmation(self):
        with patch.dict(
            os.environ,
            {
                "MOLSAN_ENVIRONMENT": "preview",
                "MOLSAN_BOOTSTRAP_ADMIN_USERNAME": "admin.preview",
                "MOLSAN_BOOTSTRAP_ADMIN_PASSWORD": "a-very-long-test-password",
            },
            clear=True,
        ):
            with patch("backend.scripts.bootstrap_admin.SessionLocal") as session_local:
                self.assertEqual(main(), 2)
                session_local.assert_not_called()


if __name__ == "__main__":
    unittest.main()

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

    def test_refuses_when_alembic_schema_is_not_complete(self):
        session = patcher = None
        session = __import__("unittest.mock", fromlist=["Mock"]).Mock()
        session.execute.return_value.scalar.return_value = "20261104_0003"
        with patch.dict(
            os.environ,
            {
                "MOLSAN_ENVIRONMENT": "preview",
                "MOLSAN_BOOTSTRAP_ADMIN_CONFIRM": "CREATE_FIRST_ADMIN_IN_PREVIEW",
                "MOLSAN_BOOTSTRAP_ADMIN_USERNAME": "admin.preview",
                "MOLSAN_BOOTSTRAP_ADMIN_PASSWORD": "a-very-long-test-password",
            },
            clear=True,
        ):
            with patch("backend.scripts.bootstrap_admin.SessionLocal", return_value=session):
                self.assertEqual(main(), 3)
                session.query.assert_not_called()
                session.close.assert_called_once()

    def test_refuses_when_alembic_version_cannot_be_read(self):
        session = __import__("unittest.mock", fromlist=["Mock"]).Mock()
        session.execute.side_effect = RuntimeError("missing alembic_version")
        with patch.dict(
            os.environ,
            {
                "MOLSAN_ENVIRONMENT": "preview",
                "MOLSAN_BOOTSTRAP_ADMIN_CONFIRM": "CREATE_FIRST_ADMIN_IN_PREVIEW",
                "MOLSAN_BOOTSTRAP_ADMIN_USERNAME": "admin.preview",
                "MOLSAN_BOOTSTRAP_ADMIN_PASSWORD": "a-very-long-test-password",
            },
            clear=True,
        ):
            with patch("backend.scripts.bootstrap_admin.SessionLocal", return_value=session):
                self.assertEqual(main(), 3)
                session.query.assert_not_called()
                session.close.assert_called_once()

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

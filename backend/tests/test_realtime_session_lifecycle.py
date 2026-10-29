"""La consulta del destinatario no debe mantener una sesión DB abierta en el WebSocket."""
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from backend.app.realtime.router import _destinatario_activo


class RealtimeSessionLifecycleTests(unittest.TestCase):
    def test_active_recipient_check_closes_its_database_session(self):
        db = MagicMock()
        with (
            patch("backend.app.realtime.router.SessionLocal", return_value=db),
            patch(
                "backend.app.realtime.router._empleado_activo",
                return_value=SimpleNamespace(id=7),
            ) as lookup,
        ):
            self.assertTrue(_destinatario_activo(7))
        lookup.assert_called_once_with(db, 7)
        db.close.assert_called_once_with()

    def test_missing_or_inactive_recipient_is_rejected_and_session_closed(self):
        db = MagicMock()
        with (
            patch("backend.app.realtime.router.SessionLocal", return_value=db),
            patch(
                "backend.app.realtime.router._empleado_activo",
                return_value=None,
            ),
        ):
            self.assertFalse(_destinatario_activo(999))
        db.close.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()

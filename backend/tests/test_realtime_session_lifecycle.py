"""La consulta del destinatario no debe mantener una sesión DB abierta en el WebSocket."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from backend.app.realtime.router import _destinatario_activo


class WebSocketRejectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_auth_rejection_accepts_handshake_then_sends_specific_close_code(self):
        from backend.app.realtime.router import _rechazar_websocket

        websocket = MagicMock()
        websocket.accept = AsyncMock()
        websocket.close = AsyncMock()

        await _rechazar_websocket(websocket, 4403, "El usuario no coincide con el token")

        websocket.accept.assert_awaited_once_with()
        websocket.close.assert_awaited_once_with(
            code=4403,
            reason="El usuario no coincide con el token",
        )


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

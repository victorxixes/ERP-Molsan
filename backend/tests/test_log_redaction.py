"""Pruebas de regresión para la redacción de credenciales en logs."""
import logging
import unittest

from backend.app.auth.log_redaction import (
    _FiltroCredencialesWebSocket,
    _redactar_valor,
)


class LogRedactionTests(unittest.TestCase):
    def test_redacts_websocket_token_in_uvicorn_path_argument(self):
        record = logging.LogRecord(
            name="uvicorn.error",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg='%s - "%s" [accepted]',
            args=(("127.0.0.1", 0), "/ws/realtime/?usuario_id=3&token=secret.jwt.value"),
            exc_info=None,
        )

        self.assertTrue(_FiltroCredencialesWebSocket().filter(record))
        rendered = record.getMessage()
        self.assertIn("token=[REDACTED]", rendered)
        self.assertNotIn("secret.jwt.value", rendered)
        self.assertIn("usuario_id=3", rendered)

    def test_redacts_access_and_refresh_tokens(self):
        value = "/ws/?access_token=first-secret&refresh_token=second-secret"
        redacted = _redactar_valor(value)

        self.assertEqual(
            redacted,
            "/ws/?access_token=[REDACTED]&refresh_token=[REDACTED]",
        )

    def test_record_factory_redacts_logs_from_any_logger(self):
        from backend.app.auth.log_redaction import instalar_filtro_credenciales_websocket

        instalar_filtro_credenciales_websocket()
        logger = logging.getLogger("uvicorn.protocols.websockets.test")
        record = logger.makeRecord(
            logger.name,
            logging.INFO,
            __file__,
            1,
            'WebSocket "%s" [accepted]',
            ("/ws/?token=secret.jwt.value",),
            None,
        )

        rendered = record.getMessage()
        self.assertIn("token=[REDACTED]", rendered)
        self.assertNotIn("secret.jwt.value", rendered)


if __name__ == "__main__":
    unittest.main()

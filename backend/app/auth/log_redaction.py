"""Redacción de credenciales en mensajes de logging de Uvicorn."""
from __future__ import annotations

import logging
import re
from collections.abc import Mapping

_CREDENCIAL_QUERY = re.compile(
    r"(?i)((?:[?&])(?:token|access_token|refresh_token)=)[^&\s\"'<>]+"
)


def _redactar_valor(valor):
    if isinstance(valor, str):
        return _CREDENCIAL_QUERY.sub(r"\1[REDACTED]", valor)
    if isinstance(valor, tuple):
        return tuple(_redactar_valor(item) for item in valor)
    if isinstance(valor, list):
        return [_redactar_valor(item) for item in valor]
    if isinstance(valor, Mapping):
        return {clave: _redactar_valor(item) for clave, item in valor.items()}
    return valor


class _FiltroCredencialesWebSocket(logging.Filter):
    """Evita que los tokens enviados en query strings queden en logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = _redactar_valor(record.msg)
        record.args = _redactar_valor(record.args)
        return True


def instalar_filtro_credenciales_websocket() -> None:
    """Instala el filtro en Uvicorn antes de que acepte conexiones."""
    for nombre in ("uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(nombre)
        if not any(isinstance(filtro, _FiltroCredencialesWebSocket) for filtro in logger.filters):
            logger.addFilter(_FiltroCredencialesWebSocket())
        for handler in logger.handlers:
            if not any(isinstance(filtro, _FiltroCredencialesWebSocket) for filtro in handler.filters):
                handler.addFilter(_FiltroCredencialesWebSocket())

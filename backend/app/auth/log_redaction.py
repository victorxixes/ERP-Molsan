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


_FACTORY_INSTALADO = False


def instalar_filtro_credenciales_websocket() -> None:
    """Redacta credenciales al crear cualquier registro, antes de formatearlo."""
    global _FACTORY_INSTALADO

    # Algunos mensajes de conexión WebSocket se emiten por loggers internos de
    # Uvicorn distintos de uvicorn.access. El record factory cubre todos ellos
    # y también los handlers que se creen después de importar la aplicación.
    if not _FACTORY_INSTALADO:
        factory_original = logging.getLogRecordFactory()

        def factory_seguro(*args, **kwargs):
            record = factory_original(*args, **kwargs)
            record.msg = _redactar_valor(record.msg)
            record.args = _redactar_valor(record.args)
            return record

        logging.setLogRecordFactory(factory_seguro)
        _FACTORY_INSTALADO = True

    for nombre in ("uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(nombre)
        if not any(isinstance(filtro, _FiltroCredencialesWebSocket) for filtro in logger.filters):
            logger.addFilter(_FiltroCredencialesWebSocket())
        for handler in logger.handlers:
            if not any(isinstance(filtro, _FiltroCredencialesWebSocket) for filtro in handler.filters):
                handler.addFilter(_FiltroCredencialesWebSocket())

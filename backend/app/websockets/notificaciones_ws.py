"""Puente de compatibilidad para notificaciones WebSocket.

El endpoint autenticado real está en backend.app.notificaciones.router_ws.
Estas funciones conservan las importaciones históricas de los routers de Intranet
y reenvían los eventos a las conexiones activas, sin quedarse en no-op.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.app.notificaciones.router_ws import (
    conexiones,
    lock,
    send_notif_to_user,
)

notificaciones_connections: Dict[int, Any] = conexiones


async def enviar_notificacion(usuario_id: int, evento: dict) -> None:
    await send_notif_to_user(int(usuario_id), evento)


async def broadcast_notificacion(evento: dict) -> None:
    """Emite a todos los usuarios que tengan una conexión autenticada activa."""
    with lock:
        usuarios = list(conexiones.keys())
    for usuario_id in usuarios:
        await send_notif_to_user(int(usuario_id), evento)


async def notificaciones_connect(usuario_id: int, websocket) -> None:
    """Compatibilidad para módulos antiguos; registra una conexión aceptada."""
    await websocket.accept()
    with lock:
        conexiones.setdefault(int(usuario_id), []).append(websocket)


async def notificaciones_disconnect(usuario_id: int) -> None:
    """Compatibilidad histórica: elimina todas las conexiones del usuario."""
    with lock:
        sockets = conexiones.pop(int(usuario_id), [])
    for websocket in sockets:
        try:
            await websocket.close(code=1000, reason="Conexión cerrada")
        except Exception:
            pass

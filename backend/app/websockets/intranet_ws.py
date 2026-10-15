"""WebSocket de intranet autenticado mediante JWT.

Los eventos se emiten únicamente a clientes que hayan presentado un token válido.
El token se recibe en query string porque la API WebSocket del navegador no permite
configurar cabeceras arbitrarias durante el handshake.
"""
from __future__ import annotations

from typing import Dict, Set

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.config import settings

router = APIRouter(prefix="/ws", tags=["Intranet WebSocket"])

# Un usuario puede tener varias pestañas/dispositivos conectados.
intranet_connections: Dict[int, Set[WebSocket]] = {}


def _usuario_id_desde_token(token: str) -> int | None:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )
        usuario_id = int(payload.get("id"))
        return usuario_id if usuario_id > 0 else None
    except (jwt.InvalidTokenError, TypeError, ValueError, KeyError):
        return None


async def intranet_connect(usuario_id: int, websocket: WebSocket) -> None:
    """Acepta y registra una conexión ya autenticada."""
    await websocket.accept()
    intranet_connections.setdefault(usuario_id, set()).add(websocket)


async def intranet_disconnect(usuario_id: int, websocket: WebSocket | None = None) -> None:
    """Elimina una conexión concreta; sin websocket, limpia las del usuario."""
    actuales = intranet_connections.get(usuario_id)
    if not actuales:
        return
    if websocket is None:
        intranet_connections.pop(usuario_id, None)
        return
    actuales.discard(websocket)
    if not actuales:
        intranet_connections.pop(usuario_id, None)


async def intranet_broadcast(evento: dict) -> None:
    """Envía un evento a todos los usuarios autenticados conectados."""
    muertos: list[tuple[int, WebSocket]] = []
    for usuario_id, sockets in list(intranet_connections.items()):
        for websocket in list(sockets):
            try:
                await websocket.send_json(evento)
            except Exception:
                muertos.append((usuario_id, websocket))
    for usuario_id, websocket in muertos:
        await intranet_disconnect(usuario_id, websocket)


async def intranet_send(usuario_id: int, evento: dict) -> None:
    """Envía un evento solo a las conexiones del usuario indicado."""
    sockets = list(intranet_connections.get(usuario_id, set()))
    for websocket in sockets:
        try:
            await websocket.send_json(evento)
        except Exception:
            await intranet_disconnect(usuario_id, websocket)


@router.websocket("/intranet")
async def intranet_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "").strip()
    usuario_id = _usuario_id_desde_token(token)
    if usuario_id is None:
        await websocket.close(code=4401, reason="Token ausente o no válido")
        return

    await intranet_connect(usuario_id, websocket)
    try:
        while True:
            # No se aceptan comandos desde el cliente; recibir solo detecta cierre.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await intranet_disconnect(usuario_id, websocket)

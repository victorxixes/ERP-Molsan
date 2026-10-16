"""WebSocket de Intranet con identidad y permiso comprobados en backend."""
from __future__ import annotations

from typing import Dict, Set

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from backend.app.auth.websocket_auth import autenticar_websocket

router = APIRouter(prefix="/ws", tags=["Intranet WebSocket"])

# Un usuario puede tener varias pestañas/dispositivos conectados.
intranet_connections: Dict[int, Set[WebSocket]] = {}


def _conexiones_de(usuario_id: int) -> Set[WebSocket]:
    return intranet_connections.setdefault(usuario_id, set())


async def intranet_connect(usuario_id: int, websocket: WebSocket) -> None:
    """Acepta y registra una conexión ya autenticada/autorizada."""
    await websocket.accept()
    _conexiones_de(usuario_id).add(websocket)


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
    """Envía un evento a todos los usuarios con una conexión autorizada."""
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
    """Envía un evento solo al usuario indicado."""
    sockets = list(intranet_connections.get(usuario_id, set()))
    for websocket in sockets:
        try:
            await websocket.send_json(evento)
        except Exception:
            await intranet_disconnect(usuario_id, websocket)


@router.websocket("/intranet")
async def intranet_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "").strip()
    try:
        # La comprobación usa la identidad de PostgreSQL: JWT válido no basta
        # si el empleado fue desactivado o ya no tiene intranet.ver.
        usuario_id = autenticar_websocket(token, modulo="intranet", accion="ver")
    except HTTPException as exc:
        codigo = 4403 if exc.status_code == 403 else 4401
        motivo = "Permiso insuficiente" if codigo == 4403 else "Token ausente, no válido o usuario inactivo"
        await websocket.close(code=codigo, reason=motivo)
        return
    except Exception:
        await websocket.close(code=4401, reason="No se pudo validar la sesión")
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

from typing import Set
import asyncio

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.config import settings

router = APIRouter(prefix="/ws", tags=["empleados_ws"])
conexiones_empleados: Set[WebSocket] = set()


async def broadcast_empleados(evento: dict):
    conexiones_muertas = []
    for ws in list(conexiones_empleados):
        try:
            await ws.send_json(evento)
        except Exception:
            conexiones_muertas.append(ws)
    for ws in conexiones_muertas:
        conexiones_empleados.discard(ws)


@router.websocket("/empleados/{empleado_id}")
async def empleados_ws(websocket: WebSocket, empleado_id: int):
    token = websocket.query_params.get("token", "").strip()
    if not token:
        await websocket.close(code=4401, reason="Token requerido")
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        usuario_id = int(payload.get("id"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        await websocket.close(code=4401, reason="Token no válido")
        return

    if usuario_id != empleado_id:
        await websocket.close(code=4403, reason="El token no corresponde al empleado solicitado")
        return

    await websocket.accept()
    conexiones_empleados.add(websocket)
    await websocket.send_json({"tipo": "ws_conectado", "empleado_id": empleado_id, "usuario_id": usuario_id})

    try:
        while True:
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=25)
                if msg == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Mantiene la conexión comprobando que sigue viva sin aceptar comandos.
                await websocket.send_json({"tipo": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        conexiones_empleados.discard(websocket)

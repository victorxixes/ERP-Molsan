from typing import Set
import asyncio

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from backend.app.auth.websocket_auth import autenticar_websocket

router = APIRouter(prefix="/ws", tags=["empleados_ws"])
conexiones_empleados: Set[WebSocket] = set()


async def broadcast_empleados(evento: dict):
    """Broadcast interno a sesiones autenticadas; no acepta eventos del cliente."""
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
    token = websocket.query_params.get("token", "")
    try:
        usuario_id = autenticar_websocket(token)
    except HTTPException as exc:
        codigo = 4401 if exc.status_code == 401 else 4403
        await websocket.close(code=codigo, reason=str(exc.detail)[:120])
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
                await websocket.send_json({"tipo": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        conexiones_empleados.discard(websocket)

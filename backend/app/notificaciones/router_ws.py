from threading import Lock

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.config import settings

router_notif = APIRouter(prefix="/ws", tags=["notificaciones_ws"])

# conexiones = { empleado_id: [ws1, ws2, ...] }
conexiones = {}
lock = Lock()


@router_notif.get("/notificaciones/test")
async def notif_test():
    return {"status": "ok"}


async def send_notif_to_user(empleado_id: int, data: dict):
    """Enviar notificación solo a las pestañas del usuario indicado."""
    with lock:
        lista = list(conexiones.get(empleado_id, []))

    muertos = []
    for ws in lista:
        try:
            await ws.send_json(data)
        except Exception:
            muertos.append(ws)

    if muertos:
        with lock:
            conexiones[empleado_id] = [
                ws for ws in conexiones.get(empleado_id, []) if ws not in muertos
            ]
            if not conexiones[empleado_id]:
                conexiones.pop(empleado_id, None)


@router_notif.websocket("/notificaciones/{empleado_id}")
async def ws_notificaciones(websocket: WebSocket, empleado_id: int):
    # No aceptar ni registrar al cliente hasta autenticar la identidad.
    token = websocket.query_params.get("token", "").strip()
    if not token:
        await websocket.close(code=4401, reason="Token requerido")
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        token_id = int(payload.get("id"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        await websocket.close(code=4401, reason="Token no válido")
        return

    if token_id != empleado_id:
        await websocket.close(code=4403, reason="El token no corresponde al empleado solicitado")
        return

    await websocket.accept()
    with lock:
        conexiones.setdefault(empleado_id, []).append(websocket)

    try:
        while True:
            # Se recibe texto para detectar desconexión. No se procesan comandos del cliente.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        with lock:
            actuales = conexiones.get(empleado_id, [])
            if websocket in actuales:
                actuales.remove(websocket)
            if not actuales:
                conexiones.pop(empleado_id, None)

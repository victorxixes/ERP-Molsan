from threading import Lock

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from backend.app.auth.websocket_auth import autenticar_websocket

router_notif = APIRouter(prefix="/ws", tags=["notificaciones_ws"])

# conexiones = { empleado_id: [ws1, ws2, ...] }
conexiones = {}
lock = Lock()


@router_notif.get("/notificaciones/test")
async def notif_test():
    # Diagnóstico inocuo; no expone datos ni identificadores de usuarios.
    return {"status": "ok"}


async def send_notif_to_user(empleado_id: int, data: dict):
    """Enviar una notificación exclusivamente a las sesiones del destinatario."""
    with lock:
        lista = list(conexiones.get(int(empleado_id), []))

    muertos = []
    for ws in lista:
        try:
            await ws.send_json(data)
        except Exception:
            muertos.append(ws)

    if muertos:
        with lock:
            actuales = conexiones.get(int(empleado_id), [])
            conexiones[int(empleado_id)] = [ws for ws in actuales if ws not in muertos]
            if not conexiones[int(empleado_id)]:
                conexiones.pop(int(empleado_id), None)


@router_notif.websocket("/notificaciones/{empleado_id}")
async def ws_notificaciones(websocket: WebSocket, empleado_id: int):
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
    with lock:
        conexiones.setdefault(empleado_id, []).append(websocket)

    try:
        while True:
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

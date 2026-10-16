from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from backend.app.auth.websocket_auth import autenticar_websocket

router = APIRouter(prefix="/ws", tags=["Agenda WebSocket"])


class AgendaWebSocketManager:
    """Canal común de Agenda para empleados con permiso agenda.ver."""
    def __init__(self):
        self.active_connections = []
        self.usuario_por_conexion = {}

    async def connect(self, websocket: WebSocket, usuario_id: int):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.usuario_por_conexion[websocket] = usuario_id

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.usuario_por_conexion.pop(websocket, None)

    async def broadcast(self, message: dict):
        # El canal representa la agenda compartida de la organización. Solo se
        # registran aquí usuarios activos que superan la autorización agenda.ver.
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = AgendaWebSocketManager()


async def enviar_evento(tipo: str, cita: dict):
    await manager.broadcast({"tipo": tipo, "cita": cita})


@router.websocket("/agenda")
async def agenda_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "")
    try:
        usuario_id = autenticar_websocket(token, modulo="agenda", accion="ver")
    except HTTPException as exc:
        codigo = 4401 if exc.status_code == 401 else 4403
        await websocket.close(code=codigo, reason=str(exc.detail)[:120])
        return

    await manager.connect(websocket, usuario_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
        raise

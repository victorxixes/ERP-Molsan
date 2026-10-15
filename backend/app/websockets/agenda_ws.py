import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.config import settings

router = APIRouter(prefix="/ws", tags=["Agenda WebSocket"])


class AgendaWebSocketManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
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
    token = websocket.query_params.get("token", "").strip()
    if not token:
        await websocket.close(code=4401, reason="Token requerido")
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        usuario_id = int(payload.get("id"))
        if usuario_id <= 0:
            raise ValueError("Identificador de usuario no válido")
    except (jwt.InvalidTokenError, TypeError, ValueError):
        await websocket.close(code=4401, reason="Token no válido")
        return

    # Solo autenticamos aquí; la autorización por ámbito del calendario debe
    # aplicarse a los eventos antes de habilitar datos de agenda por departamento.
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

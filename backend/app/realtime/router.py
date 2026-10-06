from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Query,
)

import jwt

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.empleados.models import Empleado
from backend.app.mensajes.ws_manager import manager as mensajes_manager

from .manager import realtime_manager
from .schemas import RealtimeEvent


# ============================================================
# ROUTER REALTIME
# ============================================================

router = APIRouter(
    prefix="/ws/realtime",
    tags=["Realtime"],
)


# ============================================================
# WEBSOCKET GLOBAL
# ============================================================

@router.websocket("/")
async def realtime_ws(
    websocket: WebSocket,
    usuario_id: int | None = Query(default=None),
    rol: str | None = Query(default=None),
    modulo: str | None = Query(default=None),
    grupo: str | None = Query(default=None),
    token: str | None = Query(default=None),
):

    db = SessionLocal()

    usuario_id_autenticado = None
    empleado = None

    try:

        # ====================================================
        # AUTENTICACIÓN JWT
        # ====================================================

        if token:

            try:

                payload = jwt.decode(
                    token,
                    settings.JWT_SECRET,
                    algorithms=[
                        settings.ALGORITHM
                    ],
                )

                token_usuario_id = (
                    payload.get("id")
                )

                if token_usuario_id is None:

                    await websocket.close(
                        code=4002
                    )

                    return

                usuario_id_autenticado = int(
                    token_usuario_id
                )

            except jwt.ExpiredSignatureError:

                await websocket.close(
                    code=4004
                )

                return

            except Exception:

                await websocket.close(
                    code=4005
                )

                return

        # ====================================================
        # VALIDAR usuario_id
        # ====================================================

        if usuario_id is not None:

            if usuario_id_autenticado is None:

                await websocket.close(
                    code=4001
                )

                return

            if (
                int(usuario_id)
                != usuario_id_autenticado
            ):

                await websocket.close(
                    code=4003
                )

                return

        # ====================================================
        # SI TENEMOS JWT, EL ID OFICIAL ES EL DEL TOKEN
        # ====================================================

        if usuario_id_autenticado is not None:

            usuario_id = (
                usuario_id_autenticado
            )

        # ====================================================
        # CARGAR EMPLEADO
        # ====================================================

        if usuario_id is not None:

            empleado = (
                db.query(Empleado)
                .filter(
                    Empleado.id
                    == usuario_id
                )
                .first()
            )

            if not empleado:

                await websocket.close(
                    code=4006
                )

                return

        # ====================================================
        # INFORMACIÓN DE PRESENCIA
        # ====================================================

        usuario_info = None

        if empleado:

            usuario_info = {
                "id": empleado.id,
                "nombre": empleado.nombre,
                "apellidos": empleado.apellidos,
                "foto": empleado.foto,
            }

        # ====================================================
        # CONECTAR
        # ====================================================

        era_primera_conexion = (
            await realtime_manager.connect(
                websocket,
                usuario_id=usuario_id,
                rol=rol,
                modulo=modulo,
                grupo=grupo,
                usuario_info=usuario_info,
            )
        )

        print(
            f"[REALTIME] Conectado "
            f"usuario={usuario_id}",
            flush=True,
        )

        # ====================================================
        # SNAPSHOT INICIAL
        # ====================================================

        usuarios_conectados = (
            realtime_manager
            .obtener_usuarios_conectados()
        )

        snapshot_event = RealtimeEvent(
            modulo="realtime",
            evento="usuarios_snapshot",
            usuario_id=usuario_id,
            data={
                "usuarios": usuarios_conectados
            },
        )

        await websocket.send_json(
            snapshot_event.dict()
        )

        # ====================================================
        # AVISAR ONLINE
        # ====================================================

        if (
            usuario_id is not None
            and era_primera_conexion
            and usuario_info is not None
        ):

            online_event = RealtimeEvent(
                modulo="mensajes",
                evento="usuario_online",
                usuario_id=usuario_id,
                data=usuario_info,
            )

            await realtime_manager.broadcast_global_except(
                websocket,
                online_event,
            )

        # ====================================================
        # BUCLE
        # ====================================================

        while True:

            try:

                raw = await websocket.receive_text()

            except WebSocketDisconnect:

                break

            # =================================================
            # PING SIMPLE
            # =================================================

            if raw == "ping":

                try:

                    await websocket.send_json(
                        {
                            "tipo": "pong"
                        }
                    )

                except Exception:

                    break

                continue

            # =================================================
            # JSON
            # =================================================

            try:

                data = jwt.json.loads(raw)

            except Exception:

                continue

            if not isinstance(data, dict):

                continue

            tipo = data.get("tipo")

            # =================================================
            # PING JSON
            # =================================================

            if tipo == "ping":

                try:

                    await websocket.send_json(
                        {
                            "tipo": "pong"
                        }
                    )

                except Exception:

                    break

                continue

            # =================================================
            # A PARTIR DE AQUÍ NECESITAMOS USUARIO
            # =================================================

            if usuario_id is None:

                continue

            # =================================================
            # TYPING
            # =================================================

            if tipo == "typing":

                destinatario_id = data.get(
                    "destinatario_id"
                )

                if not destinatario_id:

                    continue

                event = RealtimeEvent(
                    modulo="mensajes",
                    evento="typing",
                    usuario_id=usuario_id,
                    data={
                        "from": usuario_id,
                    },
                )

                await realtime_manager.broadcast_usuario(
                    int(destinatario_id),
                    event,
                )

                continue

            # =================================================
            # MENSAJE
            # =================================================

            if tipo == "mensaje":

                destinatario_id = data.get(
                    "destinatario_id"
                )

                contenido = data.get(
                    "contenido"
                )

                if (
                    not destinatario_id
                    or not contenido
                    or not str(
                        contenido
                    ).strip()
                ):

                    continue

                await mensajes_manager.enviar_mensaje_ws(
                    usuario_id,
                    int(destinatario_id),
                    str(contenido),
                )

                continue

            # =================================================
            # ARCHIVO
            # =================================================

            if tipo == "archivo":

                destinatario_id = data.get(
                    "destinatario_id"
                )

                archivo_url = data.get(
                    "archivo_url"
                )

                if (
                    not destinatario_id
                    or not archivo_url
                ):

                    continue

                await mensajes_manager.enviar_archivo_ws(
                    usuario_id,
                    int(destinatario_id),
                    str(archivo_url),
                )

                continue

    finally:

        (
            usuario_id_desconectado,
            era_ultima_conexion,
        ) = realtime_manager.disconnect(
            websocket
        )

        # =====================================================
        # OFFLINE
        # =====================================================

        if (
            usuario_id_desconectado is not None
            and era_ultima_conexion
        ):

            offline_event = RealtimeEvent(
                modulo="mensajes",
                evento="usuario_offline",
                usuario_id=(
                    usuario_id_desconectado
                ),
                data={
                    "id": (
                        usuario_id_desconectado
                    )
                },
            )

            await realtime_manager.broadcast_global(
                offline_event
            )

            print(
                f"[REALTIME] Offline "
                f"usuario={usuario_id_desconectado}",
                flush=True,
            )

        db.close()

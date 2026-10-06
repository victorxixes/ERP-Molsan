import json
import jwt

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Query,
)

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

    usuario_id: int | None = Query(
        default=None
    ),

    rol: str | None = Query(
        default=None
    ),

    modulo: str | None = Query(
        default=None
    ),

    grupo: str | None = Query(
        default=None
    ),

    token: str | None = Query(
        default=None
    ),
):

    db = SessionLocal()

    try:

        # ====================================================
        # TOKEN OBLIGATORIO
        # ====================================================

        if not token:

            await websocket.close(
                code=4001
            )

            return

        # ====================================================
        # VALIDAR JWT
        # ====================================================

        try:

            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[
                    settings.ALGORITHM
                ],
            )

        except jwt.ExpiredSignatureError:

            await websocket.close(
                code=4004
            )

            return

        except Exception as exc:

            print(
                f"[REALTIME] Error JWT: {exc}",
                flush=True,
            )

            await websocket.close(
                code=4005
            )

            return

        # ====================================================
        # OBTENER USUARIO
        # ====================================================

        token_usuario_id = (
            payload.get("id")
        )

        if token_usuario_id is None:

            await websocket.close(
                code=4002
            )

            return

        try:

            token_usuario_id = int(
                token_usuario_id
            )

        except Exception:

            await websocket.close(
                code=4002
            )

            return

        # ====================================================
        # COMPROBAR QUE usuario_id COINCIDE CON JWT
        # ====================================================

        if (
            usuario_id is not None
            and int(usuario_id)
            != token_usuario_id
        ):

            await websocket.close(
                code=4003
            )

            return

        usuario_id = token_usuario_id

        # ====================================================
        # BUSCAR EMPLEADO
        # ====================================================

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
        # INFORMACIÓN PRESENCIA
        # ====================================================

        usuario_info = {

            "id":
                empleado.id,

            "nombre":
                empleado.nombre,

            "apellidos":
                empleado.apellidos,

            "foto":
                empleado.foto,
        }

        # ====================================================
        # CONECTAR
        # ====================================================

        era_primera = (
            await realtime_manager.connect(
                websocket,

                usuario_id=
                    usuario_id,

                rol=
                    rol,

                modulo=
                    modulo,

                grupo=
                    grupo,

                usuario_info=
                    usuario_info,
            )
        )

        print(
            f"[REALTIME] Conectado usuario={usuario_id}",
            flush=True,
        )

        # ====================================================
        # SNAPSHOT
        # ====================================================

        usuarios = (
            realtime_manager
            .obtener_usuarios_conectados()
        )

        snapshot = RealtimeEvent(

            modulo="realtime",

            evento="usuarios_snapshot",

            usuario_id=
                usuario_id,

            data={
                "usuarios":
                    usuarios,
            },
        )

        await websocket.send_json(
            snapshot.dict()
        )

        # ====================================================
        # ONLINE
        # ====================================================

        if era_primera:

            online_event = RealtimeEvent(

                modulo="mensajes",

                evento="usuario_online",

                usuario_id=
                    usuario_id,

                data=
                    usuario_info,
            )

            await (
                realtime_manager
                .broadcast_global_except(
                    websocket,
                    online_event,
                )
            )

        # ====================================================
        # BUCLE
        # ====================================================

        while True:

            try:

                raw = (
                    await websocket
                    .receive_text()
                )

            except WebSocketDisconnect:

                break

            except Exception as exc:

                print(
                    f"[REALTIME] Error recibiendo "
                    f"usuario={usuario_id}: {exc}",
                    flush=True,
                )

                break

            # =================================================
            # PING TEXTO
            # =================================================

            if raw == "ping":

                try:

                    await websocket.send_json({
                        "tipo": "pong"
                    })

                except Exception:

                    break

                continue

            # =================================================
            # PARSEAR JSON
            # =================================================

            try:

                data = json.loads(
                    raw
                )

            except Exception:

                continue

            if not isinstance(
                data,
                dict,
            ):

                continue

            tipo = data.get(
                "tipo"
            )

            # =================================================
            # PING JSON
            # =================================================

            if tipo == "ping":

                try:

                    await websocket.send_json({
                        "tipo": "pong"
                    })

                except Exception:

                    break

                continue

            # =================================================
            # TYPING
            # =================================================

            if tipo == "typing":

                destinatario_id = (
                    data.get(
                        "destinatario_id"
                    )
                )

                if not destinatario_id:

                    continue

                try:

                    destinatario_id = int(
                        destinatario_id
                    )

                except Exception:

                    continue

                event = RealtimeEvent(

                    modulo="mensajes",

                    evento="typing",

                    usuario_id=
                        usuario_id,

                    data={
                        "from":
                            usuario_id,
                    },
                )

                await (
                    realtime_manager
                    .broadcast_usuario(
                        destinatario_id,
                        event,
                    )
                )

                continue

            # =================================================
            # MENSAJE
            # =================================================

            if tipo == "mensaje":

                destinatario_id = (
                    data.get(
                        "destinatario_id"
                    )
                )

                contenido = (
                    data.get(
                        "contenido"
                    )
                )

                if not destinatario_id:
                    continue

                if not contenido:
                    continue

                contenido = str(
                    contenido
                ).strip()

                if not contenido:
                    continue

                try:

                    destinatario_id = int(
                        destinatario_id
                    )

                except Exception:

                    continue

                try:

                    mensaje = (
                        await
                        mensajes_manager
                        .enviar_mensaje_ws(
                            usuario_id,
                            destinatario_id,
                            contenido,
                        )
                    )

                except Exception as exc:

                    print(
                        f"[REALTIME] Error guardando "
                        f"mensaje: {exc}",
                        flush=True,
                    )

                    continue

                # ---------------------------------------------
                # EVENTO GLOBAL
                # ---------------------------------------------

                event = RealtimeEvent(

                    modulo="mensajes",

                    evento="mensaje_nuevo",

                    usuario_id=
                        usuario_id,

                    data={
                        "tipo":
                            "nuevo_mensaje",

                        "mensaje":
                            mensaje.as_dict(),
                    },
                )

                await (
                    realtime_manager
                    .broadcast_usuario(
                        usuario_id,
                        event,
                    )
                )

                if (
                    destinatario_id
                    != usuario_id
                ):

                    await (
                        realtime_manager
                        .broadcast_usuario(
                            destinatario_id,
                            event,
                        )
                    )

                continue

            # =================================================
            # ARCHIVO
            # =================================================

            if tipo == "archivo":

                destinatario_id = (
                    data.get(
                        "destinatario_id"
                    )
                )

                archivo_url = (
                    data.get(
                        "archivo_url"
                    )
                )

                if not destinatario_id:
                    continue

                if not archivo_url:
                    continue

                try:

                    destinatario_id = int(
                        destinatario_id
                    )

                except Exception:

                    continue

                try:

                    mensaje = (
                        await
                        mensajes_manager
                        .enviar_archivo_ws(
                            usuario_id,
                            destinatario_id,
                            str(
                                archivo_url
                            ),
                        )
                    )

                except Exception as exc:

                    print(
                        f"[REALTIME] Error guardando "
                        f"archivo: {exc}",
                        flush=True,
                    )

                    continue

                # ---------------------------------------------
                # EVENTO GLOBAL
                # ---------------------------------------------

                event = RealtimeEvent(

                    modulo="mensajes",

                    evento="archivo_nuevo",

                    usuario_id=
                        usuario_id,

                    data={
                        "tipo":
                            "nuevo_archivo",

                        "mensaje":
                            mensaje.as_dict(),
                    },
                )

                await (
                    realtime_manager
                    .broadcast_usuario(
                        usuario_id,
                        event,
                    )
                )

                if (
                    destinatario_id
                    != usuario_id
                ):

                    await (
                        realtime_manager
                        .broadcast_usuario(
                            destinatario_id,
                            event,
                        )
                    )

                continue

    finally:

        (
            usuario_id_desconectado,
            era_ultima_conexion,
        ) = realtime_manager.disconnect(
            websocket
        )

        # ====================================================
        # OFFLINE
        # ====================================================

        if (
            usuario_id_desconectado is not None
            and era_ultima_conexion
        ):

            offline_event = RealtimeEvent(

                modulo="mensajes",

                evento="usuario_offline",

                usuario_id=
                    usuario_id_desconectado,

                data={
                    "id":
                        usuario_id_desconectado,
                },
            )

            await (
                realtime_manager
                .broadcast_global(
                    offline_event
                )
            )

            print(
                f"[REALTIME] Offline "
                f"usuario={usuario_id_desconectado}",
                flush=True,
            )

        db.close()

import json

import jwt

from fastapi import (
    APIRouter,
    Query,
    WebSocket,
    WebSocketDisconnect,
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

    usuario_id_autenticado = None
    empleado = None


    try:

        # ====================================================
        # JWT
        # ====================================================

        if not token:

            await websocket.close(
                code=4001
            )

            return


        try:

            payload = jwt.decode(

                token,

                settings.JWT_SECRET,

                algorithms=[
                    settings.ALGORITHM
                ],

            )

            token_id = payload.get(
                "id"
            )

            if token_id is None:

                await websocket.close(
                    code=4002
                )

                return


            usuario_id_autenticado = int(
                token_id
            )


        except jwt.ExpiredSignatureError:

            await websocket.close(
                code=4004
            )

            return


        except Exception as exc:

            print(
                "[REALTIME] Error JWT:",
                exc,
                flush=True,
            )

            await websocket.close(
                code=4005
            )

            return


        # ====================================================
        # VALIDAR ID
        # ====================================================

        if (
            usuario_id is not None
            and int(usuario_id)
            != usuario_id_autenticado
        ):

            await websocket.close(
                code=4003
            )

            return


        usuario_id =
            usuario_id_autenticado


        # ====================================================
        # EMPLEADO
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
        # INFO PRESENCIA
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

        primera_conexion = (

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
            "[REALTIME] Conectado "
            f"usuario={usuario_id}",
            flush=True,
        )


        # ====================================================
        # SNAPSHOT
        # ====================================================

        snapshot = RealtimeEvent(

            modulo=
                "realtime",

            evento=
                "usuarios_snapshot",

            usuario_id=
                usuario_id,

            data={

                "usuarios":
                    realtime_manager
                    .obtener_usuarios_conectados(),

            },

        )


        await websocket.send_json(
            snapshot.dict()
        )


        # ====================================================
        # ONLINE
        # ====================================================

        if primera_conexion:

            online = RealtimeEvent(

                modulo=
                    "mensajes",

                evento=
                    "usuario_online",

                usuario_id=
                    usuario_id,

                data=
                    usuario_info,

            )


            await realtime_manager.broadcast_global_except(

                websocket,

                online,

            )


        # ====================================================
        # BUCLE
        # ====================================================

        while True:

            raw = (
                await websocket.receive_text()
            )


            # =================================================
            # PING
            # =================================================

            if raw == "ping":

                await websocket.send_json(
                    {
                        "tipo":
                            "pong"
                    }
                )

                continue


            # =================================================
            # JSON
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


            if not tipo:

                continue


            # =================================================
            # PING JSON
            # =================================================

            if tipo == "ping":

                await websocket.send_json(
                    {
                        "tipo":
                            "pong"
                    }
                )

                continue


            # =================================================
            # TYPING
            # =================================================

            if tipo == "typing":

                try:

                    destinatario_id = int(
                        data.get(
                            "destinatario_id"
                        )
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue


                if destinatario_id <= 0:

                    continue


                event = RealtimeEvent(

                    modulo=
                        "mensajes",

                    evento=
                        "typing",

                    usuario_id=
                        usuario_id,

                    data={

                        "from":
                            usuario_id,

                    },

                )


                await realtime_manager.broadcast_usuario(

                    destinatario_id,

                    event,

                )

                continue


            # =================================================
            # MENSAJE
            # =================================================

            if tipo == "mensaje":

                try:

                    destinatario_id = int(
                        data.get(
                            "destinatario_id"
                        )
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue


                contenido = data.get(
                    "contenido"
                )


                if (
                    destinatario_id <= 0
                    or contenido is None
                ):

                    continue


                contenido = str(
                    contenido
                ).strip()


                if not contenido:

                    continue


                print(
                    "[REALTIME] Mensaje "
                    f"{usuario_id} -> "
                    f"{destinatario_id}",
                    flush=True,
                )


                await mensajes_manager.enviar_mensaje_ws(

                    remitente_id=
                        usuario_id,

                    destinatario_id=
                        destinatario_id,

                    contenido=
                        contenido,

                )


                continue


            # =================================================
            # ARCHIVO
            # =================================================

            if tipo == "archivo":

                try:

                    destinatario_id = int(
                        data.get(
                            "destinatario_id"
                        )
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue


                archivo_url = data.get(
                    "archivo_url"
                )


                if (
                    destinatario_id <= 0
                    or not archivo_url
                ):

                    continue


                archivo_url = str(
                    archivo_url
                ).strip()


                if not archivo_url:

                    continue


                await mensajes_manager.enviar_archivo_ws(

                    remitente_id=
                        usuario_id,

                    destinatario_id=
                        destinatario_id,

                    archivo_url=
                        archivo_url,

                )


                continue


    except WebSocketDisconnect:

        pass


    except Exception as exc:

        print(
            "[REALTIME] Error usuario "
            f"{usuario_id}: {exc}",
            flush=True,
        )


    finally:

        (
            usuario_desconectado,
            ultima_conexion,
        ) = realtime_manager.disconnect(
            websocket
        )


        if (
            usuario_desconectado is not None
            and ultima_conexion
        ):

            offline = RealtimeEvent(

                modulo=
                    "mensajes",

                evento=
                    "usuario_offline",

                usuario_id=
                    usuario_desconectado,

                data={

                    "id":
                        usuario_desconectado,

                },

            )


            await realtime_manager.broadcast_global(
                offline
            )


            print(
                "[REALTIME] Offline "
                f"usuario={usuario_desconectado}",
                flush=True,
            )


        db.close()

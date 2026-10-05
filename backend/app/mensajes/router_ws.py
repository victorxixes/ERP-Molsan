from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import json
import jwt

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.empleados.models import Empleado
from backend.app.mensajes.ws_manager import manager


# =========================================================
# ROUTER
# =========================================================

router = APIRouter()


# =========================================================
# WEBSOCKET MENSAJES
# =========================================================

@router.websocket("/ws/mensajes/{empleado_id}")
async def mensajes_ws(
    websocket: WebSocket,
    empleado_id: int,
):
    """
    WebSocket principal de Mensajes.

    Seguridad:
        JWT obligatorio.

    Eventos:

        online
        offline
        typing
        nuevo_mensaje
        nuevo_archivo

    Entrada:

        ping

        {
            "tipo": "typing",
            "destinatario_id": 2
        }

        {
            "tipo": "mensaje",
            "destinatario_id": 2,
            "contenido": "Hola"
        }

        {
            "tipo": "archivo",
            "destinatario_id": 2,
            "archivo_url": "/static/mensajes/..."
        }
    """

    db: Session = SessionLocal()

    # =====================================================
    # TOKEN
    # =====================================================

    token = websocket.query_params.get(
        "token"
    )

    if not token:

        print(
            f"[WS-MSG] RECHAZADO "
            f"empleado={empleado_id}: sin token",
            flush=True,
        )

        await websocket.close(
            code=4001
        )

        db.close()

        return

    # =====================================================
    # VALIDAR JWT
    # =====================================================

    try:

        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[
                settings.ALGORITHM
            ],
        )

        usuario_id = payload.get(
            "id"
        )

        if usuario_id is None:

            print(
                "[WS-MSG] RECHAZADO: "
                "JWT sin id",
                flush=True,
            )

            await websocket.close(
                code=4002
            )

            db.close()

            return

        usuario_id = int(
            usuario_id
        )

        # -------------------------------------------------
        # El usuario autenticado debe ser el mismo
        # que viene en la URL.
        # -------------------------------------------------

        if usuario_id != empleado_id:

            print(
                "[WS-MSG] RECHAZADO: "
                f"JWT={usuario_id} URL={empleado_id}",
                flush=True,
            )

            await websocket.close(
                code=4003
            )

            db.close()

            return

    except jwt.ExpiredSignatureError:

        print(
            f"[WS-MSG] JWT EXPIRADO "
            f"empleado={empleado_id}",
            flush=True,
        )

        await websocket.close(
            code=4004
        )

        db.close()

        return

    except Exception as exc:

        print(
            f"[WS-MSG] JWT INVÁLIDO "
            f"empleado={empleado_id}: {exc}",
            flush=True,
        )

        await websocket.close(
            code=4005
        )

        db.close()

        return

    # =====================================================
    # COMPROBAR EMPLEADO
    # =====================================================

    empleado = (
        db.query(Empleado)
        .filter(
            Empleado.id == empleado_id
        )
        .first()
    )

    if not empleado:

        print(
            f"[WS-MSG] EMPLEADO NO EXISTE "
            f"id={empleado_id}",
            flush=True,
        )

        await websocket.close(
            code=4006
        )

        db.close()

        return

    # =====================================================
    # CONECTAR
    # =====================================================

    try:

        es_primera_conexion = (
            await manager.connect(
                websocket,
                empleado_id,
            )
        )

        print(
            f"[WS-MSG] CONECTADO "
            f"empleado={empleado_id}",
            flush=True,
        )

        # =================================================
        # ONLINE
        # =================================================

        if es_primera_conexion:

            await manager.broadcast(
                {
                    "tipo": "online",
                    "id": empleado.id,
                    "nombre": empleado.nombre,
                    "apellidos": empleado.apellidos,
                    "foto": empleado.foto,
                }
            )

        # =================================================
        # BUCLE PRINCIPAL
        # =================================================

        while True:

            try:

                msg = await websocket.receive_text()

            except WebSocketDisconnect:

                break

            except Exception as exc:

                print(
                    "[WS-MSG] Error receive_text "
                    f"empleado={empleado_id}: {exc}",
                    flush=True,
                )

                break

            # =================================================
            # PING
            # =================================================

            if msg == "ping":

                try:

                    await websocket.send_text(
                        "pong"
                    )

                except Exception:

                    pass

                continue

            # =================================================
            # JSON
            # =================================================

            try:

                data = json.loads(
                    msg
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

                # ---------------------------------------------
                # Nunca usamos un remitente enviado por el
                # frontend. Siempre utilizamos el usuario
                # autenticado.
                # ---------------------------------------------

                await manager.send_to_user(
                    destinatario_id,
                    {
                        "tipo": "typing",
                        "from": empleado_id,
                    },
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

                if destinatario_id <= 0:

                    continue

                contenido = data.get(
                    "contenido"
                )

                if contenido is None:

                    continue

                contenido = str(
                    contenido
                ).strip()

                if not contenido:

                    continue

                # ---------------------------------------------
                # GUARDAR + DISTRIBUIR
                # ---------------------------------------------

                try:

                    await manager.enviar_mensaje_ws(
                        remitente_id=empleado_id,
                        destinatario_id=destinatario_id,
                        contenido=contenido,
                    )

                except Exception as exc:

                    print(
                        "[WS-MSG] Error guardando "
                        f"mensaje: {exc}",
                        flush=True,
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

                if destinatario_id <= 0:

                    continue

                archivo_url = data.get(
                    "archivo_url"
                )

                if not archivo_url:

                    continue

                archivo_url = str(
                    archivo_url
                ).strip()

                if not archivo_url:

                    continue

                try:

                    await manager.enviar_archivo_ws(
                        remitente_id=empleado_id,
                        destinatario_id=destinatario_id,
                        archivo_url=archivo_url,
                    )

                except Exception as exc:

                    print(
                        "[WS-MSG] Error guardando "
                        f"archivo: {exc}",
                        flush=True,
                    )

                continue

    except WebSocketDisconnect:

        pass

    except Exception as exc:

        print(
            "[WS-MSG] ERROR GENERAL "
            f"empleado={empleado_id}: {exc}",
            flush=True,
        )

    finally:

        # =================================================
        # DESCONECTAR
        # =================================================

        era_ultima_conexion = (
            manager.disconnect(
                websocket,
                empleado_id,
            )
        )

        print(
            f"[WS-MSG] DESCONECTADO "
            f"empleado={empleado_id}",
            flush=True,
        )

        # =================================================
        # OFFLINE
        # =================================================

        if era_ultima_conexion:

            try:

                await manager.broadcast(
                    {
                        "tipo": "offline",
                        "id": empleado_id,
                    }
                )

            except Exception as exc:

                print(
                    "[WS-MSG] Error broadcast offline: "
                    f"{exc}",
                    flush=True,
                )

        # =================================================
        # DB
        # =================================================

        try:

            db.close()

        except Exception:

            pass

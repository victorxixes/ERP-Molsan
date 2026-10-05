from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import json
import jwt

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.empleados.models import Empleado
from backend.app.mensajes.ws_manager import manager


# =========================================================
# ROUTER WEBSOCKET MENSAJES
# =========================================================

router = APIRouter()


# =========================================================
# WEBSOCKET
# =========================================================

@router.websocket("/ws/mensajes/{empleado_id}")
async def mensajes_ws(
    websocket: WebSocket,
    empleado_id: int,
):
    """
    WebSocket realtime de mensajería.

    Funciones:
    - Autenticación JWT
    - Presencia online/offline
    - Typing
    - Mensajes realtime
    - Archivos realtime
    - Soporte para múltiples pestañas
    """

    db: Session = SessionLocal()

    # =====================================================
    # VALIDAR TOKEN
    # =====================================================

    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=4001)
        db.close()
        return

    try:

        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )

        usuario_id = payload.get("id")

        if usuario_id is None:
            await websocket.close(code=4002)
            db.close()
            return

        usuario_id = int(usuario_id)

        # El usuario autenticado debe coincidir
        # con el empleado indicado en la URL.

        if usuario_id != empleado_id:
            await websocket.close(code=4003)
            db.close()
            return

    except jwt.ExpiredSignatureError:

        await websocket.close(code=4004)
        db.close()
        return

    except Exception:

        await websocket.close(code=4005)
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

        await websocket.close(code=4006)
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
            f"[WS-MSG] Conectado: {empleado_id}",
            flush=True,
        )

        # =================================================
        # ONLINE
        # =================================================

        # Solo avisamos de "online" cuando realmente
        # aparece la primera conexión del empleado.
        #
        # Si tiene dos pestañas abiertas, la segunda
        # no vuelve a generar otro evento online.

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
        # BUCLE
        # =================================================

        while True:

            try:

                msg = await websocket.receive_text()

            except WebSocketDisconnect:
                break

            except Exception as exc:

                print(
                    f"[WS-MSG] Error recibiendo mensaje "
                    f"de {empleado_id}: {exc}",
                    flush=True,
                )

                continue

            # =================================================
            # PING
            # =================================================

            if msg == "ping":

                # Respondemos para mantener viva la conexión.
                try:
                    await websocket.send_text("pong")
                except Exception:
                    pass

                continue

            # =================================================
            # JSON
            # =================================================

            try:

                data = json.loads(msg)

            except Exception:

                continue

            if not isinstance(data, dict):
                continue

            tipo = data.get("tipo")

            if not tipo:
                continue

            # =================================================
            # TYPING
            # =================================================

            if tipo == "typing":

                try:

                    destinatario_id = int(
                        data.get("destinatario_id")
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue

                if destinatario_id <= 0:
                    continue

                # Nunca permitir que un usuario envíe
                # typing fingiendo ser otro remitente.

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
                        data.get("destinatario_id")
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue

                contenido = data.get(
                    "contenido"
                )

                if destinatario_id <= 0:
                    continue

                if contenido is None:
                    continue

                contenido = str(
                    contenido
                ).strip()

                if not contenido:
                    continue

                # ---------------------------------------------
                # GUARDAR + ENVIAR
                # ---------------------------------------------

                await manager.enviar_mensaje_ws(
                    remitente_id=empleado_id,
                    destinatario_id=destinatario_id,
                    contenido=contenido,
                )

                # IMPORTANTE:
                #
                # NO hacemos aquí send_to_user().
                #
                # enviar_mensaje_ws() ya guarda el mensaje
                # y envía el objeto completo al remitente
                # y destinatario.
                #
                # Así evitamos duplicados.

                continue

            # =================================================
            # ARCHIVO
            # =================================================

            if tipo == "archivo":

                try:

                    destinatario_id = int(
                        data.get("destinatario_id")
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue

                archivo_url = data.get(
                    "archivo_url"
                )

                if destinatario_id <= 0:
                    continue

                if not archivo_url:
                    continue

                archivo_url = str(
                    archivo_url
                ).strip()

                if not archivo_url:
                    continue

                # ---------------------------------------------
                # GUARDAR + ENVIAR
                # ---------------------------------------------

                await manager.enviar_archivo_ws(
                    remitente_id=empleado_id,
                    destinatario_id=destinatario_id,
                    archivo_url=archivo_url,
                )

                # Igual que con el mensaje:
                #
                # enviar_archivo_ws() ya realiza todo.
                #
                # NO enviamos otro evento aquí.

                continue

    except WebSocketDisconnect:
        pass

    except Exception as exc:

        print(
            f"[WS-MSG] Error general "
            f"empleado {empleado_id}: {exc}",
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
            f"[WS-MSG] Desconectado: {empleado_id}",
            flush=True,
        )

        # =================================================
        # OFFLINE
        # =================================================

        # Solo notificamos offline cuando ya no queda
        # ninguna pestaña/conexión del empleado.

        if era_ultima_conexion:

            await manager.broadcast(
                {
                    "tipo": "offline",
                    "id": empleado_id,
                }
            )

        # =================================================
        # CERRAR DB
        # =================================================

        try:
            db.close()
        except Exception:
            pass


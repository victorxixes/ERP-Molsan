"""Canal Realtime global autenticado y con permisos validados.

No permite que el cliente elija el usuario, rol, módulo o grupo de suscripción.
La identidad y el rol se obtienen del empleado autenticado en PostgreSQL.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session

from backend.app.auth.websocket_auth import autenticar_websocket
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import SessionLocal
from backend.app.empleados.models import Empleado
from backend.app.mensajes.adjuntos import ruta_adjunto_mensaje
from backend.app.mensajes.ws_manager import manager as mensajes_manager
from backend.app.realtime.manager import realtime_manager
from backend.app.realtime.schemas import RealtimeEvent

router = APIRouter(prefix="/ws/realtime", tags=["Realtime"])
MAX_TEXTO = 10_000


def _codigo_cierre_autenticacion(exc: HTTPException) -> tuple[int, str]:
    """Distingue rechazos definitivos de fallos temporales del servidor."""
    if exc.status_code == 401:
        return 4401, "Sesión no válida"
    if exc.status_code == 403:
        return 4403, "Permiso insuficiente"
    if exc.status_code >= 500:
        return 1013, "Servicio temporalmente no disponible"
    return 4403, "Solicitud o permiso no válido"


async def _rechazar_websocket(websocket: WebSocket, codigo: int, motivo: str) -> None:
    """Acepta solo para poder enviar un código de cierre reconocible por el navegador.

    Si se cierra antes de aceptar el handshake, el navegador suele exponer 1006
    y el cliente no puede distinguir un rechazo de autenticación de un corte de red.
    No se envía ningún dato ni se registra la conexión en el gestor.
    """
    await websocket.accept()
    await websocket.close(code=codigo, reason=motivo)


def _empleado_activo(db: Session, empleado_id: int) -> Optional[Empleado]:
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if empleado is None or getattr(empleado, "activo", True) is False:
        return None
    return empleado


def _destinatario_activo(empleado_id: int) -> bool:
    """Comprueba al destinatario con una sesión corta, sin retener conexiones en el WebSocket."""
    db_destinatario: Session = SessionLocal()
    try:
        return _empleado_activo(db_destinatario, empleado_id) is not None
    finally:
        db_destinatario.close()


def _destinatario_id(data: dict, emisor_id: int) -> Optional[int]:
    try:
        destinatario_id = int(data.get("destinatario_id"))
    except (TypeError, ValueError):
        return None
    if destinatario_id <= 0 or destinatario_id == emisor_id:
        return None
    return destinatario_id


@router.websocket("/")
async def realtime_ws(websocket: WebSocket):
    token = websocket.query_params.get("token", "").strip()
    usuario_id_param = websocket.query_params.get("usuario_id")
    db: Session = SessionLocal()
    usuario_id: Optional[int] = None
    conectado = False

    try:
        try:
            # La presencia es global para empleados autenticados. No se exige
            # permiso de Mensajes para establecer el canal de presencia.
            usuario_id = autenticar_websocket(token)
        except HTTPException as exc:
            codigo, motivo = _codigo_cierre_autenticacion(exc)
            await _rechazar_websocket(websocket, codigo, motivo)
            return
        except Exception:
            # Un fallo inesperado al consultar/validar la sesión puede ser
            # transitorio (por ejemplo, una indisponibilidad de PostgreSQL).
            # No debe bloquear la reconexión como si el JWT fuese inválido.
            await _rechazar_websocket(websocket, 1013, "Servicio temporalmente no disponible")
            return

        if usuario_id_param is not None:
            try:
                if int(usuario_id_param) != usuario_id:
                    await _rechazar_websocket(websocket, 4403, "El usuario no coincide con el token")
                    return
            except (TypeError, ValueError):
                await _rechazar_websocket(websocket, 4403, "Identidad de usuario no válida")
                return

        empleado = _empleado_activo(db, usuario_id)
        if empleado is None:
            await _rechazar_websocket(websocket, 4401, "Empleado inexistente o inactivo")
            return

        # Ignora rol/modulo/grupo enviados por el cliente. El rol, si existe,
        # siempre procede de la relación guardada en el servidor.
        rol_obj = getattr(empleado, "rol", None)
        rol_nombre = getattr(rol_obj, "nombre", None) if rol_obj else None
        usuario_info = {
            "id": empleado.id,
            "nombre": getattr(empleado, "nombre", None),
            "apellidos": getattr(empleado, "apellidos", None),
            "foto": getattr(empleado, "foto", None),
        }

        # La presencia no concede acceso a la mensajería. Registramos por
        # separado si este empleado tiene permiso para recibir/enviar mensajes.
        try:
            require_perm_modulo(empleado, "mensajes", "ver")
            puede_mensajes = True
        except HTTPException:
            puede_mensajes = False

        # La sesión solo se necesita para autenticar y leer el empleado.
        # No mantengas una conexión PostgreSQL abierta durante toda la vida
        # del WebSocket: puede quedar obsoleta y fallar al cerrarse la conexión
        # SSL o durante un reinicio de la base de datos.
        db.close()

        era_primera = await realtime_manager.connect(
            websocket,
            usuario_id=usuario_id,
            rol=rol_nombre,
            usuario_info=usuario_info,
            puede_mensajes=puede_mensajes,
        )
        conectado = True

        snapshot = RealtimeEvent(
            modulo="realtime",
            evento="usuarios_snapshot",
            usuario_id=usuario_id,
            data={"usuarios": realtime_manager.obtener_usuarios_conectados()},
        )
        await websocket.send_json(snapshot.dict())

        if era_primera:
            online_event = RealtimeEvent(
                modulo="mensajes",
                evento="usuario_online",
                usuario_id=usuario_id,
                data=usuario_info,
            )
            await realtime_manager.broadcast_global_except(websocket, online_event)

        while True:
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            if raw == "ping":
                await websocket.send_json({"tipo": "pong"})
                continue

            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                continue
            if not isinstance(data, dict):
                continue

            tipo = str(data.get("tipo") or "").strip().lower()
            if tipo == "ping":
                await websocket.send_json({"tipo": "pong"})
                continue
            if tipo not in {"typing", "mensaje", "archivo"}:
                continue

            # La presencia global no da acceso al canal de Mensajes.
            if not puede_mensajes:
                continue

            destinatario_id = _destinatario_id(data, usuario_id)
            if destinatario_id is None:
                continue
            if not _destinatario_activo(destinatario_id):
                continue

            # Para eventos que envían contenido se exige también permiso crear.
            if tipo in {"mensaje", "archivo"}:
                try:
                    autenticar_websocket(token, modulo="mensajes", accion="crear")
                except HTTPException as exc:
                    await websocket.send_json({
                        "tipo": "error",
                        "codigo": "permiso_insuficiente",
                        "detalle": "No tienes permiso para enviar mensajes o adjuntos.",
                    })
                    if exc.status_code == 401:
                        await websocket.close(code=4401, reason="Sesión no válida")
                        break
                    continue
                except Exception:
                    await websocket.close(code=4401, reason="No se pudo validar la sesión")
                    break

            if tipo == "typing":
                event = RealtimeEvent(
                    modulo="mensajes",
                    evento="typing",
                    usuario_id=usuario_id,
                    data={"from": usuario_id},
                )
                await realtime_manager.broadcast_usuario(destinatario_id, event)
                continue

            if tipo == "mensaje":
                contenido = data.get("contenido")
                if not isinstance(contenido, str):
                    continue
                contenido = contenido.strip()
                if not contenido or len(contenido) > MAX_TEXTO:
                    continue
                try:
                    mensaje = await mensajes_manager.enviar_mensaje_ws(
                        remitente_id=usuario_id,
                        destinatario_id=destinatario_id,
                        contenido=contenido,
                    )
                except Exception as exc:
                    print(f"[REALTIME] Error guardando mensaje: {exc!r}", flush=True)
                    await websocket.send_json({"tipo": "error", "codigo": "mensaje_no_guardado"})
                    continue

                event = RealtimeEvent(
                    modulo="mensajes",
                    evento="mensaje_nuevo",
                    usuario_id=usuario_id,
                    data={"tipo": "nuevo_mensaje", "mensaje": mensaje.as_dict()},
                )
                await realtime_manager.broadcast_usuario(usuario_id, event)
                await realtime_manager.broadcast_usuario(destinatario_id, event)
                continue

            if tipo == "archivo":
                archivo_url = data.get("archivo_url")
                ruta_adjunto = ruta_adjunto_mensaje(archivo_url, exigir_existencia=True)
                if ruta_adjunto is None:
                    continue
                try:
                    mensaje = await mensajes_manager.enviar_archivo_ws(
                        remitente_id=usuario_id,
                        destinatario_id=destinatario_id,
                        archivo_url=str(archivo_url).strip(),
                    )
                except Exception as exc:
                    print(f"[REALTIME] Error guardando adjunto: {exc!r}", flush=True)
                    await websocket.send_json({"tipo": "error", "codigo": "adjunto_no_guardado"})
                    continue

                event = RealtimeEvent(
                    modulo="mensajes",
                    evento="archivo_nuevo",
                    usuario_id=usuario_id,
                    data={"tipo": "nuevo_archivo", "mensaje": mensaje.as_dict()},
                )
                await realtime_manager.broadcast_usuario(usuario_id, event)
                await realtime_manager.broadcast_usuario(destinatario_id, event)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        print(f"[REALTIME] Error WebSocket: {type(exc).__name__}", flush=True)
        try:
            await websocket.close(code=1011, reason="Error interno del WebSocket")
        except Exception:
            pass
    finally:
        if conectado:
            try:
                usuario_id_desconectado, era_ultima_conexion = realtime_manager.disconnect(websocket)
                if usuario_id_desconectado is not None and era_ultima_conexion:
                    offline_event = RealtimeEvent(
                        modulo="mensajes",
                        evento="usuario_offline",
                        usuario_id=usuario_id_desconectado,
                        data={"id": usuario_id_desconectado},
                    )
                    await realtime_manager.broadcast_global(offline_event)
            except Exception as exc:
                print(f"[REALTIME] Error liberando conexión: {exc!r}", flush=True)
        db.close()

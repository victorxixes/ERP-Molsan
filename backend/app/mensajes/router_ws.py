"""WebSocket de Mensajes con validación de identidad y destinatarios."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.app.auth.websocket_auth import autenticar_websocket
from backend.app.database import SessionLocal
from backend.app.empleados.models import Empleado
from backend.app.mensajes.ws_manager import manager
from backend.app.mensajes.adjuntos import ruta_adjunto_mensaje

router = APIRouter()
MAX_TEXTO = 10_000


def _empleado_activo(db: Session, empleado_id: int):
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        return None
    if hasattr(empleado, "activo") and empleado.activo is False:
        return None
    return empleado


@router.websocket("/ws/mensajes/{empleado_id}")
async def mensajes_ws(websocket: WebSocket, empleado_id: int):
    """Conexión realtime autenticada: el ID de ruta debe coincidir con el JWT."""
    db: Session = SessionLocal()
    conectado = False
    try:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=4001, reason="Falta el token")
            return

        try:
            usuario_id = autenticar_websocket(
                token, modulo="mensajes", accion="ver"
            )
        except HTTPException as exc:
            codigo = 4003 if exc.status_code == 403 else 4005
            motivo = "Permiso insuficiente" if codigo == 4003 else "Token inválido o usuario inactivo"
            await websocket.close(code=codigo, reason=motivo)
            return
        except Exception:
            await websocket.close(code=4005, reason="No se pudo validar la sesión")
            return

        if usuario_id != empleado_id:
            await websocket.close(code=4003, reason="El token no corresponde al empleado")
            return

        empleado = _empleado_activo(db, empleado_id)
        if not empleado:
            await websocket.close(code=4006, reason="Empleado inexistente o inactivo")
            return

        primera_conexion = await manager.connect(websocket, empleado_id)
        conectado = True

        if primera_conexion:
            await manager.broadcast({
                "tipo": "online",
                "id": empleado.id,
                "nombre": empleado.nombre,
                "apellidos": empleado.apellidos,
                "foto": empleado.foto,
            })

        while True:
            try:
                mensaje_recibido = await websocket.receive_text()
            except WebSocketDisconnect:
                break

            if mensaje_recibido == "ping":
                await websocket.send_text("pong")
                continue

            try:
                data = json.loads(mensaje_recibido)
            except (json.JSONDecodeError, TypeError):
                continue
            if not isinstance(data, dict):
                continue

            tipo = data.get("tipo")
            if tipo not in {"typing", "mensaje", "archivo"}:
                continue

            try:
                destinatario_id = int(data.get("destinatario_id"))
            except (TypeError, ValueError):
                continue
            if destinatario_id <= 0 or destinatario_id == empleado_id:
                continue

            destinatario = _empleado_activo(db, destinatario_id)
            if destinatario is None:
                # No filtrar detalles del destinatario por el socket; simplemente ignorar.
                continue

            if tipo == "typing":
                await manager.send_to_user(destinatario_id, {
                    "tipo": "typing",
                    "from": empleado_id,
                })
                continue

            if tipo == "mensaje":
                try:
                    autenticar_websocket(token, modulo="mensajes", accion="crear")
                except HTTPException as exc:
                    await websocket.send_json({"tipo": "error", "codigo": "permiso_insuficiente"})
                    if exc.status_code == 401:
                        await websocket.close(code=4005, reason="Sesión no válida")
                        break
                    continue
                except Exception:
                    await websocket.close(code=4005, reason="No se pudo validar la sesión")
                    break
                contenido = data.get("contenido")
                if not isinstance(contenido, str):
                    continue
                contenido = contenido.strip()
                if not contenido or len(contenido) > MAX_TEXTO:
                    continue
                await manager.enviar_mensaje_ws(
                    remitente_id=empleado_id,
                    destinatario_id=destinatario_id,
                    contenido=contenido,
                )
                continue

            if tipo == "archivo":
                try:
                    autenticar_websocket(token, modulo="mensajes", accion="crear")
                except HTTPException as exc:
                    await websocket.send_json({"tipo": "error", "codigo": "permiso_insuficiente"})
                    if exc.status_code == 401:
                        await websocket.close(code=4005, reason="Sesión no válida")
                        break
                    continue
                except Exception:
                    await websocket.close(code=4005, reason="No se pudo validar la sesión")
                    break
                archivo_url = data.get("archivo_url")
                if ruta_adjunto_mensaje(archivo_url, exigir_existencia=True) is None:
                    continue
                await manager.enviar_archivo_ws(
                    remitente_id=empleado_id,
                    destinatario_id=destinatario_id,
                    archivo_url=archivo_url.strip(),
                )

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        print(f"[WS-MSG] Error general empleado {empleado_id}: {exc}", flush=True)
        try:
            await websocket.close(code=1011, reason="Error interno del WebSocket")
        except Exception:
            pass
    finally:
        if conectado:
            ultima_conexion = manager.disconnect(websocket, empleado_id)
            if ultima_conexion:
                try:
                    await manager.broadcast({"tipo": "offline", "id": empleado_id})
                except Exception as exc:
                    print(f"[WS-MSG] Error broadcast offline: {exc}", flush=True)
        db.close()

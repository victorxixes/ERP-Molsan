from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.empleados.models import Empleado
from backend.app.mensajes.models import Mensaje
from backend.app.mensajes.schemas import MensajeCreate
from backend.app.mensajes.service import (
    enviar_mensaje,
    listar_conversacion,
    marcar_leido,
    marcar_conversacion_leida,
)
from backend.app.mensajes.ws_manager import manager


router = APIRouter(
    prefix="/mensajes",
    tags=["Mensajes"],
    redirect_slashes=False,
)

# Conserva la misma ubicación que main.py monta como /static/mensajes.
CARPETA_MENSAJES = Path("/tmp/mensajes")
MAX_ARCHIVO_BYTES = 20 * 1024 * 1024
EXTENSIONES_PERMITIDAS = {"pdf", "doc", "docx", "jpg", "jpeg", "png"}


def _usuario_actual_id(usuario: Empleado) -> int:
    try:
        return int(usuario.id)
    except (AttributeError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="No se pudo identificar al usuario autenticado")


@router.get("/conectados")
def conectados(
    usuario_id: int | None = None,
    db: Session = Depends(get_db),
    usuario_actual: Empleado = Depends(get_current_user),
):
    """Lista empleados conectados y mensajes pendientes del usuario autenticado."""
    actual_id = _usuario_actual_id(usuario_actual)
    if usuario_id is not None and int(usuario_id) != actual_id:
        raise HTTPException(status_code=403, detail="No puedes consultar los contadores de otro usuario")

    empleados_ids = manager.obtener_ids_conectados()
    if not empleados_ids:
        return []

    filas = (
        db.query(Mensaje.remitente_id, func.count(Mensaje.id))
        .filter(
            Mensaje.destinatario_id == actual_id,
            Mensaje.leido.is_(False),
            Mensaje.remitente_id.in_(empleados_ids),
        )
        .group_by(Mensaje.remitente_id)
        .all()
    )
    pendientes = {int(remitente_id): int(cantidad) for remitente_id, cantidad in filas}
    empleados = db.query(Empleado).filter(Empleado.id.in_(empleados_ids)).all()
    por_id = {empleado.id: empleado for empleado in empleados}

    resultado = []
    for empleado_id in empleados_ids:
        empleado = por_id.get(empleado_id)
        if not empleado:
            continue
        resultado.append({
            "id": empleado.id,
            "nombre": empleado.nombre,
            "apellidos": empleado.apellidos,
            "foto": empleado.foto,
            "rol": empleado.rol.nombre if empleado.rol else None,
            "mensajes_no_leidos": pendientes.get(empleado.id, 0),
        })
    return resultado


@router.post("")
def enviar(
    datos: MensajeCreate,
    db: Session = Depends(get_db),
    usuario_actual: Empleado = Depends(get_current_user),
):
    """Envía por REST únicamente en nombre del usuario autenticado."""
    actual_id = _usuario_actual_id(usuario_actual)
    if int(datos.remitente_id) != actual_id:
        raise HTTPException(status_code=403, detail="No puedes enviar mensajes usando otro remitente")
    if int(datos.destinatario_id) == actual_id:
        raise HTTPException(status_code=400, detail="No puedes enviarte un mensaje a ti mismo")
    destinatario = db.query(Empleado).filter(Empleado.id == datos.destinatario_id).first()
    if not destinatario:
        raise HTTPException(status_code=404, detail="El destinatario no existe")

    d = datos.dict()
    d["fecha"] = datetime.now()
    d["leido"] = False
    return enviar_mensaje(db, d)


@router.post("/upload")
async def subir_archivo(file: UploadFile = File(...)):
    """Sube adjuntos para el flujo realtime existente.

    IMPORTANTE: se mantiene temporalmente compatible con el fetch actual de
    Mensajes.jsx, que aún no envía Authorization. Por ello esta ruta continúa
    sin autenticación hasta que se actualice también ese componente. Está
    limitada por extensión y tamaño, pero no debe considerarse cerrada.
    """
    nombre_original = Path(file.filename or "").name
    if not nombre_original or nombre_original in {".", ".."}:
        raise HTTPException(status_code=400, detail="No se recibió un nombre de archivo válido")
    if "." not in nombre_original:
        raise HTTPException(status_code=400, detail="El archivo no tiene extensión")
    ext = nombre_original.rsplit(".", 1)[-1].lower().strip()
    if ext not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(status_code=400, detail=f"Extensión no permitida: .{ext}")

    contenido = await file.read(MAX_ARCHIVO_BYTES + 1)
    await file.close()
    if len(contenido) > MAX_ARCHIVO_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 20 MB")
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    nombre = f"{uuid4().hex}.{ext}"
    try:
        CARPETA_MENSAJES.mkdir(parents=True, exist_ok=True)
        ruta = CARPETA_MENSAJES / nombre
        ruta.write_bytes(contenido)
    except OSError as exc:
        print(f"[MENSAJES] Error guardando archivo: {exc}", flush=True)
        raise HTTPException(status_code=500, detail="No se pudo guardar el archivo") from exc

    return {"status": "ok", "archivo_url": f"/static/mensajes/{nombre}"}


@router.get("/{usuario_id}/{otro_id}")
def conversacion(
    usuario_id: int,
    otro_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Empleado = Depends(get_current_user),
):
    """No permite cambiar usuario_id para leer conversaciones ajenas."""
    actual_id = _usuario_actual_id(usuario_actual)
    if usuario_id != actual_id:
        raise HTTPException(status_code=403, detail="No puedes consultar la conversación de otro usuario")
    if otro_id == actual_id:
        raise HTTPException(status_code=400, detail="El interlocutor debe ser otro usuario")
    return listar_conversacion(db, actual_id, otro_id)


@router.put("/leido/{mensaje_id}")
def leido(
    mensaje_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Empleado = Depends(get_current_user),
):
    """Solo el destinatario del mensaje puede marcarlo como leído."""
    actual_id = _usuario_actual_id(usuario_actual)
    mensaje = db.query(Mensaje).filter(Mensaje.id == mensaje_id).first()
    if not mensaje:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    if int(mensaje.destinatario_id) != actual_id:
        raise HTTPException(status_code=403, detail="Solo el destinatario puede marcar este mensaje como leído")
    return marcar_leido(db, mensaje_id)


@router.put("/leido/conversacion/{usuario_id}/{otro_id}")
def marcar_conversacion(
    usuario_id: int,
    otro_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Empleado = Depends(get_current_user),
):
    """Marca como leídos solo los mensajes que el interlocutor envió al usuario actual."""
    actual_id = _usuario_actual_id(usuario_actual)
    if usuario_id != actual_id:
        raise HTTPException(status_code=403, detail="No puedes marcar la conversación de otro usuario")
    if otro_id == actual_id:
        raise HTTPException(status_code=400, detail="El interlocutor debe ser otro usuario")
    return marcar_conversacion_leida(db, actual_id, otro_id)

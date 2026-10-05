from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import uuid4
import os
from datetime import datetime

from backend.app.empleados.models import Empleado
from backend.app.database import get_db
from backend.app.mensajes.models import Mensaje
from backend.app.mensajes.schemas import MensajeCreate
from backend.app.mensajes.service import (
    enviar_mensaje,
    listar_conversacion,
    marcar_leido,
    marcar_conversacion_leida,
)
from backend.app.mensajes.ws_manager import manager


# =========================================================
# ROUTER MENSAJES
# =========================================================

router = APIRouter(
    prefix="/mensajes",
    tags=["Mensajes"],
    redirect_slashes=False,
)


# =========================================================
# EMPLEADOS CONECTADOS
# =========================================================

@router.get("/conectados")
def conectados(
    usuario_id: int | None = Query(
        None,
        description="ID del empleado actual para calcular mensajes pendientes",
    ),
    db: Session = Depends(get_db),
):
    """
    Devuelve los empleados actualmente conectados.

    Además devuelve:

        mensajes_no_leidos

    para cada empleado.

    El contador representa mensajes que ese empleado
    ha enviado al usuario actual y todavía están sin leer.

    Ejemplo:

    {
        "id": 15,
        "nombre": "Víctor",
        "apellidos": "Tomás",
        "foto": "/static/fotos/15.jpg",
        "rol": "empleado",
        "mensajes_no_leidos": 3
    }
    """

    resultado = []

    # ---------------------------------------------------------
    # IDS CONECTADOS
    # ---------------------------------------------------------

    empleados_ids = manager.obtener_ids_conectados()

    if not empleados_ids:
        return resultado

    # ---------------------------------------------------------
    # CONTADORES DE MENSAJES NO LEÍDOS
    # ---------------------------------------------------------

    pendientes_por_usuario = {}

    if usuario_id:

        filas = (
            db.query(
                Mensaje.remitente_id,
                func.count(Mensaje.id),
            )
            .filter(
                Mensaje.destinatario_id == usuario_id,
                Mensaje.leido.is_(False),
                Mensaje.remitente_id.in_(empleados_ids),
            )
            .group_by(
                Mensaje.remitente_id
            )
            .all()
        )

        pendientes_por_usuario = {
            int(remitente_id): int(cantidad)
            for remitente_id, cantidad in filas
        }

    # ---------------------------------------------------------
    # EMPLEADOS
    # ---------------------------------------------------------

    empleados = (
        db.query(Empleado)
        .filter(
            Empleado.id.in_(empleados_ids)
        )
        .all()
    )

    empleados_por_id = {
        empleado.id: empleado
        for empleado in empleados
    }

    # ---------------------------------------------------------
    # RESULTADO
    # ---------------------------------------------------------

    for empleado_id in empleados_ids:

        empleado = empleados_por_id.get(
            empleado_id
        )

        if not empleado:
            continue

        resultado.append(
            {
                "id": empleado.id,
                "nombre": empleado.nombre,
                "apellidos": empleado.apellidos,
                "foto": empleado.foto,
                "rol": (
                    empleado.rol.nombre
                    if empleado.rol
                    else None
                ),
                "mensajes_no_leidos": pendientes_por_usuario.get(
                    empleado.id,
                    0,
                ),
            }
        )

    return resultado


# =========================================================
# ENVIAR MENSAJE REST
# =========================================================

@router.post("")
def enviar(
    datos: MensajeCreate,
    db: Session = Depends(get_db),
):
    """
    Envío tradicional REST.

    Se mantiene por compatibilidad.

    La mensajería realtime utiliza WebSocket.
    """

    d = datos.dict()

    d["fecha"] = datetime.now()
    d["leido"] = False

    return enviar_mensaje(
        db,
        d,
    )


# =========================================================
# SUBIR ARCHIVO
# =========================================================

@router.post("/upload")
def subir_archivo(
    file: UploadFile = File(...),
):
    """
    Sube un archivo temporalmente.

    El registro del mensaje se crea posteriormente
    mediante WebSocket.
    """

    if not file.filename:
        return {
            "status": "error",
            "msg": "No se recibió ningún archivo.",
        }

    # ---------------------------------------------------------
    # EXTENSIÓN
    # ---------------------------------------------------------

    nombre_original = file.filename

    if "." not in nombre_original:
        return {
            "status": "error",
            "msg": "El archivo no tiene extensión.",
        }

    ext = (
        nombre_original
        .rsplit(".", 1)[-1]
        .lower()
        .strip()
    )

    extensiones_permitidas = {
        "pdf",
        "doc",
        "docx",
        "jpg",
        "jpeg",
        "png",
    }

    if ext not in extensiones_permitidas:
        return {
            "status": "error",
            "msg": f"Extensión no permitida: .{ext}",
        }

    # ---------------------------------------------------------
    # NOMBRE SEGURO
    # ---------------------------------------------------------

    nombre = f"{uuid4()}.{ext}"

    carpeta_tmp = "/tmp/mensajes"

    os.makedirs(
        carpeta_tmp,
        exist_ok=True,
    )

    ruta_tmp = os.path.join(
        carpeta_tmp,
        nombre,
    )

    # ---------------------------------------------------------
    # GUARDAR
    # ---------------------------------------------------------

    try:

        contenido = file.file.read()

        with open(
            ruta_tmp,
            "wb",
        ) as f:
            f.write(contenido)

    except Exception as exc:

        print(
            f"[MENSAJES] Error guardando archivo: {exc}",
            flush=True,
        )

        return {
            "status": "error",
            "msg": "No se pudo guardar el archivo.",
        }

    # ---------------------------------------------------------
    # URL
    # ---------------------------------------------------------

    archivo_url = (
        f"/static/mensajes/{nombre}"
    )

    return {
        "status": "ok",
        "archivo_url": archivo_url,
    }


# =========================================================
# CONVERSACIÓN
# =========================================================

@router.get("/{usuario_id}/{otro_id}")
def conversacion(
    usuario_id: int,
    otro_id: int,
    db: Session = Depends(get_db),
):
    return listar_conversacion(
        db,
        usuario_id,
        otro_id,
    )


# =========================================================
# MARCAR MENSAJE COMO LEÍDO
# =========================================================

@router.put("/leido/{mensaje_id}")
def leido(
    mensaje_id: int,
    db: Session = Depends(get_db),
):
    return marcar_leido(
        db,
        mensaje_id,
    )


# =========================================================
# MARCAR CONVERSACIÓN COMO LEÍDA
# =========================================================

@router.put("/leido/conversacion/{usuario_id}/{otro_id}")
def marcar_conversacion(
    usuario_id: int,
    otro_id: int,
    db: Session = Depends(get_db),
):
    return marcar_conversacion_leida(
        db,
        usuario_id,
        otro_id,
    )

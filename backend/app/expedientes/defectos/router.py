
from datetime import date
from io import BytesIO
from typing import Optional
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.defectos.models import (
    DefectoSubtipo,
    ExpedienteDefecto,
)


router = APIRouter(
    prefix="/expedientes",
    tags=["Defectos de expedientes"],
)

MAX_PDF_BYTES = 15 * 1024 * 1024


# ============================================================
# ESQUEMAS
# ============================================================

class SubtipoCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    activo: bool = True


class SubtipoActualizar(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    activo: bool = True


class SubtipoRespuesta(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    activo: bool

    class Config:
        orm_mode = True


class DefectoCrear(BaseModel):
    documento: Optional[str] = Field(None, max_length=300)
    motivo_defecto: str = Field(..., min_length=1, max_length=500)
    subtipo_defecto_id: Optional[int] = None
    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_entrada_subsanacion: Optional[date] = None
    observaciones_registro: Optional[str] = Field(None, max_length=200)


class DefectoActualizar(BaseModel):
    documento: Optional[str] = Field(None, max_length=300)
    motivo_defecto: Optional[str] = Field(None, max_length=500)
    subtipo_defecto_id: Optional[int] = None
    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_entrada_subsanacion: Optional[date] = None
    observaciones_registro: Optional[str] = Field(None, max_length=200)
    fecha_cierre_defecto: Optional[date] = None


class DefectoRespuesta(BaseModel):
    id: int
    expediente_id: int
    documento: Optional[str] = None
    motivo_defecto: Optional[str] = None
    subtipo_defecto_id: Optional[int] = None
    subtipo_defecto: Optional[str] = None
    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_entrada_subsanacion: Optional[date] = None
    fecha_cierre_defecto: Optional[date] = None
    observaciones_registro: Optional[str] = None
    tiene_defectos_abiertos: Optional[str] = None
    calificacion_nombre: Optional[str] = None
    calificacion_content_type: Optional[str] = None
    calificacion_tamano: Optional[int] = None

    class Config:
        orm_mode = True


# ============================================================
# UTILIDADES
# ============================================================

def obtener_expediente(db: Session, id_expediente: int) -> Expediente:
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    return expediente


def obtener_defecto(
    db: Session,
    expediente_id: int,
    defecto_id: int,
) -> ExpedienteDefecto:
    defecto = (
        db.query(ExpedienteDefecto)
        .filter(
            ExpedienteDefecto.id == defecto_id,
            ExpedienteDefecto.expediente_id == expediente_id,
        )
        .first()
    )
    if not defecto:
        raise HTTPException(status_code=404, detail="Defecto no encontrado.")
    return defecto


def obtener_subtipo_activo(db: Session, subtipo_id: int) -> DefectoSubtipo:
    subtipo = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.id == subtipo_id,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )
    if not subtipo:
        raise HTTPException(
            status_code=400,
            detail="El subtipo seleccionado no existe o está inactivo.",
        )
    return subtipo


def sincronizar_campos_compatibilidad(defecto: ExpedienteDefecto) -> None:
    """Mantiene actualizados los campos históricos usados por otras pantallas."""
    defecto.tipo_error = defecto.motivo_defecto
    defecto.falta_defecto = defecto.subtipo_defecto or defecto.motivo_defecto

    if defecto.fecha_cierre_defecto:
        defecto.tiene_defectos_abiertos = "NO"
    elif defecto.fecha_entrada_subsanacion:
        # La entrada de subsanación no equivale a cierre.
        defecto.tiene_defectos_abiertos = "SI"
    else:
        defecto.tiene_defectos_abiertos = "SI"


# ============================================================
# CATÁLOGO DE SUBTIPOS
# Base URL: /api/expedientes/subtipos-defecto
# ============================================================

@router.get(
    "/subtipos-defecto",
    response_model=list[SubtipoRespuesta],
)
def listar_subtipos_defecto(
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
):
    consulta = db.query(DefectoSubtipo)

    if not incluir_inactivos:
        consulta = consulta.filter(DefectoSubtipo.activo.is_(True))

    return consulta.order_by(DefectoSubtipo.nombre.asc()).all()


@router.post(
    "/subtipos-defecto",
    response_model=SubtipoRespuesta,
    status_code=201,
)
def crear_subtipo_defecto(
    datos: SubtipoCrear,
    db: Session = Depends(get_db),
):
    nombre = " ".join(datos.nombre.strip().split())
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")

    existente = (
        db.query(DefectoSubtipo)
        .filter(func.lower(DefectoSubtipo.nombre) == nombre.lower())
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un subtipo con ese nombre.",
        )

    subtipo = DefectoSubtipo(
        nombre=nombre,
        descripcion=datos.descripcion,
        activo=datos.activo,
    )
    db.add(subtipo)

    try:
        db.commit()
        db.refresh(subtipo)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el subtipo.",
        )

    return subtipo


@router.put(
    "/subtipos-defecto/{subtipo_id}",
    response_model=SubtipoRespuesta,
)
def actualizar_subtipo_defecto(
    subtipo_id: int,
    datos: SubtipoActualizar,
    db: Session = Depends(get_db),
):
    subtipo = (
        db.query(DefectoSubtipo)
        .filter(DefectoSubtipo.id == subtipo_id)
        .first()
    )
    if not subtipo:
        raise HTTPException(status_code=404, detail="Subtipo no encontrado.")

    nombre = " ".join(datos.nombre.strip().split())
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio.")

    duplicado = (
        db.query(DefectoSubtipo)
        .filter(
            func.lower(DefectoSubtipo.nombre) == nombre.lower(),
            DefectoSubtipo.id != subtipo_id,
        )
        .first()
    )
    if duplicado:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otro subtipo con ese nombre.",
        )

    subtipo.nombre = nombre
    subtipo.descripcion = datos.descripcion
    subtipo.activo = datos.activo

    try:
        db.commit()
        db.refresh(subtipo)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el subtipo.",
        )

    return subtipo


@router.delete("/subtipos-defecto/{subtipo_id}")
def desactivar_subtipo_defecto(
    subtipo_id: int,
    db: Session = Depends(get_db),
):
    subtipo = (
        db.query(DefectoSubtipo)
        .filter(DefectoSubtipo.id == subtipo_id)
        .first()
    )
    if not subtipo:
        raise HTTPException(status_code=404, detail="Subtipo no encontrado.")

    # No borramos el registro: los defectos históricos pueden referenciarlo.
    subtipo.activo = False

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo desactivar el subtipo.",
        )

    return {"ok": True, "mensaje": "Subtipo desactivado."}


# ============================================================
# DEFECTOS POR EXPEDIENTE
# ============================================================

@router.get(
    "/{id_expediente}/defectos",
    response_model=list[DefectoRespuesta],
)
def listar_defectos(
    id_expediente: int,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)

    return (
        db.query(ExpedienteDefecto)
        .filter(ExpedienteDefecto.expediente_id == expediente.id)
        .order_by(ExpedienteDefecto.id.desc())
        .all()
    )


@router.post(
    "/{id_expediente}/defectos",
    response_model=DefectoRespuesta,
    status_code=201,
)
def crear_defecto(
    id_expediente: int,
    datos: DefectoCrear,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)

    subtipo = None
    if datos.subtipo_defecto_id is not None:
        subtipo = obtener_subtipo_activo(db, datos.subtipo_defecto_id)

    defecto = ExpedienteDefecto(
        expediente_id=expediente.id,
        documento=datos.documento,
        motivo_defecto=datos.motivo_defecto.strip(),
        subtipo_defecto_id=subtipo.id if subtipo else None,
        subtipo_defecto=subtipo.nombre if subtipo else None,
        fecha_notificacion_registro=datos.fecha_notificacion_registro,
        fecha_vencimiento_presentacion=datos.fecha_vencimiento_presentacion,
        fecha_entrada_subsanacion=datos.fecha_entrada_subsanacion,
        observaciones_registro=datos.observaciones_registro,
        tiene_defectos_abiertos="SI",
    )
    sincronizar_campos_compatibilidad(defecto)
    db.add(defecto)

try:
    db.commit()
    db.refresh(defecto)
except Exception as error:
    db.rollback()
    print(f"ERROR AL CREAR DEFECTO: {repr(error)}")
    raise HTTPException(
        status_code=500,
        detail=f"No se pudo crear el defecto: {str(error)[:1000]}",
    )

    return defecto


@router.put(
    "/{id_expediente}/defectos/{defecto_id}",
    response_model=DefectoRespuesta,
)
def actualizar_defecto(
    id_expediente: int,
    defecto_id: int,
    datos: DefectoActualizar,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)
    defecto = obtener_defecto(db, expediente.id, defecto_id)
    cambios = datos.dict(exclude_unset=True)

    if "subtipo_defecto_id" in cambios and cambios["subtipo_defecto_id"] is not None:
        subtipo = obtener_subtipo_activo(db, cambios["subtipo_defecto_id"])
        defecto.subtipo_defecto = subtipo.nombre
        defecto.subtipo_defecto_id = subtipo.id
        cambios.pop("subtipo_defecto_id", None)
    elif cambios.get("subtipo_defecto_id") is None:
        defecto.subtipo_defecto_id = None
        defecto.subtipo_defecto = None
        cambios.pop("subtipo_defecto_id", None)

    for campo, valor in cambios.items():
        setattr(defecto, campo, valor)

    sincronizar_campos_compatibilidad(defecto)

    try:
        db.commit()
        db.refresh(defecto)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el defecto.",
        )

    return defecto


# ============================================================
# CALIFICACIÓN DEL REGISTRO: SUBIDA Y DESCARGA DEL PDF
# ============================================================

@router.post("/{id_expediente}/defectos/{defecto_id}/calificacion")
async def subir_calificacion_registro(
    id_expediente: int,
    defecto_id: int,
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)
    defecto = obtener_defecto(db, expediente.id, defecto_id)

    nombre = (fichero.filename or "calificacion.pdf").replace("\\", "/").split("/")[-1]
    if not nombre.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")

    contenido = await fichero.read(MAX_PDF_BYTES + 1)
    if len(contenido) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="El PDF supera el límite de 15 MB.",
        )

    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="El archivo seleccionado no parece ser un PDF válido.",
        )

    defecto.calificacion_archivo = contenido
    defecto.calificacion_nombre = nombre[:255]
    defecto.calificacion_content_type = "application/pdf"
    defecto.calificacion_tamano = len(contenido)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el PDF.",
        )
    finally:
        await fichero.close()

    return {
        "ok": True,
        "nombre": defecto.calificacion_nombre,
        "tamano": defecto.calificacion_tamano,
    }


@router.get("/{id_expediente}/defectos/{defecto_id}/calificacion")
def descargar_calificacion_registro(
    id_expediente: int,
    defecto_id: int,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)
    defecto = obtener_defecto(db, expediente.id, defecto_id)

    if not defecto.calificacion_archivo:
        raise HTTPException(status_code=404, detail="Este defecto no tiene PDF adjunto.")

    nombre = defecto.calificacion_nombre or "calificacion.pdf"
    nombre_ascii = "".join(
        caracter if caracter.isascii() and caracter.isalnum() else "_"
        for caracter in nombre
    ) or "calificacion.pdf"

    return StreamingResponse(
        BytesIO(defecto.calificacion_archivo),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="{nombre_ascii}"; '
                f"filename*=UTF-8''{quote(nombre)}"
            ),
            "Content-Length": str(len(defecto.calificacion_archivo)),
            "X-Content-Type-Options": "nosniff",
        },
    )

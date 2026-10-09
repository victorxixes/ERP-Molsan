from datetime import date, datetime
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
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.defectos.models import (
    DefectoSubtipo,
    ExpedienteDefecto,
)


# ============================================================
# CONFIGURACIÓN
# ============================================================

router = APIRouter(
    prefix="/expedientes",
    tags=["Defectos de expedientes"],
)

MAX_PDF_BYTES = 15 * 1024 * 1024


# ============================================================
# ESQUEMAS — SUBTIPOS DE DEFECTO
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


# ============================================================
# ESQUEMAS — DEFECTOS
# ============================================================

class DefectoCrear(BaseModel):
    documento: Optional[str] = None
    motivo_defecto: Optional[str] = None
    subtipo_defecto_id: Optional[int] = None
    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_entrada_subsanacion: Optional[date] = None
    observaciones_registro: Optional[str] = None


class DefectoActualizar(BaseModel):
    documento: Optional[str] = None
    motivo_defecto: Optional[str] = None
    subtipo_defecto_id: Optional[int] = None
    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_entrada_subsanacion: Optional[date] = None
    observaciones_registro: Optional[str] = None


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def obtener_expediente(
    db: Session,
    id_expediente: str,
):
    """
    Busca el expediente por su identificador externo.

    IMPORTANTE:
    Expediente.id_expediente es de tipo texto en la base de datos.
    Por eso se convierte el identificador recibido a str.
    """
    expediente = (
        db.query(Expediente)
        .filter(
            Expediente.id_expediente == str(id_expediente)
        )
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail=f"No existe el expediente {id_expediente}",
        )

    return expediente


def obtener_subtipo_activo(
    db: Session,
    subtipo_id: Optional[int],
):
    if subtipo_id is None:
        return None

    subtipo = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.id == subtipo_id,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )

    if subtipo is None:
        raise HTTPException(
            status_code=400,
            detail="El subtipo de defecto no existe o está inactivo",
        )

    return subtipo


def obtener_defecto(
    db: Session,
    defecto_id: int,
):
    """
    Busca un defecto por su clave primaria.
    Admite los nombres habituales de clave primaria.
    """
    if hasattr(ExpedienteDefecto, "id"):
        campo_id = getattr(ExpedienteDefecto, "id")
    elif hasattr(ExpedienteDefecto, "id_defecto"):
        campo_id = getattr(ExpedienteDefecto, "id_defecto")
    else:
        raise HTTPException(
            status_code=500,
            detail="No se encuentra la clave primaria del modelo de defectos",
        )

    defecto = (
        db.query(ExpedienteDefecto)
        .filter(campo_id == defecto_id)
        .first()
    )

    if defecto is None:
        raise HTTPException(
            status_code=404,
            detail=f"No existe el defecto {defecto_id}",
        )

    return defecto


def campo_relacion_expediente():
    """
    Detecta el nombre de la columna que relaciona el defecto
    con el expediente.
    """
    if hasattr(ExpedienteDefecto, "expediente_id"):
        return getattr(ExpedienteDefecto, "expediente_id")

    if hasattr(ExpedienteDefecto, "id_expediente"):
        return getattr(ExpedienteDefecto, "id_expediente")

    raise HTTPException(
        status_code=500,
        detail="El modelo ExpedienteDefecto no tiene una relación reconocida con Expediente",
    )


def sincronizar_campos_compatibilidad(
    db: Session,
    expediente,
):
    """
    Actualiza los campos de compatibilidad del expediente, si existen
    en el modelo actual.
    """
    relacion = campo_relacion_expediente()

    consulta = db.query(ExpedienteDefecto).filter(
        relacion == getattr(expediente, "id", None)
    )

    # Si la relación guarda el identificador externo como texto,
    # intenta también esa forma de identificación.
    if hasattr(ExpedienteDefecto, "id_expediente"):
        consulta = db.query(ExpedienteDefecto).filter(
            ExpedienteDefecto.id_expediente
            == str(expediente.id_expediente)
        )

    defectos = consulta.all()
    hay_defectos = len(defectos) > 0

    if hasattr(expediente, "tiene_defectos_abiertos"):
        expediente.tiene_defectos_abiertos = hay_defectos

    if hasattr(expediente, "tipo_error"):
        expediente.tipo_error = (
            getattr(defectos[-1], "motivo_defecto", None)
            if hay_defectos
            else None
        )

    db.add(expediente)


def datos_defecto(defecto):
    """
    Devuelve únicamente los datos del defecto.
    Evita incluir el contenido binario del PDF en las respuestas JSON.
    """
    resultado = {}

    campos = [
        "id",
        "id_defecto",
        "documento",
        "motivo_defecto",
        "subtipo_defecto_id",
        "subtipo_defecto",
        "fecha_notificacion_registro",
        "fecha_vencimiento_presentacion",
        "fecha_entrada_subsanacion",
        "observaciones_registro",
        "calificacion_nombre",
        "calificacion_content_type",
        "calificacion_tamano",
        "calificacion_subida_en",
    ]

    for campo in campos:
        if hasattr(defecto, campo):
            valor = getattr(defecto, campo)

            if isinstance(valor, (date, datetime)):
                valor = valor.isoformat()

            resultado[campo] = valor

    return resultado


def actualizar_nombre_subtipo(
    defecto,
    subtipo,
):
    """
    Mantiene el nombre del subtipo en el defecto si el modelo
    dispone de ese campo de compatibilidad.
    """
    if hasattr(defecto, "subtipo_defecto"):
        defecto.subtipo_defecto = (
            subtipo.nombre if subtipo is not None else None
        )


# ============================================================
# CRUD — SUBTIPOS DE DEFECTO
# ============================================================

@router.get(
    "/subtipos-defecto",
    response_model=list[SubtipoRespuesta],
)
def listar_subtipos_defecto(
    db: Session = Depends(get_db),
):
    return (
        db.query(DefectoSubtipo)
        .filter(DefectoSubtipo.activo.is_(True))
        .order_by(DefectoSubtipo.nombre.asc())
        .all()
    )


@router.post(
    "/subtipos-defecto",
    response_model=SubtipoRespuesta,
    status_code=201,
)
def crear_subtipo_defecto(
    datos: SubtipoCrear,
    db: Session = Depends(get_db),
):
    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre del subtipo es obligatorio",
        )

    existente = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.nombre == nombre,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )

    if existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un subtipo activo con ese nombre",
        )

    subtipo = DefectoSubtipo(
        nombre=nombre,
        descripcion=datos.descripcion,
        activo=datos.activo,
    )

    try:
        db.add(subtipo)
        db.commit()
        db.refresh(subtipo)
        return subtipo
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo crear el subtipo de defecto",
        )


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

    if subtipo is None:
        raise HTTPException(
            status_code=404,
            detail="No existe el subtipo de defecto",
        )

    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre del subtipo es obligatorio",
        )

    duplicado = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.nombre == nombre,
            DefectoSubtipo.id != subtipo_id,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )

    if duplicado:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otro subtipo activo con ese nombre",
        )

    subtipo.nombre = nombre
    subtipo.descripcion = datos.descripcion
    subtipo.activo = datos.activo

    try:
        db.commit()
        db.refresh(subtipo)
        return subtipo
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el subtipo de defecto",
        )


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

    if subtipo is None:
        raise HTTPException(
            status_code=404,
            detail="No existe el subtipo de defecto",
        )

    # Desactivación lógica para conservar el histórico.
    subtipo.activo = False

    try:
        db.commit()
        return {
            "ok": True,
            "mensaje": "Subtipo desactivado correctamente",
        }
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo desactivar el subtipo de defecto",
        )


# ============================================================
# DEFECTOS — LISTADO POR EXPEDIENTE
# ============================================================

@router.get("/{id_expediente}/defectos")
def listar_defectos_expediente(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)
    relacion = campo_relacion_expediente()

    # La relación puede utilizar la clave interna o el identificador
    # externo del expediente.
    consulta = db.query(ExpedienteDefecto)

    if hasattr(ExpedienteDefecto, "expediente_id"):
        consulta = consulta.filter(
            ExpedienteDefecto.expediente_id == expediente.id
        )
    else:
        consulta = consulta.filter(
            relacion == str(expediente.id_expediente)
        )

    defectos = consulta.all()

    return {
        "id_expediente": str(expediente.id_expediente),
        "total": len(defectos),
        "defectos": [
            datos_defecto(defecto)
            for defecto in defectos
        ],
    }


# ============================================================
# DEFECTOS — CREAR
# ============================================================

@router.post(
    "/{id_expediente}/defectos",
    status_code=201,
)
def crear_defecto(
    id_expediente: str,
    datos: DefectoCrear,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)
    subtipo = obtener_subtipo_activo(
        db,
        datos.subtipo_defecto_id,
    )

    valores = datos.dict()

    valores["subtipo_defecto"] = (
        subtipo.nombre if subtipo is not None else None
    )

    # Detecta la columna de relación existente en el modelo.
    if hasattr(ExpedienteDefecto, "expediente_id"):
        valores["expediente_id"] = expediente.id
    elif hasattr(ExpedienteDefecto, "id_expediente"):
        valores["id_expediente"] = str(expediente.id_expediente)
    else:
        raise HTTPException(
            status_code=500,
            detail="No se ha encontrado la relación del defecto con el expediente",
        )

    # Evita pasar campos de compatibilidad que no existan en el modelo.
    columnas_modelo = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    valores_validos = {
        clave: valor
        for clave, valor in valores.items()
        if clave in columnas_modelo
    }

    try:
        defecto = ExpedienteDefecto(**valores_validos)

        db.add(defecto)
        db.flush()

        sincronizar_campos_compatibilidad(
            db,
            expediente,
        )

        db.commit()
        db.refresh(defecto)

        return {
            "ok": True,
            "mensaje": "Defecto registrado correctamente",
            "defecto": datos_defecto(defecto),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        print(
            "ERROR CREANDO DEFECTO:",
            repr(exc),
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo registrar el defecto. "
                "Revisa los logs del backend para conocer el error concreto."
            ),
        )


# ============================================================
# DEFECTOS — ACTUALIZAR
# ============================================================

@router.put("/defectos/{defecto_id}")
def actualizar_defecto(
    defecto_id: int,
    datos: DefectoActualizar,
    db: Session = Depends(get_db),
):
    defecto = obtener_defecto(db, defecto_id)

    valores = datos.dict(exclude_unset=True)

    if "subtipo_defecto_id" in valores:
        subtipo = obtener_subtipo_activo(
            db,
            valores["subtipo_defecto_id"],
        )

        actualizar_nombre_subtipo(
            defecto,
            subtipo,
        )

    columnas_modelo = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    for campo, valor in valores.items():
        if campo in columnas_modelo:
            setattr(defecto, campo, valor)

    try:
        db.commit()
        db.refresh(defecto)

        return {
            "ok": True,
            "mensaje": "Defecto actualizado correctamente",
            "defecto": datos_defecto(defecto),
        }

    except Exception as exc:
        db.rollback()
        print(
            "ERROR ACTUALIZANDO DEFECTO:",
            repr(exc),
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el defecto",
        )


# ============================================================
# DEFECTOS — SUBIR PDF DE CALIFICACIÓN
# ============================================================

@router.post("/defectos/{defecto_id}/calificacion")
async def subir_calificacion_defecto(
    defecto_id: int,
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    defecto = obtener_defecto(db, defecto_id)

    nombre = fichero.filename or "calificacion.pdf"
    content_type = fichero.content_type or ""

    if not nombre.lower().endswith(".pdf") and content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="El fichero debe ser un PDF",
        )

    contenido = await fichero.read()

    if not contenido:
        raise HTTPException(
            status_code=400,
            detail="El fichero está vacío",
        )

    if len(contenido) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="El PDF supera el límite de 15 MB",
        )

    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="El contenido recibido no parece ser un PDF válido",
        )

    campos_archivo = {
        "calificacion_archivo": contenido,
        "calificacion_nombre": nombre,
        "calificacion_content_type": "application/pdf",
        "calificacion_tamano": len(contenido),
        "calificacion_subida_en": datetime.utcnow(),
    }

    columnas_modelo = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    for campo, valor in campos_archivo.items():
        if campo in columnas_modelo:
            setattr(defecto, campo, valor)

    if "calificacion_archivo" not in columnas_modelo:
        raise HTTPException(
            status_code=500,
            detail="El modelo no tiene el campo calificacion_archivo",
        )

    try:
        db.commit()
        db.refresh(defecto)

        return {
            "ok": True,
            "mensaje": "PDF de calificación guardado correctamente",
            "defecto": datos_defecto(defecto),
        }

    except Exception as exc:
        db.rollback()
        print(
            "ERROR SUBIENDO CALIFICACION:",
            repr(exc),
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el PDF de calificación",
        )


# ============================================================
# DEFECTOS — DESCARGAR PDF DE CALIFICACIÓN
# ============================================================

@router.get("/defectos/{defecto_id}/calificacion")
def descargar_calificacion_defecto(
    defecto_id: int,
    db: Session = Depends(get_db),
):
    defecto = obtener_defecto(db, defecto_id)

    contenido = getattr(
        defecto,
        "calificacion_archivo",
        None,
    )

    if not contenido:
        raise HTTPException(
            status_code=404,
            detail="Este defecto no tiene ningún PDF de calificación adjunto",
        )

    nombre = (
        getattr(defecto, "calificacion_nombre", None)
        or f"calificacion_defecto_{defecto_id}.pdf"
    )

    nombre_seguro = quote(nombre)

    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{nombre_seguro}"
            )
        },
    )

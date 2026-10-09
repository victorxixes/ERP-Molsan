
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.defectos.models import ExpedienteDefecto


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/expedientes",
    tags=["Defectos de expedientes"],
)


# ============================================================
# ESQUEMAS PYDANTIC
# ============================================================

class DefectoBase(BaseModel):
    documento: Optional[str] = Field(default=None, max_length=300)
    motivo_defecto: Optional[str] = Field(default=None, max_length=500)
    subtipo_defecto: Optional[str] = Field(default=None, max_length=500)

    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None

    calificacion_registro: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    observaciones_registro: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    # Fecha de entrada en el Registro de la subsanación.
    # Es independiente de fecha_cierre_defecto.
    fecha_entrada_subsanacion: Optional[date] = None


class DefectoCrear(DefectoBase):
    documento: str = Field(
        default="CANCELACIÓN DE CONDICIÓN RESOLUTORIA",
        max_length=300,
    )

    motivo_defecto: str = Field(
        ...,
        min_length=1,
        max_length=500,
    )


class DefectoActualizar(BaseModel):
    documento: Optional[str] = Field(default=None, max_length=300)
    motivo_defecto: Optional[str] = Field(default=None, max_length=500)
    subtipo_defecto: Optional[str] = Field(default=None, max_length=500)

    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None

    calificacion_registro: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    observaciones_registro: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    fecha_entrada_subsanacion: Optional[date] = None


class DefectoRespuesta(DefectoBase):
    id: int
    expediente_id: int

    # Campos antiguos conservados por compatibilidad con la ficha.
    tiene_defectos_abiertos: Optional[str] = None
    tipo_error: Optional[str] = None
    descripcion_error: Optional[str] = None
    falta_defecto: Optional[str] = None
    fecha_cierre_defecto: Optional[date] = None

    class Config:
        orm_mode = True


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def buscar_expediente(
    db: Session,
    id_expediente: str,
) -> Expediente:
    """
    Busca el expediente por su identificador de negocio.
    expediente.id se utiliza como clave foránea del defecto.
    """

    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    return expediente


def buscar_defecto(
    db: Session,
    expediente: Expediente,
    defecto_id: int,
) -> ExpedienteDefecto:
    """
    Busca un defecto y verifica que pertenezca al expediente indicado.
    """

    defecto = (
        db.query(ExpedienteDefecto)
        .filter(
            ExpedienteDefecto.id == defecto_id,
            ExpedienteDefecto.expediente_id == expediente.id,
        )
        .first()
    )

    if defecto is None:
        raise HTTPException(
            status_code=404,
            detail="Defecto no encontrado en este expediente.",
        )

    return defecto


def actualizar_campos_compatibles(
    defecto: ExpedienteDefecto,
) -> None:
    """
    Sincroniza los campos antiguos para mantener la compatibilidad
    con las pantallas que todavía los consultan.
    """

    defecto.tipo_error = defecto.motivo_defecto

    defecto.falta_defecto = (
        defecto.subtipo_defecto or defecto.motivo_defecto
    )

    defecto.descripcion_error = defecto.calificacion_registro

    defecto.tiene_defectos_abiertos = (
        "NO"
        if defecto.fecha_entrada_subsanacion
        else "SI"
    )


# ============================================================
# LISTAR DEFECTOS DE UN EXPEDIENTE
# GET /expedientes/{id_expediente}/defectos
# ============================================================

@router.get(
    "/{id_expediente}/defectos",
    response_model=List[DefectoRespuesta],
)
def listar_defectos(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = buscar_expediente(db, id_expediente)

    return (
        db.query(ExpedienteDefecto)
        .filter(
            ExpedienteDefecto.expediente_id == expediente.id
        )
        .order_by(ExpedienteDefecto.id.desc())
        .all()
    )


# ============================================================
# CREAR DEFECTO
# POST /expedientes/{id_expediente}/defectos
# ============================================================

@router.post(
    "/{id_expediente}/defectos",
    response_model=DefectoRespuesta,
    status_code=201,
)
def crear_defecto(
    id_expediente: str,
    datos: DefectoCrear,
    db: Session = Depends(get_db),
):
    expediente = buscar_expediente(db, id_expediente)

    valores = datos.dict()

    defecto = ExpedienteDefecto(
        expediente_id=expediente.id,
        **valores,
    )

    actualizar_campos_compatibles(defecto)

    try:
        db.add(defecto)
        db.commit()
        db.refresh(defecto)
    except Exception:
        db.rollback()
        raise

    return defecto


# ============================================================
# ACTUALIZAR DEFECTO
# PUT /expedientes/{id_expediente}/defectos/{defecto_id}
# ============================================================

@router.put(
    "/{id_expediente}/defectos/{defecto_id}",
    response_model=DefectoRespuesta,
)
def actualizar_defecto(
    id_expediente: str,
    defecto_id: int,
    datos: DefectoActualizar,
    db: Session = Depends(get_db),
):
    expediente = buscar_expediente(db, id_expediente)

    defecto = buscar_defecto(
        db=db,
        expediente=expediente,
        defecto_id=defecto_id,
    )

    # Solo modifica los campos que el cliente ha enviado.
    valores = datos.dict(exclude_unset=True)

    for campo, valor in valores.items():
        setattr(defecto, campo, valor)

    actualizar_campos_compatibles(defecto)

    try:
        db.commit()
        db.refresh(defecto)
    except Exception:
        db.rollback()
        raise

    return defecto


# ============================================================
# REGISTRAR SUBSANACIÓN
# PATCH /expedientes/{id_expediente}/defectos/{defecto_id}/subsanacion
#
# Recibe la fecha mediante el parámetro:
# fecha_entrada=AAAA-MM-DD
#
# No modifica fecha_cierre_defecto.
# ============================================================

@router.patch(
    "/{id_expediente}/defectos/{defecto_id}/subsanacion",
    response_model=DefectoRespuesta,
)
def registrar_subsanacion(
    id_expediente: str,
    defecto_id: int,
    fecha_entrada: date,
    db: Session = Depends(get_db),
):
    expediente = buscar_expediente(db, id_expediente)

    defecto = buscar_defecto(
        db=db,
        expediente=expediente,
        defecto_id=defecto_id,
    )

    defecto.fecha_entrada_subsanacion = fecha_entrada

    actualizar_campos_compatibles(defecto)

    try:
        db.commit()
        db.refresh(defecto)
    except Exception:
        db.rollback()
        raise

    return defecto

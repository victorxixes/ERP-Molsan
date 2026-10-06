from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from pydantic import BaseModel

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.tipos_carga_hipotecaria.models import (
    TipoCargaHipotecaria,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/tipos-carga-hipotecaria",
    tags=["Tipos de Carga Hipotecaria"],
)


# ============================================================
# SCHEMAS
# ============================================================

class TipoCargaHipotecariaCreate(BaseModel):

    nombre: str
    activo: bool = True


class TipoCargaHipotecariaUpdate(BaseModel):

    nombre: str
    activo: bool = True


class TipoCargaHipotecariaResponse(BaseModel):

    id: int
    nombre: str
    activo: bool

    class Config:
        orm_mode = True


# ============================================================
# UTILIDADES
# ============================================================

def normalizar_nombre(valor: str) -> str:

    if valor is None:
        return ""

    return " ".join(
        str(valor)
        .strip()
        .split()
    ).lower()


# ============================================================
# GET /api/tipos-carga-hipotecaria
# ============================================================

@router.get(
    "",
    response_model=list[TipoCargaHipotecariaResponse],
)
def listar_tipos_carga_hipotecaria(
    q: Optional[str] = Query(
        None,
        description="Buscar por nombre",
    ),
    activo: Optional[bool] = Query(
        None,
        description="Filtrar por estado activo",
    ),
    db: Session = Depends(get_db),
):

    consulta = (
        db.query(TipoCargaHipotecaria)
    )

    # --------------------------------------------------------
    # BUSCADOR
    # --------------------------------------------------------

    if q and q.strip():

        termino = q.strip().lower()

        consulta = consulta.filter(
            func.lower(
                TipoCargaHipotecaria.nombre
            ).like(
                f"%{termino}%"
            )
        )

    # --------------------------------------------------------
    # FILTRO ACTIVO
    # --------------------------------------------------------

    if activo is not None:

        consulta = consulta.filter(
            TipoCargaHipotecaria.activo == activo
        )

    # --------------------------------------------------------
    # ORDEN
    # --------------------------------------------------------

    consulta = consulta.order_by(
        func.lower(
            TipoCargaHipotecaria.nombre
        )
    )

    return consulta.all()


# ============================================================
# GET /api/tipos-carga-hipotecaria/opciones
#
# Endpoint pensado para futuros desplegables de expedientes.
# Devuelve únicamente los registros activos.
# ============================================================

@router.get(
    "/opciones",
    response_model=list[TipoCargaHipotecariaResponse],
)
def opciones_tipos_carga_hipotecaria(
    db: Session = Depends(get_db),
):

    return (
        db.query(TipoCargaHipotecaria)
        .filter(
            TipoCargaHipotecaria.activo.is_(True)
        )
        .order_by(
            func.lower(
                TipoCargaHipotecaria.nombre
            )
        )
        .all()
    )


# ============================================================
# POST /api/tipos-carga-hipotecaria
# ============================================================

@router.post(
    "",
    response_model=TipoCargaHipotecariaResponse,
)
def crear_tipo_carga_hipotecaria(
    datos: TipoCargaHipotecariaCreate,
    db: Session = Depends(get_db),
):

    nombre = normalizar_nombre(
        datos.nombre
    )

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail=(
                "El tipo de carga hipotecaria "
                "no puede estar vacío."
            ),
        )

    # --------------------------------------------------------
    # COMPROBAR DUPLICADO
    # --------------------------------------------------------

    existente = (
        db.query(TipoCargaHipotecaria)
        .filter(
            func.lower(
                TipoCargaHipotecaria.nombre
            )
            == nombre.lower()
        )
        .first()
    )

    if existente:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe un tipo de carga hipotecaria "
                "con ese nombre."
            ),
        )

    # --------------------------------------------------------
    # CREAR
    # --------------------------------------------------------

    nuevo = TipoCargaHipotecaria(
        nombre=nombre,
        activo=datos.activo,
    )

    try:

        db.add(nuevo)

        db.commit()

        db.refresh(nuevo)

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo crear el tipo de carga hipotecaria: "
                f"{exc}"
            ),
        )

    return nuevo


# ============================================================
# PUT /api/tipos-carga-hipotecaria/{tipo_id}
# ============================================================

@router.put(
    "/{tipo_id}",
    response_model=TipoCargaHipotecariaResponse,
)
def actualizar_tipo_carga_hipotecaria(
    tipo_id: int,
    datos: TipoCargaHipotecariaUpdate,
    db: Session = Depends(get_db),
):

    tipo = (
        db.query(TipoCargaHipotecaria)
        .filter(
            TipoCargaHipotecaria.id
            == tipo_id
        )
        .first()
    )

    if not tipo:

        raise HTTPException(
            status_code=404,
            detail=(
                "Tipo de carga hipotecaria "
                "no encontrado."
            ),
        )

    nombre = normalizar_nombre(
        datos.nombre
    )

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail=(
                "El tipo de carga hipotecaria "
                "no puede estar vacío."
            ),
        )

    # --------------------------------------------------------
    # COMPROBAR DUPLICADO
    # --------------------------------------------------------

    existente = (
        db.query(TipoCargaHipotecaria)
        .filter(
            func.lower(
                TipoCargaHipotecaria.nombre
            )
            == nombre.lower(),
            TipoCargaHipotecaria.id
            != tipo_id,
        )
        .first()
    )

    if existente:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro tipo de carga "
                "hipotecaria con ese nombre."
            ),
        )

    # --------------------------------------------------------
    # ACTUALIZAR
    # --------------------------------------------------------

    tipo.nombre = nombre

    tipo.activo = datos.activo

    try:

        db.commit()

        db.refresh(tipo)

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo actualizar el tipo de "
                f"carga hipotecaria: {exc}"
            ),
        )

    return tipo


# ============================================================
# DELETE /api/tipos-carga-hipotecaria/{tipo_id}
# ============================================================

@router.delete(
    "/{tipo_id}"
)
def eliminar_tipo_carga_hipotecaria(
    tipo_id: int,
    db: Session = Depends(get_db),
):

    tipo = (
        db.query(TipoCargaHipotecaria)
        .filter(
            TipoCargaHipotecaria.id
            == tipo_id
        )
        .first()
    )

    if not tipo:

        raise HTTPException(
            status_code=404,
            detail=(
                "Tipo de carga hipotecaria "
                "no encontrado."
            ),
        )

    try:

        db.delete(tipo)

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo eliminar el tipo de "
                f"carga hipotecaria: {exc}"
            ),
        )

    return {
        "ok": True,
        "mensaje": (
            "Tipo de carga hipotecaria "
            "eliminado correctamente."
        ),
    }

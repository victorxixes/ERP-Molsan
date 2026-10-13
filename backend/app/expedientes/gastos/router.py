
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.expedientes.gastos.models import ExpedienteGasto


router = APIRouter(
    prefix="/expedientes",
    tags=["Gastos de expedientes"],
)


# ============================================================
# ESQUEMAS
# ============================================================

class GastoBase(BaseModel):
    tipo: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=500)
    importe: float = Field(..., ge=0)
    fecha: Optional[date] = None
    documento_url: Optional[str] = Field(None, max_length=500)


class GastoCrear(GastoBase):
    pass


class GastoActualizar(BaseModel):
    tipo: Optional[str] = Field(None, min_length=1, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=500)
    importe: Optional[float] = Field(None, ge=0)
    fecha: Optional[date] = None
    documento_url: Optional[str] = Field(None, max_length=500)


class GastoRespuesta(GastoBase):
    id: int
    expediente_id: int

    class Config:
        orm_mode = True


# ============================================================
# LISTAR GASTOS
# GET /api/expedientes/{expediente_id}/gastos
# ============================================================

@router.get(
    "/{expediente_id}/gastos",
    response_model=list[GastoRespuesta],
)
def listar_gastos(
    expediente_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(ExpedienteGasto)
        .filter(
            ExpedienteGasto.expediente_id == expediente_id
        )
        .order_by(
            ExpedienteGasto.fecha.desc(),
            ExpedienteGasto.id.desc(),
        )
        .all()
    )


# ============================================================
# CREAR GASTO
# POST /api/expedientes/{expediente_id}/gastos
# ============================================================

@router.post(
    "/{expediente_id}/gastos",
    response_model=GastoRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_gasto(
    expediente_id: int,
    datos: GastoCrear,
    db: Session = Depends(get_db),
):
    gasto = ExpedienteGasto(
        expediente_id=expediente_id,
        tipo=datos.tipo.strip(),
        descripcion=datos.descripcion,
        importe=datos.importe,
        fecha=datos.fecha,
        documento_url=datos.documento_url,
    )

    db.add(gasto)

    try:
        db.commit()
        db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se ha podido guardar el gasto.",
        )

    return gasto


# ============================================================
# ACTUALIZAR GASTO
# PUT /api/expedientes/{expediente_id}/gastos/{gasto_id}
# ============================================================

@router.put(
    "/{expediente_id}/gastos/{gasto_id}",
    response_model=GastoRespuesta,
)
def actualizar_gasto(
    expediente_id: int,
    gasto_id: int,
    datos: GastoActualizar,
    db: Session = Depends(get_db),
):
    gasto = (
        db.query(ExpedienteGasto)
        .filter(
            ExpedienteGasto.id == gasto_id,
            ExpedienteGasto.expediente_id == expediente_id,
        )
        .first()
    )

    if gasto is None:
        raise HTTPException(
            status_code=404,
            detail="No se ha encontrado el gasto del expediente.",
        )

    cambios = datos.dict(exclude_unset=True)

    if cambios.get("tipo") is not None:
        cambios["tipo"] = cambios["tipo"].strip()

    for campo, valor in cambios.items():
        setattr(gasto, campo, valor)

    try:
        db.commit()
        db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se ha podido actualizar el gasto.",
        )

    return gasto


# ============================================================
# ELIMINAR GASTO
# DELETE /api/expedientes/{expediente_id}/gastos/{gasto_id}
# ============================================================

@router.delete(
    "/{expediente_id}/gastos/{gasto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def eliminar_gasto(
    expediente_id: int,
    gasto_id: int,
    db: Session = Depends(get_db),
):
    gasto = (
        db.query(ExpedienteGasto)
        .filter(
            ExpedienteGasto.id == gasto_id,
            ExpedienteGasto.expediente_id == expediente_id,
        )
        .first()
    )

    if gasto is None:
        raise HTTPException(
            status_code=404,
            detail="No se ha encontrado el gasto del expediente.",
        )

    try:
        db.delete(gasto)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se ha podido eliminar el gasto.",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db, engine
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.registros_propiedad.models import RegistroPropiedad


router = APIRouter(
    prefix="/expedientes/{id_expediente}/fincas",
    tags=["Expedientes - Fincas y registros"],
    dependencies=[Depends(get_current_user), Depends(validar_visibilidad_expediente_request)],
)


@router.on_event("startup")
def asegurar_columna_registro_propiedad_id():
    """Migración aditiva e idempotente; conserva el texto de registros históricos."""
    with engine.begin() as conexion:
        conexion.execute(text("""
            ALTER TABLE public.expediente_fincas
            ADD COLUMN IF NOT EXISTS registro_propiedad_id INTEGER NULL
        """))
        conexion.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_expediente_fincas_registro_propiedad_id
            ON public.expediente_fincas (registro_propiedad_id)
        """))


class FincaPayload(BaseModel):
    finca: Optional[str] = Field(None, max_length=200)
    cru_idufir: Optional[str] = Field(None, max_length=200)
    provincia: Optional[str] = Field(None, max_length=200)
    poblacion: Optional[str] = Field(None, max_length=200)
    registro: Optional[str] = Field(None, max_length=300)
    registro_propiedad_id: Optional[int] = Field(None, ge=1)
    seccion: Optional[str] = Field(None, max_length=100)
    cuantia: Optional[str] = Field(None, max_length=200)
    inscripcion: Optional[str] = Field(None, max_length=200)
    contrato: Optional[str] = Field(None, max_length=200)
    fecha_constitucion: Optional[date] = None
    subrogado: Optional[str] = Field(None, max_length=20)
    entidad_original: Optional[str] = Field(None, max_length=300)


def _obtener_expediente(db: Session, numero: str) -> Expediente:
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(numero))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail=f"No existe el expediente {numero}.")
    return expediente


def _a_dict(finca: ExpedienteFinca) -> dict:
    return {
        "id": finca.id,
        "expediente_id": finca.expediente_id,
        "finca": finca.finca,
        "cru_idufir": finca.cru_idufir,
        "provincia": finca.provincia,
        "poblacion": finca.poblacion,
        "registro": finca.registro,
        "registro_propiedad_id": finca.registro_propiedad_id,
        "seccion": finca.seccion,
        "cuantia": finca.cuantia,
        "inscripcion": finca.inscripcion,
        "contrato": finca.contrato,
        "fecha_constitucion": finca.fecha_constitucion.isoformat() if finca.fecha_constitucion else None,
        "subrogado": finca.subrogado,
        "entidad_original": finca.entidad_original,
    }


def _obtener_finca(db: Session, expediente_id: int, finca_id: int) -> ExpedienteFinca:
    finca = (
        db.query(ExpedienteFinca)
        .filter(
            ExpedienteFinca.id == finca_id,
            ExpedienteFinca.expediente_id == expediente_id,
        )
        .first()
    )
    if finca is None:
        raise HTTPException(status_code=404, detail="La finca no existe en este expediente.")
    return finca


@router.get("")
def listar_fincas(id_expediente: str, db: Session = Depends(get_db)):
    expediente = _obtener_expediente(db, id_expediente)
    fincas = (
        db.query(ExpedienteFinca)
        .filter(ExpedienteFinca.expediente_id == expediente.id)
        .order_by(ExpedienteFinca.id.asc())
        .all()
    )
    return {"items": [_a_dict(finca) for finca in fincas], "total": len(fincas)}


@router.post("")
def crear_finca(
    id_expediente: str,
    payload: FincaPayload,
    db: Session = Depends(get_db),
):
    expediente = _obtener_expediente(db, id_expediente)
    datos = payload.dict()
    registro_id = datos.get("registro_propiedad_id")
    if registro_id:
        registro_catalogo = db.query(RegistroPropiedad).filter(RegistroPropiedad.id == registro_id, RegistroPropiedad.activo.is_(True)).first()
        if not registro_catalogo:
            raise HTTPException(status_code=422, detail="El Registro de la Propiedad seleccionado no existe o está inactivo.")
        datos["registro"] = registro_catalogo.registro_propiedad
    finca = ExpedienteFinca(
        expediente_id=expediente.id,
        **datos,
    )
    db.add(finca)
    try:
        db.commit()
        db.refresh(finca)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar la finca.")
    return {"ok": True, "item": _a_dict(finca)}


@router.put("/{finca_id}")
def actualizar_finca(
    id_expediente: str,
    finca_id: int,
    payload: FincaPayload,
    db: Session = Depends(get_db),
):
    expediente = _obtener_expediente(db, id_expediente)
    finca = _obtener_finca(db, expediente.id, finca_id)
    datos = payload.dict()
    registro_id = datos.get("registro_propiedad_id")
    if registro_id:
        registro_catalogo = db.query(RegistroPropiedad).filter(RegistroPropiedad.id == registro_id, RegistroPropiedad.activo.is_(True)).first()
        if not registro_catalogo:
            raise HTTPException(status_code=422, detail="El Registro de la Propiedad seleccionado no existe o está inactivo.")
        datos["registro"] = registro_catalogo.registro_propiedad
    for campo, valor in datos.items():
        setattr(finca, campo, valor)
    try:
        db.commit()
        db.refresh(finca)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudieron guardar los cambios de la finca.")
    return {"ok": True, "item": _a_dict(finca)}


@router.delete("/{finca_id}")
def eliminar_finca(
    id_expediente: str,
    finca_id: int,
    db: Session = Depends(get_db),
):
    expediente = _obtener_expediente(db, id_expediente)
    finca = _obtener_finca(db, expediente.id, finca_id)
    try:
        db.delete(finca)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar la finca.")
    return {"ok": True, "mensaje": "Finca eliminada correctamente."}

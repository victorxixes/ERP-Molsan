from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.honorarios_gestoria.models import HonorarioGestoria

router = APIRouter(prefix="/honorarios-gestoria", tags=["Honorarios de gestoría"])


class HonorarioPayload(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=2000)
    importe: Decimal
    activo: bool = True

    @validator("nombre")
    def validar_nombre(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("El nombre es obligatorio.")
        return value

    @validator("importe", pre=True)
    def validar_importe(cls, value):
        try:
            amount = Decimal(str(value).replace(",", "."))
        except (InvalidOperation, ValueError):
            raise ValueError("El importe debe ser un número válido.")
        if not amount.is_finite() or amount < 0:
            raise ValueError("El importe debe ser un número positivo o cero.")
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    class Config:
        orm_mode = True


class HonorarioResponse(HonorarioPayload):
    id: int


def asegurar_catalogo_inicial(db: Session):
    if db.query(HonorarioGestoria.id).first():
        return
    iniciales = [
        ("Cancelaciones propias o con provisión", Decimal("83.49"), "Honorarios de gestoría, IVA incluido."),
        ("Cancelaciones de otra entidad con provisión", Decimal("111.32"), "Honorarios de gestoría, IVA incluido."),
        ("Cancelaciones sin provisión", Decimal("24.00"), "Honorarios de gestoría."),
    ]
    for nombre, importe, descripcion in iniciales:
        db.add(HonorarioGestoria(nombre=nombre, importe=importe, descripcion=descripcion, activo=True))
    try:
        db.commit()
    except Exception:
        db.rollback()
        # Si dos arranques insertan a la vez, el catálogo podrá cargarse igualmente
        # en la siguiente petición.
        return


@router.get("", response_model=list[HonorarioResponse])
def listar_honorarios(activos: bool = False, db: Session = Depends(get_db)):
    asegurar_catalogo_inicial(db)
    query = db.query(HonorarioGestoria)
    if activos:
        query = query.filter(HonorarioGestoria.activo.is_(True))
    return query.order_by(HonorarioGestoria.activo.desc(), HonorarioGestoria.nombre.asc()).all()


@router.post("", response_model=HonorarioResponse, status_code=201)
def crear_honorario(payload: HonorarioPayload, db: Session = Depends(get_db)):
    asegurar_catalogo_inicial(db)
    existente = db.query(HonorarioGestoria).filter(HonorarioGestoria.nombre.ilike(payload.nombre)).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un honorario con ese nombre.")
    honorario = HonorarioGestoria(**payload.dict())
    db.add(honorario)
    try:
        db.commit()
        db.refresh(honorario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un honorario con ese nombre.")
    return honorario


@router.put("/{honorario_id}", response_model=HonorarioResponse)
def actualizar_honorario(honorario_id: int, payload: HonorarioPayload, db: Session = Depends(get_db)):
    honorario = db.query(HonorarioGestoria).filter(HonorarioGestoria.id == honorario_id).first()
    if not honorario:
        raise HTTPException(status_code=404, detail="No se encontró el honorario.")
    duplicado = db.query(HonorarioGestoria).filter(
        HonorarioGestoria.nombre.ilike(payload.nombre),
        HonorarioGestoria.id != honorario_id,
    ).first()
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe otro honorario con ese nombre.")
    for campo, valor in payload.dict().items():
        setattr(honorario, campo, valor)
    try:
        db.commit()
        db.refresh(honorario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se pudo guardar porque el nombre ya existe.")
    return honorario


@router.delete("/{honorario_id}", response_model=HonorarioResponse)
def desactivar_honorario(honorario_id: int, db: Session = Depends(get_db)):
    honorario = db.query(HonorarioGestoria).filter(HonorarioGestoria.id == honorario_id).first()
    if not honorario:
        raise HTTPException(status_code=404, detail="No se encontró el honorario.")
    honorario.activo = False
    db.commit()
    db.refresh(honorario)
    return honorario

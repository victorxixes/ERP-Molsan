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
    importe: Optional[Decimal] = None
    base_imponible: Optional[Decimal] = None
    tipo_impuesto: str = "IVA"
    porcentaje_impuesto: Decimal = Decimal("21")
    activo: bool = True

    @validator("nombre")
    def validar_nombre(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("El nombre es obligatorio.")
        return value

    @validator("tipo_impuesto")
    def validar_tipo_impuesto(cls, value):
        value = str(value or "IVA").strip().upper()
        if value not in {"IVA", "IGIC", "EXENTO"}:
            raise ValueError("El impuesto debe ser IVA, IGIC o Exento.")
        return value

    @validator("base_imponible", "importe", "porcentaje_impuesto", pre=True)
    def validar_importes(cls, value, field):
        if value is None or value == "":
            return None
        try:
            amount = Decimal(str(value).replace(",", "."))
        except (InvalidOperation, ValueError):
            raise ValueError("El importe debe ser un número válido.")
        if not amount.is_finite() or amount < 0:
            raise ValueError("Los importes deben ser números positivos o cero.")
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @validator("porcentaje_impuesto")
    def validar_porcentaje(cls, value):
        if value is None or value > Decimal("100"):
            raise ValueError("El porcentaje del impuesto debe estar entre 0 y 100.")
        return value

    def datos_con_total(self):
        data = self.dict()
        base = data.get("base_imponible")
        tipo = data.get("tipo_impuesto") or "IVA"
        porcentaje = data.get("porcentaje_impuesto") or Decimal("0")
        if base is None:
            # Compatibilidad con clientes antiguos que solo envían importe total.
            total = data.get("importe") or Decimal("0")
            base = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            porcentaje = Decimal("0")
            tipo = "EXENTO"
        tasa = Decimal("0") if tipo == "EXENTO" else porcentaje
        impuesto = (base * tasa / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        data["base_imponible"] = base
        data["tipo_impuesto"] = tipo
        data["porcentaje_impuesto"] = porcentaje
        data["importe"] = (base + impuesto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return data

    class Config:
        orm_mode = True


class HonorarioResponse(HonorarioPayload):
    id: int


def asegurar_catalogo_inicial(db: Session):
    """Restaura y mantiene las tres tarifas históricas de honorarios."""
    tarifas = [
        {
            "nombre": "Honorarios de gestoría — CaixaBank",
            "base": Decimal("69.00"),
            "tipo": "IVA",
            "porcentaje": Decimal("21"),
            "descripcion": "Tarifa histórica CaixaBank: base 69,00 € + IVA 21 % = 83,49 €.",
            "legacy": "Cancelaciones propias o con provisión",
        },
        {
            "nombre": "Honorarios de gestoría — Otra entidad",
            "base": Decimal("92.00"),
            "tipo": "IVA",
            "porcentaje": Decimal("21"),
            "descripcion": "Tarifa histórica de otra entidad: base 92,00 € + IVA 21 % = 111,32 €.",
            "legacy": "Cancelaciones de otra entidad con provisión",
        },
        {
            "nombre": "Honorarios de gestoría — Canarias",
            "base": Decimal("69.00"),
            "tipo": "IGIC",
            "porcentaje": Decimal("7"),
            "descripcion": "Tarifa histórica para Canarias: base 69,00 € + IGIC 7 % = 73,83 €.",
            "legacy": "Cancelaciones sin provisión",
        },
    ]
    for tarifa in tarifas:
        honorario = (
            db.query(HonorarioGestoria)
            .filter(HonorarioGestoria.nombre == tarifa["nombre"])
            .first()
        )
        if honorario is None:
            honorario = (
                db.query(HonorarioGestoria)
                .filter(HonorarioGestoria.nombre == tarifa["legacy"])
                .first()
            )
        impuesto = (
            tarifa["base"] * tarifa["porcentaje"] / Decimal("100")
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if honorario is None:
            honorario = HonorarioGestoria(nombre=tarifa["nombre"])
            db.add(honorario)
        honorario.nombre = tarifa["nombre"]
        honorario.descripcion = tarifa["descripcion"]
        honorario.base_imponible = tarifa["base"]
        honorario.tipo_impuesto = tarifa["tipo"]
        honorario.porcentaje_impuesto = tarifa["porcentaje"]
        honorario.importe = tarifa["base"] + impuesto
        honorario.activo = True
    try:
        db.commit()
    except Exception:
        db.rollback()


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
    datos = payload.datos_con_total()\n    honorario = HonorarioGestoria(**datos)
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
    datos = payload.datos_con_total()\n    for campo, valor in datos.items():
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

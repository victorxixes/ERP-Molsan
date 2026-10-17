from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.expedientes.gastos.models import ExpedienteGasto
from backend.app.expedientes.models import Expediente

router = APIRouter(prefix="/expedientes", tags=["Gastos de expedientes"])
CENTIMO = Decimal("0.01")
CIEN = Decimal("100")


def _decimal_opcional(valor):
    if valor is None or valor == "":
        return None
    try:
        numero = Decimal(str(valor).replace(",", "."))
    except (InvalidOperation, ValueError):
        raise ValueError("El importe debe ser un número válido.")
    if not numero.is_finite():
        raise ValueError("El importe debe ser un número finito.")
    return numero.quantize(CENTIMO, rounding=ROUND_HALF_UP)


def _redondear(valor: Decimal) -> Decimal:
    return valor.quantize(CENTIMO, rounding=ROUND_HALF_UP)


class GastoBase(BaseModel):
    tipo: Optional[str] = Field(None, max_length=200)
    descripcion: Optional[str] = Field(None, max_length=500)
    importe: Optional[Decimal] = None
    fecha: Optional[date] = None
    documento_url: Optional[str] = Field(None, max_length=500)
    nif_notario: Optional[str] = Field(None, max_length=50)
    nombre_notario: Optional[str] = Field(None, max_length=300)
    pagador: Optional[str] = Field(None, max_length=300)
    cuenta_bancaria: Optional[str] = Field(None, max_length=34)
    medio_pago: Optional[str] = Field(None, max_length=100)
    numero_factura: Optional[str] = Field(None, max_length=150)
    fecha_factura: Optional[date] = None
    importe_total_bruto: Optional[Decimal] = None
    base_exenta_impuestos: Optional[Decimal] = None
    base_sujeta_impuestos: Optional[Decimal] = None
    tramo_impuesto: Optional[str] = Field(None, max_length=50)
    tipo_impuesto: Optional[str] = Field(None, max_length=30)
    porcentaje_impuesto: Optional[Decimal] = None
    importe_impuesto: Optional[Decimal] = None
    base_exenta_retencion: Optional[Decimal] = None
    base_sujeta_retencion: Optional[Decimal] = None
    tipo_retencion: Optional[str] = Field(None, max_length=100)
    porcentaje_retencion: Optional[Decimal] = None
    importe_retencion: Optional[Decimal] = None
    importe_resultante: Optional[Decimal] = None
    documento_carpeta_id: Optional[int] = None
    estado_pago: Optional[str] = Field("Pendiente", max_length=50)

    @validator(
        "importe", "importe_total_bruto", "base_exenta_impuestos",
        "base_sujeta_impuestos", "porcentaje_impuesto", "importe_impuesto",
        "base_exenta_retencion", "base_sujeta_retencion", "porcentaje_retencion",
        "importe_retencion", "importe_resultante", pre=True,
    )
    def validar_decimales(cls, valor):
        return _decimal_opcional(valor)

    class Config:
        orm_mode = True


class GastoCreate(GastoBase):
    pass


class GastoUpdate(GastoBase):
    pass


class GastoResponse(GastoBase):
    id: int
    expediente_id: int


def _obtener_expediente(db: Session, expediente_id: int):
    # Acepta tanto la PK interna como el número visible del expediente.
    expediente = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if expediente is None:
        expediente = db.query(Expediente).filter(Expediente.id_expediente == str(expediente_id)).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="No existe el expediente con ese identificador.")
    return expediente


def _validar_calculo(datos: dict):
    """Valida importes fiscales aportados y el neto = bruto - retención.

    El bruto es el total de factura con IVA/IGIC y antes de retenciones.
    El neto es el importe que queda por pagar al proveedor. No se recalculan
    ni modifican registros antiguos durante esta validación.
    """
    campos_no_negativos = (
        "importe", "importe_total_bruto", "base_exenta_impuestos",
        "base_sujeta_impuestos", "importe_impuesto", "base_exenta_retencion",
        "base_sujeta_retencion", "importe_retencion", "importe_resultante",
        "porcentaje_impuesto", "porcentaje_retencion",
    )
    for campo in campos_no_negativos:
        valor = datos.get(campo)
        if valor is not None and valor < 0:
            raise HTTPException(status_code=422, detail=f"El campo {campo} no puede ser negativo.")

    base = datos.get("base_sujeta_impuestos")
    porcentaje = datos.get("porcentaje_impuesto")
    impuesto = datos.get("importe_impuesto")
    if base is not None and porcentaje is not None and impuesto is not None:
        esperado = _redondear(base * porcentaje / CIEN)
        if abs(esperado - impuesto) > CENTIMO:
            raise HTTPException(status_code=422, detail="El importe del impuesto no coincide con la base sujeta y el porcentaje indicado.")

    base_retencion = datos.get("base_sujeta_retencion")
    porcentaje_retencion = datos.get("porcentaje_retencion")
    retencion = datos.get("importe_retencion")
    if base_retencion is not None and porcentaje_retencion is not None and retencion is not None:
        esperado = _redondear(base_retencion * porcentaje_retencion / CIEN)
        if abs(esperado - retencion) > CENTIMO:
            raise HTTPException(status_code=422, detail="El importe de la retención no coincide con la base sujeta y el porcentaje indicado.")

    bruto = datos.get("importe_total_bruto")
    if bruto is None:
        bruto = datos.get("importe")
    if bruto is not None and retencion is not None and datos.get("importe_resultante") is not None:
        esperado_neto = _redondear(bruto - retencion)
        if abs(esperado_neto - datos["importe_resultante"]) > CENTIMO:
            raise HTTPException(status_code=422, detail="El importe resultante debe ser el total bruto menos la retención.")


@router.get("/{expediente_id}/gastos", response_model=list[GastoResponse])
def listar_gastos(expediente_id: int, db: Session = Depends(get_db)):
    expediente = _obtener_expediente(db, expediente_id)
    return db.query(ExpedienteGasto).filter(ExpedienteGasto.expediente_id == expediente.id).order_by(ExpedienteGasto.fecha.desc(), ExpedienteGasto.id.desc()).all()


@router.post("/{expediente_id}/gastos", response_model=GastoResponse, status_code=status.HTTP_201_CREATED)
def crear_gasto(expediente_id: int, payload: GastoCreate, db: Session = Depends(get_db)):
    expediente = _obtener_expediente(db, expediente_id)
    datos = payload.dict(exclude_unset=True)
    if not datos.get("tipo"):
        raise HTTPException(status_code=422, detail="El concepto del gasto es obligatorio.")
    # Compatibilidad con clientes antiguos: importe representa el neto cuando
    # se facilita importe_resultante; si no, conserva el importe recibido.
    if datos.get("importe_resultante") is None and datos.get("importe") is not None:
        datos["importe_resultante"] = datos["importe"]
    if datos.get("importe_total_bruto") is None and datos.get("importe") is not None:
        datos["importe_total_bruto"] = datos["importe"]
    if datos.get("importe_resultante") is None and datos.get("importe_total_bruto") is not None:
        retencion = datos.get("importe_retencion") or Decimal("0.00")
        datos["importe_resultante"] = _redondear(datos["importe_total_bruto"] - retencion)
    if datos.get("importe") is None and datos.get("importe_resultante") is not None:
        datos["importe"] = datos["importe_resultante"]
    _validar_calculo(datos)
    gasto = ExpedienteGasto(expediente_id=expediente.id, **datos)
    db.add(gasto)
    try:
        db.commit(); db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el gasto. Comprueba que la migración de columnas esté aplicada.")
    return gasto


@router.put("/{expediente_id}/gastos/{gasto_id}", response_model=GastoResponse)
def actualizar_gasto(expediente_id: int, gasto_id: int, payload: GastoUpdate, db: Session = Depends(get_db)):
    expediente = _obtener_expediente(db, expediente_id)
    gasto = db.query(ExpedienteGasto).filter(ExpedienteGasto.id == gasto_id, ExpedienteGasto.expediente_id == expediente.id).first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto.")
    datos = payload.dict(exclude_unset=True)
    _validar_calculo(datos)
    # En actualizaciones parciales, validar la combinación final, no solo los campos enviados.
    combinados = {campo: getattr(gasto, campo, None) for campo in GastoBase.__fields__}
    combinados.update(datos)
    _validar_calculo(combinados)
    for campo, valor in datos.items():
        setattr(gasto, campo, valor)
    if "importe_resultante" in datos and "importe" not in datos:
        gasto.importe = datos["importe_resultante"]
    try:
        db.commit(); db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar el gasto. Comprueba que la migración de columnas esté aplicada.")
    return gasto


@router.delete("/{expediente_id}/gastos/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_gasto(expediente_id: int, gasto_id: int, db: Session = Depends(get_db)):
    expediente = _obtener_expediente(db, expediente_id)
    gasto = db.query(ExpedienteGasto).filter(ExpedienteGasto.id == gasto_id, ExpedienteGasto.expediente_id == expediente.id).first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto.")
    db.delete(gasto)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar el gasto.")
    return None

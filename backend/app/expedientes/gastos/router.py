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
        "base_exenta_retencion", "base_sujeta_retencion",
        "porcentaje_retencion", "importe_retencion", "importe_resultante",
        pre=True,
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
    expediente = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if expediente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe el expediente con ese identificador interno.",
        )
    return expediente


def _validar_calculo(datos: dict):
    """
    Valida importes si se envían las bases fiscales completas.
    No presupone que el bruto sea siempre base + impuesto, ya que algunas
    facturas pueden incluir conceptos adicionales o reglas especiales.
    """
    for campo in (
        "importe", "importe_total_bruto", "base_exenta_impuestos",
        "base_sujeta_impuestos", "importe_impuesto",
        "base_exenta_retencion", "base_sujeta_retencion",
        "importe_retencion", "importe_resultante",
    ):
        valor = datos.get(campo)
        if valor is not None and valor < 0:
            raise HTTPException(
                status_code=422,
                detail=f"El campo {campo} no puede ser negativo.",
            )

    base_impuesto = datos.get("base_sujeta_impuestos")
    porcentaje_impuesto = datos.get("porcentaje_impuesto")
    importe_impuesto = datos.get("importe_impuesto")
    if base_impuesto is not None and porcentaje_impuesto is not None and importe_impuesto is not None:
        esperado = (base_impuesto * porcentaje_impuesto / Decimal("100")).quantize(
            CENTIMO, rounding=ROUND_HALF_UP
        )
        if abs(esperado - importe_impuesto) > CENTIMO:
            raise HTTPException(
                status_code=422,
                detail="El importe del impuesto no coincide con la base sujeta y el porcentaje indicado.",
            )

    base_retencion = datos.get("base_sujeta_retencion")
    porcentaje_retencion = datos.get("porcentaje_retencion")
    importe_retencion = datos.get("importe_retencion")
    if base_retencion is not None and porcentaje_retencion is not None and importe_retencion is not None:
        esperado = (base_retencion * porcentaje_retencion / Decimal("100")).quantize(
            CENTIMO, rounding=ROUND_HALF_UP
        )
        if abs(esperado - importe_retencion) > CENTIMO:
            raise HTTPException(
                status_code=422,
                detail="El importe de la retención no coincide con la base sujeta y el porcentaje indicado.",
            )


@router.get("/{expediente_id}/gastos", response_model=list[GastoResponse])
def listar_gastos(expediente_id: int, db: Session = Depends(get_db)):
    _obtener_expediente(db, expediente_id)
    return (
        db.query(ExpedienteGasto)
        .filter(ExpedienteGasto.expediente_id == expediente_id)
        .order_by(ExpedienteGasto.fecha.desc(), ExpedienteGasto.id.desc())
        .all()
    )


@router.post(
    "/{expediente_id}/gastos",
    response_model=GastoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_gasto(
    expediente_id: int,
    payload: GastoCreate,
    db: Session = Depends(get_db),
):
    _obtener_expediente(db, expediente_id)
    datos = payload.dict(exclude_unset=True)
    _validar_calculo(datos)

    if not datos.get("tipo"):
        raise HTTPException(status_code=422, detail="El concepto del gasto es obligatorio.")

    # Compatibilidad: el importe antiguo toma el importe resultante si se omite.
    if datos.get("importe") is None and datos.get("importe_resultante") is not None:
        datos["importe"] = datos["importe_resultante"]

    gasto = ExpedienteGasto(expediente_id=expediente_id, **datos)
    db.add(gasto)
    try:
        db.commit()
        db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el gasto. Comprueba que la migración de columnas esté aplicada.",
        )
    return gasto


@router.put(
    "/{expediente_id}/gastos/{gasto_id}",
    response_model=GastoResponse,
)
def actualizar_gasto(
    expediente_id: int,
    gasto_id: int,
    payload: GastoUpdate,
    db: Session = Depends(get_db),
):
    _obtener_expediente(db, expediente_id)
    gasto = (
        db.query(ExpedienteGasto)
        .filter(
            ExpedienteGasto.id == gasto_id,
            ExpedienteGasto.expediente_id == expediente_id,
        )
        .first()
    )
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto.")

    datos = payload.dict(exclude_unset=True)
    _validar_calculo(datos)
    for campo, valor in datos.items():
        setattr(gasto, campo, valor)

    if gasto.importe is None and gasto.importe_resultante is not None:
        gasto.importe = gasto.importe_resultante

    try:
        db.commit()
        db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el gasto. Comprueba que la migración de columnas esté aplicada.",
        )
    return gasto


@router.delete(
    "/{expediente_id}/gastos/{gasto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def eliminar_gasto(
    expediente_id: int,
    gasto_id: int,
    db: Session = Depends(get_db),
):
    _obtener_expediente(db, expediente_id)
    gasto = (
        db.query(ExpedienteGasto)
        .filter(
            ExpedienteGasto.id == gasto_id,
            ExpedienteGasto.expediente_id == expediente_id,
        )
        .first()
    )
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto.")

    db.delete(gasto)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar el gasto.")
    return None

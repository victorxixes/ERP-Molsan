from __future__ import annotations

from datetime import date
from decimal import Decimal
from io import BytesIO
import unicodedata
from typing import List, Literal, Optional
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, root_validator, validator
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import get_db, engine
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.registros_propiedad.models import RegistroPropiedad
from backend.app.provisiones.models import (
    ProvisionFondo,
    ProvisionOperacion,
    ProvisionOperacionFinca,
    TarifaProvision,
)

router = APIRouter(
    tags=["Provisiones de fondos y cancelaciones"],
    dependencies=[Depends(get_current_user)],
)

Importe = Decimal


def _normalizar(texto: object) -> str:
    base = unicodedata.normalize("NFD", str(texto or "").strip().casefold())
    return "".join(c for c in base if unicodedata.category(c) != "Mn").replace("  ", " ")


def _dinero(valor: object) -> Decimal:
    if valor is None or valor == "":
        return Decimal("0.00")
    try:
        numero = Decimal(str(valor)).quantize(Decimal("0.01"))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Importe no válido: {valor!r}.") from exc
    if not numero.is_finite() or numero < 0:
        raise HTTPException(status_code=422, detail="Los importes deben ser números finitos iguales o superiores a cero.")
    return numero


def _tipo_valido(tipo: str) -> str:
    valor = _normalizar(tipo)
    if valor in {"provision", "provision de fondos", "provision fondos"}:
        return "provision"
    if valor in {"cancelacion", "cancelacion hipotecaria", "cancelacion de hipoteca"}:
        return "cancelacion"
    raise HTTPException(status_code=422, detail="El tipo debe ser 'provision' o 'cancelacion'.")


class FincaProvisionInput(BaseModel):
    finca: Optional[str] = Field(None, max_length=200)
    cru_idufir: Optional[str] = Field(None, max_length=200)
    registro_propiedad_id: Optional[int] = Field(None, ge=1)
    registro_propiedad: Optional[str] = Field(None, max_length=300)
    provincia: Optional[str] = Field(None, max_length=150)
    poblacion: Optional[str] = Field(None, max_length=150)
    seccion: Optional[str] = Field(None, max_length=100)


class OperacionProvisionInput(BaseModel):
    entidad: str = Field(..., min_length=1, max_length=300)
    numero_prestamo: Optional[str] = Field(None, max_length=200)
    capital: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    tarifa_id: Optional[int] = Field(None, ge=1)
    aplicar_tarifa: bool = True
    honorarios_base: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    honorarios: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    suplidos: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    gastos_registro: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    otros_gastos: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    condonar_honorarios: bool = False
    importe_manual: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=2)
    observaciones: Optional[str] = None
    fincas: List[FincaProvisionInput] = Field(default_factory=list)

    @validator("entidad")
    def entidad_no_vacia(cls, valor):
        valor = " ".join(valor.strip().split())
        if not valor:
            raise ValueError("La entidad es obligatoria para cada préstamo.")
        return valor


class ProvisionInput(BaseModel):
    tipo: Literal["provision", "cancelacion"]
    fecha: date
    observaciones: Optional[str] = None
    operaciones: List[OperacionProvisionInput] = Field(..., min_items=1)

    @validator("observaciones")
    def limpiar_observaciones(cls, valor):
        if valor is None:
            return None
        valor = valor.strip()
        return valor or None


class TarifaInput(BaseModel):
    tipo: Literal["provision", "cancelacion"]
    entidad: str = Field(..., min_length=1, max_length=300)
    capital_minimo: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    capital_maximo: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=2)
    honorarios: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    suplidos: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    gastos_registro: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    otros_gastos: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)

    @validator("entidad")
    def limpiar_entidad(cls, valor):
        return " ".join(valor.strip().split()) or "*"

    @root_validator
    def validar_tramo(cls, values):
        minimo, maximo = values.get("capital_minimo"), values.get("capital_maximo")
        if minimo is not None and maximo is not None and maximo < minimo:
            raise ValueError("El capital máximo no puede ser inferior al mínimo.")
        return values


class CalcularTarifaInput(BaseModel):
    tipo: Literal["provision", "cancelacion"]
    entidad: str = Field(..., min_length=1, max_length=300)
    capital: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2)
    condonar_honorarios: bool = False


def _buscar_expediente(db: Session, id_expediente: str) -> Expediente:
    item = db.query(Expediente).filter(Expediente.id_expediente == str(id_expediente)).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"No existe el expediente {id_expediente}.")
    return item


def _buscar_tarifa(db: Session, tipo: str, entidad: str, capital: Decimal) -> Optional[TarifaProvision]:
    tarifas = (
        db.query(TarifaProvision)
        .filter(TarifaProvision.activo.is_(True), TarifaProvision.tipo == tipo)
        .all()
    )
    key_entidad = _normalizar(entidad)
    aplicables = []
    for tarifa in tarifas:
        minimo = Decimal(str(tarifa.capital_minimo or 0))
        maximo = Decimal(str(tarifa.capital_maximo)) if tarifa.capital_maximo is not None else None
        if capital < minimo or (maximo is not None and capital > maximo):
            continue
        key_tarifa = _normalizar(tarifa.entidad)
        if key_tarifa not in {"*", key_entidad}:
            continue
        anchura = (maximo - minimo) if maximo is not None else Decimal("9999999999999999")
        aplicables.append((0 if key_tarifa == key_entidad and key_entidad != "*" else 1, anchura, tarifa.id, tarifa))
    if not aplicables:
        return None
    aplicables.sort(key=lambda x: (x[0], x[1], x[2]))
    return aplicables[0][3]


def _tarifa_dict(item: TarifaProvision) -> dict:
    return {
        "id": item.id,
        "tipo": item.tipo,
        "entidad": item.entidad,
        "capital_minimo": float(item.capital_minimo or 0),
        "capital_maximo": float(item.capital_maximo) if item.capital_maximo is not None else None,
        "honorarios": float(item.honorarios or 0),
        "suplidos": float(item.suplidos or 0),
        "gastos_registro": float(item.gastos_registro or 0),
        "otros_gastos": float(item.otros_gastos or 0),
        "activo": bool(item.activo),
    }


def _operacion_dict(db: Session, item: ProvisionOperacion) -> dict:
    fincas = db.query(ProvisionOperacionFinca).filter(ProvisionOperacionFinca.operacion_id == item.id).order_by(ProvisionOperacionFinca.id).all()
    return {
        "id": item.id,
        "entidad": item.entidad,
        "numero_prestamo": item.numero_prestamo,
        "capital": float(item.capital or 0),
        "tarifa_id": item.tarifa_id,
        "aplicar_tarifa": bool(item.aplicar_tarifa),
        "honorarios_base": float(item.honorarios_base or 0),
        "honorarios": float(item.honorarios or 0),
        "suplidos": float(item.suplidos or 0),
        "gastos_registro": float(item.gastos_registro or 0),
        "otros_gastos": float(item.otros_gastos or 0),
        "condonar_honorarios": bool(item.condonar_honorarios),
        "importe_manual": float(item.importe_manual) if item.importe_manual is not None else None,
        "total": float(item.total or 0),
        "observaciones": item.observaciones,
        "fincas": [{
            "id": f.id,
            "finca": f.finca,
            "cru_idufir": f.cru_idufir,
            "registro_propiedad_id": f.registro_propiedad_id,
            "registro_propiedad": f.registro_propiedad,
            "provincia": f.provincia,
            "poblacion": f.poblacion,
            "seccion": f.seccion,
        } for f in fincas],
    }


def _provision_dict(db: Session, item: ProvisionFondo) -> dict:
    operaciones = db.query(ProvisionOperacion).filter(ProvisionOperacion.provision_id == item.id).order_by(ProvisionOperacion.id).all()
    return {
        "id": item.id,
        "expediente_id": item.expediente_id,
        "tipo": item.tipo,
        "estado": item.estado,
        "fecha": item.fecha.isoformat() if item.fecha else None,
        "observaciones": item.observaciones,
        "importe_total": float(item.importe_total or 0),
        "creado_en": item.creado_en.isoformat() if item.creado_en else None,
        "actualizado_en": item.actualizado_en.isoformat() if item.actualizado_en else None,
        "operaciones": [_operacion_dict(db, op) for op in operaciones],
    }


def _comprobar_tarifas_sin_solapamiento(db: Session, data: TarifaInput, omit_id: Optional[int] = None) -> None:
    entidad_key = _normalizar(data.entidad)
    tarifas = db.query(TarifaProvision).filter(TarifaProvision.activo.is_(True), TarifaProvision.tipo == data.tipo).all()
    for tarifa in tarifas:
        if omit_id and tarifa.id == omit_id:
            continue
        if _normalizar(tarifa.entidad) != entidad_key:
            continue
        min_a = Decimal(str(tarifa.capital_minimo or 0))
        max_a = Decimal(str(tarifa.capital_maximo)) if tarifa.capital_maximo is not None else None
        min_b = data.capital_minimo
        max_b = data.capital_maximo
        termina_a = max_a is None or max_a >= min_b
        termina_b = max_b is None or max_b >= min_a
        if termina_a and termina_b:
            raise HTTPException(status_code=409, detail=f"El tramo se solapa con la tarifa activa #{tarifa.id} de {tarifa.entidad}. Corrige los límites para evitar tarifas ambiguas.")


def _crear_operacion(db: Session, provision: ProvisionFondo, datos: OperacionProvisionInput) -> ProvisionOperacion:
    entidad = datos.entidad.strip()
    capital = _dinero(datos.capital)
    tarifa = None
    if datos.aplicar_tarifa:
        tarifa = _buscar_tarifa(db, provision.tipo, entidad, capital)
    if datos.aplicar_tarifa and datos.tarifa_id and not tarifa:
        candidata = db.query(TarifaProvision).filter(TarifaProvision.id == datos.tarifa_id, TarifaProvision.activo.is_(True)).first()
        if candidata and candidata.tipo == provision.tipo and _normalizar(candidata.entidad) in {"*", _normalizar(entidad)}:
            minimo = Decimal(str(candidata.capital_minimo or 0))
            maximo = Decimal(str(candidata.capital_maximo)) if candidata.capital_maximo is not None else None
            if capital >= minimo and (maximo is None or capital <= maximo):
                tarifa = candidata
        if not tarifa:
            raise HTTPException(status_code=422, detail=f"La tarifa #{datos.tarifa_id} ya no está activa o no coincide con la entidad, tipo y capital de la operación.")

    if datos.aplicar_tarifa and not tarifa:
        raise HTTPException(
            status_code=422,
            detail="No hay una tarifa activa para este tipo, entidad y capital. Configura el tarifario o desactiva 'Aplicar tarifa configurada' para introducir los importes manualmente.",
        )

    if tarifa:
        honorarios_base = _dinero(tarifa.honorarios)
        honorarios = Decimal("0.00") if datos.condonar_honorarios else honorarios_base
        suplidos = _dinero(tarifa.suplidos)
        gastos_registro = _dinero(tarifa.gastos_registro)
        otros_gastos = _dinero(tarifa.otros_gastos)
        tarifa_id = tarifa.id
    else:
        honorarios_base = _dinero(datos.honorarios_base if datos.honorarios_base else datos.honorarios)
        honorarios = Decimal("0.00") if datos.condonar_honorarios else _dinero(datos.honorarios)
        suplidos = _dinero(datos.suplidos)
        gastos_registro = _dinero(datos.gastos_registro)
        otros_gastos = _dinero(datos.otros_gastos)
        tarifa_id = None

    importe_manual = _dinero(datos.importe_manual) if datos.importe_manual is not None else None
    total = importe_manual if importe_manual is not None else (honorarios + suplidos + gastos_registro + otros_gastos).quantize(Decimal("0.01"))
    operacion = ProvisionOperacion(
        provision_id=provision.id,
        entidad=entidad,
        numero_prestamo=(datos.numero_prestamo or "").strip() or None,
        capital=capital,
        tarifa_id=tarifa_id,
        aplicar_tarifa=bool(datos.aplicar_tarifa),
        honorarios_base=honorarios_base,
        honorarios=honorarios,
        suplidos=suplidos,
        gastos_registro=gastos_registro,
        otros_gastos=otros_gastos,
        condonar_honorarios=bool(datos.condonar_honorarios),
        importe_manual=importe_manual,
        total=total,
        observaciones=(datos.observaciones or "").strip() or None,
    )
    db.add(operacion)
    db.flush()

    for finca_data in datos.fincas:
        registro_nombre = (finca_data.registro_propiedad or "").strip() or None
        registro_id = finca_data.registro_propiedad_id
        if registro_id:
            registro = db.query(RegistroPropiedad).filter(RegistroPropiedad.id == registro_id, RegistroPropiedad.activo.is_(True)).first()
            if not registro:
                raise HTTPException(status_code=422, detail=f"El Registro de la Propiedad #{registro_id} no existe o está inactivo.")
            registro_nombre = registro.registro_propiedad
        finca = ProvisionOperacionFinca(
            operacion_id=operacion.id,
            finca=(finca_data.finca or "").strip() or None,
            cru_idufir=(finca_data.cru_idufir or "").strip() or None,
            registro_propiedad_id=registro_id,
            registro_propiedad=registro_nombre,
            provincia=(finca_data.provincia or "").strip() or None,
            poblacion=(finca_data.poblacion or "").strip() or None,
            seccion=(finca_data.seccion or "").strip() or None,
        )
        db.add(finca)
    return operacion


def _reemplazar_operaciones(db: Session, provision: ProvisionFondo, datos: ProvisionInput) -> None:
    anteriores = db.query(ProvisionOperacion).filter(ProvisionOperacion.provision_id == provision.id).all()
    for anterior in anteriores:
        db.query(ProvisionOperacionFinca).filter(ProvisionOperacionFinca.operacion_id == anterior.id).delete(synchronize_session=False)
        db.delete(anterior)
    db.flush()
    total = Decimal("0.00")
    for operacion_data in datos.operaciones:
        op = _crear_operacion(db, provision, operacion_data)
        total += Decimal(str(op.total or 0))
    provision.importe_total = total.quantize(Decimal("0.01"))


@router.get("/provisiones/tarifas/catalogo-registros", summary="Catálogo de Registros de la Propiedad para Provisiones")
def catalogo_registros_provisiones(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    registros = db.query(RegistroPropiedad).filter(RegistroPropiedad.activo.is_(True)).order_by(RegistroPropiedad.provincia, RegistroPropiedad.poblacion, RegistroPropiedad.registro_propiedad).all()
    return [{"id": r.id, "registro_propiedad": r.registro_propiedad, "provincia": r.provincia, "poblacion": r.poblacion} for r in registros]


@router.post("/provisiones/tarifas/calcular", summary="Calcular una tarifa por entidad y rango de capital")
def calcular_tarifa_provision(datos: CalcularTarifaInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "crear")
    tarifa = _buscar_tarifa(db, datos.tipo, datos.entidad, datos.capital)
    if not tarifa:
        raise HTTPException(status_code=404, detail="No hay una tarifa activa para ese tipo, entidad y capital. Configura una tarifa o introduce los importes manualmente.")
    honorarios_base = _dinero(tarifa.honorarios)
    honorarios = Decimal("0.00") if datos.condonar_honorarios else honorarios_base
    total = honorarios + _dinero(tarifa.suplidos) + _dinero(tarifa.gastos_registro) + _dinero(tarifa.otros_gastos)
    return {
        "tarifa": _tarifa_dict(tarifa),
        "honorarios_base": float(honorarios_base),
        "honorarios": float(honorarios),
        "suplidos": float(tarifa.suplidos or 0),
        "gastos_registro": float(tarifa.gastos_registro or 0),
        "otros_gastos": float(tarifa.otros_gastos or 0),
        "condonar_honorarios": datos.condonar_honorarios,
        "total_calculado": float(total.quantize(Decimal("0.01"))),
    }


@router.get("/provisiones/tarifas", summary="Listar tarifas de Provisiones y Cancelaciones")
def listar_tarifas_provisiones(incluir_inactivas: bool = False, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    query = db.query(TarifaProvision)
    if not incluir_inactivas:
        query = query.filter(TarifaProvision.activo.is_(True))
    return [_tarifa_dict(x) for x in query.order_by(TarifaProvision.tipo, TarifaProvision.entidad, TarifaProvision.capital_minimo).all()]


@router.post("/provisiones/tarifas", status_code=status.HTTP_201_CREATED, summary="Crear tarifa (solo Seguridad/editar)")
def crear_tarifa_provision(datos: TarifaInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "crear")
    require_perm_modulo(usuario, "seguridad", "editar")
    _comprobar_tarifas_sin_solapamiento(db, datos)
    item = TarifaProvision(**datos.dict(), activo=True)
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo crear la tarifa: {str(exc)[:250]}") from exc
    return _tarifa_dict(item)


@router.put("/provisiones/tarifas/{tarifa_id}", summary="Modificar tarifa (solo Seguridad/editar)")
def actualizar_tarifa_provision(tarifa_id: int, datos: TarifaInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "editar")
    require_perm_modulo(usuario, "seguridad", "editar")
    item = db.query(TarifaProvision).filter(TarifaProvision.id == tarifa_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada.")
    _comprobar_tarifas_sin_solapamiento(db, datos, omit_id=tarifa_id)
    for nombre, valor in datos.dict().items():
        setattr(item, nombre, valor)
    try:
        db.commit()
        db.refresh(item)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar la tarifa: {str(exc)[:250]}") from exc
    return _tarifa_dict(item)


@router.delete("/provisiones/tarifas/{tarifa_id}", summary="Desactivar tarifa (solo Seguridad/editar)")
def desactivar_tarifa_provision(tarifa_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "eliminar")
    require_perm_modulo(usuario, "seguridad", "editar")
    item = db.query(TarifaProvision).filter(TarifaProvision.id == tarifa_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada.")
    item.activo = False
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo desactivar la tarifa: {str(exc)[:250]}") from exc
    return {"ok": True, "id": tarifa_id, "activo": False}


@router.get("/{id_expediente}/provisiones", summary="Listar provisiones/cancelaciones de un expediente")
def listar_provisiones(id_expediente: str, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    expediente = _buscar_expediente(db, id_expediente)
    items = db.query(ProvisionFondo).filter(ProvisionFondo.expediente_id == expediente.id).order_by(ProvisionFondo.fecha.desc(), ProvisionFondo.id.desc()).all()
    return {"id_expediente": expediente.id_expediente, "items": [_provision_dict(db, x) for x in items], "total": len(items)}


@router.post("/{id_expediente}/provisiones", status_code=status.HTTP_201_CREATED, summary="Crear provisión/cancelación para un expediente")
def crear_provision(id_expediente: str, datos: ProvisionInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "crear")
    expediente = _buscar_expediente(db, id_expediente)
    item = ProvisionFondo(expediente_id=expediente.id, tipo=datos.tipo, estado="borrador", fecha=datos.fecha, observaciones=datos.observaciones, creado_por_id=getattr(usuario, "id", None))
    db.add(item)
    try:
        db.flush()
        _reemplazar_operaciones(db, item, datos)
        db.commit()
        db.refresh(item)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la provisión: {str(exc)[:300]}") from exc
    return _provision_dict(db, item)


@router.put("/{id_expediente}/provisiones/{provision_id}", summary="Modificar provisión/cancelación")
def actualizar_provision(id_expediente: str, provision_id: int, datos: ProvisionInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "editar")
    expediente = _buscar_expediente(db, id_expediente)
    item = db.query(ProvisionFondo).filter(ProvisionFondo.id == provision_id, ProvisionFondo.expediente_id == expediente.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="La provisión no existe en este expediente.")
    if item.estado == "anulada":
        raise HTTPException(status_code=409, detail="No se puede modificar una provisión anulada.")
    item.tipo = datos.tipo
    item.fecha = datos.fecha
    item.observaciones = datos.observaciones
    try:
        _reemplazar_operaciones(db, item, datos)
        db.commit()
        db.refresh(item)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudieron guardar los cambios: {str(exc)[:300]}") from exc
    return _provision_dict(db, item)


@router.delete("/{id_expediente}/provisiones/{provision_id}", summary="Anular provisión/cancelación sin borrar el histórico")
def anular_provision(id_expediente: str, provision_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "eliminar")
    expediente = _buscar_expediente(db, id_expediente)
    item = db.query(ProvisionFondo).filter(ProvisionFondo.id == provision_id, ProvisionFondo.expediente_id == expediente.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="La provisión no existe en este expediente.")
    item.estado = "anulada"
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo anular la provisión: {str(exc)[:250]}") from exc
    return {"ok": True, "id": item.id, "estado": item.estado}


def _p(texto: object, style: ParagraphStyle) -> Paragraph:
    value = escape(str(texto or "—")).replace("\n", "<br/>")
    return Paragraph(value, style)


def _euros(valor: object) -> str:
    try:
        numero = Decimal(str(valor or 0))
    except Exception:
        numero = Decimal("0")
    return f"{numero:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


@router.get("/{id_expediente}/provisiones/{provision_id}/documento", summary="Generar PDF de provisión/cancelación")
def generar_documento_provision(id_expediente: str, provision_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    expediente = _buscar_expediente(db, id_expediente)
    item = db.query(ProvisionFondo).filter(ProvisionFondo.id == provision_id, ProvisionFondo.expediente_id == expediente.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="La provisión no existe en este expediente.")
    if item.estado == "anulada":
        raise HTTPException(status_code=409, detail="No se puede generar el documento de una provisión anulada.")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=17*mm, leftMargin=17*mm, topMargin=16*mm, bottomMargin=17*mm, title=f"{item.tipo.title()} - expediente {expediente.id_expediente}", author="ERP-Molsan")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TituloMolsan", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=colors.HexColor("#15325b"), alignment=TA_LEFT, spaceAfter=4*mm))
    styles.add(ParagraphStyle(name="SubtituloMolsan", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13, textColor=colors.HexColor("#58677c"), spaceAfter=2*mm))
    styles.add(ParagraphStyle(name="Celda", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10))
    styles.add(ParagraphStyle(name="CeldaDerecha", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name="Total", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=14, alignment=TA_RIGHT, textColor=colors.HexColor("#15325b")))
    story = [
        Paragraph("MOLSAN", styles["TituloMolsan"]),
        Paragraph("PROVISIÓN DE FONDOS" if item.tipo == "provision" else "PRESUPUESTO DE CANCELACIÓN HIPOTECARIA", styles["Heading2"]),
        Paragraph(f"Expediente: <b>{escape(str(expediente.id_expediente))}</b> &nbsp;&nbsp; Fecha: <b>{item.fecha.strftime('%d/%m/%Y') if item.fecha else '—'}</b> &nbsp;&nbsp; Estado: <b>{escape(item.estado.upper())}</b>", styles["SubtituloMolsan"]),
        Spacer(1, 3*mm),
    ]
    if getattr(expediente, "nombre_titular", None): story.append(Paragraph(f"Titular: <b>{escape(str(expediente.nombre_titular))}</b>", styles["Normal"]))
    if getattr(expediente, "nif_titular", None): story.append(Paragraph(f"NIF titular: {escape(str(expediente.nif_titular))}", styles["Normal"]))
    if getattr(expediente, "oficina", None): story.append(Paragraph(f"Oficina: {escape(str(expediente.oficina))}", styles["Normal"]))
    story.append(Spacer(1, 5*mm))

    operaciones = db.query(ProvisionOperacion).filter(ProvisionOperacion.provision_id == item.id).order_by(ProvisionOperacion.id).all()
    for indice, op in enumerate(operaciones, 1):
        story.append(KeepTogether([
            Paragraph(f"Operación {indice}: {escape(op.entidad)}", styles["Heading3"]),
            Paragraph(f"Préstamo: {escape(str(op.numero_prestamo or '—'))} &nbsp;&nbsp; Capital: <b>{_euros(op.capital)}</b>", styles["Normal"]),
        ]))
        fincas = db.query(ProvisionOperacionFinca).filter(ProvisionOperacionFinca.operacion_id == op.id).order_by(ProvisionOperacionFinca.id).all()
        if fincas:
            tabla_fincas = [[_p("Finca", styles["Celda"]), _p("Registro de la Propiedad", styles["Celda"]), _p("Población / Provincia", styles["Celda"])]]
            for f in fincas:
                tabla_fincas.append([_p(f.finca, styles["Celda"]), _p(f.registro_propiedad, styles["Celda"]), _p(" · ".join(x for x in [f.poblacion, f.provincia] if x), styles["Celda"])])
            tf = Table(tabla_fincas, colWidths=[28*mm, 85*mm, 52*mm], repeatRows=1, hAlign="LEFT")
            tf.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eaf0f8")), ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#cdd6e2")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5)]))
            story.extend([Spacer(1, 2*mm), tf, Spacer(1, 3*mm)])
        conceptos = [
            [_p("Concepto", styles["Celda"]), _p("Importe", styles["CeldaDerecha"])],
            [_p("Honorarios" + (" (condonados)" if op.condonar_honorarios else ""), styles["Celda"]), _p(_euros(op.honorarios), styles["CeldaDerecha"])],
            [_p("Suplidos", styles["Celda"]), _p(_euros(op.suplidos), styles["CeldaDerecha"])],
            [_p("Gastos de registro", styles["Celda"]), _p(_euros(op.gastos_registro), styles["CeldaDerecha"])],
            [_p("Otros gastos", styles["Celda"]), _p(_euros(op.otros_gastos), styles["CeldaDerecha"])],
        ]
        if op.importe_manual is not None:
            conceptos.append([_p("Total manual aplicado", styles["Celda"]), _p(_euros(op.importe_manual), styles["CeldaDerecha"])])
        tc = Table(conceptos, colWidths=[115*mm, 50*mm], hAlign="LEFT")
        tc.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eaf0f8")), ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#cdd6e2")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4)]))
        story.extend([tc, Spacer(1, 2*mm), Paragraph(f"Total de la operación: <b>{_euros(op.total)}</b>", styles["Total"]), Spacer(1, 5*mm)])
        if op.observaciones:
            story.append(Paragraph(f"Observaciones de la operación: {escape(op.observaciones)}", styles["SubtituloMolsan"]))

    story.extend([
        Spacer(1, 3*mm),
        Paragraph(f"IMPORTE TOTAL: {_euros(item.importe_total)}", styles["Total"]),
        Spacer(1, 4*mm),
    ])
    if item.observaciones:
        story.append(Paragraph(f"Observaciones: {escape(item.observaciones)}", styles["Normal"]))
        story.append(Spacer(1, 5*mm))
    story.append(Paragraph("Documento interno de cálculo y previsión de fondos. No constituye por sí mismo una factura ni acredita pagos o gastos efectivamente satisfechos. Revise los importes y los requisitos del Registro antes de cursar la operación.", styles["SubtituloMolsan"]))

    def pie(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d7dfeb"))
        canvas.line(17*mm, 13*mm, A4[0]-17*mm, 13*mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#58677c"))
        canvas.drawString(17*mm, 8.5*mm, f"ERP-Molsan · Expediente {expediente.id_expediente}")
        canvas.drawRightString(A4[0]-17*mm, 8.5*mm, f"Página {documento.page}")
        canvas.restoreState()

    try:
        doc.build(story, onFirstPage=pie, onLaterPages=pie)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {str(exc)[:250]}") from exc
    buffer.seek(0)
    item.estado = "generada"
    try:
        db.commit()
    except Exception:
        db.rollback()
        # El PDF es válido aunque no se pueda actualizar el estado del registro.
    id_seguro = "".join(c for c in str(expediente.id_expediente) if c.isalnum() or c in "-_") or "expediente"
    filename = f"{('provision' if item.tipo == 'provision' else 'cancelacion')}_{id_seguro}_{item.id}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"})


@router.on_event("startup")
def inicializar_tablas_provisiones() -> None:
    """Crea solo tablas nuevas del módulo; no altera ni borra tablas existentes."""
    TarifaProvision.__table__.create(bind=engine, checkfirst=True)
    ProvisionFondo.__table__.create(bind=engine, checkfirst=True)
    ProvisionOperacion.__table__.create(bind=engine, checkfirst=True)
    ProvisionOperacionFinca.__table__.create(bind=engine, checkfirst=True)

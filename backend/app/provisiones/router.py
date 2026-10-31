from __future__ import annotations

import base64
from datetime import date, datetime
from email.message import EmailMessage
import os
import smtplib
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
from uuid import uuid4
import unicodedata
from typing import List, Literal, Optional
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, root_validator, validator
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image as PDFImage, Flowable
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import get_db, engine
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.registros_propiedad.models import RegistroPropiedad
from backend.app.provisiones.models import (
    ProvisionFondo,
    ProvisionOperacion,
    ProvisionOperacionFinca,
    TarifaProvision,
    ProvisionIndependiente,
    ConceptoImporteProvision,
)

router = APIRouter(
    tags=["Provisiones de fondos y cancelaciones"],
    dependencies=[Depends(get_current_user), Depends(validar_visibilidad_expediente_request)],
)

Importe = Decimal


def _normalizar(texto: object) -> str:
    base = unicodedata.normalize("NFD", str(texto or "").strip().casefold())
    return "".join(c for c in base if unicodedata.category(c) != "Mn").replace("  ", " ")


def _dinero(valor: object) -> Decimal:
    if valor is None or valor == "":
        return Decimal("0.00")
    try:
        numero = Decimal(str(valor)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
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
    notaria: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    impuestos: Decimal = Field(Decimal("0.00"), ge=0, max_digits=14, decimal_places=2)
    ajustes_motivo: Optional[str] = Field(None, max_length=1000)
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
    territorio: Literal["Península", "Canarias"] = "Península"
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
    territorio: Literal["Península", "Canarias"] = "Península"
    capital: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2)
    condonar_honorarios: bool = False


def _buscar_expediente(db: Session, id_expediente: str) -> Expediente:
    item = db.query(Expediente).filter(Expediente.id_expediente == str(id_expediente)).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"No existe el expediente {id_expediente}.")
    return item


def _buscar_tarifa(db: Session, tipo: str, entidad: str, capital: Decimal, territorio: str = "Península") -> Optional[TarifaProvision]:
    # Solo pueden participar tarifas activas del mismo circuito (provisión o
    # cancelación), además de coincidir entidad, territorio y tramo de capital.
    tarifas = (
        db.query(TarifaProvision)
        .filter(
            TarifaProvision.tipo == tipo,
            TarifaProvision.activo.is_(True),
        )
        .all()
    )
    key_entidad = _normalizar(entidad)
    aplicables = []
    for tarifa in tarifas:
        minimo = Decimal(str(tarifa.capital_minimo or 0))
        maximo = Decimal(str(tarifa.capital_maximo)) if tarifa.capital_maximo is not None else None
        if (getattr(tarifa, "territorio", "Península") or "Península") != territorio:
            continue
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
        "territorio": getattr(item, "territorio", "Península") or "Península",
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
        "notaria": float(getattr(item, "notaria", 0) or 0),
        "impuestos": float(getattr(item, "impuestos", 0) or 0),
        "gastos_registro_base": float(getattr(item, "gastos_registro_base", item.gastos_registro) or 0),
        "suplidos_base": float(getattr(item, "suplidos_base", item.suplidos) or 0),
        "otros_gastos_base": float(getattr(item, "otros_gastos_base", item.otros_gastos) or 0),
        "ajustes_motivo": getattr(item, "ajustes_motivo", None),
        "ajustes_auditoria": getattr(item, "ajustes_auditoria", []) or [],
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
        if _normalizar(tarifa.entidad) != entidad_key or (getattr(tarifa, "territorio", "Península") or "Península") != data.territorio:
            continue
        min_a = Decimal(str(tarifa.capital_minimo or 0))
        max_a = Decimal(str(tarifa.capital_maximo)) if tarifa.capital_maximo is not None else None
        min_b = data.capital_minimo
        max_b = data.capital_maximo
        termina_a = max_a is None or max_a >= min_b
        termina_b = max_b is None or max_b >= min_a
        if termina_a and termina_b:
            raise HTTPException(status_code=409, detail=f"El tramo se solapa con la tarifa activa #{tarifa.id} de {tarifa.entidad}. Corrige los límites para evitar tarifas ambiguas.")


def _crear_operacion(db: Session, provision: ProvisionFondo, datos: OperacionProvisionInput, usuario=None) -> ProvisionOperacion:
    entidad = datos.entidad.strip()
    capital = _dinero(datos.capital)
    tarifa = None
    if datos.aplicar_tarifa:
        tarifa = _buscar_tarifa(db, provision.tipo, entidad, capital)
    if datos.aplicar_tarifa and datos.tarifa_id and not tarifa:
        candidata = db.query(TarifaProvision).filter(TarifaProvision.id == datos.tarifa_id).first()
        if candidata and _normalizar(candidata.entidad) in {"*", _normalizar(entidad)}:
            minimo = Decimal(str(candidata.capital_minimo or 0))
            maximo = Decimal(str(candidata.capital_maximo)) if candidata.capital_maximo is not None else None
            if capital >= minimo and (maximo is None or capital <= maximo):
                tarifa = candidata
        if not tarifa:
            raise HTTPException(status_code=422, detail=f"La tarifa #{datos.tarifa_id} no coincide con la entidad o el capital de la operación.")

    if datos.aplicar_tarifa and not tarifa:
        raise HTTPException(
            status_code=422,
            detail="No hay una tarifa que coincida con la entidad, el territorio y el capital. Configura el tarifario o desactiva 'Aplicar tarifa configurada' para introducir los importes manualmente.",
        )

    if tarifa:
        honorarios_base = _dinero(tarifa.honorarios)
        # Solo se admiten importes distintos a la tarifa cuando el usuario
        # deja constancia expresa del motivo del ajuste.
        con_ajuste = bool((datos.ajustes_motivo or "").strip())
        honorarios = Decimal("0.00") if datos.condonar_honorarios else (_dinero(datos.honorarios) if con_ajuste else honorarios_base)
        suplidos = _dinero(datos.suplidos) if con_ajuste else _dinero(tarifa.suplidos)
        gastos_registro = _dinero(datos.gastos_registro) if con_ajuste else _dinero(tarifa.gastos_registro)
        otros_gastos = _dinero(datos.otros_gastos) if con_ajuste else _dinero(tarifa.otros_gastos)
        tarifa_id = tarifa.id
    else:
        honorarios_base = _dinero(datos.honorarios_base if datos.honorarios_base else datos.honorarios)
        honorarios = Decimal("0.00") if datos.condonar_honorarios else _dinero(datos.honorarios)
        suplidos = _dinero(datos.suplidos)
        gastos_registro = _dinero(datos.gastos_registro)
        otros_gastos = _dinero(datos.otros_gastos)
        tarifa_id = None

    # Los importes configurados son una referencia inicial para operaciones nuevas.
    # No se recalculan operaciones históricas cuando cambia el catálogo general.
    def importe_configurado(codigo: str) -> Decimal:
        item = db.query(ConceptoImporteProvision).filter(
            ConceptoImporteProvision.codigo == codigo,
            ConceptoImporteProvision.activo.is_(True),
        ).first()
        return _dinero(item.importe_previsto) if item and item.modo == "previsto" and item.importe_previsto is not None else Decimal("0.00")

    notaria_base = importe_configurado("notaria")
    impuestos_base = importe_configurado("impuestos")
    notaria = _dinero(datos.notaria) if datos.notaria else notaria_base
    impuestos = _dinero(datos.impuestos) if datos.impuestos else impuestos_base
    importe_manual = _dinero(datos.importe_manual) if datos.importe_manual is not None else None
    total = importe_manual if importe_manual is not None else (honorarios + suplidos + gastos_registro + otros_gastos + notaria + impuestos).quantize(Decimal("0.01"))
    auditoria = []
    for codigo, base, efectivo in (
        ("honorarios", honorarios_base, honorarios),
        ("notaria", notaria_base, notaria),
        ("registro", _dinero(tarifa.gastos_registro) if tarifa else _dinero(datos.gastos_registro), gastos_registro),
        ("impuestos", impuestos_base, impuestos),
        ("suplidos", _dinero(tarifa.suplidos) if tarifa else _dinero(datos.suplidos), suplidos),
        ("otros_gastos", _dinero(tarifa.otros_gastos) if tarifa else _dinero(datos.otros_gastos), otros_gastos),
    ):
        if codigo == "honorarios" and datos.condonar_honorarios:
            continue
        if base != efectivo:
            auditoria.append({
                "concepto": codigo,
                "importe_base": str(base),
                "importe_efectivo": str(efectivo),
                "diferencia": str((efectivo-base).quantize(Decimal("0.01"))),
                "fecha": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                "usuario_id": getattr(usuario, "id", None) if not isinstance(usuario, dict) else usuario.get("id"),
                "motivo": (datos.ajustes_motivo or "").strip(),
            })
    if auditoria and not (datos.ajustes_motivo or "").strip():
        raise HTTPException(status_code=422, detail="Indica el motivo de los ajustes manuales de la provisión.")
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
        notaria=notaria,
        impuestos=impuestos,
        gastos_registro_base=_dinero(tarifa.gastos_registro) if tarifa else _dinero(datos.gastos_registro),
        suplidos_base=_dinero(tarifa.suplidos) if tarifa else _dinero(datos.suplidos),
        otros_gastos_base=_dinero(tarifa.otros_gastos) if tarifa else _dinero(datos.otros_gastos),
        ajustes_motivo=(datos.ajustes_motivo or "").strip() or None,
        ajustes_auditoria=auditoria,
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


def _reemplazar_operaciones(db: Session, provision: ProvisionFondo, datos: ProvisionInput, usuario=None) -> None:
    anteriores = db.query(ProvisionOperacion).filter(ProvisionOperacion.provision_id == provision.id).all()
    for anterior in anteriores:
        db.query(ProvisionOperacionFinca).filter(ProvisionOperacionFinca.operacion_id == anterior.id).delete(synchronize_session=False)
        db.delete(anterior)
    db.flush()
    total = Decimal("0.00")
    for operacion_data in datos.operaciones:
        op = _crear_operacion(db, provision, operacion_data, usuario)
        total += Decimal(str(op.total or 0))
    provision.importe_total = total.quantize(Decimal("0.01"))



class ConceptoImporteProvisionInput(BaseModel):
    modo: Literal["previsto", "calculado"] = "previsto"
    importe_previsto: Optional[Decimal] = Field(None, ge=0, max_digits=14, decimal_places=2)
    descripcion: Optional[str] = Field(None, max_length=1000)
    reglas: Optional[dict] = None
    activo: bool = True

    @root_validator
    def validar_modo(cls, values):
        if values.get("modo") == "previsto" and values.get("importe_previsto") is None:
            raise ValueError("Indica el importe previsto para este concepto.")
        if values.get("modo") == "calculado":
            values["importe_previsto"] = None
        return values


_CONCEPTOS_PROVISION_DEFAULT = [
    ("notaria", "Notaría", "previsto", "Importe previsto de los gastos notariales."),
    ("registro", "Registro de la Propiedad", "previsto", "Importe previsto de los gastos registrales."),
    ("gestion", "Honorarios de gestoría", "catalogo", "Importe procedente del catálogo central de Honorarios Gestoría; no se duplica aquí."),
    ("impuestos", "Impuestos", "calculado", "Importe calculado o previsto cuando corresponda. El cálculo fiscal debe definirse según la operación."),
]


def _concepto_importe_dict(item: ConceptoImporteProvision) -> dict:
    return {
        "id": item.id,
        "codigo": item.codigo,
        "nombre": item.nombre,
        "modo": item.modo,
        "importe_previsto": float(item.importe_previsto) if item.importe_previsto is not None else None,
        "descripcion": item.descripcion or "",
        "reglas": item.reglas or {},
        "activo": bool(item.activo),
        "solo_catalogo": item.codigo == "gestion",
    }


@router.get("/provisiones/conceptos-importes", summary="Consultar conceptos económicos de Provisiones")
def listar_conceptos_importes_provisiones(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    try:
        existentes = {x.codigo: x for x in db.query(ConceptoImporteProvision).all()}
        for codigo, nombre, modo, descripcion in _CONCEPTOS_PROVISION_DEFAULT:
            if codigo not in existentes:
                item = ConceptoImporteProvision(codigo=codigo, nombre=nombre, modo=modo, descripcion=descripcion, activo=True)
                db.add(item)
        db.commit()
        items = db.query(ConceptoImporteProvision).order_by(ConceptoImporteProvision.id).all()
        return {"items": [_concepto_importe_dict(x) for x in items]}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el catálogo de conceptos: {str(exc)[:250]}") from exc


@router.put("/provisiones/conceptos-importes/{codigo}", summary="Actualizar importe configurable de un concepto")
def actualizar_concepto_importe_provision(codigo: str, datos: ConceptoImporteProvisionInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "editar")
    require_perm_modulo(usuario, "seguridad", "editar")
    item = db.query(ConceptoImporteProvision).filter(ConceptoImporteProvision.codigo == codigo).first()
    if not item:
        raise HTTPException(status_code=404, detail="Concepto de provisiones no encontrado.")
    if codigo == "gestion":
        raise HTTPException(status_code=422, detail="Los honorarios de gestoría se gestionan exclusivamente desde el catálogo central de Honorarios Gestoría.")
    item.modo = datos.modo
    item.importe_previsto = datos.importe_previsto
    item.descripcion = (datos.descripcion or "").strip() or None
    if datos.reglas is not None:
        # Solo se admiten reglas declarativas configuradas; no se ejecutan fórmulas arbitrarias.
        item.reglas = datos.reglas
    item.activo = datos.activo
    try:
        db.commit()
        db.refresh(item)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar el concepto: {str(exc)[:250]}") from exc
    return _concepto_importe_dict(item)


@router.get("/provisiones/tarifas/catalogo-registros", summary="Catálogo de Registros de la Propiedad para Provisiones")
def catalogo_registros_provisiones(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    registros = db.query(RegistroPropiedad).filter(RegistroPropiedad.activo.is_(True)).order_by(RegistroPropiedad.provincia, RegistroPropiedad.poblacion, RegistroPropiedad.registro_propiedad).all()
    return [{"id": r.id, "registro_propiedad": r.registro_propiedad, "provincia": r.provincia, "poblacion": r.poblacion} for r in registros]


@router.post("/provisiones/tarifas/calcular", summary="Calcular una tarifa por entidad y rango de capital")
def calcular_tarifa_provision(datos: CalcularTarifaInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "crear")
    tarifa = _buscar_tarifa(db, datos.tipo, datos.entidad, datos.capital, datos.territorio)
    if not tarifa:
        raise HTTPException(status_code=404, detail="No hay una tarifa que coincida con la entidad, el territorio y el capital. Configura una tarifa o introduce los importes manualmente.")
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
        _reemplazar_operaciones(db, item, datos, usuario)
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




def _logo_pdf():
    """Localiza el logo real de Molsan en las rutas posibles del despliegue."""
    base = Path(__file__).resolve()
    candidatos = [
        # Copia explícita del logo dentro de la imagen Docker del backend.
        base.parent / "logo.jpg",
        base.parents[3] / "frontend-app" / "public" / "img" / "logo.jpg",
        base.parents[2] / "static" / "img" / "logo.jpg",
        base.parents[1] / "static" / "img" / "logo.jpg",
        base.parents[2] / "frontend-app" / "public" / "img" / "logo.jpg",
    ]
    for ruta in candidatos:
        try:
            if ruta.is_file() and ruta.stat().st_size > 0:
                imagen = PDFImage(str(ruta), width=34*mm, height=21*mm, kind="proportional")
                imagen.hAlign = "LEFT"
                return imagen
        except Exception:
            continue
    return None


def _tabla_cabecera_pdf(logo, nombre: str, linea: str, estilo_titulo, estilo_datos, ancho=176*mm):
    """Cabecera corporativa en dos columnas, con alineación y márgenes constantes."""
    bloque_datos = [Paragraph(escape(nombre), estilo_titulo)]
    if linea:
        bloque_datos.append(Paragraph(linea, estilo_datos))
    if logo:
        filas = [[logo, bloque_datos]]
        tabla = Table(filas, colWidths=[39*mm, ancho-39*mm], hAlign="LEFT")
    else:
        filas = [[bloque_datos]]
        tabla = Table(filas, colWidths=[ancho], hAlign="LEFT")
    tabla.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tabla

def _plantilla_pdf_provision(db: Session) -> dict:
    """Lee la plantilla editable guardada en el concepto notaria del catálogo."""
    defaults = {
        "nombre_empresa": "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L.",
        "cif": "", "direccion": "", "contacto": "", "logo_data_url": "",
        "aviso_legal": "En el supuesto de que todos los gastos, hasta su inscripción registral, fueran superiores a los informados, según norma 3.7.20 Cancelaciones solicitaremos un complemento de saldo. Rogamos tengan en cuenta esta información.",
        "texto_estimacion": "La presente provisión es estimativa y podrá ajustarse a los gastos efectivamente devengados.",
        "pie_corporativo": "Documento emitido por ERP-Molsan.",
        "mostrar_aviso_legal": True, "mostrar_firma": True,
        "posiciones": {
            "logo": {"x": 2, "y": 12, "w": 23, "h": 74},
            "nombre_empresa": {"x": 28, "y": 10, "w": 70, "h": 28},
            "cif": {"x": 28, "y": 38, "w": 68, "h": 15},
            "direccion": {"x": 28, "y": 53, "w": 68, "h": 18},
            "contacto": {"x": 28, "y": 70, "w": 68, "h": 18},
        },
    }
    try:
        concepto = db.query(ConceptoImporteProvision).filter(ConceptoImporteProvision.codigo == "notaria").first()
        reglas = concepto.reglas if concepto and isinstance(concepto.reglas, dict) else {}
        guardada = reglas.get("plantilla_pdf", {}) if isinstance(reglas, dict) else {}
        if isinstance(guardada, dict):
            defaults.update({k: v for k, v in guardada.items() if k in defaults})
    except Exception:
        db.rollback()
    return defaults

class _CabeceraVisualProvision(Flowable):
    """Cabecera corporativa con posiciones editables en porcentajes del área A4."""
    def __init__(self, plantilla: dict, ancho=176*mm, alto=38*mm):
        super().__init__()
        self.plantilla = plantilla or {}
        self.width = ancho
        self.height = alto

    def _pos(self, clave, defecto):
        posiciones = self.plantilla.get("posiciones") if isinstance(self.plantilla.get("posiciones"), dict) else {}
        dato = posiciones.get(clave) if isinstance(posiciones.get(clave), dict) else {}
        return {k: float(dato.get(k, v)) for k, v in defecto.items()}

    def _logo(self):
        data_url = str(self.plantilla.get("logo_data_url") or "")
        if data_url.startswith("data:image/") and "," in data_url:
            try:
                return BytesIO(base64.b64decode(data_url.split(",", 1)[1], validate=True))
            except Exception:
                pass
        ruta = _logo_pdf_path()
        return str(ruta) if ruta else None

    def draw(self):
        c = self.canv
        defaults = {
            "logo": {"x": 2, "y": 12, "w": 23, "h": 74},
            "nombre_empresa": {"x": 28, "y": 10, "w": 70, "h": 28},
            "cif": {"x": 28, "y": 38, "w": 68, "h": 15},
            "direccion": {"x": 28, "y": 53, "w": 68, "h": 18},
            "contacto": {"x": 28, "y": 70, "w": 68, "h": 18},
        }
        for clave in ("logo", "nombre_empresa", "cif", "direccion", "contacto"):
            p = self._pos(clave, defaults[clave])
            x = self.width * max(0, min(100, p["x"])) / 100
            y_top = self.height * max(0, min(100, p["y"])) / 100
            w = self.width * max(1, min(100, p["w"])) / 100
            h = self.height * max(1, min(100, p["h"])) / 100
            y = self.height - y_top - h
            if clave == "logo":
                logo = self._logo()
                if logo:
                    try:
                        c.drawImage(ImageReader(logo) if hasattr(logo, "read") else logo, x, y, width=w, height=h, preserveAspectRatio=True, anchor="c", mask="auto")
                    except Exception:
                        pass
                continue
            valor = str(self.plantilla.get(clave) or ( "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L." if clave == "nombre_empresa" else "")).strip()
            if not valor:
                continue
            c.saveState()
            c.setFillColor(colors.HexColor("#15325b" if clave == "nombre_empresa" else "#58677c"))
            font_size = 10 if clave == "nombre_empresa" else 7
            c.setFont("Helvetica-Bold" if clave == "nombre_empresa" else "Helvetica", font_size)
            words = valor.split()
            lines, line = [], ""
            for word in words:
                candidate = (line + " " + word).strip()
                if line and c.stringWidth(candidate, "Helvetica-Bold" if clave == "nombre_empresa" else "Helvetica", font_size) > w:
                    lines.append(line)
                    line = word
                else:
                    line = candidate
            if line:
                lines.append(line)
            baseline = y + h - font_size
            leading = font_size + 1.5
            for text_line in lines[:3]:
                c.drawString(x, baseline, text_line)
                baseline -= leading
            c.restoreState()
        c.saveState()
        c.setStrokeColor(colors.HexColor("#d5deea"))
        c.setLineWidth(0.6)
        c.line(0, 0, self.width, 0)
        c.restoreState()


def _logo_pdf_path():
    """Devuelve la ruta del logo incluido en el proyecto, si está disponible."""
    base = Path(__file__).resolve()
    candidatos = [
        # Copia explícita del logo dentro de la imagen Docker del backend.
        base.parent / "logo.jpg",
        # Ruta habitual cuando se despliega desde la raíz del repositorio.
        base.parents[3] / "frontend-app" / "public" / "img" / "logo.jpg",
        # Rutas alternativas según el directorio raíz configurado en Render.
        Path.cwd() / "frontend-app" / "public" / "img" / "logo.jpg",
        Path.cwd() / "public" / "img" / "logo.jpg",
        base.parents[3] / "public" / "img" / "logo.jpg",
        base.parents[2] / "static" / "img" / "logo.jpg",
        base.parents[1] / "static" / "img" / "logo.jpg",
        base.parents[2] / "frontend-app" / "public" / "img" / "logo.jpg",
    ]
    for ruta in candidatos:
        try:
            if ruta.is_file() and ruta.stat().st_size > 0:
                return ruta
        except OSError:
            continue
    return None


def _cabecera_visual_pdf(plantilla: dict):
    return _CabeceraVisualProvision(plantilla)


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
    plantilla = _plantilla_pdf_provision(db)
    nombre_empresa = str(plantilla.get("nombre_empresa") or "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L.")
    datos_corporativos = [plantilla.get("cif"), plantilla.get("direccion"), plantilla.get("contacto")]
    linea_corporativa = " · ".join(escape(str(x)) for x in datos_corporativos if x)
    cabecera_pdf = _cabecera_visual_pdf(plantilla)
    story = [
        cabecera_pdf,
        Spacer(1, 3*mm),
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
    if plantilla.get("mostrar_aviso_legal", True) and plantilla.get("aviso_legal"):
        story.append(Paragraph(escape(str(plantilla["aviso_legal"])), styles["SubtituloMolsan"]))
    if plantilla.get("texto_estimacion"):
        story.append(Paragraph(escape(str(plantilla["texto_estimacion"])), styles["SubtituloMolsan"]))

    def pie(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d7dfeb"))
        canvas.line(17*mm, 13*mm, A4[0]-17*mm, 13*mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#58677c"))
        texto_pie = str(plantilla.get("pie_corporativo") or "ERP-Molsan")
        canvas.drawString(17*mm, 8.5*mm, f"{texto_pie} · Expediente {expediente.id_expediente}"[:110])
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




class ProvisionIndependienteInput(BaseModel):
    fecha: date
    cliente: dict = Field(default_factory=dict)
    oficina: dict = Field(default_factory=dict)
    garantias: List[dict] = Field(default_factory=list)
    observaciones: Optional[str] = None

    @validator("garantias")
    def validar_garantias(cls, valor):
        if not valor:
            raise ValueError("Añade al menos una garantía u operación.")
        return valor


def _independiente_dict(item: ProvisionIndependiente) -> dict:
    return {
        "id": item.id, "numero": item.numero,
        "fecha": item.fecha.isoformat() if item.fecha else None,
        "cliente": {
            "nombre": item.cliente_nombre, "nif": item.cliente_nif,
            "direccion": item.cliente_direccion, "cp": item.cliente_cp,
            "poblacion": item.cliente_poblacion, "provincia": item.cliente_provincia,
            "telefono": item.cliente_telefono, "email": item.cliente_email,
        },
        "oficina": {
            **((item.datos or {}).get("oficina", {}) if isinstance((item.datos or {}).get("oficina", {}), dict) else {}),
            "numero": item.oficina_numero or ((item.datos or {}).get("oficina", {}) or {}).get("numero"),
            "contacto": item.oficina_contacto or ((item.datos or {}).get("oficina", {}) or {}).get("contacto"),
            "email": item.oficina_email or ((item.datos or {}).get("oficina", {}) or {}).get("email"),
        },
        "garantias": (item.datos or {}).get("garantias", []),
        "observaciones": (item.datos or {}).get("observaciones", ""),
        "importe_total": float(item.importe_total or 0),
        "estado": item.estado,
        "creado_en": item.creado_en.isoformat() if item.creado_en else None,
        "actualizado_en": item.actualizado_en.isoformat() if item.actualizado_en else None,
    }


def _guardar_independiente(item: ProvisionIndependiente, datos: ProvisionIndependienteInput, usuario) -> None:
    cliente = datos.cliente or {}
    oficina = datos.oficina or {}
    garantias = datos.garantias or []
    total = Decimal("0.00")
    for g in garantias:
        # El total nunca se toma del cliente ni de campos heredados: se deriva exclusivamente
        # de los cuatro conceptos vigentes de la provisión.
        subtotal = sum(
            (_dinero(g.get(k, 0)) for k in ("notaria", "ajd", "registro", "gestion")),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))
        g["total"] = float(subtotal)
        total += subtotal
    item.fecha = datos.fecha
    item.cliente_nombre = str(cliente.get("nombre") or "").strip()
    if not item.cliente_nombre:
        raise HTTPException(status_code=422, detail="El nombre del cliente es obligatorio.")
    item.cliente_nif = cliente.get("nif") or None
    item.cliente_direccion = cliente.get("direccion") or None
    item.cliente_cp = cliente.get("cp") or None
    item.cliente_poblacion = cliente.get("poblacion") or None
    item.cliente_provincia = cliente.get("provincia") or None
    item.cliente_telefono = cliente.get("telefono") or None
    item.cliente_email = cliente.get("email") or None
    item.oficina_numero = oficina.get("numero") or None
    item.oficina_contacto = oficina.get("contacto") or None
    item.oficina_email = oficina.get("email") or None
    item.datos = {
        "oficina": {
            "numero": str(oficina.get("numero") or "").strip(),
            "nombre": str(oficina.get("nombre") or "").strip(),
            "direccion": str(oficina.get("direccion") or "").strip(),
            "poblacion": str(oficina.get("poblacion") or "").strip(),
            "cp": str(oficina.get("cp") or "").strip(),
            "provincia": str(oficina.get("provincia") or "").strip(),
            "dan": str(oficina.get("dan") or "").strip(),
            "dt": str(oficina.get("dt") or "").strip(),
            "contacto": str(oficina.get("contacto") or "").strip(),
            "email": str(oficina.get("email") or "").strip(),
        },
        "garantias": garantias,
        "observaciones": (datos.observaciones or "").strip(),
    }
    item.importe_total = total.quantize(Decimal("0.01"))
    item.creado_por_id = item.creado_por_id or getattr(usuario, "id", None)


@router.get("/provisiones-independientes", summary="Histórico de provisiones independientes")
def listar_provisiones_independientes(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    items = db.query(ProvisionIndependiente).order_by(ProvisionIndependiente.fecha.desc(), ProvisionIndependiente.id.desc()).all()
    return {"items": [_independiente_dict(x) for x in items], "total": len(items)}


@router.get("/provisiones-independientes/{provision_id}", summary="Recuperar provisión independiente")
def obtener_provision_independiente(provision_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    item = db.query(ProvisionIndependiente).filter(ProvisionIndependiente.id == provision_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Provisión no encontrada.")
    return _independiente_dict(item)


@router.post("/provisiones-independientes", status_code=status.HTTP_201_CREATED, summary="Guardar provisión independiente")
def crear_provision_independiente(datos: ProvisionIndependienteInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "crear")
    item = ProvisionIndependiente(numero=f"PF-TEMP-{uuid4().hex}", fecha=datos.fecha, cliente_nombre="")
    db.add(item)
    try:
        db.flush()
        item.numero = f"PF-{datos.fecha.year}-{item.id:06d}"
        _guardar_independiente(item, datos, usuario)
        db.commit()
        db.refresh(item)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar la provisión: {str(exc)[:250]}") from exc
    return _independiente_dict(item)


@router.put("/provisiones-independientes/{provision_id}", summary="Actualizar provisión independiente")
def actualizar_provision_independiente(provision_id: int, datos: ProvisionIndependienteInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "editar")
    item = db.query(ProvisionIndependiente).filter(ProvisionIndependiente.id == provision_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Provisión no encontrada.")
    if item.estado == "anulada":
        raise HTTPException(status_code=409, detail="No se puede editar una provisión anulada.")
    try:
        _guardar_independiente(item, datos, usuario)
        db.commit()
        db.refresh(item)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar la provisión: {str(exc)[:250]}") from exc
    return _independiente_dict(item)


@router.get("/provisiones-independientes/{provision_id}/documento", summary="Generar PDF de provisión independiente")
def documento_provision_independiente(provision_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "expedientes", "ver")
    item = db.query(ProvisionIndependiente).filter(ProvisionIndependiente.id == provision_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Provisión no encontrada.")
    data = _independiente_dict(item)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=17*mm, leftMargin=17*mm, topMargin=15*mm, bottomMargin=17*mm, title=f"Provisión {item.numero}", author="ERP-Molsan")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TituloInd", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=colors.HexColor("#15325b"), spaceAfter=2*mm))
    styles.add(ParagraphStyle(name="TextoInd", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11))
    styles.add(ParagraphStyle(name="EtiquetaInd", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=9.5, textColor=colors.HexColor("#58677c")))
    styles.add(ParagraphStyle(name="CeldaInd", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="CeldaIndBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10))
    styles.add(ParagraphStyle(name="TotalInd", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=12, leading=15, alignment=TA_RIGHT, textColor=colors.HexColor("#15325b")))
    plantilla = _plantilla_pdf_provision(db)
    datos_corporativos = [plantilla.get("cif"), plantilla.get("direccion"), plantilla.get("contacto")]
    linea_corporativa = " · ".join(escape(str(x)) for x in datos_corporativos if x)
    nombre_empresa = str(plantilla.get("nombre_empresa") or "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L.")
    cabecera_pdf = _cabecera_visual_pdf(plantilla)
    story = [
        cabecera_pdf,
        Spacer(1, 3*mm),
        Paragraph("PROVISIÓN ESTIMATIVA DE FONDOS", styles["Heading2"]),
        Paragraph(f"Número: <b>{escape(str(item.numero))}</b> &nbsp;&nbsp;&nbsp; Fecha de petición: <b>{item.fecha.strftime('%d/%m/%Y') if item.fecha else '—'}</b>", styles["TextoInd"]),
        Spacer(1, 4*mm),
        Paragraph("DATOS DEL CLIENTE", styles["Heading3"]),
    ]
    cli = data["cliente"]
    cliente_rows = [
        [_p("Cliente", styles["EtiquetaInd"]), _p(cli.get("nombre"), styles["CeldaIndBold"]), _p("NIF / CIF", styles["EtiquetaInd"]), _p(cli.get("nif"), styles["CeldaInd"])],
        [_p("Dirección", styles["EtiquetaInd"]), _p(cli.get("direccion"), styles["CeldaInd"]), _p("Código postal", styles["EtiquetaInd"]), _p(cli.get("cp"), styles["CeldaInd"])],
        [_p("Población", styles["EtiquetaInd"]), _p(cli.get("poblacion"), styles["CeldaInd"]), _p("Provincia", styles["EtiquetaInd"]), _p(cli.get("provincia"), styles["CeldaInd"])],
        [_p("Teléfono", styles["EtiquetaInd"]), _p(cli.get("telefono"), styles["CeldaInd"]), _p("Email", styles["EtiquetaInd"]), _p(cli.get("email"), styles["CeldaInd"])],
    ]
    tabla_cliente = Table(cliente_rows, colWidths=[24*mm, 64*mm, 25*mm, 63*mm], hAlign="LEFT")
    tabla_cliente.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#d5deea")),
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f3f6fa")),
        ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#f3f6fa")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story.extend([tabla_cliente, Spacer(1, 4*mm), Paragraph("DATOS DE LA OFICINA DE ORIGEN", styles["Heading3"])])
    off = data["oficina"]
    oficina_rows = [
        [_p("Número de oficina", styles["EtiquetaInd"]), _p(off.get("numero"), styles["CeldaIndBold"]), _p("Nombre", styles["EtiquetaInd"]), _p(off.get("nombre"), styles["CeldaInd"])],
        [_p("Dirección", styles["EtiquetaInd"]), _p(off.get("direccion"), styles["CeldaInd"]), _p("Población", styles["EtiquetaInd"]), _p(off.get("poblacion"), styles["CeldaInd"])],
        [_p("Código postal", styles["EtiquetaInd"]), _p(off.get("cp"), styles["CeldaInd"]), _p("Provincia", styles["EtiquetaInd"]), _p(off.get("provincia"), styles["CeldaInd"])],
        [_p("DAN", styles["EtiquetaInd"]), _p(off.get("dan"), styles["CeldaInd"]), _p("DT", styles["EtiquetaInd"]), _p(off.get("dt"), styles["CeldaInd"])],
        [_p("Contacto", styles["EtiquetaInd"]), _p(off.get("contacto"), styles["CeldaInd"]), _p("Email", styles["EtiquetaInd"]), _p(off.get("email"), styles["CeldaInd"])],
    ]
    tabla_oficina = Table(oficina_rows, colWidths=[24*mm, 64*mm, 25*mm, 63*mm], hAlign="LEFT")
    tabla_oficina.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#d5deea")),
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f3f6fa")),
        ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#f3f6fa")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story.extend([tabla_oficina, Spacer(1, 5*mm), Paragraph("DESGLOSE DE LA PROVISIÓN", styles["Heading3"])])
    rows = [[_p("ENTIDAD / CARGA", styles["CeldaIndBold"]), _p("CUANTÍA", styles["CeldaIndBold"]), _p("NOTARÍA", styles["CeldaIndBold"]), _p("IMPUESTOS", styles["CeldaIndBold"]), _p("REGISTRO", styles["CeldaIndBold"]), _p("GESTIÓN", styles["CeldaIndBold"]), _p("TOTAL", styles["CeldaIndBold"])]]
    for g in data["garantias"]:
        entidad_carga = f"{escape(str(g.get('entidad') or '—'))}<br/><font size='6'>Carga: {escape(str(g.get('tipo_carga') or '—'))}</font>"
        rows.append([
            Paragraph(entidad_carga, styles["CeldaInd"]),
            _p(_euros(g.get("capital", 0)), styles["CeldaInd"]),
            _p(_euros(g.get("notaria", 0)), styles["CeldaInd"]),
            _p(_euros(g.get("ajd", 0)), styles["CeldaInd"]),
            _p(_euros(g.get("registro", 0)), styles["CeldaInd"]),
            _p(_euros(g.get("gestion", 0)), styles["CeldaInd"]),
            _p(_euros(g.get("total", 0)), styles["CeldaIndBold"]),
        ])
    # La tabla ocupa exactamente el ancho útil A4 (176 mm). Se da más espacio
    # a IMPUESTOS para que el encabezado no parta la última letra y se elevan
    # los paddings para que las filas respiren mejor.
    tabla = Table(rows, colWidths=[38*mm, 22*mm, 21*mm, 24*mm, 21*mm, 22*mm, 28*mm], repeatRows=1, hAlign="LEFT")
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eaf0f8")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cdd6e2")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (1,1), (-1,-1), "RIGHT"),
        ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 9), ("BOTTOMPADDING", (0,0), (-1,-1), 9),
    ]))
    story.extend([tabla, Spacer(1, 5*mm), Paragraph(f"IMPORTE TOTAL ESTIMADO: {_euros(item.importe_total)}", styles["TotalInd"])])
    if data.get("observaciones"):
        story.extend([Spacer(1, 3*mm), Paragraph("<b>Observaciones:</b> " + escape(data["observaciones"]).replace("\\n", "<br/>"), styles["TextoInd"])])
    story.append(Spacer(1, 5*mm))
    if plantilla.get("mostrar_aviso_legal", True) and plantilla.get("aviso_legal"):
        story.append(Paragraph(escape(str(plantilla["aviso_legal"])), styles["TextoInd"]))
    if plantilla.get("texto_estimacion"):
        story.append(Paragraph(escape(str(plantilla["texto_estimacion"])), styles["TextoInd"]))
    if plantilla.get("mostrar_firma", True):
        story.extend([Spacer(1, 12*mm), Paragraph("Firma del cliente: __________________________________________", styles["TextoInd"])])
    def pie(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d7dfeb"))
        canvas.line(17*mm, 13*mm, A4[0]-17*mm, 13*mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#58677c"))
        texto_pie = str(plantilla.get("pie_corporativo") or "ERP-Molsan")
        canvas.drawString(17*mm, 8.5*mm, f"{texto_pie} · {item.numero}"[:110])
        canvas.drawRightString(A4[0]-17*mm, 8.5*mm, f"Página {documento.page}")
        canvas.restoreState()
    try:
        doc.build(story, onFirstPage=pie, onLaterPages=pie)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {str(exc)[:250]}") from exc
    buffer.seek(0)
    filename = "".join(c for c in str(item.numero) if c.isalnum() or c in "-_") or f"provision-{item.id}"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"', "Cache-Control": "no-store"})




class EnviarEmailProvisionInput(BaseModel):
    destinatario: str = Field(..., min_length=3, max_length=320)
    asunto: str = Field(..., min_length=3, max_length=500)
    cuerpo: str = Field(..., min_length=1, max_length=20000)


def _preparar_email_provision(db: Session, item: ProvisionIndependiente, usuario) -> dict:
    """Resuelve la plantilla operativa, las variables y la firma corporativa."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS correspondencia_plantillas (
            id SERIAL PRIMARY KEY, nombre VARCHAR(180) NOT NULL,
            categoria VARCHAR(120) NOT NULL DEFAULT 'General',
            asunto VARCHAR(500) NOT NULL DEFAULT '', destinatario VARCHAR(500) NOT NULL DEFAULT '',
            cc VARCHAR(500) NOT NULL DEFAULT '', cuerpo TEXT NOT NULL DEFAULT '',
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("""
        INSERT INTO correspondencia_plantillas (nombre, categoria, asunto, destinatario, cuerpo, activo)
        SELECT :nombre, :categoria, :asunto, :destinatario, :cuerpo, TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM correspondencia_plantillas WHERE lower(nombre) = lower(:nombre)
        )
    """), {
        "nombre": "Envío de provisión de fondos",
        "categoria": "Provisión de fondos",
        "asunto": "Provisión de fondos estimativa – Cliente {{cliente.nombre}}, Oficina {{oficina.numero}}, Número de provisión {{provision.id}}",
        "destinatario": "{{oficina.email}}",
        "cuerpo": "Buenos días:\n\nAdjuntamos la provisión de fondos estimativa correspondiente a la operación, para su conocimiento y revisión.\n\nEl documento adjunto recoge el importe estimado de la provisión necesaria para la tramitación.\n\nQuedamos a su disposición para cualquier aclaración.\n\nMuchas gracias.\n\nUn saludo,",
    })

    db.execute(text("""
        UPDATE correspondencia_plantillas
        SET asunto = :asunto, actualizado_en = CURRENT_TIMESTAMP
        WHERE lower(nombre) = lower(:nombre)
          AND asunto = :asunto_anterior
    """), {
        "nombre": "Envío de provisión de fondos",
        "asunto": "Provisión de fondos estimativa – Cliente {{cliente.nombre}}, Oficina {{oficina.numero}}, Número de provisión {{provision.id}}",
        "asunto_anterior": "Provisión de fondos estimativa – {{cliente.nombre}}, {{oficina.numero}}, {{provision.id}}",
    })

    plantilla = db.execute(text("""
        SELECT id, nombre, asunto, cuerpo, activo
        FROM correspondencia_plantillas
        WHERE lower(nombre) = lower(:nombre) AND activo = TRUE
        ORDER BY id ASC LIMIT 1
    """), {"nombre": "Envío de provisión de fondos"}).mappings().first()
    if not plantilla:
        raise HTTPException(status_code=500, detail="No se ha podido preparar la plantilla de envío de provisión.")

    datos = _independiente_dict(item)
    contexto = {
        "cliente.nombre": (datos.get("cliente") or {}).get("nombre") or "",
        "cliente.nif": (datos.get("cliente") or {}).get("nif") or "",
        "oficina.numero": (datos.get("oficina") or {}).get("numero") or "",
        "oficina.email": (datos.get("oficina") or {}).get("email") or "",
        "provision.id": str(item.id),
        "provision.numero": str(item.numero or ""),
        "provision.importe_total": _euros(item.importe_total),
    }
    import re
    def interpolar(valor):
        return re.sub(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}", lambda m: str(contexto.get(m.group(1), "")), str(valor or ""))
    asunto = interpolar(plantilla["asunto"])
    cuerpo = interpolar(plantilla["cuerpo"])

    db.execute(text("""
        CREATE TABLE IF NOT EXISTS correspondencia_configuracion (
            id INTEGER PRIMARY KEY, firma_pie TEXT NOT NULL DEFAULT '',
            factura_nombre VARCHAR(255), factura_tipo VARCHAR(160), factura_contenido BYTEA,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT correspondencia_configuracion_unica CHECK (id = 1)
        )
    """))
    db.execute(text("INSERT INTO correspondencia_configuracion (id, firma_pie) VALUES (1, '') ON CONFLICT (id) DO NOTHING"))
    fila_firma = db.execute(text("SELECT firma_pie FROM correspondencia_configuracion WHERE id = 1")).mappings().first()
    nombre = " ".join(filter(None, [
        str(getattr(usuario, "nombre", "") or "").strip(),
        str(getattr(usuario, "apellidos", "") or "").strip(),
    ]))
    departamento = db.execute(text("SELECT nombre FROM departamentos WHERE id = :id"), {"id": usuario.departamento_id}).scalar() if getattr(usuario, "departamento_id", None) else ""
    cargo = db.execute(text("SELECT nombre FROM cargos WHERE id = :id"), {"id": usuario.cargo_id}).scalar() if getattr(usuario, "cargo_id", None) else ""
    firma_personal = "\n".join(x for x in [nombre, " · ".join(x for x in [departamento or "", cargo or ""] if x)] if x)
    firma_pie = (fila_firma["firma_pie"] or "").strip() if fila_firma else ""
    cuerpo = "\n\n".join(x for x in [cuerpo.strip(), firma_personal, firma_pie] if x)
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS provisiones_email_envios (
            id SERIAL PRIMARY KEY, provision_id INTEGER NOT NULL,
            destinatario VARCHAR(320) NOT NULL, asunto VARCHAR(500) NOT NULL,
            estado VARCHAR(30) NOT NULL, detalle TEXT,
            enviado_por VARCHAR(300), creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    historial = db.execute(text("""
        SELECT destinatario, asunto, estado, detalle, creado_en
        FROM provisiones_email_envios WHERE provision_id = :id
        ORDER BY creado_en DESC, id DESC LIMIT 5
    """), {"id": item.id}).mappings().all()
    db.commit()
    return {
        "plantilla_id": plantilla["id"],
        "destinatario": contexto["oficina.email"],
        "asunto": asunto,
        "cuerpo": cuerpo,
        "nombre_cliente": contexto["cliente.nombre"],
        "numero_oficina": contexto["oficina.numero"],
        "provision_id": item.id,
        "pdf_filename": f"provision_{item.numero or item.id}.pdf",
        "smtp_configurado": bool(os.getenv("SMTP_HOST", "").strip()),
        "historial": [{
            "destinatario": fila["destinatario"], "asunto": fila["asunto"],
            "estado": fila["estado"], "detalle": fila["detalle"],
            "creado_en": fila["creado_en"].isoformat() if fila["creado_en"] else None,
        } for fila in historial],
    }


@router.get("/provisiones-independientes/{provision_id}/email-preview", summary="Preparar vista previa del email de provisión")
def vista_previa_email_provision(
    provision_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "expedientes", "ver")
    item = db.query(ProvisionIndependiente).filter(ProvisionIndependiente.id == provision_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Provisión no encontrada.")
    if not (item.oficina_email or ((item.datos or {}).get("oficina", {}) or {}).get("email") or ""):
        raise HTTPException(status_code=400, detail="Completa el campo Email del bloque 2. Datos de la oficina de origen antes de enviar.")
    return _preparar_email_provision(db, item, usuario)


@router.post("/provisiones-independientes/{provision_id}/email", summary="Enviar la provisión de fondos por email")
async def enviar_email_provision(
    provision_id: int,
    datos_email: EnviarEmailProvisionInput,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "expedientes", "editar")
    item = db.query(ProvisionIndependiente).filter(ProvisionIndependiente.id == provision_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Provisión no encontrada.")
    preparado = _preparar_email_provision(db, item, usuario)
    destinatario = (datos_email.destinatario or "").strip()
    if not destinatario or "@" not in destinatario or "." not in destinatario.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="El email de destino no es válido.")
    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    if not host:
        raise HTTPException(status_code=503, detail="No se puede enviar el correo: falta SMTP_HOST en las variables de entorno del backend.")

    response_pdf = documento_provision_independiente(provision_id, db, usuario)
    chunks = []
    async for chunk in response_pdf.body_iterator:
        chunks.append(chunk)
    pdf_bytes = b"".join(chunks)
    mensaje = EmailMessage()
    mensaje["Subject"] = datos_email.asunto.strip()
    mensaje["From"] = "cancelaciones@molsan.es"
    mensaje["To"] = destinatario
    mensaje.set_content(datos_email.cuerpo)
    filename = preparado["pdf_filename"].replace("/", "_").replace("\\", "_")
    mensaje.add_attachment(pdf_bytes, maintype="application", subtype="pdf", filename=filename)

    db.execute(text("""
        CREATE TABLE IF NOT EXISTS provisiones_email_envios (
            id SERIAL PRIMARY KEY, provision_id INTEGER NOT NULL,
            destinatario VARCHAR(320) NOT NULL, asunto VARCHAR(500) NOT NULL,
            estado VARCHAR(30) NOT NULL, detalle TEXT,
            enviado_por VARCHAR(300), creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    registro = {"provision_id": item.id, "destinatario": destinatario, "asunto": datos_email.asunto.strip(),
                "estado": "error", "detalle": "", "enviado_por": " ".join(filter(None, [
                    str(getattr(usuario, "nombre", "") or "").strip(),
                    str(getattr(usuario, "apellidos", "") or "").strip()
                ]))}
    try:
        with smtplib.SMTP(host, port, timeout=25) as servidor:
            servidor.ehlo()
            if os.getenv("SMTP_STARTTLS", "true").strip().lower() in {"1", "true", "yes", "si"}:
                servidor.starttls()
                servidor.ehlo()
            if smtp_user:
                servidor.login(smtp_user, smtp_password)
            servidor.send_message(mensaje)
        registro["estado"] = "enviado"
        registro["detalle"] = "Email aceptado por el servidor SMTP."
    except Exception as exc:
        registro["detalle"] = f"Error SMTP: {str(exc)[:1200]}"
        db.execute(text("""
            INSERT INTO provisiones_email_envios
                (provision_id, destinatario, asunto, estado, detalle, enviado_por)
            VALUES (:provision_id, :destinatario, :asunto, :estado, :detalle, :enviado_por)
        """), registro)
        db.commit()
        raise HTTPException(status_code=502, detail="No se pudo enviar el correo. El error ha quedado registrado en el histórico.")
    db.execute(text("""
        INSERT INTO provisiones_email_envios
            (provision_id, destinatario, asunto, estado, detalle, enviado_por)
        VALUES (:provision_id, :destinatario, :asunto, :estado, :detalle, :enviado_por)
    """), registro)
    db.commit()
    return {"ok": True, "estado": "enviado", "mensaje": "Provisión enviada por email correctamente."}


@router.on_event("startup")
def inicializar_tablas_provisiones() -> None:
    """Crea solo tablas nuevas del módulo; no altera ni borra tablas existentes."""
    TarifaProvision.__table__.create(bind=engine, checkfirst=True)
    # Compatibilidad con bases de datos ya existentes: añade la columna sin borrar datos.
    from sqlalchemy import inspect, text
    columnas_tarifas = {col["name"] for col in inspect(engine).get_columns("tarifas_provisiones")}
    if "territorio" not in columnas_tarifas:
        with engine.begin() as conexion:
            conexion.execute(text("ALTER TABLE tarifas_provisiones ADD COLUMN territorio VARCHAR(20) NOT NULL DEFAULT 'Península'"))
    ProvisionFondo.__table__.create(bind=engine, checkfirst=True)
    ProvisionOperacion.__table__.create(bind=engine, checkfirst=True)
    ProvisionOperacionFinca.__table__.create(bind=engine, checkfirst=True)
    ProvisionIndependiente.__table__.create(bind=engine, checkfirst=True)

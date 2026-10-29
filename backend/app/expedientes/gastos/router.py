from datetime import date
import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from backend.app.database import get_db, engine
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.gastos.models import ExpedienteGasto
from backend.app.expedientes.models import Expediente
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital

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


def _validar_pago_historico_conciliado(estado_pago: str | None, tiene_movimientos: bool) -> None:
    """Evita alterar el saldo de gastos antiguos pagados sin movimientos conciliados."""
    estados_pagados = {"pagado", "pagada", "abonado", "abonada", "efectuado", "efectuada"}
    if str(estado_pago or "").strip().casefold() in estados_pagados and not tiene_movimientos:
        raise HTTPException(
            status_code=409,
            detail="Este gasto consta como pagado en el histórico, pero no tiene movimientos de pago conciliados. Revísalo antes de registrar un nuevo pago.",
        )


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
    numero_factura_absis: Optional[str] = Field(None, max_length=150)
    fecha_factura_absis: Optional[date] = None
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
    id_gasto_absis: Optional[str] = Field(None, max_length=100)
    id_expediente_absis: Optional[str] = Field(None, max_length=100)
    tipo_operacion_absis: Optional[str] = Field(None, max_length=300)
    concepto_gasto_absis: Optional[str] = Field(None, max_length=300)
    tipo_concepto_absis: Optional[str] = Field(None, max_length=100)
    origen_registro: Optional[str] = Field("ERP", max_length=30)
    estado_consolidacion: Optional[str] = Field("Pendiente envío", max_length=50)
    fecha_ultima_sincronizacion: Optional[date] = None

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


class VincularDocumentoCreate(BaseModel):
    documento_carpeta_id: int
    categoria: str = Field(..., min_length=1, max_length=200)
    nombre_documento: str = Field(..., min_length=1, max_length=500)
    fecha: Optional[date] = None


class PagoCreate(BaseModel):
    fecha: date
    importe: Decimal
    concepto: str = Field(..., min_length=1, max_length=300)
    medio_pago: Optional[str] = Field(None, max_length=100)
    idempotency_key: str = Field(..., min_length=8, max_length=100)

    @validator("importe", pre=True)
    def validar_importe_pago(cls, valor):
        importe = _decimal_opcional(valor)
        if importe is None or importe <= 0:
            raise ValueError("El importe del pago debe ser mayor que cero.")
        return importe


def _garantizar_tabla_pagos_en_inicio():
    """Prepara el esquema de movimientos al arrancar, no durante peticiones."""
    # Los tests aislados pueden usar SQLite; el esquema productivo es PostgreSQL.
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as conexion:
        conexion.execute(text("""
            CREATE TABLE IF NOT EXISTS public.expediente_gasto_pagos (
                id BIGSERIAL PRIMARY KEY,
                gasto_id INTEGER NOT NULL REFERENCES public.expediente_gastos(id) ON DELETE RESTRICT,
                fecha DATE NOT NULL,
                importe NUMERIC(12, 2) NOT NULL CHECK (importe > 0),
                concepto VARCHAR(300) NOT NULL,
                medio_pago VARCHAR(100),
                idempotency_key VARCHAR(100) NOT NULL UNIQUE,
                creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                anulado_en TIMESTAMP WITHOUT TIME ZONE NULL,
                anulado_por INTEGER NULL,
                motivo_anulacion TEXT NULL
            )
        """))
        conexion.execute(text("ALTER TABLE public.expediente_gasto_pagos ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMP WITHOUT TIME ZONE NULL"))
        conexion.execute(text("ALTER TABLE public.expediente_gasto_pagos ADD COLUMN IF NOT EXISTS anulado_por INTEGER NULL"))
        conexion.execute(text("ALTER TABLE public.expediente_gasto_pagos ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL"))
        # Las solicitudes ABSIS se registran localmente; la integración no transmite
        # nada hasta que Informática configure y valide el contrato externo.
        conexion.execute(text("""
            CREATE TABLE IF NOT EXISTS public.expediente_absis_solicitudes (
                id BIGSERIAL PRIMARY KEY,
                expediente_id VARCHAR(100) NOT NULL,
                actividad VARCHAR(100) NOT NULL,
                payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                solicitado_por INTEGER NULL,
                mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE,
                estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_CONFIGURACION',
                creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))


@router.on_event("startup")
def inicializar_tabla_pagos():
    _garantizar_tabla_pagos_en_inicio()

class AnularPagoCreate(BaseModel):
    motivo: str = Field(..., min_length=5, max_length=1000)


class GastoResponse(GastoBase):
    id: int
    expediente_id: int
    numero_documento: str
    estado_absis: Optional[str] = None
    estado_justificante: Optional[str] = None
    imp_gasto: Optional[Decimal] = None
    fecha_pago: Optional[date] = None


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
def listar_gastos(expediente_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    expediente = _obtener_expediente(db, expediente_id)
    return db.query(ExpedienteGasto).filter(ExpedienteGasto.expediente_id == expediente.id).order_by(ExpedienteGasto.fecha.desc(), ExpedienteGasto.id.desc()).all()


def _tipo_gasto_desde_categoria(categoria: str) -> str | None:
    """Normaliza las categorías económicas visibles y sus alias históricos."""
    categorias = {
        "factura notarial": "Factura notarial",
        "factura registral": "Factura registral",
        "factura registro": "Factura registral",
        "factura impuestos": "Factura impuestos",
        "ajd/itp": "AJD/ITP",
        "otros impuestos": "Otros impuestos",
    }
    return categorias.get(str(categoria or "").strip().casefold())


def _validar_documento_economico(expediente, documento, tipo: str) -> None:
    """Impide vincular a un gasto documentos de otro expediente o categoría."""
    if documento is None or str(documento.expediente_id) != str(expediente.id_expediente):
        # No revelar si existe un documento perteneciente a otro expediente.
        raise HTTPException(status_code=404, detail="No se encontró el documento económico del expediente.")
    categoria_documento = str(documento.categoria or "").strip().casefold()
    tipo_normalizado = str(tipo or "").strip().casefold()
    categorias_compatibles = {
        "factura registral": {"factura registral", "factura registro"},
    }.get(tipo_normalizado, {tipo_normalizado})
    if categoria_documento not in categorias_compatibles:
        raise HTTPException(
            status_code=422,
            detail="La categoría del documento no coincide con el concepto económico seleccionado.",
        )


@router.post("/{expediente_id}/gastos/vincular-documento", status_code=status.HTTP_201_CREATED)
def vincular_documento_a_gasto(
    expediente_id: int,
    payload: VincularDocumentoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Crea una obligación pendiente al adjuntar una factura en Gestión económica, sin marcarla pagada."""
    expediente = _obtener_expediente(db, expediente_id)
    tipo = _tipo_gasto_desde_categoria(payload.categoria)
    if not tipo:
        raise HTTPException(status_code=422, detail="Solo se pueden vincular facturas o justificantes económicos.")
    documento = db.query(DocumentoCarpetaDigital).filter(
        DocumentoCarpetaDigital.id == payload.documento_carpeta_id
    ).first()
    _validar_documento_economico(expediente, documento, tipo)
    existente = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.expediente_id == expediente.id,
        ExpedienteGasto.documento_carpeta_id == payload.documento_carpeta_id,
    ).first()
    if existente:
        return {"ok": True, "duplicado": True, "gasto": existente}
    # La misma factura puede volver a subirse y recibir un nuevo ID documental.
    # Evitamos crear otra obligación si coinciden expediente, concepto y nombre.
    existente_mismo_nombre = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.expediente_id == expediente.id,
        ExpedienteGasto.tipo == tipo,
        func.lower(func.trim(ExpedienteGasto.descripcion)) == payload.nombre_documento.strip().lower(),
    ).first()
    if existente_mismo_nombre:
        return {"ok": True, "duplicado": True, "gasto": existente_mismo_nombre}
    gasto = ExpedienteGasto(
        expediente_id=expediente.id,
        tipo=tipo,
        descripcion=payload.nombre_documento.strip(),
        fecha=payload.fecha or date.today(),
        documento_carpeta_id=payload.documento_carpeta_id,
        estado_pago="Pendiente",
        origen_registro="ERP",
    )
    db.add(gasto)
    try:
        db.commit()
        db.refresh(gasto)
    except Exception as exc:
        db.rollback()
        # A simultaneous retry may have inserted the same document; return it safely.
        existente = db.query(ExpedienteGasto).filter(
            ExpedienteGasto.expediente_id == expediente.id,
            ExpedienteGasto.documento_carpeta_id == payload.documento_carpeta_id,
        ).first()
        if existente:
            return {"ok": True, "duplicado": True, "gasto": existente}
        raise HTTPException(status_code=500, detail="No se pudo crear la obligación económica del documento.") from exc
    return {"ok": True, "duplicado": False, "gasto": gasto}


@router.get("/{expediente_id}/gastos/{gasto_id}/pagos")
def listar_pagos_gasto(expediente_id: int, gasto_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    expediente = _obtener_expediente(db, expediente_id)
    gasto = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.id == gasto_id,
        ExpedienteGasto.expediente_id == expediente.id,
    ).first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró la obligación económica.")
    try:
        filas = db.execute(text("""
            SELECT id, gasto_id, fecha, importe, concepto, medio_pago, idempotency_key, creado_en, anulado_en, anulado_por, motivo_anulacion
            FROM public.expediente_gasto_pagos
            WHERE gasto_id = :gasto_id
            ORDER BY fecha, id
        """), {"gasto_id": gasto.id}).mappings().all()
        total = db.execute(text("""
            SELECT COALESCE(SUM(importe), 0)
            FROM public.expediente_gasto_pagos WHERE gasto_id = :gasto_id AND anulado_en IS NULL
        """), {"gasto_id": gasto.id}).scalar()
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo consultar el histórico de pagos.") from exc
    obligacion = _decimal_opcional(gasto.importe_resultante if gasto.importe_resultante is not None else gasto.importe) or Decimal("0.00")
    total = _decimal_opcional(total) or Decimal("0.00")
    return {
        "items": [dict(fila) for fila in filas],
        "total_pagado": str(total),
        "importe_obligacion": str(obligacion),
        "saldo_pendiente": str(max(Decimal("0.00"), obligacion - total)),
        "estado_pago": gasto.estado_pago or "Pendiente",
    }


@router.post("/{expediente_id}/gastos/{gasto_id}/pagos", status_code=status.HTTP_201_CREATED)
def registrar_pago_gasto(
    expediente_id: int,
    gasto_id: int,
    payload: PagoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Registra un movimiento real de pago, idempotente y compatible con pagos parciales."""
    expediente = _obtener_expediente(db, expediente_id)
    # Serializa las operaciones de pago que comparten el saldo del expediente.
    expediente = db.query(Expediente).filter(Expediente.id == expediente.id).with_for_update().first()
    gasto = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.id == gasto_id,
        ExpedienteGasto.expediente_id == expediente.id,
    ).with_for_update().first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró la obligación económica.")
    obligacion = _decimal_opcional(gasto.importe_resultante if gasto.importe_resultante is not None else gasto.importe)
    if obligacion is None or obligacion <= 0:
        raise HTTPException(status_code=422, detail="Completa primero el importe de la factura antes de registrar pagos.")
    try:
        tiene_movimientos = db.execute(text("""
            SELECT EXISTS (
                SELECT 1 FROM public.expediente_gasto_pagos WHERE gasto_id = :gasto_id
            )
        """), {"gasto_id": gasto.id}).scalar()
        _validar_pago_historico_conciliado(gasto.estado_pago, bool(tiene_movimientos))
        existente = db.execute(text("""
            SELECT id, gasto_id, fecha, importe, concepto, medio_pago, idempotency_key, creado_en, anulado_en, anulado_por, motivo_anulacion
            FROM public.expediente_gasto_pagos WHERE idempotency_key = :key
        """), {"key": payload.idempotency_key}).mappings().first()
        if existente:
            if int(existente["gasto_id"]) != gasto.id:
                raise HTTPException(status_code=409, detail="La clave de operación ya se utilizó para otro gasto.")
            total = db.execute(text("""
                SELECT COALESCE(SUM(importe), 0) FROM public.expediente_gasto_pagos
                WHERE gasto_id = :gasto_id AND anulado_en IS NULL
            """), {"gasto_id": gasto.id}).scalar()
            db.commit()
            total = _decimal_opcional(total) or Decimal("0.00")
            return {
                "ok": True, "duplicado": True, "pago": dict(existente),
                "total_pagado": str(total),
                "saldo_pendiente": str(max(Decimal("0.00"), obligacion - total)),
                "estado_pago": gasto.estado_pago or "Pendiente",
            }
        total_previo = _decimal_opcional(db.execute(text("""
            SELECT COALESCE(SUM(importe), 0) FROM public.expediente_gasto_pagos
            WHERE gasto_id = :gasto_id AND anulado_en IS NULL
        """), {"gasto_id": gasto.id}).scalar()) or Decimal("0.00")
        if total_previo + payload.importe > obligacion:
            raise HTTPException(
                status_code=422,
                detail=f"El pago supera el saldo de la obligación ({max(Decimal('0.00'), obligacion - total_previo):.2f} €).",
            )
        pago = db.execute(text("""
            INSERT INTO public.expediente_gasto_pagos
                (gasto_id, fecha, importe, concepto, medio_pago, idempotency_key)
            VALUES (:gasto_id, :fecha, :importe, :concepto, :medio_pago, :key)
            RETURNING id, gasto_id, fecha, importe, concepto, medio_pago, idempotency_key, creado_en
        """), {
            "gasto_id": gasto.id, "fecha": payload.fecha, "importe": payload.importe,
            "concepto": payload.concepto.strip(), "medio_pago": payload.medio_pago,
            "key": payload.idempotency_key,
        }).mappings().first()
        total = total_previo + payload.importe
        if total >= obligacion:
            gasto.estado_pago = "Pagado"
            gasto.fecha_pago = payload.fecha
        else:
            gasto.estado_pago = "Parcial"
            gasto.fecha_pago = None

        # El importe inicial no se modifica. El saldo persistido se recalcula
        # únicamente con pagos reales y gastos históricos ya marcados como pagados
        # que aún no disponen de movimientos en la tabla nueva.
        if expediente.importe is not None:
            pagos_expediente = _decimal_opcional(db.execute(text("""
                SELECT COALESCE(SUM(p.importe), 0)
                FROM public.expediente_gasto_pagos p
                JOIN public.expediente_gastos g ON g.id = p.gasto_id
                WHERE g.expediente_id = :expediente_id AND p.anulado_en IS NULL
            """), {"expediente_id": expediente.id}).scalar()) or Decimal("0.00")
            historico_pagado = _decimal_opcional(db.execute(text("""
                SELECT COALESCE(SUM(COALESCE(g.importe_resultante, g.importe, g.importe_total_bruto, 0)), 0)
                FROM public.expediente_gastos g
                WHERE g.expediente_id = :expediente_id
                  AND lower(trim(coalesce(g.estado_pago, ''))) IN
                      ('pagado', 'pagada', 'abonado', 'abonada', 'efectuado', 'efectuada')
                  AND NOT EXISTS (
                      SELECT 1 FROM public.expediente_gasto_pagos p WHERE p.gasto_id = g.id
                  )
            """), {"expediente_id": expediente.id}).scalar()) or Decimal("0.00")
            expediente.saldo_disponible = _redondear(
                Decimal(str(expediente.importe)) - pagos_expediente - historico_pagado
            )
        db.commit()
        return {
            "ok": True, "duplicado": False, "pago": dict(pago),
            "total_pagado": str(total),
            "saldo_pendiente": str(max(Decimal("0.00"), obligacion - total)),
            "estado_pago": gasto.estado_pago,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo registrar el pago. No se han confirmado cambios.") from exc


@router.post("/{expediente_id}/gastos/{gasto_id}/pagos/{pago_id}/anular")
def anular_pago_gasto(
    expediente_id: int, gasto_id: int, pago_id: int, payload: AnularPagoCreate,
    db: Session = Depends(get_db), usuario=Depends(get_current_user),
):
    """Anula un movimiento sin borrarlo; operación reservada a administradores."""
    rol = " ".join(str(getattr(getattr(usuario, "rol", None), "nombre", "") or "").strip().lower().replace("_", " ").replace("-", " ").split())
    roles_administrador = {"admin", "administrador", "administradora", "superadmin", "super admin", "superadministrador", "super administradora", "administrador general"}
    if rol not in roles_administrador:
        raise HTTPException(status_code=403, detail="Solo un administrador puede anular un pago.")
    expediente = _obtener_expediente(db, expediente_id)
    # Mismo orden de bloqueo que al registrar pagos: expediente y después gasto.
    expediente = db.query(Expediente).filter(Expediente.id == expediente.id).with_for_update().first()
    gasto = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.id == gasto_id, ExpedienteGasto.expediente_id == expediente.id
    ).with_for_update().first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró la obligación económica.")
    try:
        pago = db.execute(text("""
            SELECT id, importe, anulado_en FROM public.expediente_gasto_pagos
            WHERE id = :pago_id AND gasto_id = :gasto_id FOR UPDATE
        """), {"pago_id": pago_id, "gasto_id": gasto.id}).mappings().first()
        if pago is None:
            raise HTTPException(status_code=404, detail="No se encontró el movimiento de pago.")
        if pago["anulado_en"] is not None:
            raise HTTPException(status_code=409, detail="Este pago ya estaba anulado; se conserva su registro histórico.")
        db.execute(text("""
            UPDATE public.expediente_gasto_pagos
            SET anulado_en = CURRENT_TIMESTAMP, anulado_por = :usuario_id, motivo_anulacion = :motivo
            WHERE id = :pago_id AND gasto_id = :gasto_id AND anulado_en IS NULL
        """), {"usuario_id": getattr(usuario, "id", None), "motivo": payload.motivo.strip(), "pago_id": pago_id, "gasto_id": gasto.id})
        total = _decimal_opcional(db.execute(text("""
            SELECT COALESCE(SUM(importe), 0) FROM public.expediente_gasto_pagos
            WHERE gasto_id = :gasto_id AND anulado_en IS NULL
        """), {"gasto_id": gasto.id}).scalar()) or Decimal("0.00")
        ultima_fecha_pago = db.execute(text("""
            SELECT MAX(fecha) FROM public.expediente_gasto_pagos
            WHERE gasto_id = :gasto_id AND anulado_en IS NULL
        """), {"gasto_id": gasto.id}).scalar()
        obligacion = _decimal_opcional(gasto.importe_resultante if gasto.importe_resultante is not None else gasto.importe) or Decimal("0.00")
        if total >= obligacion and obligacion > 0:
            gasto.estado_pago, gasto.fecha_pago = "Pagado", ultima_fecha_pago or date.today()
        elif total > 0:
            gasto.estado_pago, gasto.fecha_pago = "Parcial", None
        else:
            gasto.estado_pago, gasto.fecha_pago = "Pendiente", None
        if expediente.importe is not None:
            pagos_expediente = _decimal_opcional(db.execute(text("""
                SELECT COALESCE(SUM(p.importe), 0)
                FROM public.expediente_gasto_pagos p
                JOIN public.expediente_gastos g ON g.id = p.gasto_id
                WHERE g.expediente_id = :expediente_id AND p.anulado_en IS NULL
            """), {"expediente_id": expediente.id}).scalar()) or Decimal("0.00")
            historico_pagado = _decimal_opcional(db.execute(text("""
                SELECT COALESCE(SUM(COALESCE(g.importe_resultante, g.importe, g.importe_total_bruto, 0)), 0)
                FROM public.expediente_gastos g
                WHERE g.expediente_id = :expediente_id
                  AND lower(trim(coalesce(g.estado_pago, ''))) IN ('pagado', 'pagada', 'abonado', 'abonada', 'efectuado', 'efectuada')
                  AND NOT EXISTS (SELECT 1 FROM public.expediente_gasto_pagos p WHERE p.gasto_id = g.id)
            """), {"expediente_id": expediente.id}).scalar()) or Decimal("0.00")
            expediente.saldo_disponible = _redondear(Decimal(str(expediente.importe)) - pagos_expediente - historico_pagado)
        db.commit()
        return {"ok": True, "pago_id": pago_id, "estado_pago": gasto.estado_pago,
                "total_pagado": str(total), "saldo_pendiente": str(max(Decimal("0.00"), obligacion-total)),
                "anulado_por": getattr(usuario, "id", None)}
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo anular el pago; no se ha confirmado ningún cambio.") from exc


@router.post("/{expediente_id}/gastos/{gasto_id}/integracion-absis")
def preparar_integracion_gasto_absis(
    expediente_id: int,
    gasto_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Deja una solicitud trazable para la futura API saliente; no transmite a ABSIS."""
    expediente = _obtener_expediente(db, expediente_id)
    gasto = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.id == gasto_id,
        ExpedienteGasto.expediente_id == expediente.id,
    ).first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto del expediente.")
    if not gasto.tipo_concepto_absis:
        raise HTTPException(
            status_code=422,
            detail="Asigna TIPOCONCEPTO ABSIS al gasto antes de preparar la integración.",
        )

    payload = {
        "erp": {
            "id_gasto_erp": gasto.id,
            "id_expediente_erp": str(expediente.id_expediente),
        },
        "gasto": {
            "id_gasto_absis": gasto.id_gasto_absis,
            "id_expediente_absis": gasto.id_expediente_absis or str(expediente.id_expediente),
            "tipo_concepto": gasto.tipo_concepto_absis,
            "concepto": gasto.tipo,
            "descripcion": gasto.descripcion,
            "importe": str(gasto.importe_total_bruto if gasto.importe_total_bruto is not None else gasto.importe) if (gasto.importe_total_bruto is not None or gasto.importe is not None) else None,
            "fecha_factura": gasto.fecha_factura.isoformat() if gasto.fecha_factura else None,
            "numero_factura": gasto.numero_factura,
        },
    }
    payload_json = json.dumps(payload, ensure_ascii=False, default=str)
    try:
        existente = db.execute(text("""
            SELECT id FROM expediente_absis_solicitudes
            WHERE actividad = 'gastos-postfirma'
              AND estado = 'PENDIENTE_CONFIGURACION'
              AND payload->'erp'->>'id_gasto_erp' = :gasto_id
            ORDER BY id DESC LIMIT 1
        """), {"gasto_id": str(gasto.id)}).scalar()
        if existente is None:
            solicitud_id = db.execute(text("""
                INSERT INTO expediente_absis_solicitudes
                    (expediente_id, actividad, payload, solicitado_por,
                     mover_siguiente_actividad, estado, creado_en)
                VALUES
                    (:expediente_id, 'gastos-postfirma', CAST(:payload AS JSONB),
                     :solicitado_por, FALSE, 'PENDIENTE_CONFIGURACION', CURRENT_TIMESTAMP)
                RETURNING id
            """), {
                "expediente_id": str(expediente.id_expediente),
                "payload": payload_json,
                "solicitado_por": getattr(usuario, "id", None),
            }).scalar()
        else:
            solicitud_id = existente
        gasto.estado_consolidacion = "Pendiente envío"
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo registrar la solicitud pendiente de integración ABSIS.") from exc

    return {
        "ok": True,
        "solicitud_id": solicitud_id,
        "id_gasto_erp": gasto.id,
        "id_expediente": str(expediente.id_expediente),
        "estado": "PENDIENTE_CONFIGURACION",
        "registrado_localmente": True,
        "transmitido_a_absis": False,
        "mensaje": "Solicitud registrada para Informática. No se ha enviado a ABSIS porque falta validar endpoint, autenticación y contrato de datos.",
    }


@router.post("/{expediente_id}/gastos", response_model=GastoResponse, status_code=status.HTTP_201_CREATED)
def crear_gasto(expediente_id: int, payload: GastoCreate, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    expediente = _obtener_expediente(db, expediente_id)
    datos = payload.dict(exclude_unset=True)
    datos["estado_pago"] = "Pendiente"
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
def actualizar_gasto(expediente_id: int, gasto_id: int, payload: GastoUpdate, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    expediente = _obtener_expediente(db, expediente_id)
    # Serializa las operaciones de pago que comparten el saldo del expediente.
    expediente = db.query(Expediente).filter(Expediente.id == expediente.id).with_for_update().first()
    gasto = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.id == gasto_id,
        ExpedienteGasto.expediente_id == expediente.id,
    ).with_for_update().first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto.")
    datos = payload.dict(exclude_unset=True)
    estado_actual = str(gasto.estado_pago or "Pendiente").strip().lower()
    estado_solicitado = str(datos.get("estado_pago", gasto.estado_pago or "Pendiente")).strip().lower()
    if estado_solicitado != estado_actual:
        raise HTTPException(status_code=422, detail="El estado de pago solo cambia al registrar o anular un movimiento real de pago.")
    _validar_calculo(datos)
    # Una obligación no puede rebajarse por debajo de los pagos ya registrados.
    total_pagado = _decimal_opcional(db.execute(text("""
        SELECT COALESCE(SUM(importe), 0)
        FROM public.expediente_gasto_pagos
        WHERE gasto_id = :gasto_id AND anulado_en IS NULL
    """), {"gasto_id": gasto.id}).scalar()) or Decimal("0.00")
    movimientos_pago = int(db.execute(text("""
        SELECT COUNT(*) FROM public.expediente_gasto_pagos WHERE gasto_id = :gasto_id
    """), {"gasto_id": gasto.id}).scalar() or 0)
    # En actualizaciones parciales, validar la combinación final, no solo los campos enviados.
    combinados = {campo: getattr(gasto, campo, None) for campo in GastoBase.__fields__}
    combinados.update(datos)
    _validar_calculo(combinados)
    importe_final = _decimal_opcional(combinados.get("importe_resultante") if combinados.get("importe_resultante") is not None else combinados.get("importe"))
    if total_pagado > 0 and importe_final is not None and importe_final + CENTIMO < total_pagado:
        raise HTTPException(status_code=422, detail="El importe de la obligación no puede quedar por debajo del total ya pagado.")
    for campo, valor in datos.items():
        setattr(gasto, campo, valor)
    if "importe_resultante" in datos and "importe" not in datos:
        gasto.importe = datos["importe_resultante"]

    # Si ya existe histórico de pagos nuevo, el estado debe seguir reflejando
    # la obligación final tras editar importes. No reinterpretar gastos pagados
    # legacy que aún no tienen movimientos en la tabla nueva.
    if movimientos_pago and importe_final is not None:
        if importe_final > 0 and total_pagado >= importe_final:
            ultima_fecha_pago = db.execute(text("""
                SELECT MAX(fecha) FROM public.expediente_gasto_pagos
                WHERE gasto_id = :gasto_id AND anulado_en IS NULL
            """), {"gasto_id": gasto.id}).scalar()
            gasto.estado_pago = "Pagado"
            gasto.fecha_pago = ultima_fecha_pago or gasto.fecha_pago
        elif total_pagado > 0:
            gasto.estado_pago = "Parcial"
            gasto.fecha_pago = None
        else:
            gasto.estado_pago = "Pendiente"
            gasto.fecha_pago = None

    try:
        db.commit(); db.refresh(gasto)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar el gasto. Comprueba que la migración de columnas esté aplicada.")
    return gasto


@router.delete("/{expediente_id}/gastos/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_gasto(expediente_id: int, gasto_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    expediente = _obtener_expediente(db, expediente_id)
    gasto = db.query(ExpedienteGasto).filter(
        ExpedienteGasto.id == gasto_id,
        ExpedienteGasto.expediente_id == expediente.id,
    ).with_for_update().first()
    if gasto is None:
        raise HTTPException(status_code=404, detail="No se encontró el gasto.")
    pagos_existentes = db.execute(text("""
        SELECT COUNT(*) FROM public.expediente_gasto_pagos WHERE gasto_id = :gasto_id
    """), {"gasto_id": gasto.id}).scalar() or 0
    if pagos_existentes:
        raise HTTPException(status_code=409, detail="No se puede eliminar una obligación con pagos registrados; conserva su histórico y corrige el registro si procede.")
    db.delete(gasto)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar el gasto.")
    return None

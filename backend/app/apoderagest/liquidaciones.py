"""Circuito mensual de liquidaciones de colaboradores de ApoderaGest.

La fuente de verdad de las firmas es Expediente.fecha_firma + apoderado_empleado_id.
Las relaciones validadas se guardan como instantáneas JSON para conservar auditoría.
"""
from datetime import date, datetime
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey, LargeBinary, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from backend.app.database import Base, engine, get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.empleados.models import Empleado
from backend.app.expedientes.models import Expediente

router = APIRouter(prefix="/apoderagest/liquidaciones", tags=["ApoderaGest - Liquidaciones"])

class LiquidacionMensual(Base):
    __tablename__ = "apoderagest_liquidaciones"
    id = Column(Integer, primary_key=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    periodo = Column(String(7), nullable=False, index=True)
    expedientes_json = Column(JSONB, nullable=False, default=list)
    estado_relacion = Column(String(30), nullable=False, default="pendiente")
    validado_en = Column(DateTime(timezone=True), nullable=True)
    validado_version = Column(Integer, nullable=False, default=1)
    discrepancia = Column(String(2000), nullable=True)
    factura_bytes = Column(LargeBinary, nullable=True)
    factura_nombre = Column(String(255), nullable=True)
    factura_tipo = Column(String(150), nullable=True)
    factura_subida_en = Column(DateTime(timezone=True), nullable=True)
    estado_factura = Column(String(30), nullable=False, default="sin_factura")
    factura_revisada_por = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    factura_revisada_en = Column(DateTime(timezone=True), nullable=True)
    factura_observaciones = Column(String(2000), nullable=True)
    creada_en = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    actualizada_en = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("empleado_id", "periodo", name="uq_apoderagest_liquidacion_periodo"),)

@router.on_event("startup")
def preparar_esquema_liquidaciones():
    # Migración aditiva e idempotente: no altera los datos de empleados existentes.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE empleados ADD COLUMN IF NOT EXISTS es_colaborador BOOLEAN NOT NULL DEFAULT FALSE"))
    Base.metadata.create_all(bind=engine, tables=[LiquidacionMensual.__table__])

def _es_admin(usuario):
    rol = str(getattr(getattr(usuario, "rol", None), "nombre", "") or "").casefold()
    usuario_nombre = str(getattr(usuario, "usuario", "") or "").casefold()
    if usuario_nombre == "admin" or "admin" in rol or "administrador" in rol:
        return True
    for modulo in ("utilidades", "apoderagest", "seguridad"):
        try:
            require_perm_modulo(usuario, modulo, "editar")
            return True
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
    return False

def _exigir_admin(usuario):
    if not _es_admin(usuario):
        raise HTTPException(status_code=403, detail="Necesitas permisos de administración de Control Apoderados.")

def _periodo(valor):
    try:
        return date.fromisoformat(valor + "-01")
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="El periodo debe tener formato AAAA-MM.")

def _nombre(empleado):
    return " ".join(x for x in [empleado.nombre or "", empleado.apellidos or ""] if x).strip()

def _relacion_firmas(db, empleado_id, periodo):
    inicio = _periodo(periodo)
    fin = date(inicio.year + (inicio.month == 12), 1 if inicio.month == 12 else inicio.month + 1, 1)
    filas = (db.query(Expediente)
        .filter(Expediente.apoderado_empleado_id == empleado_id,
                Expediente.fecha_firma >= inicio,
                Expediente.fecha_firma < fin)
        .order_by(Expediente.fecha_firma, Expediente.id_expediente)
        .all())
    return [{
        "expediente_id": e.id,
        "id_expediente": e.id_expediente,
        "fecha_firma": e.fecha_firma.isoformat() if e.fecha_firma else None,
        "protocolo": getattr(e, "protocolo", None),
        "tipo_firma": getattr(e, "tipo_firma", None),
        "notario": getattr(e, "nombre_notario", None) or getattr(e, "notario", None),
    } for e in filas]

def _dict(item, db, incluir_datos_factura=False):
    empleado = db.query(Empleado).filter(Empleado.id == item.empleado_id).first()
    result = {
        "id": item.id, "empleado_id": item.empleado_id,
        "colaborador": _nombre(empleado) if empleado else str(item.empleado_id),
        "periodo": item.periodo, "expedientes": item.expedientes_json or [],
        "estado_relacion": item.estado_relacion, "validado_en": item.validado_en.isoformat() if item.validado_en else None,
        "validado_version": item.validado_version, "discrepancia": item.discrepancia,
        "factura_nombre": item.factura_nombre, "factura_subida_en": item.factura_subida_en.isoformat() if item.factura_subida_en else None,
        "estado_factura": item.estado_factura, "factura_revisada_en": item.factura_revisada_en.isoformat() if item.factura_revisada_en else None,
        "factura_observaciones": item.factura_observaciones,
    }
    if incluir_datos_factura:
        result["tiene_factura"] = item.factura_bytes is not None
    return result

def _obtener_o_crear(db, empleado_id, periodo):
    _periodo(periodo)
    item = db.query(LiquidacionMensual).filter_by(empleado_id=empleado_id, periodo=periodo).with_for_update().first()
    firmas = _relacion_firmas(db, empleado_id, periodo)
    if item is None:
        item = LiquidacionMensual(empleado_id=empleado_id, periodo=periodo, expedientes_json=firmas)
        db.add(item)
        db.flush()
    elif item.estado_relacion != "validada" and item.expedientes_json != firmas:
        item.expedientes_json = firmas
        item.validado_version = (item.validado_version or 0) + 1
    # Tras validar, la instantánea no se recalcula silenciosamente.
    db.commit()
    db.refresh(item)
    return item

@router.get("/mi")
def mi_liquidacion(periodo: str, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    if not getattr(usuario, "es_colaborador", False):
        raise HTTPException(status_code=403, detail="Tu ficha no está habilitada como colaborador de ApoderaGest.")
    item = _obtener_o_crear(db, usuario.id, periodo)
    return _dict(item, db)

@router.get("/mis-periodos")
def mis_periodos(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    if not getattr(usuario, "es_colaborador", False):
        raise HTTPException(status_code=403, detail="Tu ficha no está habilitada como colaborador de ApoderaGest.")
    items = db.query(LiquidacionMensual).filter_by(empleado_id=usuario.id).order_by(LiquidacionMensual.periodo.desc()).all()
    return [_dict(x, db) for x in items]

@router.post("/mi/{liquidacion_id}/validar")
def validar_mi_relacion(liquidacion_id: int, discrepancia: str = Form(""), db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    if not getattr(usuario, "es_colaborador", False):
        raise HTTPException(status_code=403, detail="Tu ficha no está habilitada como colaborador.")
    item = db.query(LiquidacionMensual).filter_by(id=liquidacion_id, empleado_id=usuario.id).with_for_update().first()
    if item is None:
        raise HTTPException(status_code=404, detail="Relación mensual no encontrada.")
    if item.estado_relacion == "validada":
        raise HTTPException(status_code=409, detail="La relación ya está validada. Contacta con Molsan para solicitar una corrección.")
    item.discrepancia = discrepancia.strip() or None
    item.estado_relacion = "validada"
    item.validado_en = datetime.utcnow()
    item.validado_version = item.validado_version or 1
    db.commit()
    db.refresh(item)
    return _dict(item, db)

@router.post("/mi/{liquidacion_id}/factura")
def subir_factura(liquidacion_id: int, archivo: UploadFile = File(...), db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    if not getattr(usuario, "es_colaborador", False):
        raise HTTPException(status_code=403, detail="Tu ficha no está habilitada como colaborador.")
    item = db.query(LiquidacionMensual).filter_by(id=liquidacion_id, empleado_id=usuario.id).with_for_update().first()
    if item is None:
        raise HTTPException(status_code=404, detail="Relación mensual no encontrada.")
    if item.estado_relacion != "validada" or not item.validado_en:
        raise HTTPException(status_code=409, detail="Primero debes validar la relación mensual de expedientes.")
    if not archivo.filename or not archivo.filename.lower().endswith((".pdf", ".xml", ".jpg", ".jpeg", ".png")):
        raise HTTPException(status_code=422, detail="Adjunta una factura PDF, XML, JPG o PNG.")
    contenido = archivo.file.read(10 * 1024 * 1024 + 1)
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="La factura no puede superar 10 MB.")
    if not contenido:
        raise HTTPException(status_code=422, detail="El archivo está vacío.")
    item.factura_bytes = contenido
    item.factura_nombre = archivo.filename[:255]
    item.factura_tipo = archivo.content_type or "application/octet-stream"
    item.factura_subida_en = datetime.utcnow()
    item.estado_factura = "pendiente_revision"
    item.factura_revisada_por = None
    item.factura_revisada_en = None
    item.factura_observaciones = None
    db.commit()
    db.refresh(item)
    return _dict(item, db)

@router.get("/admin")
def listar_control_apoderados(periodo: str | None = None, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    q = db.query(LiquidacionMensual).join(Empleado, Empleado.id == LiquidacionMensual.empleado_id).filter(Empleado.es_colaborador.is_(True))
    if periodo:
        _periodo(periodo)
        q = q.filter(LiquidacionMensual.periodo == periodo)
    return [_dict(x, db, True) for x in q.order_by(LiquidacionMensual.periodo.desc(), LiquidacionMensual.empleado_id).all()]

@router.get("/admin/colaboradores")
def listar_colaboradores(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    return [{"id": e.id, "nombre": _nombre(e), "es_colaborador": bool(e.es_colaborador), "activo": bool(e.activo)} for e in db.query(Empleado).order_by(Empleado.apellidos, Empleado.nombre).all()]

@router.patch("/admin/colaboradores/{empleado_id}")
def marcar_colaborador(empleado_id: int, es_colaborador: bool, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    empleado = db.query(Empleado).filter_by(id=empleado_id).first()
    if empleado is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    empleado.es_colaborador = es_colaborador
    db.commit()
    return {"id": empleado.id, "nombre": _nombre(empleado), "es_colaborador": bool(empleado.es_colaborador)}

@router.get("/admin/{liquidacion_id}/factura")
def descargar_factura(liquidacion_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    item = db.query(LiquidacionMensual).filter_by(id=liquidacion_id).first()
    if item is None or not item.factura_bytes:
        raise HTTPException(status_code=404, detail="No hay factura adjunta.")
    return StreamingResponse(BytesIO(item.factura_bytes), media_type=item.factura_tipo or "application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{item.factura_nombre or "factura"}"'})

@router.post("/admin/{liquidacion_id}/factura/revisar")
def revisar_factura(liquidacion_id: int, decision: str = Form(...), observaciones: str = Form(""), db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    if decision not in {"aceptada", "rechazada", "correccion_solicitada"}:
        raise HTTPException(status_code=422, detail="Decisión no válida.")
    item = db.query(LiquidacionMensual).filter_by(id=liquidacion_id).with_for_update().first()
    if item is None or not item.factura_bytes:
        raise HTTPException(status_code=404, detail="No hay factura para revisar.")
    item.estado_factura = decision
    item.factura_revisada_por = usuario.id
    item.factura_revisada_en = datetime.utcnow()
    item.factura_observaciones = observaciones.strip() or None
    db.commit()
    db.refresh(item)
    return _dict(item, db)

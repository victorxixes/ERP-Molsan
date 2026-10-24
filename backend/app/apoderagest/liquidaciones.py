"""Circuito mensual de liquidaciones de colaboradores de ApoderaGest.

La fuente de verdad de las firmas es Expediente.fecha_firma + apoderado_empleado_id.
Las relaciones validadas se guardan como instantáneas JSON para conservar auditoría.
"""
from datetime import date, datetime
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey, LargeBinary, UniqueConstraint, and_, func, or_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from backend.app.database import Base, get_db
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
    validado_por_id = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    historial_validaciones = Column(JSONB, nullable=False, default=list)
    estado_revision_relacion = Column(String(30), nullable=False, default="pendiente_revision")
    relacion_revisada_por = Column(Integer, ForeignKey("empleados.id"), nullable=True)
    relacion_revisada_en = Column(DateTime(timezone=True), nullable=True)
    observaciones_revision_relacion = Column(String(2000), nullable=True)
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

def _es_admin(usuario):
    rol = str(getattr(getattr(usuario, "rol", None), "nombre", "") or "").casefold()
    usuario_nombre = str(getattr(usuario, "usuario", "") or "").casefold()
    if usuario_nombre == "admin" or "admin" in rol or "administrador" in rol:
        return True
    for modulo in ("utilidades", "seguridad"):
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
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    nombre = _nombre(empleado)
    filtro_apoderado = Expediente.apoderado_empleado_id == empleado_id
    if nombre:
        # Compatibilidad con expedientes históricos sin FK de apoderado.
        # Cuando la FK existe, sigue siendo la relación autoritativa.
        nombre_expediente = func.translate(
            func.lower(func.trim(Expediente.apoderado)), "áéíóúüñ", "aeiouun"
        )
        nombre_colaborador = func.translate(nombre.lower().strip(), "áéíóúüñ", "aeiouun")
        filtro_apoderado = or_(
            Expediente.apoderado_empleado_id == empleado_id,
            and_(Expediente.apoderado_empleado_id.is_(None), nombre_expediente == nombre_colaborador),
        )
    filas = (db.query(Expediente)
        .filter(filtro_apoderado,
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
        "notario_id": getattr(e, "notario_id", None),
        "tipo_operacion": getattr(e, "tipo_operacion", None),
        "id_provision": getattr(e, "id_provision", None),
        "tipo_provision": getattr(e, "tipo_provision", None),
    } for e in filas]

def _clave_protocolo(expediente):
    """Un protocolo se liquida una sola vez por colaborador, notario y número."""
    protocolo = str(expediente.get("protocolo") or "").strip()
    if not protocolo:
        # Si falta número de protocolo, no agrupar expedientes distintos por accidente.
        return ("expediente", expediente.get("expediente_id"))
    notario = str(expediente.get("notario_id") or expediente.get("notario") or "").strip().casefold()
    return ("protocolo", notario, protocolo.casefold())


def _resumen_liquidacion(empleado, expedientes):
    protocolos = {}
    for expediente in expedientes or []:
        clave = _clave_protocolo(expediente)
        grupo = protocolos.setdefault(clave, {"expedientes": [], "con_provision": False, "sin_provision": False})
        grupo["expedientes"].append(expediente)
        operacion = str(expediente.get("tipo_operacion") or "").casefold().replace("ó", "o")
        provision = str(expediente.get("tipo_provision") or "").casefold()
        tiene_provision = bool(str(expediente.get("id_provision") or "").strip()) or "con provision" in operacion or "con provision" in provision
        es_sin_provision = "sin provision" in operacion or "sin provision" in provision
        grupo["con_provision"] = grupo["con_provision"] or (tiene_provision and not es_sin_provision)
        grupo["sin_provision"] = grupo["sin_provision"] or es_sin_provision
    protocolos_unicos = list(protocolos.values())
    valor = float(getattr(empleado, "honorarios_valor", 0) or 0)
    honorarios = round(len(protocolos_unicos) * valor, 2)
    iva = round(honorarios * 0.21, 2)
    return {
        "protocolos_firmados": len(protocolos_unicos),
        "cancelaciones_sin_provision": sum(1 for p in protocolos_unicos if p["sin_provision"]),
        "cancelaciones_con_provision": sum(1 for p in protocolos_unicos if p["con_provision"] and not p["sin_provision"]),
        "honorarios_unitarios": round(valor, 2),
        "honorarios": honorarios,
        "base_neta": honorarios,
        "iva": iva,
        "total": round(honorarios + iva, 2),
    }


def _dict(item, db, incluir_datos_factura=False):
    empleado = db.query(Empleado).filter(Empleado.id == item.empleado_id).first()
    expedientes = item.expedientes_json or []
    resumen = _resumen_liquidacion(empleado, expedientes)
    result = {
        "id": item.id, "empleado_id": item.empleado_id,
        "colaborador": _nombre(empleado) if empleado else str(item.empleado_id),
        "periodo": item.periodo, "expedientes": expedientes, **resumen,
        "estado_relacion": item.estado_relacion, "validado_en": item.validado_en.isoformat() if item.validado_en else None,
        "validado_por_id": item.validado_por_id, "validado_version": item.validado_version, "discrepancia": item.discrepancia,
        "historial_validaciones": item.historial_validaciones or [], "estado_revision_relacion": item.estado_revision_relacion,
        "relacion_revisada_en": item.relacion_revisada_en.isoformat() if item.relacion_revisada_en else None,
        "observaciones_revision_relacion": item.observaciones_revision_relacion,
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
    item.validado_por_id = usuario.id
    historial = list(item.historial_validaciones or [])
    item.validado_version = len(historial) + 1
    historial.append({
        "version": item.validado_version,
        "validado_en": item.validado_en.isoformat(),
        "validado_por_id": usuario.id,
        "expedientes": item.expedientes_json or [],
        "discrepancia": item.discrepancia,
    })
    item.historial_validaciones = historial
    item.estado_revision_relacion = "pendiente_revision"
    item.relacion_revisada_por = None
    item.relacion_revisada_en = None
    item.observaciones_revision_relacion = None
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
    if item.estado_factura == "aceptada":
        raise HTTPException(status_code=409, detail="La factura ya fue aceptada por Molsan. Solicita que la reabran si necesitas sustituirla.")
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
    if periodo:
        _periodo(periodo)
        # Preparar la relación de cada colaborador para que la administración
        # pueda consultar el periodo aunque el colaborador aún no haya entrado.
        colaboradores = db.query(Empleado).filter(Empleado.es_colaborador.is_(True), Empleado.activo.is_(True)).all()
        for colaborador in colaboradores:
            _obtener_o_crear(db, colaborador.id, periodo)
    q = db.query(LiquidacionMensual).join(Empleado, Empleado.id == LiquidacionMensual.empleado_id).filter(Empleado.es_colaborador.is_(True))
    if periodo:
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

@router.post("/admin/{liquidacion_id}/relacion/revisar")
def revisar_relacion(liquidacion_id: int, decision: str = Form(...), observaciones: str = Form(""), db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    if decision not in {"aceptada", "rechazada", "correccion_solicitada"}:
        raise HTTPException(status_code=422, detail="Decisión no válida.")
    item = db.query(LiquidacionMensual).filter_by(id=liquidacion_id).with_for_update().first()
    if item is None or not item.validado_en:
        raise HTTPException(status_code=409, detail="El colaborador debe validar primero la relación mensual.")
    item.estado_revision_relacion = decision
    item.relacion_revisada_por = usuario.id
    item.relacion_revisada_en = datetime.utcnow()
    item.observaciones_revision_relacion = observaciones.strip() or None
    if decision == "correccion_solicitada":
        item.estado_relacion = "correccion_solicitada"
    elif decision == "rechazada":
        item.estado_relacion = "rechazada"
    else:
        item.estado_relacion = "validada"
    db.commit()
    db.refresh(item)
    return _dict(item, db, True)

@router.get("/admin/{liquidacion_id}/factura")
def descargar_factura(liquidacion_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _exigir_admin(usuario)
    item = db.query(LiquidacionMensual).filter_by(id=liquidacion_id).first()
    if item is None or not item.factura_bytes:
        raise HTTPException(status_code=404, detail="No hay factura adjunta.")
    nombre_seguro = (item.factura_nombre or "factura").replace("\\r", "").replace("\\n", "").replace('"', "'").replace("/", "_").replace("\\\\", "_")
    return StreamingResponse(BytesIO(item.factura_bytes), media_type=item.factura_tipo or "application/octet-stream", headers={"Content-Disposition": f'attachment; filename="{nombre_seguro}"'})

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

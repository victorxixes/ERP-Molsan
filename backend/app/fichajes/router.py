from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from io import BytesIO, StringIO
from urllib.parse import quote
import unicodedata
import json
import csv

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import Base, engine, get_db
from backend.app.empleados.models import Empleado
from backend.app.fichajes.models import (FichajeDocumento, FichajeMarcaje, FichajeTipoAusencia, FichajeVacaciones, FichajeBolsaVacaciones, FichajeFestivoTrabajado, FichajeCompensacionMovimiento, FichajeSolicitudCompensacion, FichajeCompensacionAuditoria, FichajeFestivoCalendario, FichajeMarcajeAuditoria, FichajePeriodoCerrado, FichajeDocumentoRevision, FichajeSolicitudAusencia)

router = APIRouter(prefix="/fichajes", tags=["Fichaje Molsan"])
TIPOS_MARCAJE = {"ENTRADA", "SALIDA", "PAUSA_CAFE_INICIO", "PAUSA_DESAYUNO_INICIO", "PAUSA_DESAYUNO_FIN", "PAUSA_COMIDA_INICIO", "PAUSA_COMIDA_FIN", "PAUSA_CIGARRILLO_INICIO", "PAUSA_CIGARRILLO_FIN", "RETORNO_AUSENCIA", "AUSENCIA"}
TIPOS_AUSENCIA_INICIALES = [("Visita médica", 1), ("Asunto personal", 0), ("Gestiones administrativas", 0), ("Permiso retribuido", 0), ("Permiso no retribuido", 0), ("Baja médica", 1), ("Vacaciones", 0), ("Formación", 0), ("Deberes familiares", 0), ("Otra ausencia", 0)]
TIPOS_DOCUMENTO = {
    "Justificante médico", "Vacaciones", "Ausencia", "Permiso", "Otro"
}
MAX_DOCUMENTO_BYTES = 10 * 1024 * 1024


def _migrar_tablas():
    try:
        with engine.begin() as conexion:
            from sqlalchemy import text
            conexion.execute(text("SET LOCAL lock_timeout = '2s'"))
            conexion.execute(text("SET LOCAL statement_timeout = '8s'"))
            Base.metadata.create_all(
                bind=conexion,
                tables=[FichajeMarcaje.__table__, FichajeDocumento.__table__, FichajeTipoAusencia.__table__, FichajeVacaciones.__table__, FichajeBolsaVacaciones.__table__, FichajeFestivoTrabajado.__table__, FichajeCompensacionMovimiento.__table__, FichajeSolicitudCompensacion.__table__, FichajeCompensacionAuditoria.__table__, FichajeFestivoCalendario.__table__, FichajeMarcajeAuditoria.__table__, FichajePeriodoCerrado.__table__, FichajeDocumentoRevision.__table__, FichajeSolicitudAusencia.__table__],
                checkfirst=True,
            )
        from sqlalchemy.orm import Session as _Session
        with _Session(engine) as db:
            for nombre, justificante in TIPOS_AUSENCIA_INICIALES:
                if not db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.nombre == nombre).first():
                    db.add(FichajeTipoAusencia(nombre=nombre, requiere_justificante=justificante, activo=1))
            db.commit()
        print("[FICHAJES] Tablas y catálogo inicial de ausencias comprobados.", flush=True)
    except Exception as exc:
        print(f"[FICHAJES] Aviso: migración pendiente; se reintentará al siguiente arranque: {exc!r}", flush=True)


@router.on_event("startup")
def preparar_tablas_fichajes():
    _migrar_tablas()


def _hoy_madrid():
    """Fecha civil oficial de la aplicación en la zona horaria de España peninsular."""
    return datetime.now(ZoneInfo("Europe/Madrid")).date()


def _nombre_completo(empleado):
    return " ".join(p for p in [getattr(empleado, "nombre", None), getattr(empleado, "apellidos", None)] if p).strip()


def _es_admin(usuario):
    rol = getattr(getattr(usuario, "rol", None), "nombre", "") or ""
    rol_norm = unicodedata.normalize("NFD", str(rol)).encode("ascii", "ignore").decode().lower()
    rol_norm = " ".join(rol_norm.replace("_", " ").replace("-", " ").split())
    usuario_norm = str(getattr(usuario, "usuario", "") or "").strip().lower()
    roles_administradores = {
        "admin",
        "administrador",
        "administradora",
        "superadmin",
        "super admin",
        "superadministrador",
        "super administradora",
        "superuser",
        "super usuario",
        "superusuario",
        "administrador general",
    }
    # No se debe conceder administración por coincidencias parciales como
    # "gestor" o "manager": los roles operativos no son administradores.
    return usuario_norm == "admin" or rol_norm in roles_administradores


def _exigir_admin(usuario):
    if not _es_admin(usuario):
        raise HTTPException(status_code=403, detail="Solo administración puede acceder al Control de Fichajes.")


def _marcaje_dict(m):
    return {
        "id": m.id,
        "empleado_id": m.empleado_id,
        "tipo": m.tipo,
        "fecha_hora": m.fecha_hora.isoformat() if m.fecha_hora else None,
        "observaciones": m.observaciones,
    }


def _snapshot_marcaje(m):
    return {
        "id": m.id,
        "empleado_id": m.empleado_id,
        "tipo": m.tipo,
        "fecha_hora": m.fecha_hora.isoformat() if m.fecha_hora else None,
        "observaciones": m.observaciones,
        "creado_por_id": m.creado_por_id,
    }


def _periodo_esta_cerrado(db, fecha_hora):
    periodo = db.query(FichajePeriodoCerrado).filter(
        FichajePeriodoCerrado.anio == fecha_hora.year,
        FichajePeriodoCerrado.mes == fecha_hora.month,
    ).first()
    return bool(periodo and periodo.cerrado)


def _exigir_periodo_abierto(db, fecha_hora):
    if _periodo_esta_cerrado(db, fecha_hora):
        raise HTTPException(status_code=409, detail="El periodo de este marcaje está cerrado. Un administrador autorizado debe reabrir el mes indicando el motivo antes de modificarlo.")


def _registrar_auditoria_marcaje(db, marcaje, actor, accion, anterior, nuevo, motivo):
    db.add(FichajeMarcajeAuditoria(
        marcaje_id=marcaje.id if marcaje else None,
        empleado_id=(marcaje.empleado_id if marcaje else nuevo["empleado_id"]),
        actor_id=actor.id,
        accion=accion,
        datos_anteriores=json.dumps(anterior, ensure_ascii=False, default=str) if anterior else None,
        datos_nuevos=json.dumps(nuevo, ensure_ascii=False, default=str),
        motivo=motivo.strip()[:500],
    ))


def _documento_dict(d):
    return {
        "id": d.id,
        "empleado_id": d.empleado_id,
        "tipo_justificante": d.tipo_justificante,
        "fecha_documento": d.fecha_documento.isoformat() if d.fecha_documento else None,
        "nombre_archivo": d.nombre_archivo,
        "content_type": d.content_type,
        "tamano_bytes": d.tamano_bytes,
        "subido_en": d.subido_en.isoformat() if d.subido_en else None,
    }


@router.get("/mi-perfil")
def mi_perfil(usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "fichajes", "ver")
    return {
        "id": usuario.id,
        "nombre": _nombre_completo(usuario) or usuario.usuario,
        "usuario": usuario.usuario,
        "email": getattr(usuario, "email_empresa", None) or getattr(usuario, "email_personal", None),
        "departamento_id": getattr(usuario, "departamento_id", None),
        "cargo_id": getattr(usuario, "cargo_id", None),
        "foto": getattr(usuario, "foto", None),
        "es_admin": _es_admin(usuario),
    }


@router.get("/marcajes")
def listar_mis_marcajes(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "ver")
    consulta = db.query(FichajeMarcaje).filter(FichajeMarcaje.empleado_id == usuario.id)
    if desde:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora >= datetime.combine(desde, time.min).replace(tzinfo=ZoneInfo("Europe/Madrid")))
    if hasta:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora < datetime.combine(hasta + timedelta(days=1), time.min).replace(tzinfo=ZoneInfo("Europe/Madrid")))
    return [_marcaje_dict(m) for m in consulta.order_by(desc(FichajeMarcaje.fecha_hora)).limit(2000).all()]


@router.post("/marcajes")
def crear_marcaje(
    tipo: str = Form(...),
    observaciones: str = Form(""),
    tipo_ausencia: str = Form(""),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "crear")
    # Los marcajes nuevos siempre se registran en la hora oficial de Madrid;
    # un periodo cerrado no admite nuevos movimientos ni correcciones.
    _exigir_periodo_abierto(db, datetime.now(ZoneInfo("Europe/Madrid")))
    tipo = tipo.strip().upper()
    if tipo not in TIPOS_MARCAJE:
        raise HTTPException(status_code=422, detail="Tipo de marcaje no válido.")
    if tipo == "AUSENCIA":
        nombre_ausencia = (tipo_ausencia or "").strip()
        valido = db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.nombre == nombre_ausencia, FichajeTipoAusencia.activo == 1).first()
        if not valido:
            raise HTTPException(status_code=422, detail="Selecciona un tipo de ausencia válido del catálogo.")
        observaciones = f"Ausencia: {nombre_ausencia}. {observaciones or ''}".strip()
        # El nuevo botón registra la ausencia como evento puntual, ya que la interfaz
        # no ofrece un control de regreso de ausencia. Los AUSENCIA históricos se conservan.
        tipo = "AUSENCIA_PUNTUAL"
    ultimo = db.query(FichajeMarcaje).filter(
        FichajeMarcaje.empleado_id == usuario.id
    ).order_by(desc(FichajeMarcaje.fecha_hora)).first()
    ultimo_jornada = db.query(FichajeMarcaje).filter(
        FichajeMarcaje.empleado_id == usuario.id,
        FichajeMarcaje.tipo.in_({"ENTRADA", "SALIDA"}),
    ).order_by(desc(FichajeMarcaje.fecha_hora)).first()
    if tipo == "ENTRADA" and ultimo_jornada and ultimo_jornada.tipo == "ENTRADA":
        raise HTTPException(status_code=409, detail="Ya consta una entrada sin una salida posterior.")
    if tipo == "SALIDA" and (not ultimo_jornada or ultimo_jornada.tipo != "ENTRADA"):
        raise HTTPException(status_code=409, detail="Para registrar la salida debe existir una entrada previa sin cerrar.")
    # AUSENCIA es un registro puntual de ausencia/permiso, no una pausa que bloquee
    # el resto de los controles: el panel nuevo no tiene un botón de "regreso de ausencia".
    pausas = {"PAUSA_CAFE_INICIO", "PAUSA_DESAYUNO_INICIO", "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO"}
    retornos_por_pausa = {
        "PAUSA_CAFE_INICIO": {"PAUSA_DESAYUNO_FIN", "RETORNO_AUSENCIA"},
        "PAUSA_DESAYUNO_INICIO": {"PAUSA_DESAYUNO_FIN", "RETORNO_AUSENCIA"},
        "PAUSA_COMIDA_INICIO": {"PAUSA_COMIDA_FIN", "RETORNO_AUSENCIA"},
        "PAUSA_CIGARRILLO_INICIO": {"PAUSA_CIGARRILLO_FIN", "RETORNO_AUSENCIA"},
        "AUSENCIA": {"RETORNO_AUSENCIA"},
    }
    tipos_retorno = {"PAUSA_DESAYUNO_FIN", "PAUSA_COMIDA_FIN", "PAUSA_CIGARRILLO_FIN", "RETORNO_AUSENCIA"}
    if ultimo and ultimo.tipo in pausas and tipo not in retornos_por_pausa.get(ultimo.tipo, set()) | {"SALIDA"}:
        raise HTTPException(status_code=409, detail="Tienes una pausa o ausencia abierta. Registra el regreso correspondiente antes de iniciar otro movimiento.")
    if tipo in pausas and (not ultimo_jornada or ultimo_jornada.tipo != "ENTRADA"):
        raise HTTPException(status_code=409, detail="Para iniciar una pausa o ausencia debes tener una jornada abierta.")
    if tipo in tipos_retorno and (not ultimo or tipo not in retornos_por_pausa.get(ultimo.tipo, set())):
        raise HTTPException(status_code=409, detail="El regreso no coincide con la pausa abierta. Selecciona el regreso correspondiente.")
    marcaje = FichajeMarcaje(
        empleado_id=usuario.id,
        tipo=tipo,
        observaciones=(observaciones or "").strip()[:500] or None,
        creado_por_id=usuario.id,
    )
    db.add(marcaje)
    db.flush()
    nuevo = _snapshot_marcaje(marcaje)
    _registrar_auditoria_marcaje(
        db, marcaje, usuario, "ALTA_EMPLEADO", None, nuevo,
        "Marcaje registrado por el empleado desde el módulo de Fichajes."
    )
    db.commit()
    db.refresh(marcaje)
    return _marcaje_dict(marcaje)


@router.get("/resumen-horas")
def resumen_horas(
    anio: int | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resume horas de jornadas cerradas, descontando pausas y recortando al año solicitado."""
    require_perm_modulo(usuario, "fichajes", "ver")
    if anio is None:
        anio = datetime.now(ZoneInfo("Europe/Madrid")).year
    if anio < 2000 or anio > 2100:
        raise HTTPException(status_code=422, detail="Indica un año válido entre 2000 y 2100.")

    zona = ZoneInfo("Europe/Madrid")
    inicio = datetime(anio, 1, 1, tzinfo=zona)
    fin = datetime(anio + 1, 1, 1, tzinfo=zona)
    # Se leen los marcajes hasta el día siguiente para cerrar correctamente
    # una jornada nocturna iniciada el 31 de diciembre.
    limite = fin + timedelta(days=1)
    marcajes = db.query(FichajeMarcaje).filter(
        FichajeMarcaje.empleado_id == usuario.id,
        FichajeMarcaje.fecha_hora < limite,
    ).order_by(FichajeMarcaje.fecha_hora.asc(), FichajeMarcaje.id.asc()).all()

    pausas_inicio = {
        "PAUSA_CAFE_INICIO", "PAUSA_DESAYUNO_INICIO",
        "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO", "AUSENCIA",
    }
    pausas_fin = {
        "PAUSA_DESAYUNO_FIN", "PAUSA_COMIDA_FIN",
        "PAUSA_CIGARRILLO_FIN", "RETORNO_AUSENCIA",
    }
    activo = False
    pausado = False
    inicio_jornada = None
    instante_anterior = None
    segundos_jornada_anio = 0.0
    segundos_totales = 0.0
    jornadas_incompletas = 0

    def como_local(valor):
        if valor.tzinfo is None:
            return valor.replace(tzinfo=zona)
        return valor.astimezone(zona)

    for m in marcajes:
        instante = como_local(m.fecha_hora)
        if instante_anterior is not None and activo and not pausado:
            tramo_inicio = max(instante_anterior, inicio)
            tramo_fin = min(instante, fin)
            if tramo_fin > tramo_inicio:
                segundos_jornada_anio += (tramo_fin.astimezone(timezone.utc) - tramo_inicio.astimezone(timezone.utc)).total_seconds()

        tipo = m.tipo
        if tipo == "ENTRADA":
            if activo and inicio_jornada and inicio_jornada.year == anio:
                jornadas_incompletas += 1
            activo = True
            pausado = False
            inicio_jornada = instante
            segundos_jornada_anio = 0.0
        elif tipo == "SALIDA":
            if activo:
                segundos_totales += segundos_jornada_anio
            activo = False
            pausado = False
            inicio_jornada = None
            segundos_jornada_anio = 0.0
        elif tipo in pausas_inicio and activo and not pausado:
            pausado = True
        elif tipo in pausas_fin and activo and pausado:
            pausado = False
        # AUSENCIA_PUNTUAL es un evento informativo, no abre una pausa.
        instante_anterior = instante

    if activo and inicio_jornada and inicio_jornada.year == anio:
        jornadas_incompletas += 1

    return {
        "anio": anio,
        "horas_trabajadas": round(segundos_totales / 3600, 2),
        "jornadas_incompletas": jornadas_incompletas,
        "aviso": "Solo se suman jornadas cerradas con salida registrada. Las pausas se descuentan y las jornadas que cruzan de año se imputan al tiempo comprendido dentro del año consultado.",
    }


@router.get("/documentos")
def listar_mis_documentos(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "ver")
    documentos = db.query(FichajeDocumento).filter(
        FichajeDocumento.empleado_id == usuario.id
    ).order_by(desc(FichajeDocumento.subido_en)).limit(500).all()
    resultado = []
    for d in documentos:
        revision = db.query(FichajeDocumentoRevision).filter(FichajeDocumentoRevision.documento_id == d.id).order_by(desc(FichajeDocumentoRevision.creado_en)).first()
        resultado.append({**_documento_dict(d), "revision_estado": revision.estado if revision else "PENDIENTE", "revision_motivo": revision.motivo if revision else None})
    return resultado


@router.post("/documentos")
async def subir_documento(
    tipo_justificante: str = Form(...),
    fecha_documento: date = Form(...),
    archivo: UploadFile = File(...),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "crear")
    tipo = tipo_justificante.strip()
    if tipo not in TIPOS_DOCUMENTO:
        raise HTTPException(status_code=422, detail="Tipo de justificante no válido.")
    nombre = (archivo.filename or "documento").replace("\\", "/").split("/")[-1][:255]
    contenido = await archivo.read(MAX_DOCUMENTO_BYTES + 1)
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > MAX_DOCUMENTO_BYTES:
        raise HTTPException(status_code=413, detail="El documento supera el límite de 10 MB.")
    documento = FichajeDocumento(
        empleado_id=usuario.id,
        tipo_justificante=tipo,
        fecha_documento=fecha_documento,
        nombre_archivo=nombre,
        content_type=archivo.content_type,
        contenido=contenido,
        tamano_bytes=len(contenido),
        subido_por_id=usuario.id,
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return _documento_dict(documento)


@router.get("/documentos/{documento_id}/descargar")
def descargar_documento(
    documento_id: int,
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    documento = db.query(FichajeDocumento).filter(FichajeDocumento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    if documento.empleado_id == usuario.id:
        require_perm_modulo(usuario, "fichajes", "ver")
    else:
        require_perm_modulo(usuario, "control-fichajes", "ver")
        _exigir_admin(usuario)
    nombre = quote(documento.nombre_archivo or "documento")
    return StreamingResponse(
        BytesIO(documento.contenido),
        media_type=documento.content_type or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{nombre}"},
    )


@router.get("/admin/empleados")
def admin_empleados(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    empleados = db.query(Empleado).filter(Empleado.activo.is_(True)).order_by(Empleado.nombre, Empleado.apellidos).all()
    return [{
        "id": e.id,
        "nombre": _nombre_completo(e) or e.usuario,
        "usuario": e.usuario,
        "departamento_id": e.departamento_id,
    } for e in empleados]


@router.get("/admin/marcajes")
def admin_marcajes(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    empleado_id: int | None = Query(default=None),
    tipo: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    busqueda: str | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    consulta = db.query(FichajeMarcaje, Empleado).join(Empleado, Empleado.id == FichajeMarcaje.empleado_id)
    if empleado_id:
        consulta = consulta.filter(FichajeMarcaje.empleado_id == empleado_id)
    if desde:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora >= datetime.combine(desde, time.min).replace(tzinfo=ZoneInfo("Europe/Madrid")))
    if hasta:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora < datetime.combine(hasta + timedelta(days=1), time.min).replace(tzinfo=ZoneInfo("Europe/Madrid")))
    if tipo:
        consulta = consulta.filter(FichajeMarcaje.tipo == tipo.strip().upper())
    if busqueda and busqueda.strip():
        patron = "%" + busqueda.strip()[:100] + "%"
        consulta = consulta.filter((Empleado.nombre.ilike(patron)) | (Empleado.apellidos.ilike(patron)) | (Empleado.usuario.ilike(patron)) | (FichajeMarcaje.observaciones.ilike(patron)))
    filas = consulta.order_by(desc(FichajeMarcaje.fecha_hora)).limit(5000).all()
    ids = [m.id for m, _ in filas]
    ultima_accion = {}
    if ids:
        auditorias = db.query(FichajeMarcajeAuditoria.marcaje_id, FichajeMarcajeAuditoria.accion, FichajeMarcajeAuditoria.creado_en).filter(
            FichajeMarcajeAuditoria.marcaje_id.in_(ids)
        ).order_by(desc(FichajeMarcajeAuditoria.creado_en)).all()
        for audit_id, accion, creado_en in auditorias:
            if audit_id not in ultima_accion:
                ultima_accion[audit_id] = accion
    resultado = []
    for m, e in filas:
        modificado = m.id in ultima_accion
        if estado == "MODIFICADO" and not modificado:
            continue
        if estado == "ORIGINAL" and modificado:
            continue
        resultado.append({**_marcaje_dict(m), "empleado_nombre": _nombre_completo(e) or e.usuario,
                          "creado_por_id": m.creado_por_id, "modificado": modificado, "ultima_accion": ultima_accion.get(m.id),
                          "periodo_cerrado": _periodo_esta_cerrado(db, m.fecha_hora)})
    return resultado


@router.get("/admin/marcajes/exportar")
def admin_exportar_marcajes(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    empleado_id: int | None = Query(default=None),
    tipo: str | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exporta el registro horario detallado y su resumen diario con historial de correcciones."""
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    if desde and hasta and desde > hasta:
        raise HTTPException(status_code=422, detail="La fecha inicial no puede ser posterior a la fecha final.")

    consulta = db.query(FichajeMarcaje, Empleado).join(
        Empleado, Empleado.id == FichajeMarcaje.empleado_id
    )
    if empleado_id:
        consulta = consulta.filter(FichajeMarcaje.empleado_id == empleado_id)
    if desde:
        consulta = consulta.filter(
            FichajeMarcaje.fecha_hora >= datetime.combine(desde, time.min).replace(tzinfo=ZoneInfo("Europe/Madrid"))
        )
    if hasta:
        consulta = consulta.filter(
            FichajeMarcaje.fecha_hora < datetime.combine(hasta + timedelta(days=1), time.min).replace(tzinfo=ZoneInfo("Europe/Madrid"))
        )
    if tipo:
        consulta = consulta.filter(FichajeMarcaje.tipo == tipo.strip().upper())
    filas = consulta.order_by(FichajeMarcaje.empleado_id, FichajeMarcaje.fecha_hora, FichajeMarcaje.id).all()

    ids = [marcaje.id for marcaje, _ in filas]
    historial_por_marcaje = {}
    if ids:
        auditorias = db.query(FichajeMarcajeAuditoria).filter(
            FichajeMarcajeAuditoria.marcaje_id.in_(ids)
        ).order_by(FichajeMarcajeAuditoria.creado_en, FichajeMarcajeAuditoria.id).all()
        for auditoria in auditorias:
            historial_por_marcaje.setdefault(auditoria.marcaje_id, []).append({
                "accion": auditoria.accion,
                "actor_id": auditoria.actor_id,
                "motivo": auditoria.motivo,
                "datos_anteriores": json.loads(auditoria.datos_anteriores) if auditoria.datos_anteriores else None,
                "datos_nuevos": json.loads(auditoria.datos_nuevos) if auditoria.datos_nuevos else None,
                "registrado_en": auditoria.creado_en.isoformat() if auditoria.creado_en else None,
            })

    def fecha_local(marcaje):
        instante = marcaje.fecha_hora
        if instante is None:
            return None
        if instante.tzinfo is None:
            instante = instante.replace(tzinfo=timezone.utc)
        return instante.astimezone(ZoneInfo("Europe/Madrid"))

    resumen_diario = {}
    for marcaje, _empleado in filas:
        instante = fecha_local(marcaje)
        if instante is None:
            continue
        clave = (marcaje.empleado_id, instante.date().isoformat())
        resumen = resumen_diario.setdefault(clave, {"inicio": None, "fin": None})
        if marcaje.tipo == "ENTRADA" and (resumen["inicio"] is None or instante < resumen["inicio"]):
            resumen["inicio"] = instante
        if marcaje.tipo == "SALIDA" and (resumen["fin"] is None or instante > resumen["fin"]):
            resumen["fin"] = instante

    salida = StringIO()
    salida.write("\ufeff")
    escritor = csv.writer(salida, delimiter=";", lineterminator="\r\n")
    escritor.writerow([
        "ID empleado", "Empleado", "Fecha jornada", "Inicio jornada", "Fin jornada",
        "ID marcaje", "Fecha y hora del evento", "Tipo de evento", "Observaciones",
        "Marcaje modificado", "Historial de auditoría (JSON)",
    ])
    for marcaje, empleado in filas:
        instante = fecha_local(marcaje)
        if instante is None:
            continue
        clave = (marcaje.empleado_id, instante.date().isoformat())
        resumen = resumen_diario.get(clave, {})
        inicio = resumen.get("inicio")
        fin = resumen.get("fin")
        historial = historial_por_marcaje.get(marcaje.id, [])
        escritor.writerow([
            marcaje.empleado_id,
            _nombre_completo(empleado) or empleado.usuario,
            instante.date().isoformat(),
            inicio.strftime("%H:%M:%S") if inicio else "",
            fin.strftime("%H:%M:%S") if fin else "",
            marcaje.id,
            instante.isoformat(),
            marcaje.tipo,
            marcaje.observaciones or "",
            "SI" if historial else "NO",
            json.dumps(historial, ensure_ascii=False, default=str),
        ])

    # Incluir también el rastro de marcajes eliminados: la FK deja marcaje_id
    # a NULL, pero los snapshots de auditoría deben seguir siendo exportables.
    auditorias_huerfanas = db.query(FichajeMarcajeAuditoria).filter(
        FichajeMarcajeAuditoria.marcaje_id.is_(None)
    )
    if empleado_id:
        auditorias_huerfanas = auditorias_huerfanas.filter(
            FichajeMarcajeAuditoria.empleado_id == empleado_id
        )
    for auditoria in auditorias_huerfanas.order_by(
        FichajeMarcajeAuditoria.creado_en, FichajeMarcajeAuditoria.id
    ).all():
        try:
            snapshot = json.loads(auditoria.datos_anteriores or auditoria.datos_nuevos or "{}")
            fecha_snapshot = datetime.fromisoformat(str(snapshot.get("fecha_hora", "")).replace("Z", "+00:00"))
            if fecha_snapshot.tzinfo is None:
                fecha_snapshot = fecha_snapshot.replace(tzinfo=ZoneInfo("Europe/Madrid"))
            fecha_snapshot = fecha_snapshot.astimezone(ZoneInfo("Europe/Madrid"))
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        if desde and fecha_snapshot.date() < desde:
            continue
        if hasta and fecha_snapshot.date() > hasta:
            continue
        if tipo and str(snapshot.get("tipo", "")).strip().upper() != tipo.strip().upper():
            continue
        empleado = db.query(Empleado).filter(Empleado.id == auditoria.empleado_id).first()
        escritor.writerow([
            auditoria.empleado_id,
            (_nombre_completo(empleado) or empleado.usuario) if empleado else f"Empleado {auditoria.empleado_id}",
            fecha_snapshot.date().isoformat(),
            "",
            "",
            "SIN MARCA ACTUAL",
            fecha_snapshot.isoformat(),
            auditoria.accion,
            auditoria.motivo,
            "SI",
            json.dumps([{
                "accion": auditoria.accion,
                "actor_id": auditoria.actor_id,
                "motivo": auditoria.motivo,
                "datos_anteriores": snapshot,
                "datos_nuevos": json.loads(auditoria.datos_nuevos) if auditoria.datos_nuevos else None,
                "registrado_en": auditoria.creado_en.isoformat() if auditoria.creado_en else None,
            }], ensure_ascii=False, default=str),
        ])

    contenido = salida.getvalue().encode("utf-8")
    nombre = f"registro_jornada_{desde.isoformat() if desde else 'inicio'}_{hasta.isoformat() if hasta else 'actualidad'}.csv"
    return StreamingResponse(
        iter([contenido]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(nombre)}"},
    )


@router.post("/admin/marcajes")
def admin_crear_marcaje(
    empleado_id: int = Form(...),
    tipo: str = Form(...),
    fecha_hora: str = Form(...),
    motivo: str = Form(...),
    observaciones: str = Form(""),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "crear")
    _exigir_admin(usuario)
    motivo = (motivo or "").strip()
    if len(motivo) < 5:
        raise HTTPException(status_code=422, detail="Indica un motivo de al menos cinco caracteres para el marcaje añadido.")
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="No se encuentra el empleado seleccionado.")
    tipo = tipo.strip().upper()
    if tipo not in TIPOS_MARCAJE and tipo != "AUSENCIA_PUNTUAL":
        raise HTTPException(status_code=422, detail="Tipo de marcaje no válido.")
    try:
        instante = datetime.fromisoformat(fecha_hora)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Fecha y hora no válidas.")
    if instante.tzinfo is None:
        instante = instante.replace(tzinfo=ZoneInfo("Europe/Madrid"))
    _exigir_periodo_abierto(db, instante)
    marcaje = FichajeMarcaje(empleado_id=empleado_id, tipo=tipo, fecha_hora=instante,
                            observaciones=(observaciones or "").strip()[:500] or None, creado_por_id=usuario.id)
    db.add(marcaje)
    db.flush()
    nuevo = _snapshot_marcaje(marcaje)
    _registrar_auditoria_marcaje(db, marcaje, usuario, "ALTA_ADMIN", None, nuevo, motivo)
    db.commit()
    db.refresh(marcaje)
    return {**_marcaje_dict(marcaje), "creado_por_id": usuario.id, "modificado": True}


@router.patch("/admin/marcajes/{marcaje_id}")
def admin_editar_marcaje(
    marcaje_id: int,
    empleado_id: int = Form(...),
    tipo: str = Form(...),
    fecha_hora: str = Form(...),
    motivo: str = Form(...),
    observaciones: str = Form(""),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    motivo = (motivo or "").strip()
    if len(motivo) < 5:
        raise HTTPException(status_code=422, detail="Indica el motivo de la corrección (mínimo cinco caracteres).")
    marcaje = db.query(FichajeMarcaje).filter(FichajeMarcaje.id == marcaje_id).with_for_update().first()
    if not marcaje:
        raise HTTPException(status_code=404, detail="El marcaje que quieres corregir no existe.")
    try:
        nuevo_instante = datetime.fromisoformat(fecha_hora)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Fecha y hora no válidas.")
    if nuevo_instante.tzinfo is None:
        nuevo_instante = nuevo_instante.replace(tzinfo=ZoneInfo("Europe/Madrid"))
    _exigir_periodo_abierto(db, marcaje.fecha_hora)
    _exigir_periodo_abierto(db, nuevo_instante)
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="No se encuentra el empleado seleccionado.")
    tipo = tipo.strip().upper()
    if tipo not in TIPOS_MARCAJE and tipo != "AUSENCIA_PUNTUAL":
        raise HTTPException(status_code=422, detail="Tipo de marcaje no válido.")
    anterior = _snapshot_marcaje(marcaje)
    marcaje.empleado_id = empleado_id
    marcaje.tipo = tipo
    marcaje.fecha_hora = nuevo_instante
    marcaje.observaciones = (observaciones or "").strip()[:500] or None
    nuevo = _snapshot_marcaje(marcaje)
    _registrar_auditoria_marcaje(db, marcaje, usuario, "CORRECCION_ADMIN", anterior, nuevo, motivo)
    db.commit()
    db.refresh(marcaje)
    return {**_marcaje_dict(marcaje), "creado_por_id": marcaje.creado_por_id, "modificado": True}


@router.get("/admin/marcajes/{marcaje_id}/auditoria")
def admin_auditoria_marcaje(marcaje_id: int, usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    registros = db.query(FichajeMarcajeAuditoria, Empleado).outerjoin(Empleado, Empleado.id == FichajeMarcajeAuditoria.actor_id).filter(
        FichajeMarcajeAuditoria.marcaje_id == marcaje_id
    ).order_by(FichajeMarcajeAuditoria.creado_en.desc()).all()
    return [{
        "id": a.id, "marcaje_id": a.marcaje_id, "empleado_id": a.empleado_id,
        "actor_id": a.actor_id, "actor_nombre": (_nombre_completo(actor) or actor.usuario) if actor else "Usuario eliminado",
        "accion": a.accion, "datos_anteriores": json.loads(a.datos_anteriores) if a.datos_anteriores else None,
        "datos_nuevos": json.loads(a.datos_nuevos), "motivo": a.motivo,
        "creado_en": a.creado_en.isoformat() if a.creado_en else None
    } for a, actor in registros]


@router.get("/admin/periodos")
def admin_listar_periodos(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    return [{"anio": p.anio, "mes": p.mes, "cerrado": bool(p.cerrado), "motivo": p.motivo,
             "actualizado_en": p.actualizado_en.isoformat() if p.actualizado_en else None}
            for p in db.query(FichajePeriodoCerrado).order_by(FichajePeriodoCerrado.anio.desc(), FichajePeriodoCerrado.mes.desc()).all()]


@router.post("/admin/periodos")
def admin_cambiar_periodo(
    anio: int = Form(...), mes: int = Form(...), cerrado: bool = Form(...), motivo: str = Form(...),
    usuario=Depends(get_current_user), db: Session = Depends(get_db)
):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    if anio < 2000 or anio > 2100 or mes < 1 or mes > 12:
        raise HTTPException(status_code=422, detail="Mes o año no válidos.")
    motivo = (motivo or "").strip()
    if len(motivo) < 5:
        raise HTTPException(status_code=422, detail="Indica un motivo para cerrar o reabrir el periodo.")
    periodo = db.query(FichajePeriodoCerrado).filter(FichajePeriodoCerrado.anio == anio, FichajePeriodoCerrado.mes == mes).with_for_update().first()
    if not periodo:
        periodo = FichajePeriodoCerrado(anio=anio, mes=mes, cerrado=1 if cerrado else 0, motivo=motivo, actor_id=usuario.id)
        db.add(periodo)
    else:
        periodo.cerrado = 1 if cerrado else 0
        periodo.motivo = motivo
        periodo.actor_id = usuario.id
    db.commit()
    return {"anio": anio, "mes": mes, "cerrado": bool(cerrado), "motivo": motivo}


 
@router.get("/catalogo-ausencias")
def listar_tipos_ausencia(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    return [{"id": x.id, "nombre": x.nombre, "requiere_justificante": bool(x.requiere_justificante)}
            for x in db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.activo == 1).order_by(FichajeTipoAusencia.nombre).all()]


@router.post("/catalogo-ausencias")
def crear_tipo_ausencia(nombre: str = Form(...), requiere_justificante: bool = Form(False),
                        usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "crear")
    _exigir_admin(usuario)
    nombre = nombre.strip()
    if not nombre or len(nombre) > 120:
        raise HTTPException(status_code=422, detail="Indica un nombre de ausencia de hasta 120 caracteres.")
    if db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.nombre.ilike(nombre)).first():
        raise HTTPException(status_code=409, detail="Ese tipo de ausencia ya existe.")
    item = FichajeTipoAusencia(nombre=nombre, requiere_justificante=1 if requiere_justificante else 0, activo=1)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id, "nombre": item.nombre, "requiere_justificante": bool(item.requiere_justificante)}


@router.get("/vacaciones")
def mis_vacaciones(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    anio = _hoy_madrid().year
    registros = db.query(FichajeVacaciones).filter(FichajeVacaciones.empleado_id == usuario.id,
        FichajeVacaciones.fecha_inicio >= date(anio, 1, 1), FichajeVacaciones.fecha_inicio < date(anio + 1, 1, 1)).order_by(FichajeVacaciones.fecha_inicio).all()
    hoy = _hoy_madrid()
    aprobadas = [v for v in registros if v.estado == "APROBADO"]
    disfrutados = sum(
        min(v.dias, max(0, (min(hoy, v.fecha_fin) - v.fecha_inicio).days + 1))
        for v in aprobadas if v.fecha_inicio <= hoy
    )
    reservados = sum(
        max(0, v.dias - min(v.dias, max(0, (min(hoy, v.fecha_fin) - v.fecha_inicio).days + 1)))
        for v in aprobadas if v.fecha_fin >= hoy
    )
    bolsa = db.query(FichajeBolsaVacaciones).filter(FichajeBolsaVacaciones.empleado_id == usuario.id, FichajeBolsaVacaciones.anio == anio).first()
    asignados = bolsa.dias_asignados if bolsa else None
    comprometidos = sum(v.dias for v in aprobadas)
    return {"anio": anio, "dias_asignados": asignados, "dias_disfrutados": disfrutados,
            "dias_reservados": reservados,
            "dias_restantes": max(0, asignados - comprometidos) if asignados is not None else None,
            "registros": [{"id": v.id, "fecha_inicio": v.fecha_inicio.isoformat(), "fecha_fin": v.fecha_fin.isoformat(), "dias": v.dias, "estado": v.estado, "observaciones": v.observaciones} for v in registros],
            "aviso": "Los días restantes descuentan las vacaciones aprobadas, incluidas las fechas futuras reservadas. Las solicitudes pendientes no consumen saldo."}


@router.post("/vacaciones")
def solicitar_vacaciones(fecha_inicio: date = Form(...), fecha_fin: date = Form(...), observaciones: str = Form(""),
                          usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "crear")
    if fecha_fin < fecha_inicio:
        raise HTTPException(status_code=422, detail="La fecha final no puede ser anterior a la inicial.")
    if fecha_inicio.year != fecha_fin.year:
        raise HTTPException(status_code=422, detail="Divide la solicitud si abarca dos años naturales.")
    dias = (fecha_fin - fecha_inicio).days + 1
    if dias > 60:
        raise HTTPException(status_code=422, detail="Una solicitud no puede superar 60 días naturales.")
    vacaciones_solapadas = db.query(FichajeVacaciones).filter(
        FichajeVacaciones.empleado_id == usuario.id,
        FichajeVacaciones.estado.in_({"SOLICITADO", "APROBADO"}),
        FichajeVacaciones.fecha_inicio <= fecha_fin,
        FichajeVacaciones.fecha_fin >= fecha_inicio,
    ).first()
    if vacaciones_solapadas:
        raise HTTPException(status_code=409, detail="Ya existe otra solicitud de vacaciones pendiente o aprobada que coincide con esas fechas.")
    ausencia_solapada = db.query(FichajeSolicitudAusencia).filter(
        FichajeSolicitudAusencia.empleado_id == usuario.id,
        FichajeSolicitudAusencia.estado.in_({"SOLICITADO", "APROBADO"}),
        FichajeSolicitudAusencia.fecha_inicio <= fecha_fin,
        FichajeSolicitudAusencia.fecha_fin >= fecha_inicio,
    ).first()
    if ausencia_solapada:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de ausencia pendiente o aprobada dentro de esas fechas.")
    compensacion_duplicada = db.query(FichajeSolicitudCompensacion).filter(
        FichajeSolicitudCompensacion.empleado_id == usuario.id,
        FichajeSolicitudCompensacion.fecha_disfrute >= fecha_inicio,
        FichajeSolicitudCompensacion.fecha_disfrute <= fecha_fin,
        FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
    ).first()
    if compensacion_duplicada:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de compensación dentro de ese periodo. No se puede reservar también como vacaciones ordinarias.")
    registro = FichajeVacaciones(empleado_id=usuario.id, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin, dias=dias,
        estado="SOLICITADO", observaciones=(observaciones or "").strip()[:500] or None)
    db.add(registro); db.commit(); db.refresh(registro)
    return {"id": registro.id, "estado": registro.estado, "dias": registro.dias}


@router.get("/solicitudes-ausencia")
def listar_mis_solicitudes_ausencia(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    filas = db.query(FichajeSolicitudAusencia).filter(FichajeSolicitudAusencia.empleado_id == usuario.id).order_by(desc(FichajeSolicitudAusencia.creado_en)).limit(500).all()
    return [{"id": a.id, "fecha_inicio": a.fecha_inicio.isoformat(), "fecha_fin": a.fecha_fin.isoformat(),
             "tipo_ausencia": a.tipo_ausencia, "observaciones": a.observaciones, "estado": a.estado,
             "creado_en": a.creado_en.isoformat() if a.creado_en else None, "motivo_resolucion": a.motivo_resolucion}
            for a in filas]


@router.post("/solicitudes-ausencia")
def crear_solicitud_ausencia(
    fecha_inicio: date = Form(...), fecha_fin: date = Form(...), tipo_ausencia: str = Form(...),
    observaciones: str = Form(""), usuario=Depends(get_current_user), db: Session = Depends(get_db)
):
    require_perm_modulo(usuario, "fichajes", "crear")
    if fecha_fin < fecha_inicio:
        raise HTTPException(status_code=422, detail="La fecha final no puede ser anterior a la inicial.")
    if (fecha_fin - fecha_inicio).days > 60:
        raise HTTPException(status_code=422, detail="Una solicitud no puede superar 60 días naturales.")
    tipo = (tipo_ausencia or "").strip()
    catalogo = db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.nombre == tipo, FichajeTipoAusencia.activo == 1).first()
    if not catalogo:
        raise HTTPException(status_code=422, detail="Selecciona un tipo de ausencia válido.")
    solapada = db.query(FichajeSolicitudAusencia).filter(
        FichajeSolicitudAusencia.empleado_id == usuario.id,
        FichajeSolicitudAusencia.estado.in_({"SOLICITADO", "APROBADO"}),
        FichajeSolicitudAusencia.fecha_inicio <= fecha_fin,
        FichajeSolicitudAusencia.fecha_fin >= fecha_inicio,
    ).first()
    if solapada:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de ausencia pendiente o aprobada en esas fechas.")
    vacaciones = db.query(FichajeVacaciones).filter(
        FichajeVacaciones.empleado_id == usuario.id,
        FichajeVacaciones.estado.in_({"SOLICITADO", "APROBADO"}),
        FichajeVacaciones.fecha_inicio <= fecha_fin,
        FichajeVacaciones.fecha_fin >= fecha_inicio,
    ).first()
    if vacaciones:
        raise HTTPException(status_code=409, detail="Ya hay una solicitud de vacaciones pendiente o aprobada en esas fechas.")
    compensacion = db.query(FichajeSolicitudCompensacion).filter(
        FichajeSolicitudCompensacion.empleado_id == usuario.id,
        FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
        FichajeSolicitudCompensacion.fecha_disfrute >= fecha_inicio,
        FichajeSolicitudCompensacion.fecha_disfrute <= fecha_fin,
    ).first()
    if compensacion:
        raise HTTPException(status_code=409, detail="Ya hay una solicitud de compensación pendiente o aprobada en esas fechas.")
    registro = FichajeSolicitudAusencia(empleado_id=usuario.id, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
        tipo_ausencia=tipo, observaciones=(observaciones or "").strip()[:500] or None, estado="SOLICITADO")
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return {"id": registro.id, "estado": registro.estado}


@router.get("/admin/solicitudes-ausencia")
def admin_listar_solicitudes_ausencia(
    estado: str | None = Query(default=None), empleado_id: int | None = Query(default=None),
    desde: date | None = Query(default=None), hasta: date | None = Query(default=None),
    usuario=Depends(get_current_user), db: Session = Depends(get_db)
):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    consulta = db.query(FichajeSolicitudAusencia, Empleado).join(Empleado, Empleado.id == FichajeSolicitudAusencia.empleado_id)
    if estado:
        consulta = consulta.filter(FichajeSolicitudAusencia.estado == estado.strip().upper())
    if empleado_id:
        consulta = consulta.filter(FichajeSolicitudAusencia.empleado_id == empleado_id)
    if desde:
        consulta = consulta.filter(FichajeSolicitudAusencia.fecha_fin >= desde)
    if hasta:
        consulta = consulta.filter(FichajeSolicitudAusencia.fecha_inicio <= hasta)
    return [{"id": a.id, "empleado_id": a.empleado_id, "empleado_nombre": _nombre_completo(e) or e.usuario,
             "fecha_inicio": a.fecha_inicio.isoformat(), "fecha_fin": a.fecha_fin.isoformat(), "tipo_ausencia": a.tipo_ausencia,
             "observaciones": a.observaciones, "estado": a.estado, "creado_en": a.creado_en.isoformat() if a.creado_en else None,
             "motivo_resolucion": a.motivo_resolucion} for a, e in consulta.order_by(desc(FichajeSolicitudAusencia.creado_en)).limit(2000).all()]


@router.patch("/admin/solicitudes-ausencia/{solicitud_id}")
def admin_resolver_solicitud_ausencia(
    solicitud_id: int, estado: str = Form(...), motivo: str = Form(...),
    usuario=Depends(get_current_user), db: Session = Depends(get_db)
):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    registro = db.query(FichajeSolicitudAusencia).filter(FichajeSolicitudAusencia.id == solicitud_id).with_for_update().first()
    if not registro:
        raise HTTPException(status_code=404, detail="No se encuentra la solicitud de ausencia.")
    if registro.estado != "SOLICITADO":
        raise HTTPException(status_code=409, detail="Esta solicitud ya se ha resuelto.")
    estado = estado.strip().upper()
    if estado not in {"APROBADO", "RECHAZADO"}:
        raise HTTPException(status_code=422, detail="Estado de resolución no válido.")
    motivo = (motivo or "").strip()
    if len(motivo) < 5:
        raise HTTPException(status_code=422, detail="Indica el motivo de la resolución (mínimo cinco caracteres).")
    if estado == "APROBADO":
        vacaciones = db.query(FichajeVacaciones).filter(
            FichajeVacaciones.empleado_id == registro.empleado_id,
            FichajeVacaciones.estado.in_({"SOLICITADO", "APROBADO"}),
            FichajeVacaciones.fecha_inicio <= registro.fecha_fin,
            FichajeVacaciones.fecha_fin >= registro.fecha_inicio,
        ).first()
        if vacaciones:
            raise HTTPException(status_code=409, detail="La solicitud se solapa con vacaciones ya aprobadas.")
        otra = db.query(FichajeSolicitudAusencia).filter(
            FichajeSolicitudAusencia.id != registro.id,
            FichajeSolicitudAusencia.empleado_id == registro.empleado_id,
            FichajeSolicitudAusencia.estado.in_({"SOLICITADO", "APROBADO"}),
            FichajeSolicitudAusencia.fecha_inicio <= registro.fecha_fin,
            FichajeSolicitudAusencia.fecha_fin >= registro.fecha_inicio,
        ).first()
        if otra:
            raise HTTPException(status_code=409, detail="La solicitud se solapa con otra ausencia aprobada.")
        compensacion = db.query(FichajeSolicitudCompensacion).filter(
            FichajeSolicitudCompensacion.empleado_id == registro.empleado_id,
            FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
            FichajeSolicitudCompensacion.fecha_disfrute >= registro.fecha_inicio,
            FichajeSolicitudCompensacion.fecha_disfrute <= registro.fecha_fin,
        ).first()
        if compensacion:
            raise HTTPException(status_code=409, detail="La solicitud se solapa con una compensación pendiente o aprobada.")
    registro.estado = estado
    registro.motivo_resolucion = motivo[:500]
    registro.resuelto_por_id = usuario.id
    registro.resuelto_en = datetime.now()
    db.commit()
    return {"id": registro.id, "estado": registro.estado, "motivo_resolucion": registro.motivo_resolucion}


@router.get("/admin/vacaciones")
def admin_listar_solicitudes_vacaciones(
    estado: str | None = Query(default=None),
    empleado_id: int | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    consulta = db.query(FichajeVacaciones, Empleado).join(
        Empleado, Empleado.id == FichajeVacaciones.empleado_id
    )
    if estado:
        consulta = consulta.filter(FichajeVacaciones.estado == estado.strip().upper())
    if empleado_id:
        consulta = consulta.filter(FichajeVacaciones.empleado_id == empleado_id)
    filas = consulta.order_by(desc(FichajeVacaciones.creado_en)).limit(2000).all()
    return [{
        "id": v.id,
        "empleado_id": v.empleado_id,
        "empleado_nombre": _nombre_completo(e) or e.usuario,
        "fecha_inicio": v.fecha_inicio.isoformat(),
        "fecha_fin": v.fecha_fin.isoformat(),
        "dias": v.dias,
        "estado": v.estado,
        "observaciones": v.observaciones,
        "creado_en": v.creado_en.isoformat() if v.creado_en else None,
    } for v, e in filas]


@router.patch("/admin/vacaciones/{solicitud_id}")
def admin_resolver_solicitud_vacaciones(
    solicitud_id: int,
    estado: str = Form(...),
    observaciones: str = Form(""),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    solicitud = db.query(FichajeVacaciones).filter(
        FichajeVacaciones.id == solicitud_id
    ).with_for_update().first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud de vacaciones no encontrada.")
    if solicitud.estado != "SOLICITADO":
        raise HTTPException(status_code=409, detail="Esta solicitud ya se ha resuelto.")
    estado = estado.strip().upper()
    if estado not in {"APROBADO", "RECHAZADO"}:
        raise HTTPException(status_code=422, detail="El estado debe ser APROBADO o RECHAZADO.")
    if estado == "APROBADO":
        conflicto_vacaciones = db.query(FichajeVacaciones).filter(
            FichajeVacaciones.empleado_id == solicitud.empleado_id,
            FichajeVacaciones.id != solicitud.id,
            FichajeVacaciones.estado == "APROBADO",
            FichajeVacaciones.fecha_inicio <= solicitud.fecha_fin,
            FichajeVacaciones.fecha_fin >= solicitud.fecha_inicio,
        ).first()
        if conflicto_vacaciones:
            raise HTTPException(status_code=409, detail="No se puede aprobar: las fechas coinciden con otras vacaciones ya aprobadas.")
        conflicto_compensacion = db.query(FichajeSolicitudCompensacion).filter(
            FichajeSolicitudCompensacion.empleado_id == solicitud.empleado_id,
            FichajeSolicitudCompensacion.fecha_disfrute >= solicitud.fecha_inicio,
            FichajeSolicitudCompensacion.fecha_disfrute <= solicitud.fecha_fin,
            FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
        ).first()
        if conflicto_compensacion:
            raise HTTPException(status_code=409, detail="No se puede aprobar: hay una solicitud de compensación en esas fechas.")
        conflicto_ausencia = db.query(FichajeSolicitudAusencia).filter(
            FichajeSolicitudAusencia.empleado_id == solicitud.empleado_id,
            FichajeSolicitudAusencia.estado.in_({"SOLICITADO", "APROBADO"}),
            FichajeSolicitudAusencia.fecha_inicio <= solicitud.fecha_fin,
            FichajeSolicitudAusencia.fecha_fin >= solicitud.fecha_inicio,
        ).first()
        if conflicto_ausencia:
            raise HTTPException(status_code=409, detail="No se puede aprobar: hay una solicitud de ausencia pendiente o aprobada en esas fechas.")
        bolsa = db.query(FichajeBolsaVacaciones).filter(
            FichajeBolsaVacaciones.empleado_id == solicitud.empleado_id,
            FichajeBolsaVacaciones.anio == solicitud.fecha_inicio.year,
        ).first()
        if not bolsa:
            raise HTTPException(status_code=409, detail="No se puede aprobar: administración todavía no ha asignado las vacaciones de este empleado para ese año.")
        comprometidos = sum(v.dias for v in db.query(FichajeVacaciones).filter(
            FichajeVacaciones.empleado_id == solicitud.empleado_id,
            FichajeVacaciones.estado == "APROBADO",
            FichajeVacaciones.id != solicitud.id,
            FichajeVacaciones.fecha_inicio >= date(solicitud.fecha_inicio.year, 1, 1),
            FichajeVacaciones.fecha_inicio < date(solicitud.fecha_inicio.year + 1, 1, 1),
        ).all())
        if comprometidos + solicitud.dias > bolsa.dias_asignados:
            raise HTTPException(status_code=409, detail="No se puede aprobar: la solicitud supera el saldo de vacaciones asignado.")
    solicitud.estado = estado
    if observaciones.strip():
        solicitud.observaciones = (solicitud.observaciones or "")
        solicitud.observaciones += (" | " if solicitud.observaciones else "") + observaciones.strip()[:400]
    db.commit()
    db.refresh(solicitud)
    return {"id": solicitud.id, "estado": solicitud.estado, "dias": solicitud.dias}


@router.get("/admin/documentos")
def admin_listar_documentos(
    empleado_id: int | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    consulta = db.query(FichajeDocumento, Empleado).join(
        Empleado, Empleado.id == FichajeDocumento.empleado_id
    )
    if empleado_id:
        consulta = consulta.filter(FichajeDocumento.empleado_id == empleado_id)
    if desde:
        consulta = consulta.filter(FichajeDocumento.fecha_documento >= desde)
    if hasta:
        consulta = consulta.filter(FichajeDocumento.fecha_documento <= hasta)
    filas = consulta.order_by(desc(FichajeDocumento.subido_en)).limit(2000).all()
    resultado = []
    for d, e in filas:
        revision = db.query(FichajeDocumentoRevision).filter(FichajeDocumentoRevision.documento_id == d.id).order_by(desc(FichajeDocumentoRevision.creado_en)).first()
        resultado.append({**_documento_dict(d), "empleado_nombre": _nombre_completo(e) or e.usuario, "revision_estado": revision.estado if revision else "PENDIENTE", "revision_motivo": revision.motivo if revision else None})
    return resultado



@router.patch("/admin/documentos/{documento_id}/revision")
def admin_revisar_documento(
    documento_id: int, estado: str = Form(...), motivo: str = Form(...),
    usuario=Depends(get_current_user), db: Session = Depends(get_db)
):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    documento = db.query(FichajeDocumento).filter(FichajeDocumento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="No se encuentra el justificante.")
    estado = estado.strip().upper()
    if estado not in {"APROBADO", "RECHAZADO"}:
        raise HTTPException(status_code=422, detail="La revisión debe aprobarse o rechazarse.")
    motivo = (motivo or "").strip()
    if len(motivo) < 5:
        raise HTTPException(status_code=422, detail="Indica el motivo de la revisión (mínimo cinco caracteres).")
    revision = FichajeDocumentoRevision(documento_id=documento_id, estado=estado, motivo=motivo[:500], actor_id=usuario.id)
    db.add(revision)
    db.commit()
    db.refresh(revision)
    return {"id": revision.id, "documento_id": documento_id, "estado": estado, "motivo": revision.motivo,
            "creado_en": revision.creado_en.isoformat() if revision.creado_en else None}


@router.get("/admin/vacaciones-bolsa")
def admin_listar_bolsas_vacaciones(anio: int | None = Query(default=None),
                                   usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    anio = anio or _hoy_madrid().year
    filas = db.query(FichajeBolsaVacaciones, Empleado).join(Empleado, Empleado.id == FichajeBolsaVacaciones.empleado_id).filter(FichajeBolsaVacaciones.anio == anio).all()
    return [{"empleado_id": b.empleado_id, "empleado_nombre": _nombre_completo(e) or e.usuario, "anio": b.anio, "dias_asignados": b.dias_asignados} for b, e in filas]


@router.post("/admin/vacaciones-bolsa")
def admin_configurar_bolsa_vacaciones(empleado_id: int = Form(...), anio: int = Form(...), dias_asignados: int = Form(...),
                                      usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "crear")
    _exigir_admin(usuario)
    if anio < 2000 or anio > 2100 or dias_asignados < 0 or dias_asignados > 60:
        raise HTTPException(status_code=422, detail="Indica un año válido y entre 0 y 60 días asignados.")
    if not db.query(Empleado).filter(Empleado.id == empleado_id).first():
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    bolsa = db.query(FichajeBolsaVacaciones).filter(FichajeBolsaVacaciones.empleado_id == empleado_id, FichajeBolsaVacaciones.anio == anio).first()
    comprometidos = sum(v.dias for v in db.query(FichajeVacaciones).filter(
        FichajeVacaciones.empleado_id == empleado_id,
        FichajeVacaciones.estado == "APROBADO",
        FichajeVacaciones.fecha_inicio >= date(anio, 1, 1),
        FichajeVacaciones.fecha_inicio < date(anio + 1, 1, 1),
    ).all())
    if comprometidos > dias_asignados:
        raise HTTPException(status_code=409, detail=f"No se puede asignar {dias_asignados} días: ya hay {comprometidos} días de vacaciones aprobados para ese año.")
    if bolsa:
        bolsa.dias_asignados = dias_asignados
    else:
        bolsa = FichajeBolsaVacaciones(empleado_id=empleado_id, anio=anio, dias_asignados=dias_asignados)
        db.add(bolsa)
    db.commit()
    return {"empleado_id": empleado_id, "anio": anio, "dias_asignados": dias_asignados}


# ---------------------------------------------------------------------------
# Festivos trabajados y bolsa independiente de compensación
# ---------------------------------------------------------------------------
UNIDADES_COMPENSACION = {"DIAS", "HORAS"}
ESTADOS_FESTIVO = {"VALIDADO", "RECHAZADO"}
ESTADOS_SOLICITUD = {"APROBADO", "RECHAZADO"}


def _auditar_compensacion(db, empleado_id, actor_id, entidad, entidad_id, accion,
                           anterior=None, nuevo=None, detalle=None):
    db.add(FichajeCompensacionAuditoria(
        empleado_id=empleado_id, actor_id=actor_id, entidad=entidad,
        entidad_id=entidad_id, accion=accion, estado_anterior=anterior,
        estado_nuevo=nuevo, detalle=(detalle or "")[:2000] or None,
    ))


def _saldo_compensacion(db, empleado_id, unidad):
    movimientos = db.query(FichajeCompensacionMovimiento).filter(
        FichajeCompensacionMovimiento.empleado_id == empleado_id,
        FichajeCompensacionMovimiento.unidad == unidad,
    ).all()
    saldo = sum(float(m.cantidad) * (-1 if m.tipo == "CONSUMO" else 1) for m in movimientos)
    return round(saldo, 2)


def _procesar_compensaciones_vencidas(db, empleado_id):
    """Convierte reservas aprobadas cuya fecha ya llegó en disfrutes efectivos."""
    hoy = _hoy_madrid()
    vencidas = db.query(FichajeSolicitudCompensacion).filter(
        FichajeSolicitudCompensacion.empleado_id == empleado_id,
        FichajeSolicitudCompensacion.estado == "APROBADO",
        FichajeSolicitudCompensacion.fecha_disfrute <= hoy,
    ).with_for_update().all()
    for s in vencidas:
        s.estado = "DISFRUTADO"
        db.add(FichajeCompensacionMovimiento(
            empleado_id=s.empleado_id, tipo="CONSUMO", cantidad=s.cantidad,
            unidad=s.unidad, fecha=s.fecha_disfrute, referencia_tipo="SOLICITUD",
            referencia_id=s.id, observaciones=f"Compensación disfrutada el {s.fecha_disfrute}",
            creado_por_id=s.resuelto_por_id,
        ))
        _auditar_compensacion(db, s.empleado_id, s.resuelto_por_id, "SOLICITUD", s.id,
                               "DISFRUTE_AUTOMATICO", "APROBADO", "DISFRUTADO",
                               f"Fecha de disfrute alcanzada: {s.fecha_disfrute}")
    if vencidas:
        db.flush()


def _saldo_disponible_compensacion(db, empleado_id, unidad):
    saldo = _saldo_compensacion(db, empleado_id, unidad)
    reservado = sum(float(s.cantidad) for s in db.query(FichajeSolicitudCompensacion).filter(
        FichajeSolicitudCompensacion.empleado_id == empleado_id,
        FichajeSolicitudCompensacion.unidad == unidad,
        FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
    ).all())
    return round(saldo - reservado, 2)


def _movimiento_dict(m):
    return {"id": m.id, "tipo": m.tipo, "cantidad": float(m.cantidad), "unidad": m.unidad,
            "fecha": m.fecha.isoformat(), "referencia_tipo": m.referencia_tipo,
            "referencia_id": m.referencia_id, "observaciones": m.observaciones,
            "creado_en": m.creado_en.isoformat() if m.creado_en else None}


def _festivo_dict(f, nombre=None):
    return {"id": f.id, "empleado_id": f.empleado_id, "empleado_nombre": nombre,
            "fecha": f.fecha.isoformat(), "horas_trabajadas": float(f.horas_trabajadas),
            "estado": f.estado, "observaciones": f.observaciones,
            "cantidad_compensable": float(f.cantidad_compensable) if f.cantidad_compensable is not None else None,
            "unidad_compensable": f.unidad_compensable,
            "creado_en": f.creado_en.isoformat() if f.creado_en else None,
            "validado_en": f.validado_en.isoformat() if f.validado_en else None}


def _solicitud_comp_dict(s, nombre=None):
    return {"id": s.id, "empleado_id": s.empleado_id, "empleado_nombre": nombre,
            "fecha_disfrute": s.fecha_disfrute.isoformat(), "cantidad": float(s.cantidad),
            "unidad": s.unidad, "estado": s.estado, "observaciones": s.observaciones,
            "creado_en": s.creado_en.isoformat() if s.creado_en else None,
            "resuelto_en": s.resuelto_en.isoformat() if s.resuelto_en else None}


@router.get("/compensaciones/resumen")
def resumen_mi_compensacion(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    _procesar_compensaciones_vencidas(db, usuario.id)
    db.commit()
    festivos = db.query(FichajeFestivoTrabajado).filter(
        FichajeFestivoTrabajado.empleado_id == usuario.id
    ).order_by(desc(FichajeFestivoTrabajado.fecha)).limit(300).all()
    solicitudes = db.query(FichajeSolicitudCompensacion).filter(
        FichajeSolicitudCompensacion.empleado_id == usuario.id
    ).order_by(desc(FichajeSolicitudCompensacion.fecha_disfrute)).limit(300).all()
    movimientos = db.query(FichajeCompensacionMovimiento).filter(
        FichajeCompensacionMovimiento.empleado_id == usuario.id
    ).order_by(desc(FichajeCompensacionMovimiento.creado_en)).limit(500).all()
    return {
        "saldo_dias": _saldo_disponible_compensacion(db, usuario.id, "DIAS"),
        "saldo_horas": _saldo_disponible_compensacion(db, usuario.id, "HORAS"),
        "festivos": [_festivo_dict(f) for f in festivos],
        "calendario_festivos": [{"id": x.id, "fecha": x.fecha.isoformat(), "nombre": x.nombre, "ambito": x.ambito} for x in db.query(FichajeFestivoCalendario).filter(FichajeFestivoCalendario.activo == 1).order_by(FichajeFestivoCalendario.fecha).all()],
        "solicitudes": [_solicitud_comp_dict(s) for s in solicitudes],
        "movimientos": [_movimiento_dict(m) for m in movimientos],
        "vacaciones_ordinarias_separadas": True,
    }


@router.post("/compensaciones/solicitudes")
def solicitar_compensacion(fecha_disfrute: date = Form(...), cantidad: float = Form(...),
                            unidad: str = Form("DIAS"), observaciones: str = Form(""),
                            usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "crear")
    unidad = (unidad or "").strip().upper()
    if unidad not in UNIDADES_COMPENSACION or cantidad <= 0 or cantidad > 100:
        raise HTTPException(status_code=422, detail="Indica una cantidad positiva y una unidad válida (días u horas).")
    if fecha_disfrute < _hoy_madrid():
        raise HTTPException(status_code=422, detail="La fecha de disfrute no puede estar en el pasado.")
    vacaciones_duplicadas = db.query(FichajeVacaciones).filter(
        FichajeVacaciones.empleado_id == usuario.id,
        FichajeVacaciones.fecha_inicio <= fecha_disfrute,
        FichajeVacaciones.fecha_fin >= fecha_disfrute,
        FichajeVacaciones.estado.in_({"SOLICITADO", "APROBADO"}),
    ).first()
    if vacaciones_duplicadas:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de vacaciones ordinarias para esa fecha. No se puede reservar también como compensación.")
    ausencia_duplicada = db.query(FichajeSolicitudAusencia).filter(
        FichajeSolicitudAusencia.empleado_id == usuario.id,
        FichajeSolicitudAusencia.fecha_inicio <= fecha_disfrute,
        FichajeSolicitudAusencia.fecha_fin >= fecha_disfrute,
        FichajeSolicitudAusencia.estado.in_({"SOLICITADO", "APROBADO"}),
    ).first()
    if ausencia_duplicada:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de ausencia pendiente o aprobada para esa fecha.")
    _procesar_compensaciones_vencidas(db, usuario.id)
    disponible = _saldo_disponible_compensacion(db, usuario.id, unidad)
    if cantidad > disponible + 0.0001:
        raise HTTPException(status_code=409, detail=f"Saldo insuficiente. Disponible sin reservas: {max(0, disponible):g} {unidad.lower()}.")
    duplicada = db.query(FichajeSolicitudCompensacion).filter(
        FichajeSolicitudCompensacion.empleado_id == usuario.id,
        FichajeSolicitudCompensacion.fecha_disfrute == fecha_disfrute,
        FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
    ).first()
    if duplicada:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud pendiente o aprobada para esa fecha.")
    registro = FichajeSolicitudCompensacion(empleado_id=usuario.id, fecha_disfrute=fecha_disfrute,
        cantidad=cantidad, unidad=unidad, estado="SOLICITADO",
        observaciones=(observaciones or "").strip()[:500] or None)
    db.add(registro)
    db.flush()
    _auditar_compensacion(db, usuario.id, usuario.id, "SOLICITUD", registro.id,
                           "CREADA", None, "SOLICITADO", f"{cantidad:g} {unidad}; fecha {fecha_disfrute}")
    db.commit()
    db.refresh(registro)
    return _solicitud_comp_dict(registro)


@router.get("/compensaciones/mis-movimientos")
def mis_movimientos_compensacion(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    filas = db.query(FichajeCompensacionMovimiento).filter(
        FichajeCompensacionMovimiento.empleado_id == usuario.id
    ).order_by(desc(FichajeCompensacionMovimiento.creado_en)).limit(500).all()
    return [_movimiento_dict(m) for m in filas]


@router.post("/admin/compensaciones/festivos")
def admin_registrar_festivo(empleado_id: int = Form(...), fecha: date = Form(...),
                             horas_trabajadas: float = Form(...), observaciones: str = Form(""),
                             usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "crear")
    _exigir_admin(usuario)
    if horas_trabajadas <= 0 or horas_trabajadas > 24:
        raise HTTPException(status_code=422, detail="Las horas trabajadas deben estar entre 0 y 24.")
    if not db.query(Empleado).filter(Empleado.id == empleado_id).first():
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    existente = db.query(FichajeFestivoTrabajado).filter(
        FichajeFestivoTrabajado.empleado_id == empleado_id,
        FichajeFestivoTrabajado.fecha == fecha,
        FichajeFestivoTrabajado.estado != "RECHAZADO",
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un registro de festivo para ese empleado y fecha.")
    f = FichajeFestivoTrabajado(empleado_id=empleado_id, fecha=fecha, horas_trabajadas=horas_trabajadas,
        estado="PENDIENTE", observaciones=(observaciones or "").strip()[:500] or None, creado_por_id=usuario.id)
    db.add(f); db.flush()
    _auditar_compensacion(db, empleado_id, usuario.id, "FESTIVO", f.id, "REGISTRADO",
                           None, "PENDIENTE", f"{horas_trabajadas:g} horas trabajadas el {fecha}")
    db.commit(); db.refresh(f)
    return _festivo_dict(f)


@router.get("/admin/compensaciones/festivos")
def admin_listar_festivos(estado: str | None = Query(default=None),
                           empleado_id: int | None = Query(default=None),
                           usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    q = db.query(FichajeFestivoTrabajado, Empleado).join(Empleado, Empleado.id == FichajeFestivoTrabajado.empleado_id)
    if estado: q = q.filter(FichajeFestivoTrabajado.estado == estado.upper())
    if empleado_id: q = q.filter(FichajeFestivoTrabajado.empleado_id == empleado_id)
    return [_festivo_dict(f, _nombre_completo(e) or e.usuario) for f, e in q.order_by(desc(FichajeFestivoTrabajado.fecha)).limit(1000).all()]


@router.patch("/admin/compensaciones/festivos/{festivo_id}")
def admin_validar_festivo(festivo_id: int, estado: str = Form(...),
                           cantidad_compensable: float = Form(0), unidad_compensable: str = Form("DIAS"),
                           observaciones: str = Form(""), usuario=Depends(get_current_user),
                           db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    f = db.query(FichajeFestivoTrabajado).filter(FichajeFestivoTrabajado.id == festivo_id).with_for_update().first()
    if not f: raise HTTPException(status_code=404, detail="Registro de festivo no encontrado.")
    if f.estado != "PENDIENTE": raise HTTPException(status_code=409, detail="Este festivo ya se ha resuelto.")
    estado = estado.strip().upper()
    if estado not in ESTADOS_FESTIVO: raise HTTPException(status_code=422, detail="El estado debe ser VALIDADO o RECHAZADO.")
    anterior = f.estado
    f.estado = estado; f.validado_por_id = usuario.id; f.validado_en = datetime.utcnow()
    if observaciones.strip(): f.observaciones = (f.observaciones or "") + (" | " if f.observaciones else "") + observaciones.strip()[:400]
    if estado == "VALIDADO":
        unidad = (unidad_compensable or "").strip().upper()
        if unidad not in UNIDADES_COMPENSACION or cantidad_compensable <= 0 or cantidad_compensable > 100:
            raise HTTPException(status_code=422, detail="Indica una cantidad compensable positiva en días u horas.")
        f.cantidad_compensable = cantidad_compensable; f.unidad_compensable = unidad
        db.add(FichajeCompensacionMovimiento(empleado_id=f.empleado_id, tipo="ABONO",
            cantidad=cantidad_compensable, unidad=unidad, fecha=f.fecha, referencia_tipo="FESTIVO",
            referencia_id=f.id, observaciones=f"Festivo trabajado {f.fecha}: {float(f.horas_trabajadas):g} horas",
            creado_por_id=usuario.id))
    _auditar_compensacion(db, f.empleado_id, usuario.id, "FESTIVO", f.id, "VALIDACION",
                           anterior, estado, f"{float(cantidad_compensable):g} {unidad_compensable}" if estado == "VALIDADO" else observaciones)
    db.commit(); db.refresh(f)
    return _festivo_dict(f)


@router.get("/admin/compensaciones/solicitudes")
def admin_listar_solicitudes_compensacion(estado: str | None = Query(default=None),
                                           empleado_id: int | None = Query(default=None),
                                           usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    q = db.query(FichajeSolicitudCompensacion, Empleado).join(Empleado, Empleado.id == FichajeSolicitudCompensacion.empleado_id)
    if estado: q = q.filter(FichajeSolicitudCompensacion.estado == estado.upper())
    if empleado_id: q = q.filter(FichajeSolicitudCompensacion.empleado_id == empleado_id)
    return [_solicitud_comp_dict(s, _nombre_completo(e) or e.usuario) for s, e in q.order_by(desc(FichajeSolicitudCompensacion.fecha_disfrute)).limit(1000).all()]


@router.patch("/admin/compensaciones/solicitudes/{solicitud_id}")
def admin_resolver_solicitud_compensacion(solicitud_id: int, estado: str = Form(...),
                                           observaciones: str = Form(""), usuario=Depends(get_current_user),
                                           db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "editar")
    _exigir_admin(usuario)
    s = db.query(FichajeSolicitudCompensacion).filter(FichajeSolicitudCompensacion.id == solicitud_id).with_for_update().first()
    if not s: raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    if s.estado != "SOLICITADO": raise HTTPException(status_code=409, detail="Esta solicitud ya se ha resuelto.")
    estado = estado.strip().upper()
    if estado not in ESTADOS_SOLICITUD: raise HTTPException(status_code=422, detail="El estado debe ser APROBADO o RECHAZADO.")
    anterior = s.estado
    if estado == "APROBADO":
        vacaciones = db.query(FichajeVacaciones).filter(FichajeVacaciones.empleado_id == s.empleado_id,
            FichajeVacaciones.estado.in_({"SOLICITADO", "APROBADO"}), FichajeVacaciones.fecha_inicio <= s.fecha_disfrute,
            FichajeVacaciones.fecha_fin >= s.fecha_disfrute).first()
        if vacaciones: raise HTTPException(status_code=409, detail="No se puede aprobar: hay vacaciones pendientes o aprobadas en esa fecha.")
        ausencia = db.query(FichajeSolicitudAusencia).filter(FichajeSolicitudAusencia.empleado_id == s.empleado_id,
            FichajeSolicitudAusencia.estado.in_({"SOLICITADO", "APROBADO"}), FichajeSolicitudAusencia.fecha_inicio <= s.fecha_disfrute,
            FichajeSolicitudAusencia.fecha_fin >= s.fecha_disfrute).first()
        if ausencia: raise HTTPException(status_code=409, detail="No se puede aprobar: hay una ausencia pendiente o aprobada en esa fecha.")
        _procesar_compensaciones_vencidas(db, s.empleado_id)
        disponible_sin_esta = _saldo_compensacion(db, s.empleado_id, s.unidad) - sum(float(x.cantidad) for x in db.query(FichajeSolicitudCompensacion).filter(
            FichajeSolicitudCompensacion.empleado_id == s.empleado_id,
            FichajeSolicitudCompensacion.unidad == s.unidad,
            FichajeSolicitudCompensacion.estado.in_({"SOLICITADO", "APROBADO"}),
            FichajeSolicitudCompensacion.id != s.id,
        ).all())
        if float(s.cantidad) > disponible_sin_esta + 0.0001:
            raise HTTPException(status_code=409, detail="No se puede aprobar: el saldo disponible ya está comprometido por otras solicitudes.")
    s.estado = estado; s.resuelto_por_id = usuario.id; s.resuelto_en = datetime.utcnow()
    if observaciones.strip(): s.observaciones = (s.observaciones or "") + (" | " if s.observaciones else "") + observaciones.strip()[:400]
    _auditar_compensacion(db, s.empleado_id, usuario.id, "SOLICITUD", s.id, "RESOLUCION",
                           anterior, estado, observaciones)
    if estado == "APROBADO" and s.fecha_disfrute <= _hoy_madrid():
        _procesar_compensaciones_vencidas(db, s.empleado_id)
    db.commit(); db.refresh(s)
    return _solicitud_comp_dict(s)


@router.get("/admin/compensaciones/saldos")
def admin_saldos_compensacion(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    empleados = db.query(Empleado).filter(Empleado.activo.is_(True)).order_by(Empleado.nombre, Empleado.apellidos).all()
    resultado = []
    for e in empleados:
        _procesar_compensaciones_vencidas(db, e.id)
        resultado.append({"empleado_id": e.id, "empleado_nombre": _nombre_completo(e) or e.usuario,
                          "saldo_dias": _saldo_disponible_compensacion(db, e.id, "DIAS"),
                          "saldo_horas": _saldo_disponible_compensacion(db, e.id, "HORAS")})
    db.commit()
    return resultado



@router.get("/compensaciones/calendario-festivos")
def calendario_festivos(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    return [{"id": x.id, "fecha": x.fecha.isoformat(), "nombre": x.nombre, "ambito": x.ambito}
            for x in db.query(FichajeFestivoCalendario).filter(FichajeFestivoCalendario.activo == 1)
            .order_by(FichajeFestivoCalendario.fecha).all()]


@router.post("/compensaciones/mis-festivos")
def empleado_reportar_festivo(fecha: date = Form(...), horas_trabajadas: float = Form(...),
                              observaciones: str = Form(""), usuario=Depends(get_current_user),
                              db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "crear")
    festivo = db.query(FichajeFestivoCalendario).filter(
        FichajeFestivoCalendario.fecha == fecha, FichajeFestivoCalendario.activo == 1).first()
    if not festivo:
        raise HTTPException(status_code=422, detail="La fecha no está en el calendario de festivos aprobado. Contacta con administración para revisarla.")
    if fecha > _hoy_madrid() or horas_trabajadas <= 0 or horas_trabajadas > 24:
        raise HTTPException(status_code=422, detail="Indica un festivo ya trabajado y entre 0 y 24 horas.")
    existente = db.query(FichajeFestivoTrabajado).filter(
        FichajeFestivoTrabajado.empleado_id == usuario.id,
        FichajeFestivoTrabajado.fecha == fecha,
        FichajeFestivoTrabajado.estado != "RECHAZADO").first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un registro de ese festivo para ti.")
    f = FichajeFestivoTrabajado(empleado_id=usuario.id, fecha=fecha, horas_trabajadas=horas_trabajadas,
        estado="PENDIENTE", observaciones=(f"Festivo: {festivo.nombre}. " + (observaciones or "")).strip()[:500],
        creado_por_id=usuario.id)
    db.add(f); db.flush()
    _auditar_compensacion(db, usuario.id, usuario.id, "FESTIVO", f.id, "REPORTADO_EMPLEADO",
                           None, "PENDIENTE", f"{horas_trabajadas:g} horas el {fecha}")
    db.commit(); db.refresh(f)
    return _festivo_dict(f)


@router.get("/admin/compensaciones/calendario")
def admin_listar_calendario_festivos(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    return [{"id": x.id, "fecha": x.fecha.isoformat(), "nombre": x.nombre, "ambito": x.ambito, "activo": bool(x.activo)}
            for x in db.query(FichajeFestivoCalendario).order_by(FichajeFestivoCalendario.fecha).limit(1000).all()]


@router.post("/admin/compensaciones/calendario")
def admin_crear_calendario_festivo(fecha: date = Form(...), nombre: str = Form(...),
                                    ambito: str = Form("EMPRESA"), usuario=Depends(get_current_user),
                                    db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "crear")
    _exigir_admin(usuario)
    nombre = nombre.strip()
    ambito = (ambito or "EMPRESA").strip().upper()
    if not nombre or len(nombre) > 160 or ambito not in {"ESTATAL", "AUTONOMICO", "LOCAL", "EMPRESA"}:
        raise HTTPException(status_code=422, detail="Indica nombre y ámbito válidos: estatal, autonómico, local o empresa.")
    if db.query(FichajeFestivoCalendario).filter(FichajeFestivoCalendario.fecha == fecha).first():
        raise HTTPException(status_code=409, detail="Ya existe un festivo configurado para esa fecha.")
    f = FichajeFestivoCalendario(fecha=fecha, nombre=nombre, ambito=ambito, activo=1, creado_por_id=usuario.id)
    db.add(f); db.flush()
    _auditar_compensacion(db, usuario.id, usuario.id, "CALENDARIO", f.id, "CREADO", None, "ACTIVO",
                           f"{fecha} · {nombre} · {ambito}")
    db.commit(); db.refresh(f)
    return {"id": f.id, "fecha": f.fecha.isoformat(), "nombre": f.nombre, "ambito": f.ambito, "activo": True}


@router.get("/admin/compensaciones/auditoria")
def admin_auditoria_compensaciones(empleado_id: int | None = Query(default=None),
                                    usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "control-fichajes", "ver")
    _exigir_admin(usuario)
    q = db.query(FichajeCompensacionAuditoria, Empleado).join(
        Empleado, Empleado.id == FichajeCompensacionAuditoria.empleado_id)
    if empleado_id:
        q = q.filter(FichajeCompensacionAuditoria.empleado_id == empleado_id)
    filas = q.order_by(desc(FichajeCompensacionAuditoria.creado_en)).limit(1000).all()
    return [{"id": a.id, "empleado_id": a.empleado_id,
             "empleado_nombre": _nombre_completo(e) or e.usuario,
             "actor_id": a.actor_id, "entidad": a.entidad, "entidad_id": a.entidad_id,
             "accion": a.accion, "estado_anterior": a.estado_anterior,
             "estado_nuevo": a.estado_nuevo, "detalle": a.detalle,
             "creado_en": a.creado_en.isoformat() if a.creado_en else None}
            for a, e in filas]

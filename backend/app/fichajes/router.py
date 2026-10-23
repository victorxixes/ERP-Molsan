from datetime import date, datetime, time, timedelta
from io import BytesIO
from urllib.parse import quote
import unicodedata

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import Base, engine, get_db
from backend.app.empleados.models import Empleado
from backend.app.fichajes.models import (FichajeDocumento, FichajeMarcaje, FichajeTipoAusencia, FichajeVacaciones, FichajeBolsaVacaciones, FichajeFestivoTrabajado, FichajeCompensacionMovimiento, FichajeSolicitudCompensacion, FichajeCompensacionAuditoria, FichajeFestivoCalendario)

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
                tables=[FichajeMarcaje.__table__, FichajeDocumento.__table__, FichajeTipoAusencia.__table__, FichajeVacaciones.__table__, FichajeBolsaVacaciones.__table__, FichajeFestivoTrabajado.__table__, FichajeCompensacionMovimiento.__table__, FichajeSolicitudCompensacion.__table__, FichajeCompensacionAuditoria.__table__, FichajeFestivoCalendario.__table__],
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


def _nombre_completo(empleado):
    return " ".join(p for p in [getattr(empleado, "nombre", None), getattr(empleado, "apellidos", None)] if p).strip()


def _es_admin(usuario):
    rol = getattr(getattr(usuario, "rol", None), "nombre", "") or ""
    rol_norm = unicodedata.normalize("NFD", str(rol)).encode("ascii", "ignore").decode().lower()
    usuario_norm = str(getattr(usuario, "usuario", "") or "").strip().lower()
    return usuario_norm == "admin" or any(p in rol_norm for p in ("admin", "superuser", "superusuario", "gestor", "manager"))


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
        consulta = consulta.filter(FichajeMarcaje.fecha_hora >= datetime.combine(desde, time.min))
    if hasta:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora < datetime.combine(hasta + timedelta(days=1), time.min))
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
    tipo = tipo.strip().upper()
    if tipo not in TIPOS_MARCAJE:
        raise HTTPException(status_code=422, detail="Tipo de marcaje no válido.")
    if tipo == "AUSENCIA":
        nombre_ausencia = (tipo_ausencia or "").strip()
        valido = db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.nombre == nombre_ausencia, FichajeTipoAusencia.activo == 1).first()
        if not valido:
            raise HTTPException(status_code=422, detail="Selecciona un tipo de ausencia válido del catálogo.")
        observaciones = f"Ausencia: {nombre_ausencia}. {observaciones or ''}".strip()
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
    db.commit()
    db.refresh(marcaje)
    return _marcaje_dict(marcaje)


@router.get("/documentos")
def listar_mis_documentos(
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "ver")
    documentos = db.query(FichajeDocumento).filter(
        FichajeDocumento.empleado_id == usuario.id
    ).order_by(desc(FichajeDocumento.subido_en)).limit(500).all()
    return [_documento_dict(d) for d in documentos]


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
    require_perm_modulo(usuario, "fichajes", "ver")
    documento = db.query(FichajeDocumento).filter(FichajeDocumento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    if documento.empleado_id != usuario.id:
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
    require_perm_modulo(usuario, "fichajes", "ver")
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
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "ver")
    _exigir_admin(usuario)
    consulta = db.query(FichajeMarcaje, Empleado).join(Empleado, Empleado.id == FichajeMarcaje.empleado_id)
    if empleado_id:
        consulta = consulta.filter(FichajeMarcaje.empleado_id == empleado_id)
    if desde:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora >= datetime.combine(desde, time.min))
    if hasta:
        consulta = consulta.filter(FichajeMarcaje.fecha_hora < datetime.combine(hasta + timedelta(days=1), time.min))
    filas = consulta.order_by(desc(FichajeMarcaje.fecha_hora)).limit(5000).all()
    return [{
        **_marcaje_dict(m),
        "empleado_nombre": _nombre_completo(e) or e.usuario,
    } for m, e in filas]

 
@router.get("/catalogo-ausencias")
def listar_tipos_ausencia(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    return [{"id": x.id, "nombre": x.nombre, "requiere_justificante": bool(x.requiere_justificante)}
            for x in db.query(FichajeTipoAusencia).filter(FichajeTipoAusencia.activo == 1).order_by(FichajeTipoAusencia.nombre).all()]


@router.post("/catalogo-ausencias")
def crear_tipo_ausencia(nombre: str = Form(...), requiere_justificante: bool = Form(False),
                        usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "crear")
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
    anio = date.today().year
    registros = db.query(FichajeVacaciones).filter(FichajeVacaciones.empleado_id == usuario.id,
        FichajeVacaciones.fecha_inicio >= date(anio, 1, 1), FichajeVacaciones.fecha_inicio < date(anio + 1, 1, 1)).order_by(FichajeVacaciones.fecha_inicio).all()
    hoy = date.today()
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


@router.get("/resumen-horas")
def resumen_horas(anio: int | None = Query(default=None), usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    anio = anio or date.today().year
    require_perm_modulo(usuario, "fichajes", "ver")
    if anio < 2000 or anio > 2100:
        raise HTTPException(status_code=422, detail="Año no válido.")
    inicio, fin = date(anio, 1, 1), date(anio + 1, 1, 1)
    registros = db.query(FichajeMarcaje).filter(FichajeMarcaje.empleado_id == usuario.id,
        FichajeMarcaje.fecha_hora >= datetime.combine(inicio, time.min), FichajeMarcaje.fecha_hora < datetime.combine(fin, time.min)).order_by(FichajeMarcaje.fecha_hora).all()
    pausas = {"PAUSA_CAFE_INICIO", "PAUSA_DESAYUNO_INICIO", "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO"}
    retornos = {"PAUSA_DESAYUNO_FIN", "PAUSA_COMIDA_FIN", "PAUSA_CIGARRILLO_FIN", "RETORNO_AUSENCIA"}
    jornada_abierta = None; pausa_abierta = None; pausa_segundos = 0; segundos = 0; incompletos = 0
    for m in registros:
        ts = m.fecha_hora
        if m.tipo == "ENTRADA":
            if jornada_abierta is not None: incompletos += 1
            jornada_abierta = ts; pausa_abierta = None; pausa_segundos = 0
        elif m.tipo in pausas and jornada_abierta is not None:
            if pausa_abierta is None: pausa_abierta = ts
        elif m.tipo in retornos and pausa_abierta is not None:
            pausa_segundos += max(0, (ts - pausa_abierta).total_seconds())
            pausa_abierta = None
        elif m.tipo == "SALIDA" and jornada_abierta is not None:
            fin_pausa = 0
            if pausa_abierta is not None:
                fin_pausa = max(0, (ts - pausa_abierta).total_seconds()); incompletos += 1
            segundos += max(0, (ts - jornada_abierta).total_seconds() - pausa_segundos - fin_pausa)
            jornada_abierta = None; pausa_abierta = None; pausa_segundos = 0
    if jornada_abierta is not None: incompletos += 1
    return {"anio": anio, "horas_trabajadas": round(max(0, segundos) / 3600, 2), "horas_previstas": None,
            "diferencia_horas": None, "marcajes": len(registros), "jornadas_incompletas": incompletos,
            "aviso": "Las horas previstas y la diferencia se habilitarán al configurar el calendario laboral individual."}


@router.get("/admin/vacaciones")
def admin_listar_solicitudes_vacaciones(
    estado: str | None = Query(default=None),
    empleado_id: int | None = Query(default=None),
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "ver")
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
    require_perm_modulo(usuario, "fichajes", "editar")
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
    require_perm_modulo(usuario, "fichajes", "ver")
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
    return [{
        **_documento_dict(d),
        "empleado_nombre": _nombre_completo(e) or e.usuario,
    } for d, e in filas]


@router.get("/admin/vacaciones-bolsa")
def admin_listar_bolsas_vacaciones(anio: int | None = Query(default=None),
                                   usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
    _exigir_admin(usuario)
    anio = anio or date.today().year
    filas = db.query(FichajeBolsaVacaciones, Empleado).join(Empleado, Empleado.id == FichajeBolsaVacaciones.empleado_id).filter(FichajeBolsaVacaciones.anio == anio).all()
    return [{"empleado_id": b.empleado_id, "empleado_nombre": _nombre_completo(e) or e.usuario, "anio": b.anio, "dias_asignados": b.dias_asignados} for b, e in filas]


@router.post("/admin/vacaciones-bolsa")
def admin_configurar_bolsa_vacaciones(empleado_id: int = Form(...), anio: int = Form(...), dias_asignados: int = Form(...),
                                      usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "crear")
    _exigir_admin(usuario)
    if anio < 2000 or anio > 2100 or dias_asignados < 0 or dias_asignados > 60:
        raise HTTPException(status_code=422, detail="Indica un año válido y entre 0 y 60 días asignados.")
    if not db.query(Empleado).filter(Empleado.id == empleado_id).first():
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    bolsa = db.query(FichajeBolsaVacaciones).filter(FichajeBolsaVacaciones.empleado_id == empleado_id, FichajeBolsaVacaciones.anio == anio).first()
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
    hoy = date.today()
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
    if fecha_disfrute < date.today():
        raise HTTPException(status_code=422, detail="La fecha de disfrute no puede estar en el pasado.")
    vacaciones_duplicadas = db.query(FichajeVacaciones).filter(
        FichajeVacaciones.empleado_id == usuario.id,
        FichajeVacaciones.fecha_inicio <= fecha_disfrute,
        FichajeVacaciones.fecha_fin >= fecha_disfrute,
        FichajeVacaciones.estado.in_({"SOLICITADO", "APROBADO"}),
    ).first()
    if vacaciones_duplicadas:
        raise HTTPException(status_code=409, detail="Ya existe una solicitud de vacaciones ordinarias para esa fecha. No se puede reservar también como compensación.")
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
    require_perm_modulo(usuario, "fichajes", "crear")
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
    require_perm_modulo(usuario, "fichajes", "ver")
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
    require_perm_modulo(usuario, "fichajes", "editar")
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
    require_perm_modulo(usuario, "fichajes", "ver")
    _exigir_admin(usuario)
    q = db.query(FichajeSolicitudCompensacion, Empleado).join(Empleado, Empleado.id == FichajeSolicitudCompensacion.empleado_id)
    if estado: q = q.filter(FichajeSolicitudCompensacion.estado == estado.upper())
    if empleado_id: q = q.filter(FichajeSolicitudCompensacion.empleado_id == empleado_id)
    return [_solicitud_comp_dict(s, _nombre_completo(e) or e.usuario) for s, e in q.order_by(desc(FichajeSolicitudCompensacion.fecha_disfrute)).limit(1000).all()]


@router.patch("/admin/compensaciones/solicitudes/{solicitud_id}")
def admin_resolver_solicitud_compensacion(solicitud_id: int, estado: str = Form(...),
                                           observaciones: str = Form(""), usuario=Depends(get_current_user),
                                           db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "editar")
    _exigir_admin(usuario)
    s = db.query(FichajeSolicitudCompensacion).filter(FichajeSolicitudCompensacion.id == solicitud_id).with_for_update().first()
    if not s: raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    if s.estado != "SOLICITADO": raise HTTPException(status_code=409, detail="Esta solicitud ya se ha resuelto.")
    estado = estado.strip().upper()
    if estado not in ESTADOS_SOLICITUD: raise HTTPException(status_code=422, detail="El estado debe ser APROBADO o RECHAZADO.")
    anterior = s.estado
    if estado == "APROBADO":
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
    if estado == "APROBADO" and s.fecha_disfrute <= date.today():
        _procesar_compensaciones_vencidas(db, s.empleado_id)
    db.commit(); db.refresh(s)
    return _solicitud_comp_dict(s)


@router.get("/admin/compensaciones/saldos")
def admin_saldos_compensacion(usuario=Depends(get_current_user), db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "ver")
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
    if fecha > date.today() or horas_trabajadas <= 0 or horas_trabajadas > 24:
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
    require_perm_modulo(usuario, "fichajes", "ver")
    _exigir_admin(usuario)
    return [{"id": x.id, "fecha": x.fecha.isoformat(), "nombre": x.nombre, "ambito": x.ambito, "activo": bool(x.activo)}
            for x in db.query(FichajeFestivoCalendario).order_by(FichajeFestivoCalendario.fecha).limit(1000).all()]


@router.post("/admin/compensaciones/calendario")
def admin_crear_calendario_festivo(fecha: date = Form(...), nombre: str = Form(...),
                                    ambito: str = Form("EMPRESA"), usuario=Depends(get_current_user),
                                    db: Session = Depends(get_db)):
    require_perm_modulo(usuario, "fichajes", "crear")
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
    require_perm_modulo(usuario, "fichajes", "ver")
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

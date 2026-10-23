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
from backend.app.fichajes.models import FichajeDocumento, FichajeMarcaje, FichajeTipoAusencia, FichajeVacaciones, FichajeBolsaVacaciones

router = APIRouter(prefix="/fichajes", tags=["Fichaje Molsan"])
TIPOS_MARCAJE = {"ENTRADA", "SALIDA", "PAUSA_CAFE_INICIO", "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO", "RETORNO_AUSENCIA", "AUSENCIA"}
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
                tables=[FichajeMarcaje.__table__, FichajeDocumento.__table__, FichajeTipoAusencia.__table__, FichajeVacaciones.__table__, FichajeBolsaVacaciones.__table__],
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
    return usuario_norm == "admin" or any(p in rol_norm for p in ("admin", "superuser", "superusuario"))


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
    pausas = {"PAUSA_CAFE_INICIO", "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO", "AUSENCIA"}
    if ultimo and ultimo.tipo in pausas and tipo not in {"RETORNO_AUSENCIA", "SALIDA"}:
        raise HTTPException(status_code=409, detail="Tienes una pausa o ausencia abierta. Registra primero el retorno.")
    if tipo in pausas and (not ultimo_jornada or ultimo_jornada.tipo != "ENTRADA"):
        raise HTTPException(status_code=409, detail="Para iniciar una pausa o ausencia debes tener una jornada abierta.")
    if tipo == "RETORNO_AUSENCIA" and (not ultimo or ultimo.tipo not in pausas):
        raise HTTPException(status_code=409, detail="No hay una pausa o ausencia abierta que puedas cerrar.")
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
    disfrutados = sum(v.dias for v in registros if v.estado == "APROBADO")
    bolsa = db.query(FichajeBolsaVacaciones).filter(FichajeBolsaVacaciones.empleado_id == usuario.id, FichajeBolsaVacaciones.anio == anio).first()
    asignados = bolsa.dias_asignados if bolsa else None
    return {"anio": anio, "dias_asignados": asignados, "dias_disfrutados": disfrutados,
            "dias_restantes": max(0, asignados - disfrutados) if asignados is not None else None,
            "registros": [{"id": v.id, "fecha_inicio": v.fecha_inicio.isoformat(), "fecha_fin": v.fecha_fin.isoformat(), "dias": v.dias, "estado": v.estado, "observaciones": v.observaciones} for v in registros],
            "aviso": "La asignación anual debe configurarla administración; no se inventa una bolsa de días."}


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
    pausas = {"PAUSA_CAFE_INICIO", "PAUSA_COMIDA_INICIO", "PAUSA_CIGARRILLO_INICIO", "AUSENCIA"}
    jornada_abierta = None; pausa_abierta = None; pausa_segundos = 0; segundos = 0; incompletos = 0
    for m in registros:
        ts = m.fecha_hora
        if m.tipo == "ENTRADA":
            if jornada_abierta is not None: incompletos += 1
            jornada_abierta = ts; pausa_abierta = None; pausa_segundos = 0
        elif m.tipo in pausas and jornada_abierta is not None:
            if pausa_abierta is None: pausa_abierta = ts
        elif m.tipo == "RETORNO_AUSENCIA" and pausa_abierta is not None:
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

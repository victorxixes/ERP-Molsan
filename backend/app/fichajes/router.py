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
from backend.app.fichajes.models import FichajeDocumento, FichajeMarcaje

router = APIRouter(prefix="/fichajes", tags=["Fichaje Molsan"])
TIPOS_MARCAJE = {"ENTRADA", "SALIDA", "PAUSA_CAFE", "AUSENCIA_COMER"}
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
                tables=[FichajeMarcaje.__table__, FichajeDocumento.__table__],
                checkfirst=True,
            )
        print("[FICHAJES] Tablas comprobadas.", flush=True)
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
    usuario=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_perm_modulo(usuario, "fichajes", "crear")
    tipo = tipo.strip().upper()
    if tipo not in TIPOS_MARCAJE:
        raise HTTPException(status_code=422, detail="Tipo de marcaje no válido.")
    ultimo = db.query(FichajeMarcaje).filter(
        FichajeMarcaje.empleado_id == usuario.id
    ).order_by(desc(FichajeMarcaje.fecha_hora)).first()
    # No se permite duplicar consecutivamente el mismo estado ni entrar dos veces sin salida.
    if ultimo and ultimo.tipo == tipo and tipo in {"ENTRADA", "SALIDA"}:
        raise HTTPException(status_code=409, detail=f"El último marcaje ya es {tipo.lower()}.")
    if tipo == "ENTRADA" and ultimo and ultimo.tipo == "ENTRADA":
        raise HTTPException(status_code=409, detail="Ya consta una entrada sin una salida posterior.")
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

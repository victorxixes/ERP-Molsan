from datetime import date, datetime, timedelta
from pathlib import Path
from uuid import uuid4
from decimal import Decimal
import hashlib
import hmac
import secrets
import os

import jwt

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, condecimal, constr
from sqlalchemy import or_, func, inspect as sa_inspect, text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import obtener_token_bearer
from backend.app.auth.permissions import require_perm_modulo
from backend.app.config import settings
from backend.app.empleados.models import Empleado
from backend.app.ctn.models import Notaria
from backend.app.database import Base, engine, get_db
from backend.app.encargagest.models import (
    EncargoExterno, EncargoExternoActividad, EncargoExternoDocumento,
    EncargoExternoUsuario,
)
from backend.app.storage import CARPETA_DIGITAL_DIR

router = APIRouter(prefix="/encargagest", tags=["EncargaGest"])
ROOT = (CARPETA_DIGITAL_DIR / "encargagest").resolve()
ROOT.mkdir(parents=True, exist_ok=True)

MAX_BYTES = int(os.getenv("ENCARGAGEST_MAX_DOCUMENT_BYTES", str(25 * 1024 * 1024)))
EXTENSIONES_PERMITIDAS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".eml", ".msg", ".txt"}
CATEGORIAS_DOCUMENTO = {
    "Hoja de solicitud",
    "Certificado de saldo cero / deuda",
    "Nota simple registral (vigencia de 3 meses)",
    "Otros",
}
ESTADOS = {
    "PENDIENTE_RECEPCION", "RECEPCIONADO", "RECIBIDO",
    "EN_REVISION", "DOCUMENTACION_PENDIENTE", "EN_GESTION",
    "INCIDENCIA", "AUTORIZADO", "RESUELTO", "CERRADO",
}

ETIQUETAS_ESTADO = {
    "PENDIENTE_RECEPCION": "Pendiente de recepción",
    "RECEPCIONADO": "Recepcionado / aceptado",
    "RECIBIDO": "Recibido",
    "EN_REVISION": "En revisión",
    "DOCUMENTACION_PENDIENTE": "Documentación pendiente",
    "EN_GESTION": "En gestión",
    "INCIDENCIA": "Incidencia",
    "AUTORIZADO": "Autorizado",
    "RESUELTO": "Resuelto",
    "CERRADO": "Cerrado",
}
PRIORIDADES = {"Baja", "Normal", "Alta", "Urgente"}


@router.on_event("startup")
def crear_tablas_encargagest():
    # Crea las tablas del módulo y añade de forma idempotente las columnas
    # incorporadas posteriormente, sin modificar los datos existentes.
    Base.metadata.create_all(
        bind=engine,
        tables=[
            EncargoExterno.__table__,
            EncargoExternoDocumento.__table__,
            EncargoExternoActividad.__table__,
            EncargoExternoUsuario.__table__,
        ],
        checkfirst=True,
    )
    migraciones = {
        "encargagest_encargos": {
            "capital_inscrito": "NUMERIC(14, 2)",
            "fecha_constitucion": "DATE",
            "numero_finca": "VARCHAR(150)",
            "municipio_registro": "VARCHAR(200)",
            "registro_propiedad": "VARCHAR(200)",
        },
        "encargagest_documentos": {
            "categoria": "VARCHAR(120) NOT NULL DEFAULT 'Otros'",
        },
    }
    inspector = sa_inspect(engine)
    tablas = set(inspector.get_table_names())
    for tabla, columnas in migraciones.items():
        if tabla not in tablas:
            continue
        existentes = {columna["name"] for columna in inspector.get_columns(tabla)}
        faltantes = [(nombre, tipo) for nombre, tipo in columnas.items() if nombre not in existentes]
        if not faltantes:
            continue
        with engine.begin() as conexion:
            for nombre, tipo in faltantes:
                conexion.execute(text(f'ALTER TABLE "{tabla}" ADD COLUMN "{nombre}" {tipo}'))


def _es_externo(actor):
    return isinstance(actor, dict) and actor.get("tipo") == "externo"


def _autorizar(usuario, accion="ver"):
    if _es_externo(usuario):
        if accion in {"ver", "crear", "editar"}:
            return usuario
        raise HTTPException(status_code=403, detail="Esta acción requiere una cuenta interna de MOLSAN.")
    require_perm_modulo(usuario, "encargagest", accion)
    return usuario


def _exigir_interno(usuario, accion="editar"):
    if _es_externo(usuario):
        raise HTTPException(status_code=403, detail="Esta operación solo está disponible para el equipo interno de MOLSAN.")
    return _autorizar(usuario, accion)


def _normalizar_usuario(valor):
    return "".join(str(valor or "").upper().split()).replace("-", "").replace(".", "")


def _hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    rounds = 310000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), rounds).hex()
    return f"pbkdf2_sha256${rounds}${salt}${digest}"


def _verificar_password(password, almacenado):
    try:
        algoritmo, rondas, salt, esperado = almacenado.split("$", 3)
        if algoritmo != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(rondas)).hex()
        return hmac.compare_digest(actual, esperado)
    except (ValueError, TypeError, AttributeError):
        return False


def get_encargagest_actor(token=Depends(obtener_token_bearer), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        if payload.get("tipo") == "encargagest":
            acceso = db.query(EncargoExternoUsuario).filter(
                EncargoExternoUsuario.id == int(payload.get("usuario_id") or 0),
                EncargoExternoUsuario.notaria_id == int(payload.get("notaria_id") or 0),
                EncargoExternoUsuario.habilitado.is_(True),
            ).first()
            if not acceso:
                raise HTTPException(status_code=401, detail="El acceso EncargaGest está deshabilitado.")
            notaria = db.query(Notaria).filter(Notaria.id == acceso.notaria_id).first()
            if not notaria:
                raise HTTPException(status_code=401, detail="La notaría asociada al acceso ya no existe.")
            nombre = " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or f"Notaría {notaria.id}"
            return {
                "tipo": "externo", "id": acceso.id, "usuario_id": acceso.id,
                "notaria_id": notaria.id, "nombre": nombre, "usuario": acceso.usuario,
            }

        empleado_id = payload.get("id")
        if not empleado_id:
            raise HTTPException(status_code=401, detail="Sesión EncargaGest no válida.")
        empleado = db.query(Empleado).filter(Empleado.id == int(empleado_id)).first()
        if not empleado or getattr(empleado, "activo", True) is False:
            raise HTTPException(status_code=401, detail="Usuario ERP inválido o inactivo.")
        return empleado
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión EncargaGest ha caducado.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Sesión EncargaGest no válida.")
    except Exception as exc:
        print(f"ERROR AUTENTICACIÓN ENCARGAGEST: {exc}", flush=True)
        raise HTTPException(status_code=401, detail="No se pudo validar la sesión EncargaGest.")


def _nombre_usuario(usuario):
    if _es_externo(usuario):
        return usuario.get("nombre") or usuario.get("usuario") or "Notaría externa"
    return " ".join(filter(None, [
        str(getattr(usuario, "nombre", "") or "").strip(),
        str(getattr(usuario, "apellidos", "") or "").strip(),
    ])) or str(getattr(usuario, "usuario", "") or "Usuario ERP")


def _serializar(encargo):
    return {
        "id": encargo.id,
        "referencia": encargo.referencia or f"EG-{encargo.id:06d}",
        "notaria_id": encargo.notaria_id,
        "notaria_nombre": encargo.notaria_nombre,
        "notaria_nif": encargo.notaria_nif,
        "contacto_nombre": encargo.contacto_nombre,
        "contacto_email": encargo.contacto_email,
        "contacto_telefono": encargo.contacto_telefono,
        "tipo_encargo": encargo.tipo_encargo,
        "titular": encargo.titular,
        "nif_titular": encargo.nif_titular,
        "entidad_bancaria": encargo.entidad_bancaria,
        "numero_prestamo": encargo.numero_prestamo,
        "capital_inscrito": float(encargo.capital_inscrito) if encargo.capital_inscrito is not None else None,
        "fecha_constitucion": encargo.fecha_constitucion.isoformat() if encargo.fecha_constitucion else None,
        "numero_finca": encargo.numero_finca,
        "municipio_registro": encargo.municipio_registro,
        "registro_propiedad": encargo.registro_propiedad,
        "importe": float(encargo.importe) if encargo.importe is not None else None,
        "fecha_objetivo": encargo.fecha_objetivo.isoformat() if encargo.fecha_objetivo else None,
        "prioridad": encargo.prioridad,
        "estado": encargo.estado,
        "observaciones": encargo.observaciones,
        "observaciones_internas": encargo.observaciones_internas,
        "creado_por_nombre": encargo.creado_por_nombre,
        "creado_en": encargo.creado_en.isoformat() if encargo.creado_en else None,
        "actualizado_en": encargo.actualizado_en.isoformat() if encargo.actualizado_en else None,
    }


def _serializar_actividad(item):
    return {
        "id": item.id,
        "tipo": item.tipo,
        "mensaje": item.mensaje,
        "visible_notaria": bool(item.visible_notaria),
        "autor_nombre": item.autor_nombre or "Sistema",
        "creado_en": item.creado_en.isoformat() if item.creado_en else None,
    }


def _serializar_documento(item):
    return {
        "id": item.id,
        "nombre_original": item.nombre_original,
        "categoria": item.categoria or "Otros",
        "tipo_mime": item.tipo_mime,
        "tamano_bytes": item.tamano_bytes,
        "subido_por_nombre": item.subido_por_nombre or "Usuario ERP",
        "fecha_subida": item.fecha_subida.isoformat() if item.fecha_subida else None,
    }


def _obtener_encargo(db, encargo_id, actor=None):
    item = db.query(EncargoExterno).filter(EncargoExterno.id == encargo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Encargo no encontrado.")
    if _es_externo(actor) and item.notaria_id != actor.get("notaria_id"):
        raise HTTPException(status_code=404, detail="Encargo no encontrado.")
    return item


def _registrar_actividad(db, encargo_id, usuario, tipo, mensaje, visible_notaria=True):
    registro = EncargoExternoActividad(
        encargo_id=encargo_id,
        tipo=tipo,
        mensaje=mensaje,
        visible_notaria=visible_notaria,
        autor_id=(usuario.get("usuario_id") if _es_externo(usuario) else getattr(usuario, "id", None)),
        autor_nombre=_nombre_usuario(usuario),
    )
    db.add(registro)


class EncargoCrear(BaseModel):
    notaria_id: int | None = None
    contacto_nombre: constr(max_length=200) | None = None
    contacto_email: constr(max_length=320) | None = None
    contacto_telefono: constr(max_length=60) | None = None
    tipo_encargo: constr(min_length=2, max_length=120) = "Cancelación hipotecaria"
    titular: constr(min_length=2, max_length=300)
    nif_titular: constr(max_length=50) | None = None
    entidad_bancaria: constr(max_length=200) | None = None
    numero_prestamo: constr(max_length=150) | None = None
    capital_inscrito: condecimal(max_digits=14, decimal_places=2, ge=0) | None = None
    fecha_constitucion: date | None = None
    numero_finca: constr(max_length=150) | None = None
    municipio_registro: constr(max_length=200) | None = None
    registro_propiedad: constr(max_length=200) | None = None
    importe: condecimal(max_digits=14, decimal_places=2, ge=0) | None = None
    fecha_objetivo: date | None = None
    prioridad: str = "Normal"
    observaciones: constr(max_length=10000) | None = None


class EncargoActualizar(BaseModel):
    contacto_nombre: constr(max_length=200) | None = None
    contacto_email: constr(max_length=320) | None = None
    contacto_telefono: constr(max_length=60) | None = None
    titular: constr(min_length=2, max_length=300) | None = None
    nif_titular: constr(max_length=50) | None = None
    entidad_bancaria: constr(max_length=200) | None = None
    numero_prestamo: constr(max_length=150) | None = None
    capital_inscrito: condecimal(max_digits=14, decimal_places=2, ge=0) | None = None
    fecha_constitucion: date | None = None
    numero_finca: constr(max_length=150) | None = None
    municipio_registro: constr(max_length=200) | None = None
    registro_propiedad: constr(max_length=200) | None = None
    importe: condecimal(max_digits=14, decimal_places=2, ge=0) | None = None
    fecha_objetivo: date | None = None
    prioridad: str | None = None
    observaciones: constr(max_length=10000) | None = None
    observaciones_internas: constr(max_length=10000) | None = None


class CambioEstado(BaseModel):
    estado: str
    comentario: constr(max_length=2000) | None = None


class CrearActividad(BaseModel):
    mensaje: constr(min_length=1, max_length=5000)
    visible_notaria: bool = True
    tipo: str = "COMENTARIO"


class LoginEncargaGest(BaseModel):
    usuario: constr(min_length=2, max_length=100)
    password: constr(min_length=1, max_length=128)


class AccesoEncargaGest(BaseModel):
    notaria_id: int
    password: constr(min_length=10, max_length=128) | None = None
    habilitado: bool = True


@router.post("/login")
def login_encargagest(datos: LoginEncargaGest, db: Session = Depends(get_db)):
    usuario_norm = _normalizar_usuario(datos.usuario)
    acceso = db.query(EncargoExternoUsuario).filter(
        func.upper(EncargoExternoUsuario.usuario) == usuario_norm,
        EncargoExternoUsuario.habilitado.is_(True),
    ).first()
    if not acceso or not _verificar_password(datos.password, acceso.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
    notaria = db.query(Notaria).filter(Notaria.id == acceso.notaria_id).first()
    if not notaria:
        raise HTTPException(status_code=401, detail="La notaría asociada al acceso no está disponible.")
    token = jwt.encode({
        "tipo": "encargagest",
        "usuario_id": acceso.id,
        "notaria_id": notaria.id,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    nombre = " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or f"Notaría {notaria.id}"
    return {"token": token, "tipo": "encargagest", "notaria": {"id": notaria.id, "nombre": nombre, "nif": notaria.nif}, "usuario": acceso.usuario}


@router.get("/me")
def mi_sesion_encargagest(usuario=Depends(get_encargagest_actor)):
    if _es_externo(usuario):
        return {"modo": "externo", "notaria_id": usuario["notaria_id"], "notaria_nombre": usuario["nombre"], "usuario": usuario["usuario"]}
    _autorizar(usuario, "ver")
    return {"modo": "interno", "nombre": _nombre_usuario(usuario), "empleado_id": usuario.id}


@router.get("/accesos")
def listar_accesos_encargagest(db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "ver")
    notarías = db.query(Notaria).order_by(Notaria.apellidos.asc(), Notaria.nombre.asc()).all()
    accesos = {item.notaria_id: item for item in db.query(EncargoExternoUsuario).all()}
    return [{
        "notaria_id": n.id,
        "nombre": " ".join(filter(None, [n.nombre, n.apellidos])).strip() or f"Notaría {n.id}",
        "nif": n.nif,
        "usuario": accesos[n.id].usuario if n.id in accesos else _normalizar_usuario(n.nif),
        "habilitado": bool(accesos[n.id].habilitado) if n.id in accesos else False,
        "tiene_acceso": n.id in accesos,
    } for n in notarías]


@router.post("/accesos")
def guardar_acceso_encargagest(datos: AccesoEncargaGest, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "editar")
    notaria = db.query(Notaria).filter(Notaria.id == datos.notaria_id).first()
    if not notaria:
        raise HTTPException(status_code=404, detail="Notaría CTN no encontrada.")
    usuario_login = _normalizar_usuario(notaria.nif)
    if not usuario_login:
        raise HTTPException(status_code=422, detail="La notaría no tiene NIF registrado en CTN; completa ese dato antes de crear el acceso.")
    acceso = db.query(EncargoExternoUsuario).filter(EncargoExternoUsuario.notaria_id == notaria.id).first()
    if acceso is None and not datos.password:
        raise HTTPException(status_code=422, detail="Indica una contraseña inicial de al menos 10 caracteres.")
    existente = db.query(EncargoExternoUsuario).filter(
        func.upper(EncargoExternoUsuario.usuario) == usuario_login,
        EncargoExternoUsuario.notaria_id != notaria.id,
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe otro acceso con ese usuario; revisa el NIF de CTN.")
    if acceso is None:
        acceso = EncargoExternoUsuario(
            notaria_id=notaria.id, usuario=usuario_login,
            password_hash=_hash_password(datos.password or secrets.token_urlsafe(24)),
            habilitado=datos.habilitado,
        )
        db.add(acceso)
    else:
        acceso.usuario = usuario_login
        acceso.habilitado = datos.habilitado
        if datos.password:
            acceso.password_hash = _hash_password(datos.password)
        acceso.actualizado_en = datetime.utcnow()
    db.commit()
    db.refresh(acceso)
    return {"ok": True, "notaria_id": notaria.id, "usuario": acceso.usuario, "habilitado": bool(acceso.habilitado), "password_actualizada": bool(datos.password)}


@router.get("/resumen")
def resumen(db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    consulta_base = db.query(EncargoExterno)
    if _es_externo(usuario):
        consulta_base = consulta_base.filter(EncargoExterno.notaria_id == usuario["notaria_id"])
    total = consulta_base.count()
    filas = consulta_base.with_entities(EncargoExterno.estado, func.count(EncargoExterno.id)).group_by(EncargoExterno.estado).all()
    estados = {estado: cantidad for estado, cantidad in filas}
    return {
        "total": total,
        "por_estado": estados,
        "requieren_atencion": sum(estados.get(e, 0) for e in ("DOCUMENTACION_PENDIENTE", "INCIDENCIA")),
    }


@router.get("/notarias")
def listar_notarias(db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    consulta = db.query(Notaria)
    if _es_externo(usuario):
        consulta = consulta.filter(Notaria.id == usuario["notaria_id"])
    registros = consulta.order_by(Notaria.apellidos.asc(), Notaria.nombre.asc()).all()
    return [{
        "id": n.id,
        "nombre": " ".join(filter(None, [n.nombre, n.apellidos])).strip() or f"Notaría {n.id}",
        "nif": n.nif,
        "provincia": n.provincia,
        "municipio": n.municipio,
        "telefono": n.telefono,
        "email": None,
    } for n in registros]


@router.get("/encargos")
def listar_encargos(
    q: str | None = None,
    estado: str | None = None,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    usuario=Depends(get_encargagest_actor),
):
    _autorizar(usuario, "ver")
    consulta = db.query(EncargoExterno)
    if _es_externo(usuario):
        consulta = consulta.filter(EncargoExterno.notaria_id == usuario["notaria_id"])
    if q and q.strip():
        termino = f"%{q.strip()}%"
        consulta = consulta.filter(or_(
            EncargoExterno.referencia.ilike(termino),
            EncargoExterno.notaria_nombre.ilike(termino),
            EncargoExterno.titular.ilike(termino),
            EncargoExterno.nif_titular.ilike(termino),
            EncargoExterno.entidad_bancaria.ilike(termino),
        ))
    if estado and estado in ESTADOS:
        consulta = consulta.filter(EncargoExterno.estado == estado)
    total = consulta.count()
    items = consulta.order_by(EncargoExterno.actualizado_en.desc(), EncargoExterno.id.desc()).offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    filas = []
    for item in items:
        fila = _serializar(item)
        if _es_externo(usuario):
            fila.pop("observaciones_internas", None)
        filas.append(fila)
    return {"items": filas, "total": total, "pagina": pagina, "por_pagina": por_pagina}


@router.post("/encargos", status_code=201)
def crear_encargo(datos: EncargoCrear, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "crear")
    notaria_id = usuario["notaria_id"] if _es_externo(usuario) else datos.notaria_id
    if notaria_id is None:
        raise HTTPException(status_code=422, detail="Selecciona una notaría del catálogo CTN.")
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    if not notaria:
        raise HTTPException(status_code=404, detail="La notaría seleccionada no existe en CTN.")
    if datos.prioridad not in PRIORIDADES:
        raise HTTPException(status_code=422, detail="Prioridad no válida.")
    nombre_notaria = " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or f"Notaría {notaria.id}"
    item = EncargoExterno(
        notaria_id=notaria.id,
        notaria_nombre=nombre_notaria,
        notaria_nif=notaria.nif,
        tipo_encargo=datos.tipo_encargo.strip(),
        titular=datos.titular.strip(),
        nif_titular=(datos.nif_titular or "").strip() or None,
        entidad_bancaria=(datos.entidad_bancaria or "").strip() or None,
        numero_prestamo=(datos.numero_prestamo or "").strip() or None,
        capital_inscrito=Decimal(datos.capital_inscrito) if datos.capital_inscrito is not None else None,
        fecha_constitucion=datos.fecha_constitucion,
        numero_finca=(datos.numero_finca or "").strip() or None,
        municipio_registro=(datos.municipio_registro or "").strip() or None,
        registro_propiedad=(datos.registro_propiedad or "").strip() or None,
        importe=Decimal(datos.importe) if datos.importe is not None else None,
        fecha_objetivo=datos.fecha_objetivo,
        prioridad=datos.prioridad,
        estado=("PENDIENTE_RECEPCION" if _es_externo(usuario) else "RECEPCIONADO"),
        contacto_nombre=(datos.contacto_nombre or "").strip() or None,
        contacto_email=(datos.contacto_email or "").strip() or None,
        contacto_telefono=(datos.contacto_telefono or "").strip() or None,
        observaciones=(datos.observaciones or "").strip() or None,
        creado_por_id=(usuario.get('usuario_id') if _es_externo(usuario) else usuario.id),
        creado_por_nombre=_nombre_usuario(usuario),
    )
    try:
        db.add(item)
        db.flush()
        item.referencia = f"EG-{datetime.now().year}-{item.id:06d}"
        db.add(item)
        mensaje_inicial = (
            "La notaría ha enviado el encargo. Está pendiente de recepción por MOLSAN."
            if _es_externo(usuario)
            else "Encargo registrado directamente por el equipo MOLSAN."
        )
        _registrar_actividad(db, item.id, usuario, "SISTEMA", mensaje_inicial, visible_notaria=True)
        db.commit()
        db.refresh(item)
        return _serializar(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el encargo. Inténtalo de nuevo.")


@router.get("/encargos/{encargo_id}")
def detalle_encargo(encargo_id: int, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    item = _obtener_encargo(db, encargo_id, usuario)
    documentos = db.query(EncargoExternoDocumento).filter(EncargoExternoDocumento.encargo_id == encargo_id).order_by(EncargoExternoDocumento.fecha_subida.desc()).all()
    consulta_actividad = db.query(EncargoExternoActividad).filter(EncargoExternoActividad.encargo_id == encargo_id)
    if _es_externo(usuario):
        consulta_actividad = consulta_actividad.filter(EncargoExternoActividad.visible_notaria.is_(True))
    actividad = consulta_actividad.order_by(EncargoExternoActividad.creado_en.desc()).all()
    data = _serializar(item)
    if _es_externo(usuario):
        data.pop("observaciones_internas", None)
    data["documentos"] = [_serializar_documento(doc) for doc in documentos]
    data["actividad"] = [_serializar_actividad(entry) for entry in actividad]
    return data


@router.put("/encargos/{encargo_id}")
def actualizar_encargo(encargo_id: int, datos: EncargoActualizar, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "editar")
    item = _obtener_encargo(db, encargo_id, usuario)
    cambios = datos.dict(exclude_unset=True)
    if "prioridad" in cambios and cambios["prioridad"] is not None and cambios["prioridad"] not in PRIORIDADES:
        raise HTTPException(status_code=422, detail="Prioridad no válida.")
    for campo, valor in cambios.items():
        if campo in {"titular", "contacto_nombre", "contacto_email", "contacto_telefono", "nif_titular", "entidad_bancaria", "numero_prestamo", "numero_finca", "municipio_registro", "registro_propiedad", "observaciones", "observaciones_internas"} and isinstance(valor, str):
            valor = valor.strip() or None
        setattr(item, campo, valor)
    item.actualizado_en = datetime.utcnow()
    _registrar_actividad(db, item.id, usuario, "EDICION", "Datos del encargo actualizados.", visible_notaria=False)
    db.commit()
    db.refresh(item)
    return _serializar(item)


@router.post("/encargos/{encargo_id}/aceptar")
def aceptar_encargo(encargo_id: int, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "editar")
    item = _obtener_encargo(db, encargo_id, usuario)
    if item.estado not in {"PENDIENTE_RECEPCION", "RECIBIDO"}:
        raise HTTPException(status_code=409, detail="Este encargo ya ha sido recepcionado o ya está en tramitación.")
    item.estado = "RECEPCIONADO"
    item.actualizado_en = datetime.utcnow()
    _registrar_actividad(
        db,
        item.id,
        usuario,
        "RECEPCION",
        "MOLSAN ha recepcionado y aceptado el encargo. Comienza su tramitación.",
        visible_notaria=True,
    )
    db.commit()
    db.refresh(item)
    return _serializar(item)


@router.post("/encargos/{encargo_id}/estado")
def cambiar_estado(encargo_id: int, datos: CambioEstado, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "editar")
    item = _obtener_encargo(db, encargo_id, usuario)
    estado = str(datos.estado or "").strip().upper()
    if estado not in ESTADOS:
        raise HTTPException(status_code=422, detail="Estado no válido.")
    anterior = item.estado
    if estado == "PENDIENTE_RECEPCION":
        raise HTTPException(status_code=422, detail="La recepción se realiza con la acción «Aceptar encargo».")
    if anterior in {"PENDIENTE_RECEPCION", "RECIBIDO"}:
        raise HTTPException(status_code=409, detail="Primero debes usar la acción «Aceptar encargo» para recepcionar esta solicitud.")
    item.estado = estado
    item.actualizado_en = datetime.utcnow()
    mensaje = f"Estado actualizado: {ETIQUETAS_ESTADO.get(estado, estado)}."
    if datos.comentario and datos.comentario.strip():
        mensaje += f" {datos.comentario.strip()}"
    _registrar_actividad(db, item.id, usuario, "CAMBIO_ESTADO", mensaje, visible_notaria=True)
    db.commit()
    db.refresh(item)
    return _serializar(item)


@router.get("/encargos/{encargo_id}/actividad")
def listar_actividad(encargo_id: int, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    _obtener_encargo(db, encargo_id, usuario)
    consulta = db.query(EncargoExternoActividad).filter(EncargoExternoActividad.encargo_id == encargo_id)
    if _es_externo(usuario):
        consulta = consulta.filter(EncargoExternoActividad.visible_notaria.is_(True))
    registros = consulta.order_by(EncargoExternoActividad.creado_en.desc()).all()
    return [_serializar_actividad(item) for item in registros]


@router.post("/encargos/{encargo_id}/actividad", status_code=201)
def crear_actividad(encargo_id: int, datos: CrearActividad, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "editar")
    _obtener_encargo(db, encargo_id, usuario)
    tipo = datos.tipo.upper()
    if tipo not in {"COMENTARIO", "INCIDENCIA", "SISTEMA"}:
        raise HTTPException(status_code=422, detail="Tipo de actividad no válido.")
    if _es_externo(usuario):
        if tipo not in {"COMENTARIO", "INCIDENCIA"}:
            raise HTTPException(status_code=403, detail="La notaría no puede registrar este tipo de actividad.")
        datos.visible_notaria = True
    mensaje = datos.mensaje.strip()
    if not mensaje:
        raise HTTPException(status_code=422, detail="Escribe un mensaje antes de guardarlo.")
    if tipo == "INCIDENCIA" and not _es_externo(usuario):
        item = _obtener_encargo(db, encargo_id, usuario)
        item.estado = "INCIDENCIA"
        item.actualizado_en = datetime.utcnow()
    _registrar_actividad(db, encargo_id, usuario, tipo, mensaje, datos.visible_notaria)
    db.commit()
    return {"ok": True}


@router.post("/encargos/{encargo_id}/documentos", status_code=201)
async def subir_documento(
    encargo_id: int,
    archivo: UploadFile = File(...),
    categoria: str = Form("Otros"),
    db: Session = Depends(get_db),
    usuario=Depends(get_encargagest_actor),
):
    _autorizar(usuario, "editar")
    item = _obtener_encargo(db, encargo_id, usuario)
    categoria = str(categoria or "Otros").strip()
    if categoria not in CATEGORIAS_DOCUMENTO:
        raise HTTPException(status_code=422, detail="Categoría documental no válida.")
    nombre_original = Path(archivo.filename or "documento").name
    extension = Path(nombre_original).suffix.lower()
    if not nombre_original or nombre_original in {".", ".."} or extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(status_code=400, detail="Formato de documento no permitido.")
    contenido = await archivo.read(MAX_BYTES + 1)
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"El archivo supera el límite de {MAX_BYTES // (1024 * 1024)} MB.")
    nombre_guardado = f"{uuid4().hex}{extension}"
    ruta = (ROOT / nombre_guardado).resolve()
    if ruta.parent != ROOT:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido.")
    try:
        ruta.write_bytes(contenido)
        documento = EncargoExternoDocumento(
            encargo_id=item.id,
            nombre_original=nombre_original,
            nombre_guardado=nombre_guardado,
            categoria=categoria,
            tipo_mime=archivo.content_type,
            tamano_bytes=len(contenido),
            subido_por_id=(usuario.get("usuario_id") if _es_externo(usuario) else usuario.id),
            subido_por_nombre=_nombre_usuario(usuario),
        )
        db.add(documento)
        item.actualizado_en = datetime.utcnow()
        _registrar_actividad(db, item.id, usuario, "DOCUMENTO", f"Documento añadido en {categoria}: {nombre_original}.")
        db.commit()
        db.refresh(documento)
        return _serializar_documento(documento) | {"ok": True}
    except Exception:
        db.rollback()
        ruta.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="No se pudo guardar el documento.")
    finally:
        await archivo.close()


@router.get("/encargos/{encargo_id}/documentos/{documento_id}/descargar")
def descargar_documento(encargo_id: int, documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    _obtener_encargo(db, encargo_id, usuario)
    documento = db.query(EncargoExternoDocumento).filter(
        EncargoExternoDocumento.id == documento_id,
        EncargoExternoDocumento.encargo_id == encargo_id,
    ).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    ruta = (ROOT / documento.nombre_guardado).resolve()
    if ruta.parent != ROOT or not ruta.is_file():
        raise HTTPException(status_code=404, detail="El archivo no está disponible en el almacenamiento.")
    return FileResponse(path=str(ruta), filename=documento.nombre_original, media_type=documento.tipo_mime or "application/octet-stream")


@router.delete("/encargos/{encargo_id}/documentos/{documento_id}")
def eliminar_documento(encargo_id: int, documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "eliminar")
    _obtener_encargo(db, encargo_id, usuario)
    documento = db.query(EncargoExternoDocumento).filter(
        EncargoExternoDocumento.id == documento_id,
        EncargoExternoDocumento.encargo_id == encargo_id,
    ).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    ruta = (ROOT / documento.nombre_guardado).resolve()
    try:
        if ruta.parent == ROOT:
            ruta.unlink(missing_ok=True)
        db.delete(documento)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo eliminar el documento.")
    return {"ok": True}

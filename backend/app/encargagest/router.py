from datetime import date, datetime, timedelta
from pathlib import Path
from uuid import uuid4
from decimal import Decimal
import hashlib
import hmac
import secrets
import os
import base64

import jwt
from cryptography.fernet import Fernet

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
ESTADOS = {"EN_PROCESO", "RECIBIDO", "AUTORIZADO", "INCIDENCIA", "FIRMADO"}

# Estados heredados conservados para leer encargos anteriores sin perderlos.
# La bandeja interna unifica las solicitudes pendientes de autorización en «Recibidos».
# La firma real se integrará desde ApoderaGest; EncargaGest no cierra encargos por firma.
ESTADOS_LEGACY_PENDIENTES = {"EN_REVISION", "DOCUMENTACION_PENDIENTE", "EN_GESTION"}
ESTADOS_LEGACY_FIRMADOS = {"RESUELTO", "CERRADO"}
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
        "empleados": {
            "notarias_encargagest_ids": "JSONB NOT NULL DEFAULT '[]'::jsonb",
        },
        "encargagest_usuarios": {
            "password_enc": "TEXT",
            "password_provisional": "BOOLEAN NOT NULL DEFAULT TRUE",
        },
        "encargagest_encargos": {
            "capital_inscrito": "NUMERIC(14, 2)",
            "fecha_constitucion": "DATE",
            "numero_finca": "VARCHAR(150)",
            "municipio_registro": "VARCHAR(200)",
            "registro_propiedad": "VARCHAR(200)",
            "contratos_json": "JSONB",
        },
        "encargagest_documentos": {
            "categoria": "VARCHAR(120) NOT NULL DEFAULT 'Otros'",
            "contrato_index": "INTEGER NOT NULL DEFAULT 0",
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


def _es_administrador_encargagest(usuario):
    nombre_usuario = str(getattr(usuario, "usuario", "") or "").strip().casefold()
    rol = str(getattr(getattr(usuario, "rol", None), "nombre", "") or "").strip().casefold()
    return nombre_usuario == "admin" or rol in {"admin", "administrador", "administradora", "superadmin"}


def _ids_notarias_asignadas(usuario):
    valor = getattr(usuario, "notarias_encargagest_ids", None)
    if isinstance(valor, str):
        try:
            import json
            valor = json.loads(valor)
        except (TypeError, ValueError):
            valor = []
    if not isinstance(valor, (list, tuple, set)):
        return set()
    resultado = set()
    for item in valor:
        try:
            resultado.add(int(item))
        except (TypeError, ValueError):
            continue
    return resultado


def _notaria_permitida(usuario, notaria_id):
    if _es_externo(usuario):
        return int(usuario.get("notaria_id") or 0) == int(notaria_id or 0)
    if _es_administrador_encargagest(usuario):
        return True
    return int(notaria_id or 0) in _ids_notarias_asignadas(usuario)


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


def _cifrar_password(password):
    secreto = str(getattr(settings, "JWT_SECRET", "") or os.getenv("JWT_SECRET", "")).strip()
    if not secreto:
        raise HTTPException(status_code=500, detail="No está configurada la clave de cifrado de contraseñas.")
    clave = base64.urlsafe_b64encode(hashlib.sha256(("ERP-Molsan-portales-v1:" + secreto).encode("utf-8")).digest())
    return Fernet(clave).encrypt(password.encode("utf-8")).decode("ascii")


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


def _estado_publico(estado):
    estado = str(estado or "").strip().upper()
    if estado in ESTADOS_LEGACY_FIRMADOS:
        return "FIRMADO"
    if estado in ESTADOS_LEGACY_PENDIENTES:
        return "EN_PROCESO"
    return estado


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
        "contratos": encargo.contratos_json or [{
            "entidad_bancaria": encargo.entidad_bancaria,
            "numero_prestamo": encargo.numero_prestamo,
            "capital_inscrito": float(encargo.capital_inscrito) if encargo.capital_inscrito is not None else None,
            "fecha_constitucion": encargo.fecha_constitucion.isoformat() if encargo.fecha_constitucion else None,
            "fincas": [{"numero_finca": encargo.numero_finca, "municipio_registro": encargo.municipio_registro, "registro_propiedad": encargo.registro_propiedad}] if any([encargo.numero_finca, encargo.municipio_registro, encargo.registro_propiedad]) else [],
        }],
        "importe": float(encargo.importe) if encargo.importe is not None else None,
        "fecha_objetivo": encargo.fecha_objetivo.isoformat() if encargo.fecha_objetivo else None,
        "prioridad": encargo.prioridad,
        "estado": _estado_publico(encargo.estado),
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
        "contrato_index": int(item.contrato_index or 0),
        "tipo_mime": item.tipo_mime,
        "tamano_bytes": item.tamano_bytes,
        "subido_por_nombre": item.subido_por_nombre or "Usuario ERP",
        "fecha_subida": item.fecha_subida.isoformat() if item.fecha_subida else None,
    }


def _obtener_encargo(db, encargo_id, actor=None):
    item = db.query(EncargoExterno).filter(EncargoExterno.id == encargo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Encargo no encontrado.")
    if not _notaria_permitida(actor, item.notaria_id):
        raise HTTPException(status_code=404, detail="Encargo no encontrado.")
    return item


def _exigir_encargo_abierto(item):
    if _estado_publico(item.estado) == "FIRMADO":
        raise HTTPException(status_code=409, detail="El encargo está firmado y cerrado; no admite más modificaciones.")


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
    contratos: list[dict] = Field(default_factory=list)
    importe: condecimal(max_digits=14, decimal_places=2, ge=0) | None = None
    fecha_objetivo: date | None = None
    prioridad: str = "Normal"
    observaciones: constr(max_length=10000) | None = None


class EncargoActualizar(BaseModel):
    tipo_encargo: constr(min_length=2, max_length=120) | None = None
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
    contratos: list[dict] | None = None


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
    password: constr(min_length=8, max_length=128) | None = None
    habilitado: bool = True


@router.post("/login")
def login_encargagest(datos: LoginEncargaGest, db: Session = Depends(get_db)):
    usuario_norm = _normalizar_usuario(datos.usuario)
    acceso = db.query(EncargoExternoUsuario).filter(
        func.upper(EncargoExternoUsuario.usuario) == usuario_norm,
    ).first()
    if not acceso:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
    if not acceso.habilitado:
        db.execute(text("""
            INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
            VALUES (:id, 'encargagest', 'LOGIN', 'fallido', :usuario, 'Acceso deshabilitado')
        """), {"id": acceso.notaria_id, "usuario": usuario_norm})
        db.commit()
        raise HTTPException(status_code=401, detail="El acceso EncargaGest está deshabilitado.")
    notaria = db.query(Notaria).filter(Notaria.id == acceso.notaria_id).first()
    password_nif = bool(notaria and notaria.nif and hmac.compare_digest(_normalizar_usuario(datos.password), _normalizar_usuario(notaria.nif)))
    valido = _verificar_password(datos.password, acceso.password_hash)
    if not valido and acceso.password_provisional and password_nif:
        acceso.password_hash = _hash_password(_normalizar_usuario(notaria.nif))
        acceso.password_enc = _cifrar_password(_normalizar_usuario(notaria.nif))
        acceso.usuario = _normalizar_usuario(notaria.nif)
        acceso.habilitado = True
        acceso.actualizado_en = datetime.utcnow()
        valido = True
    if valido and acceso.password_provisional and not password_nif:
        acceso.password_provisional = False
    if not valido:
        db.execute(text("""
            INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
            VALUES (:id, 'encargagest', 'LOGIN', 'fallido', :usuario, 'Credenciales incorrectas')
        """), {"id": acceso.notaria_id, "usuario": usuario_norm})
        db.commit()
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos.")
    db.execute(text("""
        INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
        VALUES (:id, 'encargagest', 'LOGIN', 'correcto', :usuario, 'Inicio de sesión correcto')
    """), {"id": acceso.notaria_id, "usuario": usuario_norm})
    db.commit()
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
def mi_sesion_encargagest(usuario=Depends(get_encargagest_actor), db: Session = Depends(get_db)):
    if _es_externo(usuario):
        notaria = db.query(Notaria).filter(Notaria.id == usuario["notaria_id"]).first()
        if not notaria:
            raise HTTPException(status_code=404, detail="No se encuentra la ficha CTN asociada.")
        nombre_ctn = " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or usuario["nombre"]
        return {
            "modo": "externo",
            "notaria_id": notaria.id,
            "notaria_nombre": nombre_ctn,
            "usuario": usuario["usuario"],
            "usuario_nombre": usuario["nombre"],
            "nombre": nombre_ctn,
            "nif": notaria.nif,
            "codigo": getattr(notaria, "codigo", None),
            "telefono": getattr(notaria, "telefono", None),
            "direccion": getattr(notaria, "direccion", None),
            "cp": getattr(notaria, "cp", None),
            "municipio": getattr(notaria, "municipio", None),
            "provincia": getattr(notaria, "provincia", None),
            "vc": getattr(notaria, "vc", None),
            "apoderado": getattr(notaria, "apoderado", None),
            "departamento_cancelaciones": getattr(notaria, "departamento_cancelaciones", None),
            "departamento_copias": getattr(notaria, "departamento_copias", None),
            "otros_departamentos": getattr(notaria, "otros_departamentos", None),
            "observacion": getattr(notaria, "observacion", None),
        }
    _autorizar(usuario, "ver")
    return {"modo": "interno", "nombre": _nombre_usuario(usuario), "empleado_id": usuario.id}


class CambioPasswordEncargaGest(BaseModel):
    password_actual: constr(min_length=1, max_length=128)
    password_nueva: constr(min_length=8, max_length=128)


@router.post("/cambiar-password")
def cambiar_password_encargagest(datos: CambioPasswordEncargaGest, usuario=Depends(get_encargagest_actor), db: Session = Depends(get_db)):
    if not _es_externo(usuario):
        raise HTTPException(status_code=403, detail="El cambio de contraseña desde el perfil es para las cuentas externas de notaría.")
    acceso = db.query(EncargoExternoUsuario).filter(
        EncargoExternoUsuario.id == usuario["usuario_id"],
        EncargoExternoUsuario.notaria_id == usuario["notaria_id"],
        EncargoExternoUsuario.habilitado.is_(True),
    ).first()
    notaria = db.query(Notaria).filter(Notaria.id == usuario["notaria_id"]).first()
    if not acceso or not notaria:
        raise HTTPException(status_code=401, detail="La cuenta externa no está disponible.")
    actual_valida = _verificar_password(datos.password_actual, acceso.password_hash)
    if not actual_valida and acceso.password_provisional and notaria.nif:
        actual_valida = hmac.compare_digest(_normalizar_usuario(datos.password_actual), _normalizar_usuario(notaria.nif))
    if not actual_valida:
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")
    nueva = datos.password_nueva.strip()
    if not nueva or _normalizar_usuario(nueva) == _normalizar_usuario(notaria.nif):
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser distinta del NIF.")
    acceso.password_hash = _hash_password(nueva)
    acceso.password_enc = _cifrar_password(nueva)
    acceso.password_provisional = False
    acceso.actualizado_en = datetime.utcnow()
    acceso.usuario = _normalizar_usuario(notaria.nif)
    db.execute(text("""
        INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
        VALUES (:id, 'encargagest', 'CAMBIO_PASSWORD', 'correcto', :usuario, 'La notaría cambió su contraseña desde su perfil')
    """), {"id": notaria.id, "usuario": acceso.usuario})
    db.commit()
    return {"ok": True, "mensaje": "Contraseña actualizada correctamente."}


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
    existente = db.query(EncargoExternoUsuario).filter(
        func.upper(EncargoExternoUsuario.usuario) == usuario_login,
        EncargoExternoUsuario.notaria_id != notaria.id,
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe otro acceso con ese usuario; revisa el NIF de CTN.")
    if acceso is None:
        password_inicial = (datos.password or usuario_login).strip()
        acceso = EncargoExternoUsuario(
            notaria_id=notaria.id, usuario=usuario_login,
            password_hash=_hash_password(password_inicial),
            password_enc=_cifrar_password(password_inicial),
            password_provisional=(_normalizar_usuario(password_inicial) == usuario_login),
            habilitado=datos.habilitado,
        )
        db.add(acceso)
    else:
        acceso.usuario = usuario_login
        acceso.habilitado = datos.habilitado
        if datos.password:
            acceso.password_hash = _hash_password(datos.password)
            acceso.password_enc = _cifrar_password(datos.password)
            acceso.password_provisional = (_normalizar_usuario(datos.password) == usuario_login)
        acceso.actualizado_en = datetime.utcnow()
    db.commit()
    db.refresh(acceso)
    db.execute(text("""
        INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
        VALUES (:id, 'encargagest', 'CONFIGURACION_ACCESO', 'correcto', :usuario, :detalle)
    """), {"id": notaria.id, "usuario": acceso.usuario,
        "detalle": "Acceso habilitado" if acceso.habilitado else "Acceso deshabilitado"})
    db.commit()
    return {"ok": True, "notaria_id": notaria.id, "usuario": acceso.usuario, "habilitado": bool(acceso.habilitado), "password_actualizada": bool(datos.password)}


@router.get("/gestion/notarias")
def listar_notarias_para_asignacion(db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    if not _es_administrador_encargagest(usuario):
        raise HTTPException(status_code=403, detail="Solo un administrador puede configurar las notarías asignadas.")
    registros = db.query(Notaria).order_by(Notaria.apellidos.asc(), Notaria.nombre.asc()).all()
    return [{
        "id": n.id,
        "nombre": " ".join(filter(None, [n.nombre, n.apellidos])).strip() or f"Notaría {n.id}",
        "nif": n.nif,
        "municipio": n.municipio,
        "provincia": n.provincia,
    } for n in registros]


@router.get("/gestion/empleados/{empleado_id}/notarias")
def obtener_notarias_empleado(empleado_id: int, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    if not _es_administrador_encargagest(usuario):
        raise HTTPException(status_code=403, detail="Solo un administrador puede consultar estas asignaciones.")
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    return {"empleado_id": empleado.id, "notaria_ids": sorted(_ids_notarias_asignadas(empleado))}


class AsignacionNotariasEncargaGest(BaseModel):
    notaria_ids: list[int] = Field(default_factory=list)


@router.put("/gestion/empleados/{empleado_id}/notarias")
def guardar_notarias_empleado(empleado_id: int, datos: AsignacionNotariasEncargaGest, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "editar")
    if not _es_administrador_encargagest(usuario):
        raise HTTPException(status_code=403, detail="Solo un administrador puede modificar estas asignaciones.")
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    ids = sorted(set(int(value) for value in datos.notaria_ids if int(value) > 0))
    existentes = {row[0] for row in db.query(Notaria.id).filter(Notaria.id.in_(ids)).all()} if ids else set()
    if existentes != set(ids):
        raise HTTPException(status_code=422, detail="Una o varias notarías seleccionadas ya no existen en CTN.")
    empleado.notarias_encargagest_ids = ids
    db.commit()
    db.refresh(empleado)
    return {"ok": True, "empleado_id": empleado.id, "notaria_ids": ids}


@router.get("/directorio/notarias")
def directorio_notarias_encargagest(
    q: str | None = None,
    alcance: str = Query("habilitadas", regex="^(habilitadas|todas)$"),
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
    usuario=Depends(get_encargagest_actor),
):
    """Directorio CTN paginado para administración; por defecto solo accesos habilitados."""
    _exigir_interno(usuario, "ver")
    if not _es_administrador_encargagest(usuario):
        raise HTTPException(status_code=403, detail="Solo un administrador puede consultar el directorio nacional.")

    consulta = db.query(Notaria, EncargoExternoUsuario).outerjoin(
        EncargoExternoUsuario, EncargoExternoUsuario.notaria_id == Notaria.id
    )
    if alcance == "habilitadas":
        consulta = consulta.filter(EncargoExternoUsuario.habilitado.is_(True))
    if q and q.strip():
        termino = f"%{q.strip()}%"
        consulta = consulta.filter(or_(
            Notaria.nombre.ilike(termino),
            Notaria.apellidos.ilike(termino),
            func.concat(Notaria.nombre, " ", Notaria.apellidos).ilike(termino),
            Notaria.nif.ilike(termino),
            Notaria.municipio.ilike(termino),
            Notaria.provincia.ilike(termino),
        ))
    total = consulta.count()
    registros = consulta.order_by(Notaria.provincia.asc(), Notaria.municipio.asc(), Notaria.apellidos.asc(), Notaria.nombre.asc()).offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    items = []
    for notaria, acceso in registros:
        items.append({
            "id": notaria.id,
            "nombre": " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or f"Notaría {notaria.id}",
            "nif": notaria.nif,
            "municipio": notaria.municipio,
            "provincia": notaria.provincia,
            "telefono": notaria.telefono,
            "tiene_acceso": acceso is not None,
            "habilitada": bool(acceso and acceso.habilitado),
        })
    return {"items": items, "total": total, "pagina": pagina, "por_pagina": por_pagina}


@router.get("/resumen")
def resumen(notaria_id: int | None = Query(None), db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    consulta_base = db.query(EncargoExterno)
    if _es_externo(usuario):
        consulta_base = consulta_base.filter(EncargoExterno.notaria_id == usuario["notaria_id"])
    elif notaria_id is not None:
        if not _notaria_permitida(usuario, notaria_id):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta notaría en EncargaGest.")
        consulta_base = consulta_base.filter(EncargoExterno.notaria_id == notaria_id)
    elif not _es_administrador_encargagest(usuario):
        ids = _ids_notarias_asignadas(usuario)
        consulta_base = consulta_base.filter(EncargoExterno.notaria_id.in_(ids)) if ids else consulta_base.filter(EncargoExterno.id == -1)
    else:
        habilitadas = db.query(EncargoExternoUsuario.notaria_id).filter(EncargoExternoUsuario.habilitado.is_(True))
        consulta_base = consulta_base.filter(EncargoExterno.notaria_id.in_(habilitadas))
    total = consulta_base.count()
    filas = consulta_base.with_entities(EncargoExterno.estado, func.count(EncargoExterno.id)).group_by(EncargoExterno.estado).all()
    estados = {}
    for estado, cantidad in filas:
        publico = _estado_publico(estado)
        estados[publico] = estados.get(publico, 0) + cantidad
    return {"total": total, "por_estado": estados}


@router.get("/notarias")
def listar_notarias(db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _autorizar(usuario, "ver")
    consulta = db.query(Notaria)
    if _es_externo(usuario):
        consulta = consulta.filter(Notaria.id == usuario["notaria_id"])
    elif _es_administrador_encargagest(usuario):
        habilitadas = db.query(EncargoExternoUsuario.notaria_id).filter(EncargoExternoUsuario.habilitado.is_(True))
        consulta = consulta.filter(Notaria.id.in_(habilitadas))
    else:
        ids = _ids_notarias_asignadas(usuario)
        consulta = consulta.filter(Notaria.id.in_(ids)) if ids else consulta.filter(Notaria.id == -1)
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
    notaria_id: int | None = Query(None),
    db: Session = Depends(get_db),
    usuario=Depends(get_encargagest_actor),
):
    _autorizar(usuario, "ver")
    consulta = db.query(EncargoExterno)
    if _es_externo(usuario):
        consulta = consulta.filter(EncargoExterno.notaria_id == usuario["notaria_id"])
    elif notaria_id is not None:
        if not _notaria_permitida(usuario, notaria_id):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta notaría en EncargaGest.")
        consulta = consulta.filter(EncargoExterno.notaria_id == notaria_id)
    elif not _es_administrador_encargagest(usuario):
        ids = _ids_notarias_asignadas(usuario)
        consulta = consulta.filter(EncargoExterno.notaria_id.in_(ids)) if ids else consulta.filter(EncargoExterno.id == -1)
    else:
        habilitadas = db.query(EncargoExternoUsuario.notaria_id).filter(EncargoExternoUsuario.habilitado.is_(True))
        consulta = consulta.filter(EncargoExterno.notaria_id.in_(habilitadas))
    if q and q.strip():
        termino = f"%{q.strip()}%"
        consulta = consulta.filter(or_(
            EncargoExterno.referencia.ilike(termino),
            EncargoExterno.notaria_nombre.ilike(termino),
            EncargoExterno.titular.ilike(termino),
            EncargoExterno.nif_titular.ilike(termino),
            EncargoExterno.entidad_bancaria.ilike(termino),
        ))
    grupos_estado = {
        "GRUPO_RECIBIDOS": ("EN_PROCESO", "RECIBIDO", *ESTADOS_LEGACY_PENDIENTES),
        "GRUPO_AUTORIZADOS": ("AUTORIZADO",),
        "GRUPO_INCIDENCIAS": ("INCIDENCIA",),
    }
    if estado in grupos_estado:
        consulta = consulta.filter(EncargoExterno.estado.in_(grupos_estado[estado]))
    elif estado == "FIRMADO":
        consulta = consulta.filter(EncargoExterno.estado.in_(("FIRMADO", *ESTADOS_LEGACY_FIRMADOS)))
    elif estado == "RECIBIDO":
        consulta = consulta.filter(EncargoExterno.estado == "RECIBIDO")
    elif estado and estado in ESTADOS:
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
    if not _notaria_permitida(usuario, notaria.id):
        raise HTTPException(status_code=403, detail="No tienes asignada esta notaría en EncargaGest.")
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
        contratos_json=datos.contratos or None,
        importe=Decimal(datos.importe) if datos.importe is not None else None,
        fecha_objetivo=datos.fecha_objetivo,
        prioridad=datos.prioridad,
        estado="EN_PROCESO",
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
        _registrar_actividad(db, item.id, usuario, "SISTEMA", "Encargo registrado en EncargaGest.")
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
    notaria_ctn = db.query(Notaria).filter(Notaria.id == item.notaria_id).first()
    if notaria_ctn:
        data["notaria_contacto"] = {
            "nombre": " ".join(filter(None, [notaria_ctn.nombre, notaria_ctn.apellidos])).strip(),
            "nif": notaria_ctn.nif,
            "direccion": notaria_ctn.direccion,
            "cp": notaria_ctn.cp,
            "municipio": notaria_ctn.municipio,
            "provincia": notaria_ctn.provincia,
            "telefono": notaria_ctn.telefono,
            "departamento_cancelaciones": notaria_ctn.departamento_cancelaciones,
        }
    else:
        data["notaria_contacto"] = None
    if _es_externo(usuario):
        data.pop("observaciones_internas", None)
    data["documentos"] = [_serializar_documento(doc) for doc in documentos]
    data["actividad"] = [_serializar_actividad(entry) for entry in actividad]
    return data


@router.put("/encargos/{encargo_id}")
def actualizar_encargo(encargo_id: int, datos: EncargoActualizar, db: Session = Depends(get_db), usuario=Depends(get_encargagest_actor)):
    _exigir_interno(usuario, "editar")
    item = _obtener_encargo(db, encargo_id, usuario)
    _exigir_encargo_abierto(item)
    cambios = datos.dict(exclude_unset=True)
    if "prioridad" in cambios and cambios["prioridad"] is not None and cambios["prioridad"] not in PRIORIDADES:
        raise HTTPException(status_code=422, detail="Prioridad no válida.")
    if "contratos" in cambios:
        contratos = cambios["contratos"] or []
        if not isinstance(contratos, list):
            raise HTTPException(status_code=422, detail="Los contratos deben enviarse como una lista.")
        normalizados = []
        for indice_contrato, contrato in enumerate(contratos):
            if not isinstance(contrato, dict):
                raise HTTPException(status_code=422, detail=f"El contrato {indice_contrato + 1} no tiene un formato válido.")
            fincas = contrato.get("fincas") or []
            if not isinstance(fincas, list):
                raise HTTPException(status_code=422, detail=f"Las fincas del contrato {indice_contrato + 1} deben enviarse como una lista.")
            fincas_limpias = []
            for indice_finca, finca in enumerate(fincas):
                if not isinstance(finca, dict):
                    raise HTTPException(status_code=422, detail=f"La finca {indice_finca + 1} del contrato {indice_contrato + 1} no tiene un formato válido.")
                capital = finca.get("capital_inscrito")
                try:
                    capital = Decimal(str(capital)) if capital not in (None, "") else None
                    if capital is not None and (not capital.is_finite() or capital < 0 or len(capital.as_tuple().digits) > 14):
                        raise ValueError()
                except Exception:
                    raise HTTPException(status_code=422, detail=f"Capital inscrito no válido en la finca {indice_finca + 1} del contrato {indice_contrato + 1}.")
                fincas_limpias.append({
                    "numero_finca": str(finca.get("numero_finca") or "").strip(),
                    "capital_inscrito": float(capital) if capital is not None else None,
                    "numero_inscripcion": str(finca.get("numero_inscripcion") or "").strip(),
                    "seccion": str(finca.get("seccion") or "").strip(),
                    "municipio_registro": str(finca.get("municipio_registro") or "").strip(),
                    "registro_propiedad": str(finca.get("registro_propiedad") or "").strip(),
                })
            fecha_constitucion = contrato.get("fecha_constitucion") or None
            if fecha_constitucion:
                try:
                    date.fromisoformat(str(fecha_constitucion)[:10])
                    fecha_constitucion = str(fecha_constitucion)[:10]
                except ValueError:
                    raise HTTPException(status_code=422, detail=f"Fecha de constitución no válida en el contrato {indice_contrato + 1}.")
            normalizados.append({
                "entidad_bancaria": str(contrato.get("entidad_bancaria") or "").strip(),
                "numero_prestamo": str(contrato.get("numero_prestamo") or "").strip(),
                "fecha_constitucion": fecha_constitucion,
                "fincas": fincas_limpias,
            })
        cambios["contratos"] = normalizados
        # Mantener los campos heredados sincronizados con el primer contrato y finca.
        primer_contrato = normalizados[0] if normalizados else {}
        primera_finca = (primer_contrato.get("fincas") or [{}])[0]
        cambios.update({
            "entidad_bancaria": primer_contrato.get("entidad_bancaria") or None,
            "numero_prestamo": primer_contrato.get("numero_prestamo") or None,
            "fecha_constitucion": date.fromisoformat(primer_contrato["fecha_constitucion"]) if primer_contrato.get("fecha_constitucion") else None,
            "capital_inscrito": Decimal(str(primera_finca["capital_inscrito"])) if primera_finca.get("capital_inscrito") is not None else None,
            "numero_finca": primera_finca.get("numero_finca") or None,
            "municipio_registro": primera_finca.get("municipio_registro") or None,
            "registro_propiedad": primera_finca.get("registro_propiedad") or None,
        })
    for campo, valor in cambios.items():
        if campo == "contratos":
            item.contratos_json = valor or None
            continue
        if campo in {"titular", "contacto_nombre", "contacto_email", "contacto_telefono", "nif_titular", "entidad_bancaria", "numero_prestamo", "numero_finca", "municipio_registro", "registro_propiedad", "observaciones", "observaciones_internas"} and isinstance(valor, str):
            valor = valor.strip() or None
        setattr(item, campo, valor)
    item.actualizado_en = datetime.utcnow()
    _registrar_actividad(db, item.id, usuario, "EDICION", "Datos del encargo actualizados.", visible_notaria=False)
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
    anterior = _estado_publico(item.estado)
    if anterior == "FIRMADO":
        raise HTTPException(status_code=409, detail="Un encargo firmado está cerrado y no puede modificarse.")
    if estado == anterior:
        raise HTTPException(status_code=409, detail="El encargo ya se encuentra en ese estado.")
    comentario = (datos.comentario or "").strip()
    if estado == "INCIDENCIA" and len(comentario) < 5:
        raise HTTPException(status_code=422, detail="Para registrar una incidencia debes indicar un motivo detallado que verá la notaría.")
    transiciones = {
        # En proceso y recibido forman una única bandeja: MOLSAN revisa y autoriza
        # directamente, sin un paso artificial de confirmación de recepción.
        "EN_PROCESO": {"AUTORIZADO", "INCIDENCIA"},
        "RECIBIDO": {"AUTORIZADO", "INCIDENCIA"},
        "AUTORIZADO": {"INCIDENCIA"},
        # La incidencia resuelta vuelve a autorizados; la firma se confirmará
        # desde ApoderaGest y no desde EncargaGest.
        "INCIDENCIA": {"AUTORIZADO"},
    }
    if estado not in transiciones.get(anterior, set()):
        raise HTTPException(status_code=409, detail=f"No se permite pasar directamente de {anterior} a {estado}. Valida las fases del encargo en orden.")
    item.estado = estado
    item.actualizado_en = datetime.utcnow()
    if estado == "INCIDENCIA":
        mensaje = "INCIDENCIA comunicada por MOLSAN: " + comentario
        _registrar_actividad(db, item.id, usuario, "INCIDENCIA", mensaje, visible_notaria=True)
    else:
        etiquetas = {
            "RECIBIDO": "Encargo recibido por MOLSAN.",
            "AUTORIZADO": "Documentación validada por MOLSAN. El encargo queda autorizado para continuar.",
        }
        mensaje = etiquetas.get(estado, f"Estado validado: {estado}.")
        if anterior == "INCIDENCIA":
            mensaje = "Incidencia marcada como resuelta por MOLSAN. " + mensaje
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
    item = _obtener_encargo(db, encargo_id, usuario)
    _exigir_encargo_abierto(item)
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
    if tipo == "INCIDENCIA":
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
    contrato_index: int = Form(0),
    db: Session = Depends(get_db),
    usuario=Depends(get_encargagest_actor),
):
    _autorizar(usuario, "editar")
    item = _obtener_encargo(db, encargo_id, usuario)
    _exigir_encargo_abierto(item)
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
            contrato_index=max(0, contrato_index),
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
    encargo = _obtener_encargo(db, encargo_id, usuario)
    _exigir_encargo_abierto(encargo)
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

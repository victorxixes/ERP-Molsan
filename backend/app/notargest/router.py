import hashlib
import hmac
import secrets
import os
import base64
import uuid
from pathlib import Path
from datetime import date, datetime, time, timedelta

import jwt
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, Request
from pydantic import BaseModel, constr
from sqlalchemy import and_, text, or_
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import obtener_token_bearer
from backend.app.config import settings
from backend.app.ctn.models import Notaria
from backend.app.database import engine, get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.gastos.models import ExpedienteGasto
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.expediente_observaciones.models import ExpedienteObservacion
from backend.app.empleados.models import Empleado
from backend.app.auth.permissions import require_perm_modulo
from backend.app.storage import CARPETA_DIGITAL_DIR

router = APIRouter(prefix="/notargest", tags=["NotarGest"])
ROOT = CARPETA_DIGITAL_DIR.resolve()
MAX_WORKFLOW_UPLOAD_BYTES = 25 * 1024 * 1024
EXTENSIONES_NOTARGEST_PERMITIDAS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".odt", ".ods", ".odp", ".rtf", ".txt", ".csv", ".eml",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip",
}
EXTENSIONES_NOTARGEST_VISTA_PREVIA = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _tipo_mime_notargest_seguro(nombre: str) -> tuple[str, str]:
    extension = Path(nombre).suffix.lower()
    if extension not in EXTENSIONES_NOTARGEST_PERMITIDAS:
        raise HTTPException(status_code=415, detail="Formato documental no permitido.")
    tipo_mime = mimetypes.guess_type(f"documento{extension}")[0] or "application/octet-stream"
    return extension, tipo_mime


def _politica_descarga_notargest(nombre: str) -> tuple[str, str]:
    extension = Path(nombre or "").suffix.lower()
    tipo_mime = (
        mimetypes.guess_type(f"documento{extension}")[0]
        if extension in EXTENSIONES_NOTARGEST_PERMITIDAS
        else None
    ) or "application/octet-stream"
    return tipo_mime, "inline" if extension in EXTENSIONES_NOTARGEST_VISTA_PREVIA else "attachment"


def _validar_contenido_workflow(contenido: bytes, exigir_pdf: bool = False) -> None:
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > MAX_WORKFLOW_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 25 MB.")
    if exigir_pdf and b"%PDF-" not in contenido[:1024]:
        raise HTTPException(status_code=400, detail="El contenido recibido no parece ser un PDF válido.")
ROOT.mkdir(parents=True, exist_ok=True)

@router.on_event("startup")
def crear_tabla_avisos_leidos_notargest():
    """Guarda las notificaciones leídas por notario, sin alterar las observaciones originales."""
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notargest_avisos_leidos (
                id SERIAL PRIMARY KEY,
                notaria_id INTEGER NOT NULL,
                tipo VARCHAR(20) NOT NULL,
                aviso_id INTEGER NOT NULL,
                leido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_notargest_aviso_leido UNIQUE (notaria_id, tipo, aviso_id)
            )
        """))

class LoginNotario(BaseModel):
    usuario: constr(min_length=3, max_length=50)
    password: constr(min_length=1, max_length=128)

class CambioPassword(BaseModel):
    password_actual: constr(min_length=1, max_length=128)
    password_nueva: constr(min_length=8, max_length=128)

class ComentarioGestorNotarGest(BaseModel):
    comentario: constr(min_length=1, max_length=2000)
    empleado_destinatario_id: int

def normalizar_nif(valor):
    return "".join((valor or "").upper().split()).replace("-", "")

def cifrar_password_portal(password):
    secreto = str(getattr(settings, "JWT_SECRET", "") or os.getenv("JWT_SECRET", "")).strip()
    if not secreto:
        raise HTTPException(status_code=500, detail="No está configurada la clave de cifrado de contraseñas.")
    clave = base64.urlsafe_b64encode(hashlib.sha256(("ERP-Molsan-portales-v1:" + secreto).encode("utf-8")).digest())
    return Fernet(clave).encrypt(password.encode("utf-8")).decode("ascii")


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    rounds = 310000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), rounds).hex()
    return "pbkdf2_sha256$" + str(rounds) + "$" + salt + "$" + digest

def verificar_password(password, stored):
    try:
        algorithm, rounds, salt, expected = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

@router.on_event("startup")
def migrar_notargest():
    """Comprueba primero el esquema y evita ALTER TABLE si las columnas ya existen.

    PostgreSQL puede necesitar un bloqueo exclusivo para ALTER TABLE incluso con
    ADD COLUMN IF NOT EXISTS. Por eso no ejecutamos ALTER sobre columnas existentes.
    """
    import time as _time

    cambios = [
        ("notargest_habilitado", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("notargest_password_hash", "VARCHAR(255)"),
        ("notargest_cambiar_password", "BOOLEAN NOT NULL DEFAULT TRUE"),
        ("notargest_password_provisional", "BOOLEAN NOT NULL DEFAULT TRUE"),
    ]
    tabla = "ctn_notarios"
    print("[NOTARGEST MIGRACION] Inicio de migración de columnas de acceso.", flush=True)

    with engine.connect() as conn:
        resultado = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = :tabla"
            ),
            {"tabla": tabla},
        )
        existentes = {fila[0] for fila in resultado.fetchall()}
        print(
            f"[NOTARGEST MIGRACION] Columnas encontradas en {tabla}: "
            f"{', '.join(sorted(existentes)) or '(ninguna)'}.",
            flush=True,
        )

    for nombre, tipo_sql in cambios:
        if nombre in existentes:
            print(f"[NOTARGEST MIGRACION] {nombre} ya existe; se omite ALTER TABLE.", flush=True)
            continue

        sql = f"ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo_sql}"
        completado = False
        for intento in range(1, 4):
            try:
                print(f"[NOTARGEST MIGRACION] Añadiendo {nombre} (intento {intento}/3)...", flush=True)
                with engine.begin() as conn:
                    conn.execute(text("SET LOCAL lock_timeout = '5s'"))
                    conn.execute(text("SET LOCAL statement_timeout = '15s'"))
                    conn.execute(text(sql))
                print(f"[NOTARGEST MIGRACION] Columna {nombre}: OK.", flush=True)
                completado = True
                break
            except Exception as exc:
                print(f"[NOTARGEST MIGRACION] Error en {nombre}, intento {intento}/3: {exc!r}", flush=True)
                if intento < 3:
                    _time.sleep(2)
                else:
                    # No bloquear el arranque completo del ERP por una migración
                    # auxiliar de acceso NotarGest. Se deja constancia para resolverla.
                    print(
                        f"[NOTARGEST MIGRACION] AVISO: no se pudo añadir {nombre}; "
                        "el arranque continuará y habrá que reintentar la migración.",
                        flush=True,
                    )
        if not completado:
            continue

    print("[NOTARGEST MIGRACION] Migración de acceso revisada.", flush=True)

def _requiere_cambio_password_notargest(notaria) -> bool:
    return bool(
        getattr(notaria, "notargest_cambiar_password", True)
        or getattr(notaria, "notargest_password_provisional", True)
    )


def _ruta_permitida_durante_cambio_password(path: str) -> bool:
    ruta = str(path or "").rstrip("/")
    return ruta in {
        "/api/notargest/me",
        "/api/notargest/cambiar-password",
    }


def _accion_requerida_notargest(method: str, path: str) -> str:
    verbo = str(method or "GET").upper()
    ruta = str(path or "").rstrip("/")
    # Seleccionar una notaría emulada es navegación de solo lectura; la ruta
    # impone además el control explícito de administrador ERP.
    if verbo in {"GET", "HEAD", "OPTIONS"} or (
        verbo == "POST" and ruta.startswith("/api/notargest/seleccion/notaria/")
    ):
        return "ver"
    if verbo == "DELETE":
        return "eliminar"
    return "editar"


def get_notario(request: Request, token=Depends(obtener_token_bearer), db: Session = Depends(get_db)):
    """Acepta JWT de notario o JWT ERP autorizado para el módulo NotarGest."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        if payload.get("tipo") == "notargest" and payload.get("notaria_id"):
            n = db.query(Notaria).filter(Notaria.id == int(payload["notaria_id"])).first()
            if not n or not n.notargest_habilitado:
                raise HTTPException(status_code=403, detail="Acceso NotarGest deshabilitado")

            requiere_cambio = _requiere_cambio_password_notargest(n)
            if requiere_cambio and not _ruta_permitida_durante_cambio_password(request.url.path):
                raise HTTPException(
                    status_code=403,
                    detail="Debes cambiar la contraseña provisional antes de acceder a NotarGest.",
                )
            return n
        empleado_id = payload.get("id")
        if not empleado_id:
            raise HTTPException(status_code=401, detail="Sesión NotarGest inválida")
        empleado = db.query(Empleado).filter(Empleado.id == int(empleado_id)).first()
        if not empleado or getattr(empleado, "activo", True) is False:
            raise HTTPException(status_code=401, detail="Usuario ERP inválido o inactivo")
        modulos = getattr(empleado, "modulos_visibles_list", None) or []
        if not any(str(m).strip().casefold() == "notargest" for m in modulos):
            raise HTTPException(status_code=403, detail="NotarGest no está habilitado para este usuario ERP")
        # Toda sesión ERP necesita permiso de lectura del módulo; las
        # operaciones que mutan datos requieren además editar/eliminar.
        require_perm_modulo(empleado, "notargest", "ver")
        accion_requerida = _accion_requerida_notargest(
            request.method,
            request.url.path,
        )
        if accion_requerida != "ver":
            require_perm_modulo(empleado, "notargest", accion_requerida)
        return empleado
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión ha caducado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Sesión NotarGest inválida")
    except Exception as exc:
        print(f"ERROR AUTENTICACIÓN NOTARGEST: {exc}", flush=True)
        raise HTTPException(status_code=401, detail="Sesión NotarGest inválida")

def _es_usuario_erp(actor):
    return isinstance(actor, Empleado)


def _expedientes_de_notario(n, db):
    if _es_usuario_erp(n):
        filtros = []
        if hasattr(Expediente, "fecha_envio_notario"):
            filtros.append(Expediente.fecha_envio_notario.isnot(None))
        if hasattr(Expediente, "notargest_estado"):
            filtros.append(Expediente.notargest_estado.isnot(None))
        if filtros:
            return db.query(Expediente).filter(or_(*filtros)).order_by(Expediente.id.desc()).limit(1000).all()
        return []
    nombre = " ".join(x for x in [n.nombre, n.apellidos] if x).strip()
    filtros_legacy = []
    if nombre:
        filtros_legacy.append(Expediente.nombre_notario.ilike(nombre))
    if n.nif:
        filtros_legacy.append(text("upper(replace(replace(coalesce(nif_notario, ''), ' ', ''), '-', '')) = :nif").bindparams(nif=normalizar_nif(n.nif)))
    notario_id = getattr(n, "id", None)
    if notario_id is not None:
        filtro_id = Expediente.notario_id == int(notario_id)
        if filtros_legacy:
            filtro = or_(
                filtro_id,
                and_(Expediente.notario_id.is_(None), or_(*filtros_legacy)),
            )
        else:
            filtro = filtro_id
        return db.query(Expediente).filter(filtro).order_by(Expediente.id.desc()).limit(500).all()
    if not filtros_legacy:
        return []
    return db.query(Expediente).filter(or_(*filtros_legacy)).order_by(Expediente.id.desc()).limit(500).all()

def _fecha(valor):
    return valor.isoformat() if isinstance(valor, (date, datetime, time)) else valor


def _campos_ficha_central(expediente):
    """Campos base explícitos del portal; no serializar automáticamente toda la fila ORM."""
    permitidos = {
        "id", "id_expediente", "fecha_alta", "oficina", "oficina_alta",
        "nombre_titular", "apellidos", "nif_titular", "nombre_solicitante",
        "nif_solicitante", "finca", "nombre_notario", "notario", "nif_notario",
        "notario_id", "poblacion", "provincia", "fecha_envio", "fecha_envio_notario",
        "fecha_prevista_firma", "hora_prevista_firma", "fecha_firma", "protocolo",
        "escritura_firmada", "tipo_documento", "idioma_documento", "formato_escritura",
        "tipo_tramite", "tipo_firma", "capital", "importe", "contrato",
        "tipo_operacion", "subtipo_operacion", "observaciones", "numero_entrada",
        "asiento_presentacion_libro_diario", "fecha_presentacion",
        "fecha_presentacion_tributaria", "fecha_liquidacion_tributaria",
        "fecha_inscripcion", "actividad_actual", "estado_actividad",
        "estado_expediente", "notargest_estado", "notargest_fecha_cierre",
        "notargest_fecha_envio_gestoria", "tiene_defectos_abiertos",
        "numero_solicitud_pnc", "fecha_solicitud_pnc", "firma_urgente",
    }
    resultado = {}
    for nombre in permitidos:
        if not hasattr(expediente, nombre):
            continue
        valor = getattr(expediente, nombre, None)
        if valor is not None and hasattr(valor, "isoformat"):
            valor = valor.isoformat()
        resultado[nombre] = valor
    return resultado


def _filtrar_campos_sensibles_notario_externo(datos):
    """Retira campos financieros internos que no forman parte del portal notarial."""
    for campo in (
        "saldo_real", "saldo_disponible", "origen_bankia", "producto_gtg",
        "tipo_provision", "id_provision",
    ):
        datos.pop(campo, None)
    return datos

def _resumen(e, db):
    actividad = getattr(e, "actividad_actual", None)
    fecha_firma = getattr(e, "fecha_firma", None)
    actividad_norm = (actividad or "").strip().casefold()
    pendiente_presentacion = bool(fecha_firma and ("sede notarial" in actividad_norm or "protocolo" in actividad_norm))
    docs = db.query(DocumentoCarpetaDigital).filter(DocumentoCarpetaDigital.expediente_id == str(e.id_expediente)).all()
    factura = next((d for d in docs if (d.categoria or "").casefold() == "factura notarial"), None)
    return {
        # Los campos de la ficha central están disponibles en NotarGest.
        # Los campos derivados/alias de abajo conservan compatibilidad con la UI.
        **_campos_ficha_central(e),
        "id": e.id,
        "id_expediente": e.id_expediente,
        "notario_id": getattr(e, "notario_id", None),
        "apoderado_empleado_id": getattr(e, "apoderado_empleado_id", None),
        "numero_expediente": e.id_expediente,
        "id_provision": e.id_provision,
        "titular": e.nombre_titular,
        "nombre": getattr(e, "nombre_titular", None),
        "apellidos": getattr(e, "apellidos", None),
        "dni": getattr(e, "nif_titular", None),
        "nombre_solicitante": getattr(e, "nombre_solicitante", None),
        "nif_solicitante": getattr(e, "nif_solicitante", None),
        "finca": getattr(e, "finca", None),
        "cuantia_documento": next(
            (
                getattr(documento, "cuantia", None)
                for documento in (getattr(e, "documentos_escritura", None) or [])
                if getattr(documento, "cuantia", None) is not None
            ),
            None,
        ),
        "bloqueado": bool(getattr(e, "bloqueo_manual", False) or str(getattr(e, "estado_expediente", "") or "").strip().upper().startswith(("LST", "RST")) or getattr(e, "liquidado_sin_tramitar", False) or getattr(e, "cambio_gestoria", False)),
        "motivo_bloqueo_efectivo": (getattr(e, "motivo_bloqueo", None) or ("LIQUIDADO SIN TRAMITAR" if str(getattr(e, "estado_expediente", "") or "").strip().upper().startswith("LST") or getattr(e, "liquidado_sin_tramitar", False) else "RETENCIÓN SIN TRAMITAR" if str(getattr(e, "estado_expediente", "") or "").strip().upper().startswith("RST") else "CAMBIO DE GESTORÍA" if getattr(e, "cambio_gestoria", False) else "BLOQUEO MANUAL" if getattr(e, "bloqueo_manual", False) else None)),
        "nif_titular": e.nif_titular,
        "solicitante": e.nombre_solicitante,
        "nif_solicitante": e.nif_solicitante,
        "estado": e.estado_expediente,
        "notargest_estado": _estado_workflow(e),
        "notargest_fecha_cierre": _fecha(getattr(e, "notargest_fecha_cierre", None)),
        "notargest_fecha_envio_gestoria": _fecha(getattr(e, "notargest_fecha_envio_gestoria", None)),
        "tiene_defectos_abiertos": getattr(e, "tiene_defectos_abiertos", None),
        "estado_actividad": e.estado_actividad,
        "actividad_actual": actividad,
        "oficina": e.oficina or e.oficina_alta,
        "fecha_alta": _fecha(e.fecha_alta),
        "fecha_envio": _fecha(getattr(e, "fecha_envio", None)),
        "fecha_envio_notario": _fecha(e.fecha_envio_notario),
        "fecha_envio": _fecha(e.fecha_envio),
        "nombre_notario": e.nombre_notario or e.notario,
        "nif_notario": e.nif_notario,
        "poblacion": e.poblacion,
        "provincia": e.provincia,
        "apoderado": e.apoderado,
        "escritura_firmada": e.escritura_firmada,
        "cuantia": next((getattr(documento, "cuantia", None) for documento in (getattr(e, "documentos_escritura", None) or []) if getattr(documento, "cuantia", None) is not None), None),
        "documentos_escritura": [{"id": d.id, "tipo_documento": d.tipo_documento, "cuantia": d.cuantia} for d in (getattr(e, "documentos_escritura", None) or [])],
        "facturacion_nombre": e.facturacion_nombre,
        "facturacion_apellidos": e.facturacion_apellidos,
        "facturacion_dni_nif": e.facturacion_dni_nif,
        "facturacion_direccion": e.facturacion_direccion,
        "facturacion_codigo_postal": e.facturacion_codigo_postal,
        "facturacion_poblacion": e.facturacion_poblacion,
        "facturacion_provincia": e.facturacion_provincia,
        "facturacion_telefono": e.facturacion_telefono,
        "facturacion_email": e.facturacion_email,
        "fecha_solicitud_pnc": _fecha(e.fecha_solicitud_pnc),
        "numero_solicitud_pnc": e.numero_solicitud_pnc,
        "fecha_prevista_firma": _fecha(e.fecha_prevista_firma),
        "hora_prevista_firma": _fecha(e.hora_prevista_firma),
        "firma_urgente": bool(getattr(e, "firma_urgente", False)),
        "fecha_firma": _fecha(fecha_firma),
        "protocolo": e.protocolo,
        "tipo_documento": e.tipo_documento,
        "idioma_documento": e.idioma_documento,
        "formato_escritura": e.formato_escritura,
        "tipo_tramite": e.tipo_tramite,
        "tipo_firma": e.tipo_firma,
        "capital": (
            getattr(e, "capital_documento_notarial", None)
            if getattr(e, "capital_documento_notarial", None) is not None
            else e.capital
        ),
        "importe": e.importe,
        "saldo_real": e.saldo_real,
        "saldo_disponible": e.saldo_disponible,
        "contrato": e.contrato,
        "tipo_operacion": e.tipo_operacion,
        "subtipo_operacion": getattr(e, "subtipo_operacion", None),
        "observaciones": e.observaciones,
        "numero_entrada": e.numero_entrada,
        "asiento_presentacion_libro_diario": e.asiento_presentacion_libro_diario,
        "fecha_presentacion": _fecha(e.fecha_presentacion),
        "fecha_presentacion_registro": _fecha(e.fecha_presentacion),
        "fecha_presentacion_tributaria": _fecha(getattr(e, "fecha_presentacion_tributaria", None)),
        "fecha_liquidacion_tributaria": _fecha(getattr(e, "fecha_liquidacion_tributaria", None)),
        "fecha_inscripcion": _fecha(getattr(e, "fecha_inscripcion", None)),
        "tipo_provision": getattr(e, "tipo_provision", None),
        "origen_bankia": getattr(e, "origen_bankia", None),
        "producto_gtg": getattr(e, "producto_gtg", None),
        "pendiente_presentacion_registro": pendiente_presentacion and not e.fecha_presentacion,
        "factura_notarial": ({
            "id": factura.id, "nombre": factura.nombre_original,
            "fecha_subida": _fecha(factura.fecha_subida)
        } if factura else None),
    }

@router.post("/login")
def login(data: LoginNotario, db: Session = Depends(get_db)):
    nif = normalizar_nif(data.usuario)
    n = db.query(Notaria).filter(text("upper(replace(replace(nif, ' ', ''), '-', '')) = :nif")).params(nif=nif).first()
    if not n:
        raise HTTPException(status_code=401, detail="Acceso no habilitado. Contacta con Molsan.")
    if not n.notargest_habilitado:
        db.execute(text("""
            INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
            VALUES (:id, 'notargest', 'LOGIN', 'fallido', :usuario, 'Acceso deshabilitado')
        """), {"id": n.id, "usuario": nif})
        db.commit()
        raise HTTPException(status_code=401, detail="Acceso no habilitado. Contacta con Molsan.")
    password_nif = hmac.compare_digest(normalizar_nif(data.password), nif)
    if password_nif and (not n.notargest_password_hash or getattr(n, "notargest_password_provisional", True)):
        n.notargest_password_hash = hash_password(nif)
        n.notargest_password_enc = cifrar_password_portal(nif)
        n.notargest_cambiar_password = True
        n.notargest_password_provisional = True
        valido = True
    elif n.notargest_password_hash:
        valido = verificar_password(data.password, n.notargest_password_hash)
        if valido and not password_nif:
            n.notargest_password_provisional = False
    else:
        valido = False
    if not valido:
        db.execute(text("""
            INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
            VALUES (:id, 'notargest', 'LOGIN', 'fallido', :usuario, 'Credenciales incorrectas')
        """), {"id": n.id, "usuario": nif})
        db.commit()
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    db.execute(text("""
        INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
        VALUES (:id, 'notargest', 'LOGIN', 'correcto', :usuario, 'Inicio de sesión correcto')
    """), {"id": n.id, "usuario": nif})
    db.commit()
    token = jwt.encode({"tipo": "notargest", "notaria_id": n.id, "exp": datetime.utcnow() + timedelta(hours=8)}, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    requiere_cambio = _requiere_cambio_password_notargest(n)
    return {
        "token": token,
        "requiere_cambio_password": requiere_cambio,
        "notario": {
            "id": n.id,
            "nombre": " ".join(x for x in [n.nombre, n.apellidos] if x),
            "nif": n.nif,
        },
    }



def _es_administrador_notargest(usuario):
    nombre_usuario = str(getattr(usuario, "usuario", "") or "").strip().casefold()
    rol = str(getattr(getattr(usuario, "rol", None), "nombre", "") or "").strip().casefold()
    return nombre_usuario == "admin" or rol in {"admin", "administrador", "administradora", "superadmin"}


@router.get("/seleccion/notarias")
def notarias_habilitadas_para_admin(n=Depends(get_notario), db: Session = Depends(get_db)):
    if not _es_usuario_erp(n) or not _es_administrador_notargest(n):
        raise HTTPException(status_code=403, detail="Solo un administrador ERP puede seleccionar una notaría en NotarGest.")
    require_perm_modulo(n, "notargest", "ver")
    notarías = db.query(Notaria).filter(Notaria.notargest_habilitado.is_(True)).order_by(Notaria.apellidos.asc(), Notaria.nombre.asc()).all()
    resultado = []
    campos_pendientes = {
        "pendientes_recepcion": "recepcion",
        "pendientes_firma": "firma",
        "pendientes_factura": "factura",
        "pendientes_registro": "registro",
        "pendientes_ajd_itp": "ajd",
        "pendientes_inscripcion": "inscripcion",
        "pendientes_copias": "copia",
        "escrituras_cerradas": "cerrada",
    }
    for item in notarías:
        expedientes = _expedientes_de_notario(item, db)
        conteos = {clave: 0 for clave in campos_pendientes}
        urgentes = 0
        defectos = 0
        for expediente in expedientes:
            estado = _estado_workflow(expediente)
            for clave, estado_objetivo in campos_pendientes.items():
                if estado == estado_objetivo:
                    conteos[clave] += 1
            if bool(getattr(expediente, "firma_urgente", False)):
                urgentes += 1
            actividad = str(getattr(expediente, "actividad_actual", "") or "").casefold()
            if ("defecto" in actividad) or str(getattr(expediente, "tiene_defectos_abiertos", "") or "").strip().casefold() in {"si", "sí", "true", "1", "abierto"}:
                defectos += 1
        total_pendiente = sum(valor for clave, valor in conteos.items() if clave != "escrituras_cerradas")
        resultado.append({
            "id": item.id,
            "nombre": " ".join(filter(None, [item.nombre, item.apellidos])).strip() or f"Notaría {item.id}",
            "nif": item.nif,
            "municipio": item.municipio,
            "provincia": item.provincia,
            "total_expedientes": len(expedientes),
            "total_pendiente": total_pendiente,
            "firmas_urgentes": urgentes,
            "con_defectos": defectos,
            **conteos,
        })
    return resultado



@router.get("/seleccion/expedientes")
def expedientes_resumen_global(n=Depends(get_notario), db: Session = Depends(get_db)):
    """Listado de expedientes de todas las notarías habilitadas para el modal de Visión Molsan."""
    if not _es_usuario_erp(n) or not _es_administrador_notargest(n):
        raise HTTPException(status_code=403, detail="Solo un administrador ERP puede consultar el resumen global de NotarGest.")
    require_perm_modulo(n, "notargest", "ver")
    notarías = db.query(Notaria).filter(Notaria.notargest_habilitado.is_(True)).order_by(Notaria.apellidos.asc(), Notaria.nombre.asc()).all()
    resultado = []
    for notaria in notarías:
        nombre_notaria = " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or f"Notaría {notaria.id}"
        for expediente in _expedientes_de_notario(notaria, db):
            item = _resumen(expediente, db)
            estado = _estado_workflow(expediente)
            actividad = str(getattr(expediente, "actividad_actual", "") or "").casefold()
            valor_defectos = str(getattr(expediente, "tiene_defectos_abiertos", "") or "").strip().casefold()
            con_defectos = ("defecto" in actividad) or valor_defectos in {"si", "sí", "true", "1", "abierto"}
            item.update({
                "notaria_id": notaria.id,
                "notaria_nombre": nombre_notaria,
                "pendiente_recepcion": estado == "recepcion",
                "pendiente_firma": estado == "firma",
                "pendiente_factura_notarial": estado == "factura",
                "pendiente_presentacion_registro": estado == "registro",
                "pendiente_ajd_itp": estado == "ajd",
                "pendiente_inscripcion": estado == "inscripcion",
                "pendiente_copia_simple": estado == "copia",
                "escrituras_cerradas_inscritas": estado == "cerrada",
                "con_defectos": con_defectos,
                "firmas_urgentes": bool(getattr(expediente, "firma_urgente", False)),
            })
            resultado.append(item)
    return {"items": resultado, "total": len(resultado)}


@router.post("/seleccion/notaria/{notaria_id}")
def seleccionar_notaria_admin(notaria_id: int, n=Depends(get_notario), db: Session = Depends(get_db)):
    if not _es_usuario_erp(n) or not _es_administrador_notargest(n):
        raise HTTPException(status_code=403, detail="Solo un administrador ERP puede seleccionar una notaría en NotarGest.")
    require_perm_modulo(n, "notargest", "ver")
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id, Notaria.notargest_habilitado.is_(True)).first()
    if not notaria:
        raise HTTPException(status_code=404, detail="La notaría no existe o no tiene NotarGest habilitado.")
    token = jwt.encode({
        "tipo": "notargest",
        "notaria_id": notaria.id,
        "seleccion_admin": True,
        "empleado_admin_id": n.id,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return {
        "token": token,
        "notaria": {
            "id": notaria.id,
            "nombre": " ".join(filter(None, [notaria.nombre, notaria.apellidos])).strip() or f"Notaría {notaria.id}",
            "nif": notaria.nif,
        },
    }


@router.get("/me")
def me(n=Depends(get_notario), db: Session = Depends(get_db)):
    if _es_usuario_erp(n):
        nif_erp = normalizar_nif(getattr(n, "dni", None) or "")
        notaria_ctn = None
        if nif_erp:
            notaria_ctn = db.query(Notaria).filter(
                text("upper(replace(replace(nif, ' ', ''), '-', '')) = :nif")
            ).params(nif=nif_erp).first()
        if notaria_ctn:
            n = notaria_ctn
            tipo_acceso = "erp_ctn"
        else:
            return {"id": n.id, "nombre": " ".join(x for x in [n.nombre, n.apellidos] if x), "nif": n.dni, "tipo_acceso": "erp", "requiere_cambio_password": False}
    else:
        tipo_acceso = "notario"
    return {
        "id": n.id,
        "nombre": " ".join(x for x in [n.nombre, n.apellidos] if x),
        "nif": getattr(n, "nif", None) or getattr(n, "dni", None),
        "codigo": getattr(n, "codigo", None),
        "telefono": getattr(n, "telefono", None),
        "direccion": getattr(n, "direccion", None),
        "cp": getattr(n, "cp", None),
        "municipio": getattr(n, "municipio", None),
        "provincia": getattr(n, "provincia", None),
        "vc": getattr(n, "vc", None),
        "apoderado": getattr(n, "apoderado", None),
        "departamento_cancelaciones": getattr(n, "departamento_cancelaciones", None),
        "departamento_copias": getattr(n, "departamento_copias", None),
        "otros_departamentos": getattr(n, "otros_departamentos", None),
        "observacion": getattr(n, "observacion", None),
        "tipo_acceso": tipo_acceso,
        "requiere_cambio_password": _requiere_cambio_password_notargest(n),
    }

@router.post("/cambiar-password")
def cambiar_password(data: CambioPassword, n=Depends(get_notario), db: Session = Depends(get_db)):
    if _es_usuario_erp(n):
        raise HTTPException(
            status_code=403,
            detail="El cambio de contraseña desde el perfil está reservado a las cuentas externas de notaría.",
        )
    valida = bool(n.notargest_password_hash and verificar_password(data.password_actual, n.notargest_password_hash))
    if not valida and getattr(n, "notargest_password_provisional", True):
        valida = hmac.compare_digest(normalizar_nif(data.password_actual), normalizar_nif(n.nif or ""))
    if not valida:
        raise HTTPException(status_code=400, detail="La contraseña provisional no es correcta.")
    if normalizar_nif(data.password_nueva) == normalizar_nif(n.nif or ""):
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser el DNI/NIF")
    n.notargest_password_hash = hash_password(data.password_nueva)
    n.notargest_password_enc = cifrar_password_portal(data.password_nueva)
    n.notargest_cambiar_password = False
    n.notargest_password_provisional = False
    db.execute(text("""
        INSERT INTO ctn_portal_accesos_historial (notaria_id, portal, evento, resultado, usuario, detalle)
        VALUES (:id, 'notargest', 'CAMBIO_PASSWORD', 'correcto', :usuario, 'La notaría cambió su contraseña desde su perfil')
    """), {"id": n.id, "usuario": normalizar_nif(n.nif)})
    db.commit()
    return {"ok": True, "mensaje": "Contraseña actualizada"}



ESTADOS_NOTARGEST = {
    "recepcion": "Pendientes de recepción",
    "firma": "Pendientes de firma",
    "factura": "Pendientes de factura notaría",
    "registro": "Pendientes de presentación en Registro",
    "ajd": "Liquidación AJD / ITP",
    "inscripcion": "Pendientes de inscripción",
    "copia": "Pendientes de copia simple",
    "cerrada": "Escrituras cerradas inscritas",
}

# La migración de estas columnas se centraliza en main.py para evitar DDL concurrente.
def migrar_workflow_notargest():
    """Comprueba columnas del workflow y no bloquea el arranque por migraciones auxiliares."""
    import time as _time

    tabla = "expedientes"
    cambios = [
        ("notargest_estado", "VARCHAR(80)"),
        ("notargest_fecha_cierre", "DATE"),
        ("notargest_fecha_envio_gestoria", "DATE"),
    ]
    print("[NOTARGEST WORKFLOW] Inicio de migración.", flush=True)

    with engine.connect() as conn:
        resultado = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = :tabla"
            ),
            {"tabla": tabla},
        )
        existentes = {fila[0] for fila in resultado.fetchall()}

    for nombre, tipo_sql in cambios:
        if nombre in existentes:
            print(f"[NOTARGEST WORKFLOW] {nombre} ya existe; se omite ALTER TABLE.", flush=True)
            continue

        completado = False
        for intento in range(1, 4):
            try:
                print(f"[NOTARGEST WORKFLOW] Añadiendo {nombre} (intento {intento}/3)...", flush=True)
                with engine.begin() as conn:
                    conn.execute(text("SET LOCAL lock_timeout = '5s'"))
                    conn.execute(text("SET LOCAL statement_timeout = '15s'"))
                    conn.execute(text(f"ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo_sql}"))
                print(f"[NOTARGEST WORKFLOW] Columna {nombre}: OK.", flush=True)
                completado = True
                break
            except Exception as exc:
                print(f"[NOTARGEST WORKFLOW] Error en {nombre}, intento {intento}/3: {exc!r}", flush=True)
                if intento < 3:
                    _time.sleep(2)

        if not completado:
            print(
                f"[NOTARGEST WORKFLOW] AVISO: no se pudo añadir {nombre}; "
                "el arranque continuará y habrá que reintentar la migración.",
                flush=True,
            )

    print("[NOTARGEST WORKFLOW] Migración revisada.", flush=True)


def _estado_workflow(e):
    estado = getattr(e, "notargest_estado", None)
    if estado in ESTADOS_NOTARGEST:
        return estado
    actividad = (getattr(e, "actividad_actual", None) or "").casefold()
    if getattr(e, "notargest_fecha_cierre", None): return "cerrada"
    if "copia simple" in actividad: return "copia"
    if "inscrip" in actividad: return "inscripcion"
    if any(x in actividad for x in ("ajd", "itp", "impuesto")): return "ajd"
    if getattr(e, "fecha_firma", None): return "factura"
    if getattr(e, "fecha_prevista_firma", None): return "firma"
    if getattr(e, "fecha_envio_notario", None): return "recepcion"
    return "recepcion"

@router.post("/expedientes/{expediente_id}/estado")
def cambiar_estado_workflow(expediente_id: str, data: dict, n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    destino = str(data.get("estado") or "").strip()
    if destino not in ESTADOS_NOTARGEST:
        raise HTTPException(status_code=400, detail="Estado NotarGest no válido")
    actual = _estado_workflow(e)
    permitidos = {"recepcion": {"firma"}, "firma": {"factura"}}
    if destino not in permitidos.get(actual, set()):
        raise HTTPException(status_code=400, detail=f"No se permite pasar de {ESTADOS_NOTARGEST.get(actual, actual)} a {ESTADOS_NOTARGEST[destino]} mediante este botón")
    if destino == "factura" and (not e.fecha_firma or not (e.protocolo or "").strip()):
        raise HTTPException(status_code=400, detail="Indica la fecha de firma y el protocolo antes de continuar")
    e.notargest_estado = destino
    if destino == "firma":
        e.actividad_actual = ESTADOS_NOTARGEST[destino]
    elif destino == "factura":
        e.actividad_actual = ESTADOS_NOTARGEST[destino]
    db.commit()
    return {"ok": True, "estado": destino, "estado_texto": ESTADOS_NOTARGEST[destino]}

@router.patch("/expedientes/{expediente_id}/firma")
def actualizar_datos_firma(expediente_id: str, data: dict, n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    fecha = data.get("fecha_firma")
    protocolo = str(data.get("protocolo") or "").strip()

    if e.fecha_firma or (getattr(e, "protocolo", None) or "").strip():
        fecha_entrante = None
        if fecha:
            try:
                fecha_entrante = date.fromisoformat(str(fecha)[:10])
            except ValueError:
                raise HTTPException(status_code=400, detail="La fecha de firma no es válida")
        if fecha_entrante == e.fecha_firma and protocolo == (e.protocolo or "").strip():
            return {"ok": True, "fecha_firma": _fecha(e.fecha_firma), "protocolo": e.protocolo, "sin_cambios": True}
        raise HTTPException(
            status_code=409,
            detail="La firma ya está registrada y no puede borrarse ni sustituirse desde NotarGest.",
        )

    if not fecha or not protocolo:
        raise HTTPException(status_code=400, detail="Para registrar una firma debes indicar fecha y protocolo.")
    try:
        e.fecha_firma = date.fromisoformat(str(fecha)[:10])
    except ValueError:
        raise HTTPException(status_code=400, detail="La fecha de firma no es válida")
    e.protocolo = protocolo
    e.escritura_firmada = True
    db.commit()
    return {"ok": True, "fecha_firma": _fecha(e.fecha_firma), "protocolo": e.protocolo}

@router.patch("/expedientes/{expediente_id}/cierre")
def actualizar_cierre(expediente_id: str, data: dict, n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    for campo in ("notargest_fecha_cierre", "notargest_fecha_envio_gestoria"):
        valor = data.get(campo)
        if valor:
            try: setattr(e, campo, date.fromisoformat(str(valor)[:10]))
            except ValueError: raise HTTPException(status_code=400, detail=f"Fecha no válida: {campo}")
    if e.notargest_fecha_cierre:
        e.notargest_estado = "cerrada"
        e.actividad_actual = ESTADOS_NOTARGEST["cerrada"]
    db.commit()
    return {"ok": True, "fecha_cierre": _fecha(e.notargest_fecha_cierre), "fecha_envio_gestoria": _fecha(e.notargest_fecha_envio_gestoria), "estado": _estado_workflow(e)}

@router.post("/expedientes/{expediente_id}/documentos-workflow")
async def subir_documento_workflow(expediente_id: str, categoria: str = Form(...), archivo: UploadFile = File(...), n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    categorias = {
        "factura": ("Factura notarial", "application/pdf", "registro"),
        "presentacion": ("Presentación Registro", None, "ajd"),
        "ajd": ("AJD/ITP", None, "inscripcion"),
        "defecto": ("Defecto registral", "application/pdf", None),
        "subsanacion": ("Subsanación del defecto", "application/pdf", None),
        "inscripcion": ("Hoja de Inscripción", "application/pdf", "copia"),
        "copia": ("Copia simple", "application/pdf", "cerrada"),
    }
    if categoria not in categorias:
        raise HTTPException(status_code=400, detail="Tipo de documento no válido")
    categoria_carpeta, mime_fijo, siguiente = categorias[categoria]
    nombre = Path(archivo.filename or "documento").name
    extension, tipo_mime_seguro = _tipo_mime_notargest_seguro(nombre)
    if categoria in ("factura", "defecto", "subsanacion", "inscripcion", "copia") and extension != ".pdf":
        raise HTTPException(status_code=400, detail="Este documento debe adjuntarse en PDF")
    if categoria == "copia" and str(getattr(e, "tiene_defectos_abiertos", "") or "").strip().casefold() in {"si", "sí", "true", "1", "abierto"}:
        raise HTTPException(status_code=400, detail="No se puede cerrar el expediente mientras haya defectos registrales abiertos. Adjunta primero la subsanación del defecto.")
    try:
        contenido = await archivo.read(MAX_WORKFLOW_UPLOAD_BYTES + 1)
    finally:
        await archivo.close()
    exigir_pdf = mime_fijo == "application/pdf" or categoria in {
        "factura", "defecto", "subsanacion", "inscripcion", "copia"
    }
    _validar_contenido_workflow(contenido, exigir_pdf=exigir_pdf)
    nombre_guardado = f"{uuid.uuid4().hex}{Path(nombre).suffix[:20].lower()}"
    ruta = (ROOT / nombre_guardado).resolve()
    if ruta.parent != ROOT: raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
    ruta.write_bytes(contenido)
    try:
        doc = DocumentoCarpetaDigital(expediente_id=str(e.id_expediente), categoria=categoria_carpeta, nombre_original=nombre, nombre_guardado=nombre_guardado, tipo_mime=mime_fijo or tipo_mime_seguro, tamano_bytes=len(contenido), fecha_subida=datetime.utcnow())
        db.add(doc)
        if categoria == "defecto":
            e.tiene_defectos_abiertos = "SI"
        elif categoria == "subsanacion":
            e.tiene_defectos_abiertos = "NO"
        if siguiente:
            e.notargest_estado = siguiente
            e.actividad_actual = ESTADOS_NOTARGEST[siguiente]
        db.commit(); db.refresh(doc)
    except Exception:
        db.rollback(); ruta.unlink(missing_ok=True); raise
    return {"ok": True, "id": doc.id, "categoria": doc.categoria, "nombre": doc.nombre_original, "estado": _estado_workflow(e)}

@router.get("/expedientes")
def mis_expedientes(n=Depends(get_notario), db: Session = Depends(get_db)):
    filas = _expedientes_de_notario(n, db)
    items = []
    for e in filas:
        item = _resumen(e, db)
        if not _es_usuario_erp(n):
            item = _filtrar_campos_sensibles_notario_externo(item)
        # Estados separados para que cada bandeja tenga una condición clara.
        actividad = (e.actividad_actual or "").casefold()
        estado = _estado_workflow(e)
        item["notargest_estado"] = estado
        item["notargest_fecha_cierre"] = _fecha(getattr(e, "notargest_fecha_cierre", None))
        item["notargest_fecha_envio_gestoria"] = _fecha(getattr(e, "notargest_fecha_envio_gestoria", None))
        item["pendiente_recepcion"] = estado == "recepcion"
        item["pendiente_firma"] = estado == "firma"
        item["pendiente_factura_notaria"] = estado == "factura"
        item["pendiente_presentacion_registro"] = estado == "registro"
        item["pendiente_ajd_itp"] = estado == "ajd"
        item["pendiente_inscripcion"] = estado == "inscripcion"
        item["pendiente_copia_simple"] = estado == "copia"
        item["escrituras_cerradas_inscritas"] = estado == "cerrada"
        item["con_defectos"] = ("defecto" in actividad) or str(getattr(e, "tiene_defectos_abiertos", "") or "").strip().casefold() in {"si", "sí", "true", "1", "abierto"}
        items.append(item)
    return {"items": items, "total": len(items)}

def _expediente_autorizado(expediente_id, n, db):
    e = db.query(Expediente).filter(Expediente.id_expediente == str(expediente_id)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    if _es_usuario_erp(n):
        if not (getattr(e, "fecha_envio_notario", None) or getattr(e, "notargest_estado", None)):
            raise HTTPException(status_code=403, detail="Este expediente no forma parte del circuito NotarGest")
        return e
    notario_id_expediente = getattr(e, "notario_id", None)
    if notario_id_expediente is not None:
        if int(notario_id_expediente) != int(getattr(n, "id", -1)):
            raise HTTPException(status_code=403, detail="Este expediente no está asignado a tu notaría")
        return e
    nombre = " ".join(x for x in [n.nombre, n.apellidos] if x).strip().casefold()
    nif_notario = normalizar_nif(getattr(e, "nif_notario", "") or "")
    if not ((nombre and (getattr(e, "nombre_notario", "") or "").strip().casefold() == nombre) or (n.nif and nif_notario == normalizar_nif(n.nif))):
        raise HTTPException(status_code=403, detail="Este expediente no está asignado a tu notaría")
    return e


@router.get("/pagos")
def pagos_notario(n=Depends(get_notario), db: Session = Depends(get_db)):
    """Solicitudes de pago ya efectuadas desde la ficha del expediente al notario."""
    consulta = (
        db.query(ExpedienteGasto, Expediente)
        .join(Expediente, Expediente.id == ExpedienteGasto.expediente_id)
        .filter(
            ExpedienteGasto.estado_pago.isnot(None),
            text("lower(trim(coalesce(expediente_gastos.estado_pago, ''))) IN ('pagado', 'pagada', 'abonado', 'abonada', 'efectuado', 'efectuada')")
        )
        .order_by(ExpedienteGasto.fecha.desc().nullslast(), ExpedienteGasto.id.desc())
        .limit(2000)
        .all()
    )
    nombre_notario = " ".join(x for x in [getattr(n, "nombre", None), getattr(n, "apellidos", None)] if x).strip()
    nif_notario = normalizar_nif(getattr(n, "nif", None) or "")
    resultados = []
    for gasto, expediente in consulta:
        nif_gasto = normalizar_nif(getattr(gasto, "nif_notario", None) or "")
        nombre_gasto = " ".join((getattr(gasto, "nombre_notario", None) or "").split()).casefold()
        nif_expediente = normalizar_nif(getattr(expediente, "nif_notario", None) or "")
        nombre_expediente = " ".join((getattr(expediente, "nombre_notario", None) or "").split()).casefold()
        if _es_usuario_erp(n):
            # Para el usuario ERP, solo pagos dirigidos al notario registrado en el expediente.
            identidad_valida = bool(nif_gasto or nombre_gasto) and (
                (nif_gasto and nif_expediente and nif_gasto == nif_expediente)
                or (nombre_gasto and nombre_expediente and nombre_gasto == nombre_expediente)
            )
        else:
            identidad_valida = bool(
                (nif_notario and (nif_gasto == nif_notario or nif_expediente == nif_notario))
                or (nombre_notario and (nombre_gasto == nombre_notario.casefold() or nombre_expediente == nombre_notario.casefold()))
            )
        if not identidad_valida:
            continue

        documentos = db.query(DocumentoCarpetaDigital).filter(
            DocumentoCarpetaDigital.expediente_id == str(expediente.id_expediente)
        ).all()
        factura = next((d for d in documentos if (d.categoria or "").strip().casefold() == "factura notarial"), None)
        justificante = next((d for d in documentos if "justificante" in (d.categoria or "").casefold() and "pago" in (d.categoria or "").casefold()), None)
        resultados.append({
            "id": gasto.id,
            "id_expediente": expediente.id_expediente,
            "fecha_pago": _fecha(gasto.fecha),
            "nombre": " ".join(x for x in [getattr(expediente, "nombre_titular", None), getattr(expediente, "apellidos", None)] if x).strip() or getattr(expediente, "nombre_solicitante", None),
            "dni": getattr(expediente, "nif_titular", None) or getattr(expediente, "dni", None),
            "importe": float(gasto.importe_resultante if gasto.importe_resultante is not None else (gasto.importe or 0)),
            "protocolo": getattr(expediente, "protocolo", None),
            "fecha_firma": _fecha(getattr(expediente, "fecha_firma", None)),
            "factura_notarial_id": getattr(factura, "id", None),
            "justificante_documento_id": getattr(justificante, "id", None) or getattr(gasto, "documento_carpeta_id", None),
            "justificante_url": getattr(gasto, "documento_url", None),
        })
    return {"items": resultados, "total": len(resultados)}

@router.get("/expedientes/{expediente_id}")
def detalle_expediente(expediente_id: str, n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    fincas = db.query(ExpedienteFinca).filter(ExpedienteFinca.expediente_id == e.id).all()
    docs = db.query(DocumentoCarpetaDigital).filter(DocumentoCarpetaDigital.expediente_id == str(e.id_expediente)).order_by(DocumentoCarpetaDigital.fecha_subida.desc()).all()
    obs = db.query(ExpedienteObservacion).filter(
        ExpedienteObservacion.expediente_id == e.id,
        ExpedienteObservacion.activo.is_(True),
        or_(
            ExpedienteObservacion.visibilidad.in_(["Notario", "Visible notario", "Ambos", "Todos"]),
            (ExpedienteObservacion.visibilidad == "Gestor") & ExpedienteObservacion.autor_empleado_id.is_(None),
        )
    ).order_by(ExpedienteObservacion.fecha.desc()).all()
    datos = _resumen(e, db)
    if not _es_usuario_erp(n):
        datos = _filtrar_campos_sensibles_notario_externo(datos)
    datos["fincas"] = [{
        "id": f.id, "finca": f.finca, "cru_idufir": f.cru_idufir,
        "provincia": f.provincia, "poblacion": f.poblacion, "registro": f.registro,
        "seccion": f.seccion, "cuantia": f.cuantia, "inscripcion": f.inscripcion,
        "contrato": f.contrato, "fecha_constitucion": _fecha(f.fecha_constitucion),
        "subrogado": f.subrogado, "entidad_original": f.entidad_original
    } for f in fincas]
    datos["documentos"] = [{
        "id": d.id, "categoria": d.categoria, "nombre": d.nombre_original,
        "tipo_mime": d.tipo_mime, "tamano_bytes": d.tamano_bytes,
        "fecha_subida": _fecha(d.fecha_subida)
    } for d in docs]
    datos["observaciones_notaria"] = [{
        "id": o.id, "comentario": o.comentario, "visibilidad": o.visibilidad,
        "empleado_destinatario_id": o.empleado_destinatario_id,
        "empleado_destinatario": (lambda empleado: " ".join(filter(None, [empleado.nombre, empleado.apellidos])) if empleado else None)(db.query(Empleado).filter(Empleado.id == o.empleado_destinatario_id).first()) if o.empleado_destinatario_id else None,
        "fecha": _fecha(o.fecha)
    } for o in obs]
    return datos


@router.get("/avisos")
def avisos_notargest(n=Depends(get_notario), db: Session = Depends(get_db)):
    """Avisos de observaciones visibles y documentos añadidos tras el envío y antes de la firma."""
    expedientes = _expedientes_de_notario(n, db)
    if not expedientes:
        return {"comentarios": [], "documentos": []}
    expediente_por_id = {e.id: e for e in expedientes}
    ids_documentales = {str(e.id_expediente): e for e in expedientes}
    observaciones = db.query(ExpedienteObservacion).filter(
        ExpedienteObservacion.expediente_id.in_(list(expediente_por_id.keys())),
        ExpedienteObservacion.activo.is_(True),
        ExpedienteObservacion.visibilidad.in_(["Notario", "Visible notario", "Ambos", "Todos"]),
    ).order_by(ExpedienteObservacion.fecha.desc()).limit(300).all()
    comentarios = []
    for o in observaciones:
        e = expediente_por_id.get(o.expediente_id)
        if e:
            comentarios.append({"id": o.id, "id_expediente": e.id_expediente, "oficina": e.oficina or e.oficina_alta, "solicitante": e.nombre_solicitante, "comentario": o.comentario, "visibilidad": o.visibilidad, "fecha": _fecha(o.fecha)})
    leidos = db.execute(text(
        "SELECT tipo, aviso_id FROM notargest_avisos_leidos WHERE notaria_id = :notaria_id"
    ), {"notaria_id": n.id}).fetchall()
    leidos_por_tipo = {tipo: set() for tipo in ("comentario", "documento")}
    for tipo, aviso_id in leidos:
        leidos_por_tipo.setdefault(tipo, set()).add(int(aviso_id))
    comentarios = [item for item in comentarios if item["id"] not in leidos_por_tipo.get("comentario", set())]

    documentos = []
    docs = db.query(DocumentoCarpetaDigital).filter(DocumentoCarpetaDigital.expediente_id.in_(list(ids_documentales.keys()))).order_by(DocumentoCarpetaDigital.fecha_subida.desc()).limit(1000).all()
    for d in docs:
        e = ids_documentales.get(str(d.expediente_id))
        if not e or e.fecha_firma or (e.protocolo or "").strip() or d.id in leidos_por_tipo.get("documento", set()):
            continue
        envio = getattr(e, "fecha_envio_notario", None) or getattr(e, "fecha_envio", None)
        subida = d.fecha_subida
        if not envio or not subida:
            continue
        limite = envio.replace(tzinfo=None) if isinstance(envio, datetime) else datetime.combine(envio, time.min)
        if subida.replace(tzinfo=None) <= limite:
            continue
        documentos.append({"id": d.id, "id_expediente": e.id_expediente, "oficina": e.oficina or e.oficina_alta, "solicitante": e.nombre_solicitante, "nombre": d.nombre_original, "categoria": d.categoria, "fecha_subida": _fecha(d.fecha_subida)})
    return {"comentarios": comentarios, "documentos": documentos}


@router.post("/avisos/{tipo}/{aviso_id}/leido")
def marcar_aviso_leido_notargest(tipo: str, aviso_id: int, n=Depends(get_notario), db: Session = Depends(get_db)):
    """Marca como leída una notificación solo para la sesión/notaría autenticada."""
    if tipo not in ("comentario", "documento"):
        raise HTTPException(status_code=400, detail="Tipo de notificación no válido.")
    expedientes = _expedientes_de_notario(n, db)
    ids_expediente = {e.id for e in expedientes}
    if tipo == "comentario":
        aviso = db.query(ExpedienteObservacion).filter(
            ExpedienteObservacion.id == aviso_id,
            ExpedienteObservacion.expediente_id.in_(list(ids_expediente) or [-1]),
            ExpedienteObservacion.activo.is_(True),
            ExpedienteObservacion.visibilidad.in_(["Notario", "Visible notario", "Ambos", "Todos"]),
        ).first()
    else:
        ids_documentales = {str(e.id_expediente) for e in expedientes}
        aviso = db.query(DocumentoCarpetaDigital).filter(
            DocumentoCarpetaDigital.id == aviso_id,
            DocumentoCarpetaDigital.expediente_id.in_(list(ids_documentales) or ["__none__"]),
        ).first()
    if not aviso:
        raise HTTPException(status_code=404, detail="La notificación no existe o no está autorizada.")
    db.execute(text("""
        INSERT INTO notargest_avisos_leidos (notaria_id, tipo, aviso_id)
        VALUES (:notaria_id, :tipo, :aviso_id)
        ON CONFLICT (notaria_id, tipo, aviso_id) DO NOTHING
    """), {"notaria_id": n.id, "tipo": tipo, "aviso_id": aviso_id})
    db.commit()
    return {"ok": True, "tipo": tipo, "aviso_id": aviso_id, "leida": True}

@router.get("/gestores")
def listar_gestores_notargest(n=Depends(get_notario), db: Session = Depends(get_db)):
    empleados = db.query(Empleado).filter(Empleado.activo.is_(True)).order_by(Empleado.apellidos.asc(), Empleado.nombre.asc()).all()
    return [{"id": e.id, "nombre": " ".join(filter(None, [e.nombre, e.apellidos]))} for e in empleados]


@router.post("/expedientes/{expediente_id}/comentarios")
def crear_comentario_gestor_notargest(expediente_id: str, datos: ComentarioGestorNotarGest, n=Depends(get_notario), db: Session = Depends(get_db)):
    expediente = _expediente_autorizado(expediente_id, n, db)
    destinatario = db.query(Empleado).filter(Empleado.id == datos.empleado_destinatario_id, Empleado.activo.is_(True)).first()
    if not destinatario:
        raise HTTPException(status_code=404, detail="El gestor seleccionado no existe o está inactivo.")
    comentario = datos.comentario.strip()
    if not comentario:
        raise HTTPException(status_code=400, detail="Escribe un comentario antes de guardarlo.")
    observacion = ExpedienteObservacion(
        expediente_id=expediente.id,
        comentario=comentario,
        visibilidad="Gestor",
        empleado_destinatario_id=destinatario.id,
        autor_empleado_id=None,
        activo=True,
    )
    try:
        db.add(observacion)
        db.commit()
        db.refresh(observacion)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el comentario dirigido al gestor.")
    return {"ok": True, "id": observacion.id, "comentario": observacion.comentario, "empleado_destinatario_id": destinatario.id, "empleado_destinatario": " ".join(filter(None, [destinatario.nombre, destinatario.apellidos])), "fecha": _fecha(observacion.fecha)}


@router.post("/expedientes/{expediente_id}/documentos")
async def subir_documento_carpeta_notargest(
    expediente_id: str,
    categoria: str = Form(...),
    archivo: UploadFile = File(...),
    n=Depends(get_notario),
    db: Session = Depends(get_db),
):
    """Sube PDFs a categorías de Carpeta Digital visibles desde la ficha NotarGest."""
    e = _expediente_autorizado(expediente_id, n, db)
    categorias_permitidas = {
        "Hoja de encargo firmada",
        "Justificante de cancelación",
        "Nota simple registral",
        "Borradores de escritura",
        "Otros documentos",
    }
    if categoria not in categorias_permitidas:
        raise HTTPException(status_code=400, detail="Categoría documental no válida")
    nombre = Path(archivo.filename or "documento.pdf").name
    if not nombre.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se admiten archivos PDF")
    try:
        contenido = await archivo.read(MAX_WORKFLOW_UPLOAD_BYTES + 1)
    finally:
        await archivo.close()
    _validar_contenido_workflow(contenido, exigir_pdf=True)
    nombre_guardado = f"{uuid.uuid4().hex}{Path(nombre).suffix[:20].lower()}"
    ruta = (ROOT / nombre_guardado).resolve()
    if ruta.parent != ROOT:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
    ruta.write_bytes(contenido)
    try:
        doc = DocumentoCarpetaDigital(
            expediente_id=str(e.id_expediente),
            categoria=categoria,
            nombre_original=nombre,
            nombre_guardado=nombre_guardado,
            tipo_mime="application/pdf",
            tamano_bytes=len(contenido),
            fecha_subida=datetime.utcnow(),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        ruta.unlink(missing_ok=True)
        raise
    return {"ok": True, "id": doc.id, "categoria": doc.categoria, "nombre": doc.nombre_original}


@router.get("/expedientes/{expediente_id}/documentos/{documento_id}/descargar")
def descargar_documento(expediente_id: str, documento_id: int, n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    doc = db.query(DocumentoCarpetaDigital).filter(
        DocumentoCarpetaDigital.id == documento_id,
        DocumentoCarpetaDigital.expediente_id == str(e.id_expediente)
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    ruta = (ROOT / doc.nombre_guardado).resolve()
    if ruta.parent != ROOT or not ruta.is_file():
        raise HTTPException(status_code=404, detail="El archivo no está disponible en el almacenamiento")
    from fastapi.responses import FileResponse
    media_type_seguro, disposicion = _politica_descarga_notargest(doc.nombre_original)
    return FileResponse(
        path=ruta,
        media_type=media_type_seguro,
        filename=doc.nombre_original,
        content_disposition_type=disposicion,
        headers={"X-Content-Type-Options": "nosniff"},
    )

@router.post("/expedientes/{expediente_id}/factura-notarial")
async def subir_factura_notarial(expediente_id: str, archivo: UploadFile = File(...), n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    nombre = Path(archivo.filename or "factura.pdf").name
    if not nombre.lower().endswith(".pdf") or (archivo.content_type and archivo.content_type not in ("application/pdf", "application/octet-stream")):
        raise HTTPException(status_code=400, detail="Adjunta la factura en formato PDF")
    contenido = await archivo.read(25 * 1024 * 1024 + 1)
    if not contenido or len(contenido) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El PDF está vacío o supera 25 MB")
    anterior = db.query(DocumentoCarpetaDigital).filter(
        DocumentoCarpetaDigital.expediente_id == str(e.id_expediente),
        DocumentoCarpetaDigital.categoria == "Factura notarial"
    ).first()
    nombre_guardado = f"{uuid.uuid4().hex}.pdf"
    ruta = (ROOT / nombre_guardado).resolve()
    if ruta.parent != ROOT:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
    ruta.write_bytes(contenido)
    try:
        if anterior:
            ruta_anterior = (ROOT / anterior.nombre_guardado).resolve()
            anterior.nombre_original = nombre
            anterior.nombre_guardado = nombre_guardado
            anterior.tipo_mime = "application/pdf"
            anterior.tamano_bytes = len(contenido)
            anterior.fecha_subida = datetime.utcnow()
            db.commit()
            if ruta_anterior.parent == ROOT:
                ruta_anterior.unlink(missing_ok=True)
            doc = anterior
        else:
            doc = DocumentoCarpetaDigital(
                expediente_id=str(e.id_expediente), categoria="Factura notarial",
                nombre_original=nombre, nombre_guardado=nombre_guardado,
                tipo_mime="application/pdf", tamano_bytes=len(contenido), fecha_subida=datetime.utcnow()
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
    except Exception:
        db.rollback()
        ruta.unlink(missing_ok=True)
        raise
    e.notargest_estado = "registro"
    e.actividad_actual = ESTADOS_NOTARGEST["registro"]
    db.commit()
    return {"ok": True, "id": doc.id, "nombre": doc.nombre_original, "fecha_subida": _fecha(doc.fecha_subida), "estado": "registro"}

import hashlib
import hmac
import secrets
import os
import uuid
from pathlib import Path
from datetime import date, datetime, time, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile
from pydantic import BaseModel, constr
from sqlalchemy import text, or_
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import obtener_token_bearer
from backend.app.config import settings
from backend.app.ctn.models import Notaria
from backend.app.database import engine, get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.expediente_observaciones.models import ExpedienteObservacion
from backend.app.storage import CARPETA_DIGITAL_DIR

router = APIRouter(prefix="/notargest", tags=["NotarGest"])
ROOT = CARPETA_DIGITAL_DIR.resolve()
ROOT.mkdir(parents=True, exist_ok=True)

class LoginNotario(BaseModel):
    usuario: constr(min_length=3, max_length=50)
    password: constr(min_length=1, max_length=128)

class CambioPassword(BaseModel):
    password_actual: constr(min_length=1, max_length=128)
    password_nueva: constr(min_length=1, max_length=128)

def normalizar_nif(valor):
    return "".join((valor or "").upper().split()).replace("-", "")

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
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS notargest_habilitado BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS notargest_password_hash VARCHAR(255)"))
        conn.execute(text("ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS notargest_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE"))

def get_notario(token=Depends(obtener_token_bearer), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        if payload.get("tipo") != "notargest" or not payload.get("notaria_id"):
            raise HTTPException(status_code=401, detail="Sesión NotarGest inválida")
        n = db.query(Notaria).filter(Notaria.id == int(payload["notaria_id"])).first()
        if not n or not n.notargest_habilitado:
            raise HTTPException(status_code=403, detail="Acceso NotarGest deshabilitado")
        return n
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión ha caducado")
    except Exception:
        raise HTTPException(status_code=401, detail="Sesión NotarGest inválida")

def _expedientes_de_notario(n, db):
    nombre = " ".join(x for x in [n.nombre, n.apellidos] if x).strip()
    filtros = []
    if nombre:
        filtros.append(Expediente.nombre_notario.ilike(nombre))
    if n.nif:
        filtros.append(text("upper(replace(replace(coalesce(nif_notario, ''), ' ', ''), '-', '')) = :nif").bindparams(nif=normalizar_nif(n.nif)))
    if not filtros:
        return []
    return db.query(Expediente).filter(or_(*filtros)).order_by(Expediente.id.desc()).limit(500).all()

def _fecha(valor):
    return valor.isoformat() if isinstance(valor, (date, datetime, time)) else valor

def _resumen(e, db):
    actividad = getattr(e, "actividad_actual", None)
    fecha_firma = getattr(e, "fecha_firma", None)
    actividad_norm = (actividad or "").strip().casefold()
    pendiente_presentacion = bool(fecha_firma and ("sede notarial" in actividad_norm or "protocolo" in actividad_norm))
    docs = db.query(DocumentoCarpetaDigital).filter(DocumentoCarpetaDigital.expediente_id == str(e.id_expediente)).all()
    factura = next((d for d in docs if (d.categoria or "").casefold() == "factura notarial"), None)
    return {
        "id": e.id,
        "id_expediente": e.id_expediente,
        "numero_expediente": e.id_expediente,
        "titular": e.nombre_titular,
        "nif_titular": e.nif_titular,
        "solicitante": e.nombre_solicitante,
        "nif_solicitante": e.nif_solicitante,
        "estado": e.estado_expediente,
        "estado_actividad": e.estado_actividad,
        "actividad_actual": actividad,
        "oficina": e.oficina or e.oficina_alta,
        "fecha_alta": _fecha(e.fecha_alta),
        "fecha_envio": _fecha(getattr(e, "fecha_envio", None)),
        "fecha_envio_notario": _fecha(e.fecha_envio_notario),
        "fecha_solicitud_pnc": _fecha(e.fecha_solicitud_pnc),
        "numero_solicitud_pnc": e.numero_solicitud_pnc,
        "fecha_prevista_firma": _fecha(e.fecha_prevista_firma),
        "hora_prevista_firma": _fecha(e.hora_prevista_firma),
        "fecha_firma": _fecha(fecha_firma),
        "protocolo": e.protocolo,
        "tipo_documento": e.tipo_documento,
        "idioma_documento": e.idioma_documento,
        "formato_escritura": e.formato_escritura,
        "tipo_tramite": e.tipo_tramite,
        "tipo_firma": e.tipo_firma,
        "capital": e.capital,
        "importe": e.importe,
        "saldo_real": e.saldo_real,
        "saldo_disponible": e.saldo_disponible,
        "contrato": e.contrato,
        "tipo_operacion": e.tipo_operacion,
        "observaciones": e.observaciones,
        "numero_entrada": e.numero_entrada,
        "asiento_presentacion_libro_diario": e.asiento_presentacion_libro_diario,
        "fecha_presentacion": _fecha(e.fecha_presentacion),
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
    if not n or not n.notargest_habilitado:
        raise HTTPException(status_code=401, detail="Acceso no habilitado. Contacta con Molsan.")
    password_nif = hmac.compare_digest(normalizar_nif(data.password), nif)
    if password_nif:
        n.notargest_password_hash = hash_password(nif)
        n.notargest_cambiar_password = False
        db.commit()
        valido = True
    elif n.notargest_password_hash:
        valido = verificar_password(data.password, n.notargest_password_hash)
    else:
        valido = False
    if not valido:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = jwt.encode({"tipo": "notargest", "notaria_id": n.id, "exp": datetime.utcnow() + timedelta(hours=8)}, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return {"token": token, "requiere_cambio_password": False, "notario": {"id": n.id, "nombre": " ".join(x for x in [n.nombre, n.apellidos] if x), "nif": n.nif}}

@router.get("/me")
def me(n=Depends(get_notario)):
    return {"id": n.id, "nombre": " ".join(x for x in [n.nombre, n.apellidos] if x), "nif": n.nif, "requiere_cambio_password": False}

@router.post("/cambiar-password")
def cambiar_password(data: CambioPassword, n=Depends(get_notario), db: Session = Depends(get_db)):
    valida = bool(n.notargest_password_hash and verificar_password(data.password_actual, n.notargest_password_hash))
    if not valida and n.notargest_cambiar_password:
        valida = hmac.compare_digest(normalizar_nif(data.password_actual), normalizar_nif(n.nif or ""))
    if not valida:
        raise HTTPException(status_code=400, detail="La contraseña provisional no es correcta.")
    if normalizar_nif(data.password_nueva) == normalizar_nif(n.nif or ""):
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser el DNI/NIF")
    n.notargest_password_hash = hash_password(data.password_nueva)
    n.notargest_cambiar_password = False
    db.commit()
    return {"ok": True, "mensaje": "Contraseña actualizada"}

@router.get("/expedientes")
def mis_expedientes(n=Depends(get_notario), db: Session = Depends(get_db)):
    filas = _expedientes_de_notario(n, db)
    items = []
    for e in filas:
        item = _resumen(e, db)
        # Estados separados para que cada bandeja tenga una condición clara.
        actividad = (e.actividad_actual or "").casefold()
        item["pendiente_recepcion"] = not bool(e.fecha_envio_notario) is False if False else bool(e.fecha_envio_notario and not e.fecha_firma)
        item["pendiente_firma"] = bool(e.fecha_prevista_firma and not e.fecha_firma)
        item["pendiente_presentacion_registro"] = bool(item["pendiente_presentacion_registro"])
        item["pendiente_factura_notaria"] = bool(e.fecha_firma and not item["factura_notarial"])
        item["pendiente_copia_simple"] = "copia simple" in actividad
        item["pendiente_ajd_itp"] = any(k in actividad for k in ("ajd", "itp", "impuesto"))
        item["pendiente_inscripcion"] = "inscrip" in actividad
        item["con_defectos"] = "defecto" in actividad or bool(getattr(e, "tiene_defectos_abiertos", None))
        items.append(item)
    return {"items": items, "total": len(items)}

def _expediente_autorizado(expediente_id, n, db):
    e = db.query(Expediente).filter(Expediente.id_expediente == str(expediente_id)).first()
    if not e:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    nombre = " ".join(x for x in [n.nombre, n.apellidos] if x).strip().casefold()
    nif_notario = normalizar_nif(getattr(e, "nif_notario", "") or "")
    if not ((nombre and (getattr(e, "nombre_notario", "") or "").strip().casefold() == nombre) or (n.nif and nif_notario == normalizar_nif(n.nif))):
        raise HTTPException(status_code=403, detail="Este expediente no está asignado a tu notaría")
    return e

@router.get("/expedientes/{expediente_id}")
def detalle_expediente(expediente_id: str, n=Depends(get_notario), db: Session = Depends(get_db)):
    e = _expediente_autorizado(expediente_id, n, db)
    fincas = db.query(ExpedienteFinca).filter(ExpedienteFinca.expediente_id == e.id).all()
    docs = db.query(DocumentoCarpetaDigital).filter(DocumentoCarpetaDigital.expediente_id == str(e.id_expediente)).order_by(DocumentoCarpetaDigital.fecha_subida.desc()).all()
    obs = db.query(ExpedienteObservacion).filter(
        ExpedienteObservacion.expediente_id == e.id,
        ExpedienteObservacion.activo.is_(True),
        ExpedienteObservacion.visibilidad.in_(["Notario", "Visible notario", "Ambos", "Todos"])
    ).order_by(ExpedienteObservacion.fecha.desc()).all()
    datos = _resumen(e, db)
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
        "fecha": _fecha(o.fecha)
    } for o in obs]
    return datos

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
    return FileResponse(path=ruta, media_type=doc.tipo_mime or "application/octet-stream", filename=doc.nombre_original, content_disposition_type="inline")

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
    return {"ok": True, "id": doc.id, "nombre": doc.nombre_original, "fecha_subida": _fecha(doc.fecha_subida)}

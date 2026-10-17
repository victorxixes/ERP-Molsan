from datetime import date, datetime
from pathlib import Path
from uuid import uuid4
from decimal import Decimal
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, condecimal, constr
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.ctn.models import Notaria
from backend.app.database import Base, engine, get_db
from backend.app.encargagest.models import (
    EncargoExterno, EncargoExternoActividad, EncargoExternoDocumento,
)
from backend.app.storage import CARPETA_DIGITAL_DIR

router = APIRouter(prefix="/encargagest", tags=["EncargaGest"])
ROOT = (CARPETA_DIGITAL_DIR / "encargagest").resolve()
ROOT.mkdir(parents=True, exist_ok=True)

MAX_BYTES = int(os.getenv("ENCARGAGEST_MAX_DOCUMENT_BYTES", str(25 * 1024 * 1024)))
EXTENSIONES_PERMITIDAS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".eml", ".msg", ".txt"}
ESTADOS = {
    "RECIBIDO", "EN_REVISION", "DOCUMENTACION_PENDIENTE",
    "EN_GESTION", "INCIDENCIA", "RESUELTO", "CERRADO",
}
PRIORIDADES = {"Baja", "Normal", "Alta", "Urgente"}


@router.on_event("startup")
def crear_tablas_encargagest():
    # Solo crea las tablas nuevas del módulo. No altera las tablas existentes.
    Base.metadata.create_all(
        bind=engine,
        tables=[
            EncargoExterno.__table__,
            EncargoExternoDocumento.__table__,
            EncargoExternoActividad.__table__,
        ],
        checkfirst=True,
    )


def _autorizar(usuario, accion="ver"):
    require_perm_modulo(usuario, "encargagest", accion)
    return usuario


def _nombre_usuario(usuario):
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
        "tipo_mime": item.tipo_mime,
        "tamano_bytes": item.tamano_bytes,
        "subido_por_nombre": item.subido_por_nombre or "Usuario ERP",
        "fecha_subida": item.fecha_subida.isoformat() if item.fecha_subida else None,
    }


def _obtener_encargo(db, encargo_id):
    item = db.query(EncargoExterno).filter(EncargoExterno.id == encargo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Encargo no encontrado.")
    return item


def _registrar_actividad(db, encargo_id, usuario, tipo, mensaje, visible_notaria=True):
    registro = EncargoExternoActividad(
        encargo_id=encargo_id,
        tipo=tipo,
        mensaje=mensaje,
        visible_notaria=visible_notaria,
        autor_id=getattr(usuario, "id", None),
        autor_nombre=_nombre_usuario(usuario),
    )
    db.add(registro)


class EncargoCrear(BaseModel):
    notaria_id: int
    contacto_nombre: constr(max_length=200) | None = None
    contacto_email: constr(max_length=320) | None = None
    contacto_telefono: constr(max_length=60) | None = None
    tipo_encargo: constr(min_length=2, max_length=120) = "Cancelación hipotecaria"
    titular: constr(min_length=2, max_length=300)
    nif_titular: constr(max_length=50) | None = None
    entidad_bancaria: constr(max_length=200) | None = None
    numero_prestamo: constr(max_length=150) | None = None
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


@router.get("/resumen")
def resumen(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "ver")
    total = db.query(func.count(EncargoExterno.id)).scalar() or 0
    filas = db.query(EncargoExterno.estado, func.count(EncargoExterno.id)).group_by(EncargoExterno.estado).all()
    estados = {estado: cantidad for estado, cantidad in filas}
    return {
        "total": total,
        "por_estado": estados,
        "requieren_atencion": sum(estados.get(e, 0) for e in ("DOCUMENTACION_PENDIENTE", "INCIDENCIA")),
    }


@router.get("/notarias")
def listar_notarias(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "ver")
    registros = db.query(Notaria).order_by(Notaria.apellidos.asc(), Notaria.nombre.asc()).all()
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
    usuario=Depends(get_current_user),
):
    _autorizar(usuario, "ver")
    consulta = db.query(EncargoExterno)
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
    return {"items": [_serializar(item) for item in items], "total": total, "pagina": pagina, "por_pagina": por_pagina}


@router.post("/encargos", status_code=201)
def crear_encargo(datos: EncargoCrear, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "crear")
    notaria = db.query(Notaria).filter(Notaria.id == datos.notaria_id).first()
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
        importe=Decimal(datos.importe) if datos.importe is not None else None,
        fecha_objetivo=datos.fecha_objetivo,
        prioridad=datos.prioridad,
        estado="RECIBIDO",
        contacto_nombre=(datos.contacto_nombre or "").strip() or None,
        contacto_email=(datos.contacto_email or "").strip() or None,
        contacto_telefono=(datos.contacto_telefono or "").strip() or None,
        observaciones=(datos.observaciones or "").strip() or None,
        creado_por_id=usuario.id,
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
def detalle_encargo(encargo_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "ver")
    item = _obtener_encargo(db, encargo_id)
    documentos = db.query(EncargoExternoDocumento).filter(EncargoExternoDocumento.encargo_id == encargo_id).order_by(EncargoExternoDocumento.fecha_subida.desc()).all()
    actividad = db.query(EncargoExternoActividad).filter(EncargoExternoActividad.encargo_id == encargo_id).order_by(EncargoExternoActividad.creado_en.desc()).all()
    data = _serializar(item)
    data["documentos"] = [_serializar_documento(doc) for doc in documentos]
    data["actividad"] = [_serializar_actividad(entry) for entry in actividad]
    return data


@router.put("/encargos/{encargo_id}")
def actualizar_encargo(encargo_id: int, datos: EncargoActualizar, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "editar")
    item = _obtener_encargo(db, encargo_id)
    cambios = datos.dict(exclude_unset=True)
    if "prioridad" in cambios and cambios["prioridad"] is not None and cambios["prioridad"] not in PRIORIDADES:
        raise HTTPException(status_code=422, detail="Prioridad no válida.")
    for campo, valor in cambios.items():
        if campo in {"titular", "contacto_nombre", "contacto_email", "contacto_telefono", "nif_titular", "entidad_bancaria", "numero_prestamo", "observaciones", "observaciones_internas"} and isinstance(valor, str):
            valor = valor.strip() or None
        setattr(item, campo, valor)
    item.actualizado_en = datetime.utcnow()
    _registrar_actividad(db, item.id, usuario, "EDICION", "Datos del encargo actualizados.", visible_notaria=False)
    db.commit()
    db.refresh(item)
    return _serializar(item)


@router.post("/encargos/{encargo_id}/estado")
def cambiar_estado(encargo_id: int, datos: CambioEstado, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "editar")
    item = _obtener_encargo(db, encargo_id)
    estado = str(datos.estado or "").strip().upper()
    if estado not in ESTADOS:
        raise HTTPException(status_code=422, detail="Estado no válido.")
    anterior = item.estado
    item.estado = estado
    item.actualizado_en = datetime.utcnow()
    mensaje = f"Estado cambiado de {anterior} a {estado}."
    if datos.comentario and datos.comentario.strip():
        mensaje += f" {datos.comentario.strip()}"
    _registrar_actividad(db, item.id, usuario, "CAMBIO_ESTADO", mensaje)
    db.commit()
    db.refresh(item)
    return _serializar(item)


@router.get("/encargos/{encargo_id}/actividad")
def listar_actividad(encargo_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "ver")
    _obtener_encargo(db, encargo_id)
    registros = db.query(EncargoExternoActividad).filter(EncargoExternoActividad.encargo_id == encargo_id).order_by(EncargoExternoActividad.creado_en.desc()).all()
    return [_serializar_actividad(item) for item in registros]


@router.post("/encargos/{encargo_id}/actividad", status_code=201)
def crear_actividad(encargo_id: int, datos: CrearActividad, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "editar")
    _obtener_encargo(db, encargo_id)
    tipo = datos.tipo.upper()
    if tipo not in {"COMENTARIO", "INCIDENCIA", "SISTEMA"}:
        raise HTTPException(status_code=422, detail="Tipo de actividad no válido.")
    mensaje = datos.mensaje.strip()
    if not mensaje:
        raise HTTPException(status_code=422, detail="Escribe un mensaje antes de guardarlo.")
    if tipo == "INCIDENCIA":
        item = _obtener_encargo(db, encargo_id)
        item.estado = "INCIDENCIA"
        item.actualizado_en = datetime.utcnow()
    _registrar_actividad(db, encargo_id, usuario, tipo, mensaje, datos.visible_notaria)
    db.commit()
    return {"ok": True}


@router.post("/encargos/{encargo_id}/documentos", status_code=201)
async def subir_documento(
    encargo_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _autorizar(usuario, "editar")
    item = _obtener_encargo(db, encargo_id)
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
            tipo_mime=archivo.content_type,
            tamano_bytes=len(contenido),
            subido_por_id=usuario.id,
            subido_por_nombre=_nombre_usuario(usuario),
        )
        db.add(documento)
        item.actualizado_en = datetime.utcnow()
        _registrar_actividad(db, item.id, usuario, "DOCUMENTO", f"Documento añadido: {nombre_original}.")
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
def descargar_documento(encargo_id: int, documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "ver")
    _obtener_encargo(db, encargo_id)
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
def eliminar_documento(encargo_id: int, documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _autorizar(usuario, "editar")
    _obtener_encargo(db, encargo_id)
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

from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.intranet.documentos.models import Documento
from backend.app.storage import DOCUMENTOS_INTRANET_DIR

UPLOAD_DIR = DOCUMENTOS_INTRANET_DIR
MAX_FILE_SIZE = 20 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".txt", ".csv", ".png", ".jpg", ".jpeg",
}
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def listar_documentos(db: Session, search: str | None = None):
    query = db.query(Documento)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Documento.titulo.ilike(term), Documento.concepto.ilike(term)))
    return query.order_by(Documento.fecha_publicacion.desc(), Documento.id.desc()).all()


def obtener_documento(db: Session, documento_id: int):
    doc = db.query(Documento).filter(Documento.id == documento_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="El documento no existe")
    return doc


def crear_documento(db: Session, titulo: str, concepto: str, archivo, usuario_id: int | None = None):
    titulo = (titulo or "").strip()
    concepto = (concepto or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="El título es obligatorio")

    nombre_original = Path(getattr(archivo, "filename", "") or "documento").name
    extension = Path(nombre_original).suffix.lower()
    if not nombre_original or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Tipo de archivo no permitido. Usa PDF, Office, TXT, CSV, PNG o JPG.",
        )

    contenido = archivo.file.read(MAX_FILE_SIZE + 1)
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    if len(contenido) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 20 MB")

    nombre_guardado = f"{uuid4().hex}{extension}"
    ruta = (UPLOAD_DIR / nombre_guardado).resolve()
    if ruta.parent != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=400, detail="Ruta de archivo no válida")
    temporal = ruta.with_name(f".{ruta.name}.part")

    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        temporal.write_bytes(contenido)
        temporal.replace(ruta)
        doc = Documento(
            titulo=titulo[:300],
            concepto=concepto[:2000] or None,
            fichero=str(ruta),
            fecha_publicacion=datetime.utcnow(),
            usuario_id=usuario_id,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    except Exception:
        db.rollback()
        ruta.unlink(missing_ok=True)
        temporal.unlink(missing_ok=True)
        raise
    finally:
        try:
            archivo.file.close()
        except Exception:
            pass


def actualizar_documento(db: Session, documento_id: int, titulo: str, concepto: str, usuario_id: int | None = None):
    doc = obtener_documento(db, documento_id)
    titulo = (titulo or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="El título es obligatorio")
    doc.titulo = titulo[:300]
    doc.concepto = (concepto or "").strip()[:2000] or None
    doc.usuario_id = usuario_id
    db.commit()
    db.refresh(doc)
    return doc


def eliminar_documento(db: Session, documento_id: int):
    doc = obtener_documento(db, documento_id)
    ruta = Path(doc.fichero).resolve() if doc.fichero else None
    db.delete(doc)
    db.commit()
    try:
        if ruta and ruta.parent == UPLOAD_DIR.resolve():
            ruta.unlink(missing_ok=True)
    except OSError as exc:
        print(f"[DOCUMENTOS INTRANET] No se pudo eliminar el fichero físico: {exc}", flush=True)
    return doc

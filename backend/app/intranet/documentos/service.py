from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.intranet.documentos.models import Documento
from backend.app.storage import DOCUMENTOS_INTRANET_DIR

UPLOAD_DIR = DOCUMENTOS_INTRANET_DIR
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def listar_documentos(db: Session, search: str | None = None):
    query = db.query(Documento)
    if search:
        query = query.filter(Documento.titulo.ilike(f"%{search}%"))
    return query.order_by(Documento.fecha_publicacion.desc()).all()


def obtener_documento(db: Session, documento_id: int):
    return db.query(Documento).filter(Documento.id == documento_id).first()


def crear_documento(db: Session, titulo: str, concepto: str, archivo):
    """Guarda el archivo con un nombre opaco y registra la ruta persistente."""
    nombre_original = Path(getattr(archivo, "filename", "") or "documento").name
    if nombre_original in {"", ".", ".."}:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")

    extension = Path(nombre_original).suffix[:20].lower()
    nombre_guardado = f"{uuid4().hex}{extension}"
    ruta = (UPLOAD_DIR / nombre_guardado).resolve()
    if ruta.parent != UPLOAD_DIR.resolve():
        raise HTTPException(status_code=400, detail="Ruta de archivo no válida")
    temporal = ruta.with_name(f".{ruta.name}.part")

    contenido = archivo.file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        temporal.write_bytes(contenido)
        temporal.replace(ruta)

        doc = Documento(
            titulo=titulo,
            concepto=concepto,
            fichero=str(ruta),
            fecha_publicacion=datetime.utcnow(),
            usuario_id=None,
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


def actualizar_documento(db: Session, documento_id: int, titulo: str, concepto: str):
    doc = obtener_documento(db, documento_id)
    if doc:
        doc.titulo = titulo
        doc.concepto = concepto
        db.commit()
        db.refresh(doc)
    return doc


def eliminar_documento(db: Session, documento_id: int):
    doc = obtener_documento(db, documento_id)
    if not doc:
        return None

    ruta = Path(doc.fichero).resolve() if doc.fichero else None
    db.delete(doc)
    db.commit()

    # Nunca borrar fuera del directorio de documentos, ni borrar antes de confirmar
    # el borrado de la fila en PostgreSQL.
    try:
        if ruta and ruta.parent == UPLOAD_DIR.resolve():
            ruta.unlink(missing_ok=True)
    except OSError as exc:
        print(f"[DOCUMENTOS] No se pudo eliminar el fichero físico: {exc}", flush=True)
    return doc

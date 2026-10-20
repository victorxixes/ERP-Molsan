from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.intranet.noticias.models import Noticia


def listar_noticias(db: Session, search: str | None = None):
    query = db.query(Noticia)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Noticia.titulo.ilike(term), Noticia.descripcion.ilike(term)))
    return query.order_by(Noticia.fecha_publicacion.desc(), Noticia.id.desc()).all()


def obtener_noticia(db: Session, noticia_id: int):
    noticia = db.query(Noticia).filter(Noticia.id == noticia_id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="La noticia no existe")
    return noticia


def crear_noticia(db: Session, titulo: str, descripcion: str, usuario_id: int | None = None):
    titulo = (titulo or "").strip()
    descripcion = (descripcion or "").strip()
    if not titulo:
        raise HTTPException(status_code=422, detail="El título es obligatorio")
    if not descripcion:
        raise HTTPException(status_code=422, detail="El contenido de la noticia es obligatorio")
    noticia = Noticia(
        titulo=titulo[:300],
        descripcion=descripcion,
        fecha_publicacion=datetime.utcnow(),
        usuario_id=usuario_id,
    )
    db.add(noticia)
    db.commit()
    db.refresh(noticia)
    return noticia


def actualizar_noticia(db: Session, noticia_id: int, titulo: str, descripcion: str, usuario_id: int | None = None):
    noticia = obtener_noticia(db, noticia_id)
    titulo = (titulo or "").strip()
    descripcion = (descripcion or "").strip()
    if not titulo or not descripcion:
        raise HTTPException(status_code=422, detail="El título y el contenido son obligatorios")
    noticia.titulo = titulo[:300]
    noticia.descripcion = descripcion
    noticia.usuario_id = usuario_id
    db.commit()
    db.refresh(noticia)
    return noticia


def eliminar_noticia(db: Session, noticia_id: int):
    noticia = obtener_noticia(db, noticia_id)
    db.delete(noticia)
    db.commit()
    return noticia

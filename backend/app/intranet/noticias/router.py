from fastapi import APIRouter, Depends
from pydantic import BaseModel, constr
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.intranet.auditoria import registrar_auditoria
from backend.app.intranet.noticias.service import (
    listar_noticias, obtener_noticia, crear_noticia,
    actualizar_noticia, eliminar_noticia,
)
from backend.app.auth.dependencies import get_current_user
from backend.app.intranet.permissions import require_intranet_perm
from backend.app.websockets.intranet_ws import intranet_broadcast
from backend.app.websockets.notificaciones_ws import broadcast_notificacion

router = APIRouter(prefix="/noticias", tags=["Noticias"])


class NoticiaPayload(BaseModel):
    titulo: constr(strip_whitespace=True, min_length=1, max_length=300)
    descripcion: constr(strip_whitespace=True, min_length=1, max_length=20000)


@router.get("/")
def listar(search: str | None = None, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "ver")
    return listar_noticias(db, search)


@router.post("/")
async def crear(payload: NoticiaPayload, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "crear")
    noticia = crear_noticia(db, payload.titulo, payload.descripcion, getattr(usuario, "id", None))
    registrar_auditoria(db, usuario, "CREAR", "NOTICIA", noticia.id, noticia.titulo)
    evento = {
        "tipo": "nueva_noticia", "id": noticia.id, "titulo": noticia.titulo,
        "descripcion": noticia.descripcion,
    }
    await intranet_broadcast(evento)
    await broadcast_notificacion({"tipo": "nueva_noticia", "titulo": noticia.titulo})
    return noticia


@router.get("/{noticia_id}")
def obtener(noticia_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "ver")
    return obtener_noticia(db, noticia_id)


@router.put("/{noticia_id}")
async def actualizar(noticia_id: int, payload: NoticiaPayload, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "editar")
    noticia = actualizar_noticia(db, noticia_id, payload.titulo, payload.descripcion, getattr(usuario, "id", None))
    registrar_auditoria(db, usuario, "EDITAR", "NOTICIA", noticia.id, noticia.titulo)
    await intranet_broadcast({
        "tipo": "noticia_actualizada", "id": noticia.id, "titulo": noticia.titulo,
        "descripcion": noticia.descripcion,
    })
    return noticia


@router.delete("/{noticia_id}")
async def eliminar(noticia_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "eliminar")
    noticia = eliminar_noticia(db, noticia_id)
    registrar_auditoria(db, usuario, "ELIMINAR", "NOTICIA", noticia_id, noticia.titulo)
    await intranet_broadcast({"tipo": "noticia_eliminada", "id": noticia_id})
    await broadcast_notificacion({"tipo": "noticia_eliminada", "id": noticia_id})
    return {"status": "ok", "id": noticia_id}

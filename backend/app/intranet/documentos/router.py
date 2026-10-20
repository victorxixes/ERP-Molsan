from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.intranet.auditoria import registrar_auditoria
from backend.app.intranet.documentos.service import (
    listar_documentos, obtener_documento, crear_documento,
    actualizar_documento, eliminar_documento, UPLOAD_DIR,
)
from backend.app.auth.dependencies import get_current_user
from backend.app.intranet.permissions import require_intranet_perm
from backend.app.websockets.intranet_ws import intranet_broadcast
from backend.app.websockets.notificaciones_ws import broadcast_notificacion

router = APIRouter(prefix="/documentos", tags=["Documentos"])


@router.get("/")
def listar(search: str | None = None, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "ver")
    return listar_documentos(db, search)


@router.get("/{documento_id}")
def obtener(documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "ver")
    return obtener_documento(db, documento_id)


@router.post("/")
async def crear(
    titulo: str = Form(...),
    concepto: str = Form(""),
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_intranet_perm(usuario, "crear")
    documento = crear_documento(db, titulo, concepto, fichero, getattr(usuario, "id", None))
    registrar_auditoria(db, usuario, "CREAR", "DOCUMENTO", documento.id, documento.titulo)
    await intranet_broadcast({
        "tipo": "nuevo_documento", "id": documento.id,
        "titulo": documento.titulo, "concepto": documento.concepto,
    })
    await broadcast_notificacion({"tipo": "nuevo_documento", "titulo": documento.titulo})
    return documento


@router.put("/{documento_id}")
async def actualizar(
    documento_id: int,
    titulo: str = Form(...),
    concepto: str = Form(""),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_intranet_perm(usuario, "editar")
    documento = actualizar_documento(
        db, documento_id, titulo, concepto, getattr(usuario, "id", None)
    )
    registrar_auditoria(db, usuario, "EDITAR", "DOCUMENTO", documento.id, documento.titulo)
    await intranet_broadcast({
        "tipo": "documento_actualizado", "id": documento.id,
        "titulo": documento.titulo, "concepto": documento.concepto,
    })
    return documento


@router.delete("/{documento_id}")
async def eliminar(documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "eliminar")
    documento = eliminar_documento(db, documento_id)
    registrar_auditoria(db, usuario, "ELIMINAR", "DOCUMENTO", documento_id, documento.titulo)
    await intranet_broadcast({"tipo": "documento_eliminado", "id": documento_id})
    await broadcast_notificacion({"tipo": "documento_eliminado", "id": documento_id})
    return {"status": "ok", "id": documento_id}


@router.get("/descargar/{documento_id}")
def descargar(documento_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    require_intranet_perm(usuario, "ver")
    doc = obtener_documento(db, documento_id)
    ruta = Path(doc.fichero).resolve() if doc.fichero else None
    if not ruta or ruta.parent != UPLOAD_DIR.resolve() or not ruta.is_file():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="El archivo del documento no está disponible")
    extension = ruta.suffix.lower()
    return FileResponse(
        str(ruta),
        media_type="application/octet-stream",
        filename=f"documento-{doc.id}{extension}",
    )

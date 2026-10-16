import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.storage import CARPETA_DIGITAL_DIR

# Toda la API de la carpeta digital exige una sesión JWT válida.
# El frontend de esta funcionalidad usa el cliente axios común, que añade el token.
router = APIRouter(
    prefix="/expedientes",
    tags=["Carpeta digital"],
    dependencies=[Depends(get_current_user)],
)

CATEGORIAS = {
    # Documentación previa
    "Documentos Absis",
    "Hoja de Encargo firmada",
    "Justificante de cancelación",
    "Nota simple registral",
    "Escrituras/borradores",
    # Sede notarial
    "Presentación Registro",
    "Copia simple",
    # Liquidación impuestos
    "AJD/ITP",
    "Otros impuestos",
    # Gestión económica
    "Factura notarial",
    "Factura Registral",
    "Honorarios gestoría",
    "Otros pagos",
    # Defectos registrales
    "Defecto registral",
    "Subsanación del defecto",
    # Tramitación inscripción
    "Hoja de Inscripción",
    # Facturación y cierre
    "Escritura digital final",
    # Documentación general
    "Mails de la Oficina",
    "Otra documentación",
    # Compatibilidad con categorías anteriores
    "Mails de la oficina",
    "Borradores de escrituras",
    "Factura impuestos",
    "Otros documentos económicos",
    "Documento de inscripción",
    "Expediente digital completo",
}

MAX_BYTES = int(os.getenv("CARPETA_DIGITAL_MAX_BYTES", str(100 * 1024 * 1024)))
# Carpeta compartida de almacenamiento. En Render debe quedar bajo el disco
# persistente configurado en MOLSAN_STORAGE_ROOT.
ROOT = CARPETA_DIGITAL_DIR.resolve()
ROOT.mkdir(parents=True, exist_ok=True)


class DocumentoRespuesta(BaseModel):
    id: int
    expediente_id: str
    categoria: str
    nombre_original: str
    tipo_mime: str | None = None
    tamano_bytes: int
    fecha_subida: datetime

    class Config:
        orm_mode = True


def _expediente_existe(db: Session, expediente_id: str):
    # El ERP identifica expedientes mediante id_expediente (referencia ABSIS).
    encontrado = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(expediente_id))
        .first()
    )
    if not encontrado:
        raise HTTPException(status_code=404, detail=f"No existe el expediente {expediente_id}")


def _ruta_segura(nombre_guardado: str) -> Path:
    # El nombre almacenado lo genera el backend, nunca se acepta una ruta enviada
    # por el cliente. Esta validación también protege frente a registros antiguos.
    ruta = (ROOT / nombre_guardado).resolve()
    if ruta.parent != ROOT:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
    return ruta


@router.get("/{expediente_id}/carpeta-digital", response_model=List[DocumentoRespuesta])
def listar_documentos(expediente_id: str, db: Session = Depends(get_db)):
    _expediente_existe(db, expediente_id)
    return (
        db.query(DocumentoCarpetaDigital)
        .filter(DocumentoCarpetaDigital.expediente_id == str(expediente_id))
        .order_by(DocumentoCarpetaDigital.fecha_subida.desc())
        .all()
    )


@router.post(
    "/{expediente_id}/carpeta-digital",
    response_model=DocumentoRespuesta,
    status_code=201,
)
async def subir_documento(
    expediente_id: str,
    categoria: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _expediente_existe(db, expediente_id)
    if categoria not in CATEGORIAS:
        raise HTTPException(status_code=400, detail="Categoría documental no válida")

    nombre_original = Path(archivo.filename or "documento").name
    if not nombre_original or nombre_original in {".", ".."}:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")

    try:
        contenido = await archivo.read(MAX_BYTES + 1)
        if len(contenido) > MAX_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"El archivo supera el límite de {MAX_BYTES // (1024 * 1024)} MB",
            )
        if not contenido:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        # Nombre aleatorio y extensión saneada; no se usa el nombre aportado como ruta.
        extension = Path(nombre_original).suffix[:20].lower()
        nombre_guardado = f"{uuid.uuid4().hex}{extension}"
        ruta = _ruta_segura(nombre_guardado)
        temporal = _ruta_segura(f".{nombre_guardado}.part")

        try:
            temporal.write_bytes(contenido)
            temporal.replace(ruta)
            registro = DocumentoCarpetaDigital(
                expediente_id=str(expediente_id),
                categoria=categoria,
                nombre_original=nombre_original,
                nombre_guardado=nombre_guardado,
                tipo_mime=archivo.content_type,
                tamano_bytes=len(contenido),
                fecha_subida=datetime.utcnow(),
            )
            db.add(registro)
            db.commit()
            db.refresh(registro)
            return registro
        except Exception:
            db.rollback()
            ruta.unlink(missing_ok=True)
            temporal.unlink(missing_ok=True)
            raise
    finally:
        await archivo.close()


@router.get("/{expediente_id}/carpeta-digital/{documento_id}/descargar")
def descargar_documento(
    expediente_id: str,
    documento_id: int,
    db: Session = Depends(get_db),
):
    _expediente_existe(db, expediente_id)
    doc = (
        db.query(DocumentoCarpetaDigital)
        .filter(
            DocumentoCarpetaDigital.id == documento_id,
            DocumentoCarpetaDigital.expediente_id == str(expediente_id),
        )
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    ruta = _ruta_segura(doc.nombre_guardado)
    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail=(
                "El archivo no está en el almacenamiento. Comprueba que "
                "CARPETA_DIGITAL_DIR apunte al disco persistente de Render."
            ),
        )
    return FileResponse(
        path=ruta,
        media_type=doc.tipo_mime or "application/octet-stream",
        filename=doc.nombre_original,
        content_disposition_type="inline",
    )


@router.delete("/{expediente_id}/carpeta-digital/{documento_id}")
def eliminar_documento(
    expediente_id: str,
    documento_id: int,
    db: Session = Depends(get_db),
):
    _expediente_existe(db, expediente_id)
    doc = (
        db.query(DocumentoCarpetaDigital)
        .filter(
            DocumentoCarpetaDigital.id == documento_id,
            DocumentoCarpetaDigital.expediente_id == str(expediente_id),
        )
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    ruta = _ruta_segura(doc.nombre_guardado)
    db.delete(doc)
    db.commit()
    ruta.unlink(missing_ok=True)
    return {"ok": True, "id": documento_id}

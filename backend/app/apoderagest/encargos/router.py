
"""Endpoints de encargos de ApoderaGest."""

from datetime import date
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual
from backend.app.apoderagest.encargos.service import listar_encargos
from backend.app.expedientes.models import Expediente

router = APIRouter(
    prefix="/apoderagest/encargos",
    tags=["ApoderaGest - Encargos"],
)


@router.get("")
def obtener_encargos(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
    pendientes: bool = Query(True, description="Solo envíos pendientes de firma"),
):
    return listar_encargos(db, usuario, solo_pendientes=pendientes)



class FirmaEncargo(BaseModel):
    fecha_firma: date
    protocolo: str = Field(..., min_length=1, max_length=200)
    notario_otorgante: str = Field(..., min_length=1, max_length=300)


@router.post("/{id_expediente}/firmar", summary="Registrar firma real desde ApoderaGest")
def firmar_encargo(
    id_expediente: str,
    datos: FirmaEncargo,
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    """Guarda fecha de firma y protocolo en el mismo expediente de FichaExpediente."""
    # Solo se permite firmar expedientes asignados al apoderado autenticado.
    encargos_usuario = listar_encargos(db, usuario, solo_pendientes=False)
    encargo = next(
        (
            item for item in encargos_usuario
            if str(item.get("id_expediente") or "") == str(id_expediente)
        ),
        None,
    )
    if not encargo:
        raise HTTPException(
            status_code=403,
            detail="Este expediente no está asignado al apoderado autenticado.",
        )

    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    protocolo = datos.protocolo.strip()
    if not protocolo:
        raise HTTPException(status_code=422, detail="Indica el número de protocolo.")

    expediente.fecha_firma = datos.fecha_firma
    expediente.protocolo = protocolo
    expediente.notario_otorgante = datos.notario_otorgante.strip()
    try:
        db.commit()
        db.refresh(expediente)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo registrar la firma: {str(exc)[:250]}",
        )

    return {
        "ok": True,
        "id_expediente": expediente.id_expediente,
        "fecha_firma": expediente.fecha_firma.isoformat() if expediente.fecha_firma else None,
        "protocolo": expediente.protocolo,
        "notario_otorgante": expediente.notario_otorgante,
        "mensaje": "Firma registrada en FichaExpediente.",
    }

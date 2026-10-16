
"""Endpoints de encargos de ApoderaGest."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual
from backend.app.apoderagest.encargos.service import listar_encargos

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

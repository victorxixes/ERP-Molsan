
"""Endpoints de agenda de ApoderaGest."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual
from backend.app.apoderagest.agenda.service import (
    listar_citas_apoderado,
)

router = APIRouter(
    prefix="/apoderagest/agenda",
    tags=["ApoderaGest - Agenda"],
)


@router.get("")
def obtener_agenda(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    return listar_citas_apoderado(db, usuario)

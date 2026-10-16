
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual

from backend.app.notargest.agenda.service import (
    listar_citas_usuario,
    serializar_cita,
)


router = APIRouter(
    prefix="/apoderagest/agenda",
    tags=["ApoderaGest - Agenda"],
)


@router.get("")
def listar_agenda(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    citas = listar_citas_usuario(db, usuario)

    return [
        serializar_cita(cita)
        for cita in citas
    ]


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual

from backend.app.notargest.encargos.service import (
    listar_encargos_usuario,
    serializar_encargo,
)


router = APIRouter(
    prefix="/apoderagest/encargos",
    tags=["ApoderaGest - Encargos"],
)


@router.get("")
def listar_encargos(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    expedientes = listar_encargos_usuario(db, usuario)

    return [
        serializar_encargo(expediente)
        for expediente in expedientes
    ]

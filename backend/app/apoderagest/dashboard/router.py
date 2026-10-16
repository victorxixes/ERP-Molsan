
"""Endpoints del cuadro de mando de ApoderaGest."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual
from backend.app.apoderagest.dashboard.service import obtener_dashboard

router = APIRouter(
    prefix="/apoderagest/dashboard",
    tags=["ApoderaGest - Dashboard"],
)


@router.get("")
def dashboard(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    return obtener_dashboard(db, usuario)


from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual

from backend.app.notargest.dashboard.service import resumen_usuario


router = APIRouter(
    prefix="/apoderagest/dashboard",
    tags=["ApoderaGest - Dashboard"],
)


@router.get("")
def dashboard(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    return resumen_usuario(db, usuario)

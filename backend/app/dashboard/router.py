from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from .schemas import DashboardExpedientesResponse
from .service import obtener_dashboard_expedientes, obtener_dashboard_cancelagest

router = APIRouter(
    prefix="/dashboard/expedientes",
    tags=["Dashboard Expedientes"],
)


@router.get(
    "",
    response_model=DashboardExpedientesResponse,
    summary="Dashboard de expedientes",
)
def dashboard_expedientes(
    db: Session = Depends(get_db),
):
    """
    Devuelve los indicadores principales del dashboard de Expedientes:
    - expedientes por actividad
    - media de días entre envío y firma por tipo de operación

    En este proyecto, la fecha de envío se toma de
    Expediente.fecha_inicio_actividad.
    """
    return obtener_dashboard_expedientes(db)



@router.get(
    "/cancelagest",
    summary="Indicadores de firmas y tiempos del circuito de CancelaGest",
)
def dashboard_cancelagest(
    db: Session = Depends(get_db),
):
    return obtener_dashboard_cancelagest(db)

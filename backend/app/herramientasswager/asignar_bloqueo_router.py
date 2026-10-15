from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.empleados.models import Empleado


def _autorizar_edicion_empleados(usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "empleados", "editar")
    return usuario


router = APIRouter(
    prefix="/seguridad/asignar",
    tags=["Seguridad - Asignación"],
    dependencies=[Depends(_autorizar_edicion_empleados)],
)


@router.post("/empleado/{empleado_id}/bloquear")
def bloquear_empleado(empleado_id: int, db: Session = Depends(get_db)):
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if empleado is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    empleado.activo = False
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo bloquear al empleado") from exc

    return {"estado": "OK", "detalle": f"Empleado {empleado.usuario} ha sido BLOQUEADO"}


@router.post("/empleado/{empleado_id}/desbloquear")
def desbloquear_empleado(empleado_id: int, db: Session = Depends(get_db)):
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if empleado is None:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    empleado.activo = True
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo desbloquear al empleado") from exc

    return {"estado": "OK", "detalle": f"Empleado {empleado.usuario} ha sido DESBLOQUEADO"}

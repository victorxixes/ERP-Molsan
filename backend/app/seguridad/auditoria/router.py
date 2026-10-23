from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user

from backend.app.seguridad.auditoria.schemas import (
    AuditoriaCreate,
    AuditoriaOut,
)

from backend.app.seguridad.auditoria.service import (
    obtener_auditoria,
    obtener_metricas,
    registrar_auditoria,
    obtener_auditoria_empleado,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/seguridad/auditoria",
    tags=["Seguridad - Auditoría"],
)


# ============================================================
# AUDITORÍA GLOBAL
# ============================================================

@router.get(
    "/",
    response_model=list[AuditoriaOut],
    summary="Obtener auditoría global",
)
def listar_auditoria(
    db: Session = Depends(get_db),
):
    """
    Devuelve los registros de auditoría globales,
    ordenados del más reciente al más antiguo.

    El límite y la lógica de consulta pertenecen al service.
    """

    return obtener_auditoria(db)


# ============================================================
# AUDITORÍA POR EMPLEADO
# ============================================================

@router.get(
    "/empleado/{empleado_id}",
    response_model=list[AuditoriaOut],
    summary="Obtener auditoría de un empleado",
)
def listar_auditoria_empleado(
    empleado_id: int,
    db: Session = Depends(get_db),
):
    """
    Devuelve la actividad de auditoría asociada
    al empleado indicado.
    """

    return obtener_auditoria_empleado(
        db=db,
        empleado_id=empleado_id,
    )


# ============================================================
# MÉTRICAS
# ============================================================

@router.get(
    "/metricas",
    summary="Obtener métricas de auditoría",
)
def metricas(
    db: Session = Depends(get_db),
):
    """
    Devuelve las métricas agregadas de auditoría:
    - total de registros
    - registros por módulo
    - registros por acción
    - últimos logins
    """

    return obtener_metricas(db)


# ============================================================
# REGISTRAR AUDITORÍA
# ============================================================

@router.post(
    "/",
    response_model=AuditoriaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar evento de auditoría",
)
def registrar(
    datos: AuditoriaCreate,
    request: Request,
    usuario_actual=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Registra un nuevo evento de auditoría.

    El cuerpo esperado es:

    {
        "usuario": "usuario",
        "modulo": "seguridad",
        "accion": "login",
        "descripcion": "Inicio de sesión",
        "ip": "127.0.0.1"
    }
    """

    actor = (
        getattr(usuario_actual, "usuario", None)
        or getattr(usuario_actual, "username", None)
        or getattr(usuario_actual, "email", None)
        or f"empleado:{getattr(usuario_actual, 'id', 'autenticado')}"
    )
    ip = request.client.host if request.client else None
    detalle = (datos.descripcion or "Registro manual solicitado")[:400]
    return registrar_auditoria(
        db=db,
        usuario=str(actor)[:100],
        modulo="auditoria",
        accion="REGISTRO_MANUAL",
        descripcion=f"Registro manual: {detalle}"[:500],
        ip=ip,
    )

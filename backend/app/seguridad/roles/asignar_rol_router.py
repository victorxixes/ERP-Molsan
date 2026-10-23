from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.empleados.models import Empleado
from backend.app.seguridad.roles.models import Rol


router = APIRouter(
    prefix="/seguridad/asignar",
    tags=["Seguridad - Asignación"]
)


def _requiere_edicion_seguridad(usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "seguridad", "editar")
    return usuario


# ============================================================
# ASIGNAR ROL
# ============================================================

@router.post(
    "/empleado/{empleado_id}/rol/{rol_id}"
)
def asignar_rol(
    empleado_id: int,
    rol_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_edicion_seguridad),
):
    """
    Asigna un rol a un empleado.
    """

    empleado = (
        db.query(Empleado)
        .filter(
            Empleado.id == empleado_id
        )
        .first()
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    rol = (
        db.query(Rol)
        .filter(
            Rol.id == rol_id
        )
        .first()
    )

    if not rol:

        raise HTTPException(
            status_code=404,
            detail="Rol no encontrado"
        )

    empleado.rol_id = rol.id

    db.commit()
    db.refresh(empleado)

    return {
        "estado": "OK",
        "empleado_id": empleado.id,
        "rol_id": rol.id,
        "rol": {
            "id": rol.id,
            "nombre": rol.nombre,
            "descripcion": rol.descripcion,
        },
        "detalle": (
            f"Rol '{rol.nombre}' asignado "
            f"correctamente al empleado "
            f"{empleado.nombre}"
        ),
    }


# ============================================================
# COMPATIBILIDAD FRONTEND
# ============================================================
#
# El frontend actual utiliza:
#
# POST /seguridad/permisos/asignar-rol
#
# Mantenemos este endpoint para no romper
# SeguridadFicha / seguridadStore.
#
# ============================================================

@router.post(
    "/permisos/asignar-rol"
)
def asignar_rol_compatibilidad(
    empleado_id: int,
    rol_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_edicion_seguridad),
):
    """
    Endpoint compatible con versiones anteriores
    del frontend.
    """

    empleado = (
        db.query(Empleado)
        .filter(
            Empleado.id == empleado_id
        )
        .first()
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    rol = (
        db.query(Rol)
        .filter(
            Rol.id == rol_id
        )
        .first()
    )

    if not rol:

        raise HTTPException(
            status_code=404,
            detail="Rol no encontrado"
        )

    empleado.rol_id = rol.id

    db.commit()
    db.refresh(empleado)

    return {
        "estado": "OK",
        "empleado_id": empleado.id,
        "rol_id": rol.id,
        "rol": {
            "id": rol.id,
            "nombre": rol.nombre,
            "descripcion": rol.descripcion,
        },
        "detalle": (
            f"Rol '{rol.nombre}' asignado "
            f"correctamente"
        ),
    }

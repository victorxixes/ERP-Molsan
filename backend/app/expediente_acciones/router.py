
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from backend.app.database import get_db

from backend.app.expedientes.models import Expediente
from backend.app.acciones_expediente.models import AccionExpediente
from backend.app.expediente_acciones.models import ExpedienteAccion

from backend.app.expediente_acciones.schemas import (
    ExpedienteAccionCreate,
    ExpedienteAccionUpdate,
    ExpedienteAccionResponse,
)


router = APIRouter(
    prefix="/expediente-acciones",
    tags=["Acciones del expediente"],
)


ESTADOS_VALIDOS = {
    "Pendiente",
    "En curso",
    "Realizada",
    "Cancelada",
}


# ============================================================
# HELPERS
# ============================================================

def obtener_expediente_por_identificador(
    db: Session,
    id_expediente: str,
):
    expediente = (
        db.query(Expediente)
        .filter(
            Expediente.id_expediente == id_expediente
        )
        .first()
    )

    if not expediente:
        raise HTTPException(
            status_code=404,
            detail=f"No existe el expediente {id_expediente}.",
        )

    return expediente


def validar_estado(estado: str):
    if estado not in ESTADOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Estado no válido. Estados permitidos: "
                + ", ".join(sorted(ESTADOS_VALIDOS))
            ),
        )


def accion_a_dict(accion):
    """
    Convierte la acción SQLAlchemy en un diccionario
    compatible con la respuesta de Pydantic.
    """

    if accion is None:
        return None

    return {
        "id": accion.id,
        "departamento": accion.departamento,
        "seccion": accion.seccion,
        "actividad": accion.actividad,
        "descripcion": accion.descripcion,
        "activo": accion.activo,
    }


def relacion_a_dict(relacion, accion=None):
    """
    Serializa la asignación y la acción del catálogo.
    """

    return {
        "id": relacion.id,
        "expediente_id": relacion.expediente_id,
        "accion_id": relacion.accion_id,
        "estado": relacion.estado,
        "fecha": relacion.fecha,
        "observaciones": relacion.observaciones,
        "activo": relacion.activo,
        "accion": accion_a_dict(accion),
    }


def obtener_accion_catalogo(
    db: Session,
    accion_id: int,
):
    return (
        db.query(AccionExpediente)
        .filter(
            AccionExpediente.id == accion_id
        )
        .first()
    )


# ============================================================
# LISTAR ACCIONES DEL EXPEDIENTE
# GET /expediente/{id_expediente}
# ============================================================

@router.get(
    "/expediente/{id_expediente}",
    response_model=List[ExpedienteAccionResponse],
)
def listar_acciones_expediente(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente_por_identificador(
        db,
        id_expediente,
    )

    relaciones = (
        db.query(ExpedienteAccion)
        .filter(
            ExpedienteAccion.expediente_id == expediente.id,
            ExpedienteAccion.activo.is_(True),
        )
        .order_by(
            ExpedienteAccion.fecha.asc().nullslast(),
            ExpedienteAccion.id.asc(),
        )
        .all()
    )

    resultado = []

    for relacion in relaciones:
        accion = obtener_accion_catalogo(
            db,
            relacion.accion_id,
        )

        resultado.append(
            relacion_a_dict(
                relacion,
                accion,
            )
        )

    return resultado


# ============================================================
# ASIGNAR ACCIÓN AL EXPEDIENTE
# POST /expediente/{id_expediente}
# ============================================================

@router.post(
    "/expediente/{id_expediente}",
    response_model=ExpedienteAccionResponse,
)
def asignar_accion_expediente(
    id_expediente: str,
    datos: ExpedienteAccionCreate,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente_por_identificador(
        db,
        id_expediente,
    )

    validar_estado(datos.estado)

    accion = obtener_accion_catalogo(
        db,
        datos.accion_id,
    )

    if not accion:
        raise HTTPException(
            status_code=404,
            detail="La acción seleccionada no existe en el catálogo.",
        )

    if not accion.activo:
        raise HTTPException(
            status_code=400,
            detail="La acción seleccionada está inactiva.",
        )

    existente = (
        db.query(ExpedienteAccion)
        .filter(
            ExpedienteAccion.expediente_id == expediente.id,
            ExpedienteAccion.accion_id == datos.accion_id,
        )
        .first()
    )

    if existente:
        if existente.activo:
            raise HTTPException(
                status_code=409,
                detail="Esta acción ya está asignada al expediente.",
            )

        # Reactivar una asignación retirada anteriormente.
        existente.activo = True
        existente.estado = datos.estado
        existente.fecha = datos.fecha
        existente.observaciones = datos.observaciones

        try:
            db.commit()
            db.refresh(existente)
        except Exception:
            db.rollback()
            raise

        return relacion_a_dict(
            existente,
            accion,
        )

    relacion = ExpedienteAccion(
        expediente_id=expediente.id,
        accion_id=datos.accion_id,
        estado=datos.estado,
        fecha=datos.fecha,
        observaciones=datos.observaciones,
        activo=True,
    )

    try:
        db.add(relacion)
        db.commit()
        db.refresh(relacion)
    except Exception:
        db.rollback()
        raise

    return relacion_a_dict(
        relacion,
        accion,
    )


# ============================================================
# MODIFICAR ACCIÓN ASIGNADA
# PUT /{relacion_id}
# ============================================================

@router.put(
    "/{relacion_id}",
    response_model=ExpedienteAccionResponse,
)
def actualizar_accion_expediente(
    relacion_id: int,
    datos: ExpedienteAccionUpdate,
    db: Session = Depends(get_db),
):
    relacion = (
        db.query(ExpedienteAccion)
        .filter(
            ExpedienteAccion.id == relacion_id
        )
        .first()
    )

    if not relacion:
        raise HTTPException(
            status_code=404,
            detail="No existe esta acción asignada al expediente.",
        )

    if datos.estado is not None:
        validar_estado(datos.estado)
        relacion.estado = datos.estado

    if datos.fecha is not None:
        relacion.fecha = datos.fecha

    if datos.observaciones is not None:
        relacion.observaciones = datos.observaciones

    if datos.activo is not None:
        relacion.activo = datos.activo

    try:
        db.commit()
        db.refresh(relacion)
    except Exception:
        db.rollback()
        raise

    accion = obtener_accion_catalogo(
        db,
        relacion.accion_id,
    )

    return relacion_a_dict(
        relacion,
        accion,
    )


# ============================================================
# RETIRAR ACCIÓN DEL EXPEDIENTE
# DELETE /{relacion_id}
# ============================================================

@router.delete(
    "/{relacion_id}",
)
def eliminar_accion_expediente(
    relacion_id: int,
    db: Session = Depends(get_db),
):
    relacion = (
        db.query(ExpedienteAccion)
        .filter(
            ExpedienteAccion.id == relacion_id
        )
        .first()
    )

    if not relacion:
        raise HTTPException(
            status_code=404,
            detail="No existe esta acción asignada al expediente.",
        )

    # Borrado lógico: no se elimina la acción del catálogo.
    relacion.activo = False

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "status": "ok",
        "message": "Acción retirada del expediente correctamente.",
    }

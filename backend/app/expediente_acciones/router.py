from datetime import date
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
                "Estado no válido. "
                "Estados permitidos: "
                + ", ".join(sorted(ESTADOS_VALIDOS))
            ),
        )


# ============================================================
# LISTAR ACCIONES DEL EXPEDIENTE
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

    acciones = (
        db.query(ExpedienteAccion)
        .filter(
            ExpedienteAccion.expediente_id == expediente.id,
            ExpedienteAccion.activo == True,
        )
        .order_by(
            ExpedienteAccion.fecha.asc(),
            ExpedienteAccion.id.asc(),
        )
        .all()
    )

    resultado = []

    for relacion in acciones:
        accion = (
            db.query(AccionExpediente)
            .filter(
                AccionExpediente.id == relacion.accion_id
            )
            .first()
        )

        resultado.append(
            {
                "id": relacion.id,
                "expediente_id": relacion.expediente_id,
                "accion_id": relacion.accion_id,
                "estado": relacion.estado,
                "fecha": relacion.fecha,
                "observaciones": relacion.observaciones,
                "activo": relacion.activo,
                "accion": accion,
            }
        )

    return resultado


# ============================================================
# ASIGNAR ACCIÓN AL EXPEDIENTE
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

    accion = (
        db.query(AccionExpediente)
        .filter(
            AccionExpediente.id == datos.accion_id
        )
        .first()
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

        existente.activo = True
        existente.estado = datos.estado
        existente.fecha = datos.fecha
        existente.observaciones = datos.observaciones

        db.commit()
        db.refresh(existente)

        return {
            "id": existente.id,
            "expediente_id": existente.expediente_id,
            "accion_id": existente.accion_id,
            "estado": existente.estado,
            "fecha": existente.fecha,
            "observaciones": existente.observaciones,
            "activo": existente.activo,
            "accion": accion,
        }

    relacion = ExpedienteAccion(
        expediente_id=expediente.id,
        accion_id=datos.accion_id,
        estado=datos.estado,
        fecha=datos.fecha,
        observaciones=datos.observaciones,
        activo=True,
    )

    db.add(relacion)
    db.commit()
    db.refresh(relacion)

    return {
        "id": relacion.id,
        "expediente_id": relacion.expediente_id,
        "accion_id": relacion.accion_id,
        "estado": relacion.estado,
        "fecha": relacion.fecha,
        "observaciones": relacion.observaciones,
        "activo": relacion.activo,
        "accion": accion,
    }


# ============================================================
# MODIFICAR ACCIÓN DEL EXPEDIENTE
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

    db.commit()
    db.refresh(relacion)

    accion = (
        db.query(AccionExpediente)
        .filter(
            AccionExpediente.id == relacion.accion_id
        )
        .first()
    )

    return {
        "id": relacion.id,
        "expediente_id": relacion.expediente_id,
        "accion_id": relacion.accion_id,
        "estado": relacion.estado,
        "fecha": relacion.fecha,
        "observaciones": relacion.observaciones,
        "activo": relacion.activo,
        "accion": accion,
    }


# ============================================================
# ELIMINAR ACCIÓN DEL EXPEDIENTE
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

    relacion.activo = False

    db.commit()

    return {
        "status": "ok",
        "message": "Acción retirada del expediente correctamente.",
    }

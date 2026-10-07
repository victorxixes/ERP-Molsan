from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from backend.app.database import get_db

from backend.app.agenda.schemas import (
    CitaCreate,
    CitaUpdate,
    CitaResponse,
)

from backend.app.agenda.service import (
    obtener_cita,
    obtener_citas_dia,
    obtener_citas_semana,
    obtener_citas_mes,
    crear_cita,
    editar_cita,
    eliminar_cita,
    mover_cita,
)

from backend.app.agenda.models import Cita


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/agenda",
    tags=["Agenda"],
)


# ============================================================
# BUSCAR
# ============================================================

@router.get(
    "/search",
    response_model=list[CitaResponse],
)
def buscar_citas(
    query: str | None = None,
    notario_id: int | None = None,
    apoderado_id: int | None = None,
    tipo_cita: str | None = None,
    expediente_id: int | None = None,
    id_expediente: str | None = None,
    fecha: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    db: Session = Depends(get_db),
):

    q = db.query(Cita)

    if query:

        patron = (
            f"%{query}%"
        )

        q = q.filter(
            Cita.tipo_cita.ilike(
                patron
            )
            |
            Cita.observaciones.ilike(
                patron
            )
        )

    if notario_id:

        q = q.filter(
            Cita.notario_id
            == notario_id
        )

    if apoderado_id:

        q = q.filter(
            Cita.apoderado_id
            == apoderado_id
        )

    if tipo_cita:

        q = q.filter(
            Cita.tipo_cita.ilike(
                f"%{tipo_cita}%"
            )
        )

    if expediente_id:

        q = q.filter(
            Cita.expediente_id
            == expediente_id
        )

    if fecha:

        q = q.filter(
            Cita.fecha
            == date.fromisoformat(
                fecha
            )
        )

    if desde:

        q = q.filter(
            Cita.fecha
            >= date.fromisoformat(
                desde
            )
        )

    if hasta:

        q = q.filter(
            Cita.fecha
            <= date.fromisoformat(
                hasta
            )
        )

    if id_expediente:

        from backend.app.expedientes.models import Expediente

        q = (
            q.join(
                Expediente,
                Cita.expediente_id
                == Expediente.id,
            )
            .filter(
                Expediente.id_expediente
                == id_expediente
            )
        )

    citas = (
        q.order_by(
            Cita.fecha.asc(),
            Cita.hora_inicio.asc(),
        )
        .all()
    )

    from backend.app.agenda.service import (
        cita_con_relaciones,
    )

    return [
        cita_con_relaciones(
            db,
            cita,
        )
        for cita in citas
    ]


# ============================================================
# DÍA
# ============================================================

@router.get(
    "/dia/{fecha}",
    response_model=list[CitaResponse],
)
def citas_dia(
    fecha: date,
    db: Session = Depends(get_db),
):

    return obtener_citas_dia(
        db,
        fecha,
    )


# ============================================================
# SEMANA
# ============================================================

@router.get(
    "/semana/{fecha}",
    response_model=list[CitaResponse],
)
def citas_semana(
    fecha: date,
    db: Session = Depends(get_db),
):

    return obtener_citas_semana(
        db,
        fecha,
    )


# ============================================================
# MES
# ============================================================

@router.get(
    "/mes/{año}/{mes}",
)
def citas_mes(
    año: int,
    mes: int,
    db: Session = Depends(get_db),
):

    if mes < 1 or mes > 12:

        raise HTTPException(
            status_code=400,
            detail="El mes debe estar entre 1 y 12.",
        )

    citas = obtener_citas_mes(
        db,
        año,
        mes,
    )

    return {
        "citas": citas,
    }


# ============================================================
# OBTENER CITA
# ============================================================

@router.get(
    "/{id}",
    response_model=CitaResponse,
)
def obtener(
    id: int,
    db: Session = Depends(get_db),
):

    cita = obtener_cita(
        db,
        id,
    )

    if not cita:

        raise HTTPException(
            status_code=404,
            detail="Cita no encontrada",
        )

    return cita


# ============================================================
# CREAR CITA
# ============================================================

@router.post(
    "/",
    response_model=CitaResponse,
)
async def create_cita(
    cita: CitaCreate,
    db: Session = Depends(get_db),
):

    nueva = crear_cita(
        db,
        cita,
    )

    return nueva


# ============================================================
# EDITAR CITA
# ============================================================

@router.put(
    "/{id}",
    response_model=CitaResponse,
)
async def editar(
    id: int,
    data: CitaUpdate,
    db: Session = Depends(get_db),
):

    editada = editar_cita(
        db,
        id,
        data,
    )

    if not editada:

        raise HTTPException(
            status_code=404,
            detail="Cita no encontrada",
        )

    return editada


# ============================================================
# ELIMINAR CITA
# ============================================================

@router.delete(
    "/{id}",
)
async def eliminar(
    id: int,
    db: Session = Depends(get_db),
):

    resultado = eliminar_cita(
        db,
        id,
    )

    if not resultado:

        raise HTTPException(
            status_code=404,
            detail="Cita no encontrada",
        )

    return {
        "status": "ok",
    }


# ============================================================
# MOVER CITA
# ============================================================

@router.put(
    "/{id}/mover",
    response_model=CitaResponse,
)
async def mover(
    id: int,
    fecha: date,
    db: Session = Depends(get_db),
):

    resultado = mover_cita(
        db,
        id,
        fecha,
    )

    if not resultado:

        raise HTTPException(
            status_code=404,
            detail="Cita no encontrada",
        )

    return resultado


# ============================================================
# DEBUG
# ============================================================

@router.get(
    "/debug/estado",
)
def debug_estado(
    db: Session = Depends(get_db),
):

    total = (
        db.query(
            Cita
        ).count()
    )

    return {
        "status": "ok",
        "tabla": "agenda_citas",
        "total_citas": total,
    }

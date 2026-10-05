from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.app.database import get_db
from backend.app.ctn.models import Notaria
from backend.app.ctn.service import obtener_notaria
from backend.app.agenda.models import Cita
from backend.app.ctn.schemas import NotariaResponse

from backend.app.utils.distancia import (
    distancia_km,
    MOLSAN_LAT,
    MOLSAN_LNG,
)

from backend.app.ctn.geocode import (
    geocode_todas_notarias,
)

from backend.app.ctn.migracion import (
    agregar_coordenadas,
)


router = APIRouter(
    prefix="/ctn",
    tags=["CTN"]
)


# =========================================================
# GEOCODIFICACIÓN
# =========================================================

@router.post("/geocode/notarias")
def geocode_notarias(
    db: Session = Depends(get_db)
):
    return geocode_todas_notarias(db)


# =========================================================
# MIGRACIÓN COORDENADAS
# =========================================================

@router.post("/migracion/agregar-coordenadas")
def migracion_agregar_coordenadas(
    db: Session = Depends(get_db)
):
    return agregar_coordenadas(db)


# =========================================================
# LISTAR NOTARÍAS
# =========================================================

@router.get("/notarias")
def listar(
    db: Session = Depends(get_db),
    provincia: str | None = None,
    municipio: str | None = None,
    vc: str | None = None,
    apoderado: str | None = None,
    q: str | None = None,
    page: int = 1,
    page_size: int = 50
):
    query = db.query(Notaria)

    if provincia:
        provincia_clean = provincia.strip()

        query = query.filter(
            func.unaccent(Notaria.provincia).ilike(
                func.unaccent(f"%{provincia_clean}%")
            )
        )

    if municipio:
        municipio_clean = municipio.strip()

        query = query.filter(
            func.unaccent(Notaria.municipio).ilike(
                func.unaccent(f"%{municipio_clean}%")
            )
        )

    if vc:
        vc_clean = vc.strip()

        query = query.filter(
            func.unaccent(Notaria.vc).ilike(
                func.unaccent(f"%{vc_clean}%")
            )
        )

    if apoderado:
        apoderado_clean = apoderado.strip()

        query = query.filter(
            func.unaccent(Notaria.apoderado).ilike(
                func.unaccent(f"%{apoderado_clean}%")
            )
        )

    if q:
        q_clean = q.strip()

        query = query.filter(
            or_(
                func.unaccent(Notaria.nombre).ilike(
                    func.unaccent(f"%{q_clean}%")
                ),
                func.unaccent(Notaria.apellidos).ilike(
                    func.unaccent(f"%{q_clean}%")
                ),
                func.unaccent(Notaria.codigo).ilike(
                    func.unaccent(f"%{q_clean}%")
                ),
                func.unaccent(Notaria.nif).ilike(
                    func.unaccent(f"%{q_clean}%")
                ),
            )
        )

    total = query.count()

    items = (
        query
        .order_by(Notaria.nombre.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                **NotariaResponse.from_orm(n).dict(),
                "distancia_km": distancia_km(
                    MOLSAN_LAT,
                    MOLSAN_LNG,
                    n.lat,
                    n.lng
                )
            }
            for n in items
        ]
    }


# =========================================================
# OBTENER NOTARÍA
# =========================================================

@router.get(
    "/notarias/{notaria_id}",
    response_model=NotariaResponse
)
def obtener(
    notaria_id: int,
    db: Session = Depends(get_db)
):
    try:
        notaria_id = int(
            str(notaria_id).strip()
        )
    except Exception:
        return None

    notaria = obtener_notaria(
        db,
        notaria_id
    )

    if notaria is None:
        return None

    return NotariaResponse.from_orm(
        notaria
    )


# =========================================================
# FIRMAS POR NOTARÍA
# =========================================================

@router.get(
    "/notarias/{notaria_id}/firmas"
)
def contar_firmas(
    notaria_id: int,
    db: Session = Depends(get_db)
):
    total = (
        db.query(Cita)
        .filter(
            Cita.notario_id == notaria_id
        )
        .count()
    )

    vc = (
        db.query(Cita)
        .filter(
            Cita.notario_id == notaria_id,
            Cita.tipo_cita == "VC"
        )
        .count()
    )

    presencial = (
        db.query(Cita)
        .filter(
            Cita.notario_id == notaria_id,
            Cita.tipo_cita == "P"
        )
        .count()
    )

    return {
        "notaria_id": notaria_id,
        "total_firmas": total,
        "total_vc": vc,
        "total_presencial": presencial
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.informes.service import (
    obtener_tabla,
    obtener_ranking,
    obtener_informe_individual,
)
from backend.app.informes.schemas import InformeFila, InformeIndividual


def _autorizar_informes(usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "informes", "ver")
    return usuario


router = APIRouter(
    prefix="/informes/apoderados",
    tags=["Informes"],
    dependencies=[Depends(get_current_user), Depends(_autorizar_informes)],
)


# ---------------------------------------------------------
# TABLA MENSUAL
# ---------------------------------------------------------
@router.get("/tabla", response_model=list[InformeFila])
def tabla_informes(mes: int, año: int, db: Session = Depends(get_db)):
    try:
        tabla = obtener_tabla(db, mes, año)
        return tabla
    except Exception as e:
        print("ERROR en /informes/apoderados/tabla:", e)
        raise HTTPException(500, "Error generando tabla de informes")


# ---------------------------------------------------------
# RANKING
# ---------------------------------------------------------
@router.get("/ranking", response_model=list[InformeFila])
def ranking_informes(mes: int, año: int, db: Session = Depends(get_db)):
    try:
        ranking = obtener_ranking(db, mes, año)
        return ranking
    except Exception as e:
        print("ERROR en /informes/apoderados/ranking:", e)
        raise HTTPException(500, "Error generando ranking")


# ---------------------------------------------------------
# INFORME INDIVIDUAL
# ---------------------------------------------------------
@router.get("/{apoderado_id}", response_model=InformeIndividual)
def informe_individual(apoderado_id: int, mes: int, año: int, db: Session = Depends(get_db)):
    try:
        informe = obtener_informe_individual(db, apoderado_id, mes, año)
        return informe
    except Exception as e:
        print("ERROR en /informes/apoderados/{id}:", e)
        raise HTTPException(500, "Error generando informe individual")

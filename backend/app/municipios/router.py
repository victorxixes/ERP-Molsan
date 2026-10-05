from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.municipios.models import Municipio
from backend.app.Utilidades.importadores.municipios_importer import (
    importar_municipios_desde_excel
)


router = APIRouter(
    prefix="/municipios",
    tags=["Municipios"]
)


# ============================================================
# IMPORTAR MUNICIPIOS
# ============================================================

@router.post("/importar")
async def importar_municipios(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    if not fichero.filename:
        raise HTTPException(
            status_code=400,
            detail="No se ha recibido ningún fichero."
        )


    nombre = fichero.filename.lower()

    if not (
        nombre.endswith(".xlsx") or
        nombre.endswith(".xls")
    ):

        raise HTTPException(
            status_code=400,
            detail="El fichero debe ser un Excel (.xlsx o .xls)."
        )


    contenido = await fichero.read()


    if not contenido:

        raise HTTPException(
            status_code=400,
            detail="El fichero está vacío."
        )


    try:

        resultado = importar_municipios_desde_excel(
            db,
            contenido
        )

        return {
            "ok": True,
            "mensaje": "Municipios importados correctamente.",
            **resultado
        }


    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Error importando municipios: {e}"
        )


# ============================================================
# LISTADO DE MUNICIPIOS
# ============================================================

@router.get("")
def listar_municipios(
    db: Session = Depends(get_db)
):

    municipios = (
        db.query(Municipio)
        .order_by(
            Municipio.ccaa,
            Municipio.provincia,
            Municipio.municipio
        )
        .all()
    )

    return [
        {
            "id": municipio.id,
            "ccaa": municipio.ccaa,
            "provincia": municipio.provincia,
            "municipio": municipio.municipio
        }
        for municipio in municipios
    ]

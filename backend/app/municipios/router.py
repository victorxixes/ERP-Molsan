from typing import List

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.municipios.models import Municipio
from backend.app.Utilidades.importadores.municipios_importer import (
    importar_excel_municipios,
)


# ============================================================
# ROUTER
# MOLSAN ERP
# ============================================================

router = APIRouter(
    prefix="/municipios",
    tags=["Municipios"],
)


# ============================================================
# SCHEMAS
# ============================================================

class MunicipioBase(BaseModel):

    ccaa: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    provincia: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    municipio: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )


class MunicipioCreate(MunicipioBase):
    pass


class MunicipioUpdate(MunicipioBase):
    pass


class MunicipioResponse(MunicipioBase):

    id: int
    activo: bool

    class Config:
        orm_mode = True
        from_attributes = True


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(valor: str) -> str:

    if valor is None:
        return ""

    return " ".join(
        str(valor).strip().split()
    )


# ============================================================
# GET /api/municipios
# ============================================================

@router.get(
    "",
    response_model=List[MunicipioResponse],
)
def listar_municipios(
    db: Session = Depends(get_db),
):

    municipios = (
        db.query(Municipio)
        .filter(
            Municipio.activo.is_(True)
        )
        .order_by(
            Municipio.ccaa.asc(),
            Municipio.provincia.asc(),
            Municipio.municipio.asc(),
        )
        .all()
    )

    return municipios


# ============================================================
# POST /api/municipios
# ============================================================

@router.post(
    "",
    response_model=MunicipioResponse,
)
def crear_municipio(
    datos: MunicipioCreate,
    db: Session = Depends(get_db),
):

    ccaa = limpiar_texto(
        datos.ccaa
    )

    provincia = limpiar_texto(
        datos.provincia
    )

    municipio_nombre = limpiar_texto(
        datos.municipio
    )

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not ccaa:

        raise HTTPException(
            status_code=400,
            detail="La comunidad autónoma es obligatoria.",
        )

    if not provincia:

        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria.",
        )

    if not municipio_nombre:

        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio.",
        )

    # --------------------------------------------------------
    # BUSCAR EXISTENTE
    # --------------------------------------------------------

    existente = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == municipio_nombre,
        )
        .first()
    )

    # --------------------------------------------------------
    # REACTIVAR SI EXISTÍA INACTIVO
    # --------------------------------------------------------

    if existente:

        if not existente.activo:

            existente.activo = True

            try:

                db.commit()

                db.refresh(
                    existente
                )

            except Exception as exc:

                db.rollback()

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "No se pudo reactivar el municipio: "
                        f"{exc}"
                    ),
                )

            return existente

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe un municipio con "
                "la misma comunidad autónoma, "
                "provincia y municipio."
            ),
        )

    # --------------------------------------------------------
    # CREAR
    # --------------------------------------------------------

    nuevo = Municipio(
        ccaa=ccaa,
        provincia=provincia,
        municipio=municipio_nombre,
        activo=True,
    )

    try:

        db.add(
            nuevo
        )

        db.commit()

        db.refresh(
            nuevo
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"No se pudo crear el municipio: {exc}"
            ),
        )

    return nuevo


# ============================================================
# POST /api/municipios/importar-excel
#
# IMPORTANTE:
# Esta ruta va antes de /{municipio_id}
# ============================================================

@router.post(
    "/importar-excel"
)
async def importar_municipios_excel(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    # ========================================================
    # VALIDAR NOMBRE DEL ARCHIVO
    # ========================================================

    nombre = (
        fichero.filename or ""
    ).strip().lower()

    if not (
        nombre.endswith(".xlsx")
        or nombre.endswith(".xls")
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "El archivo debe ser un Excel "
                "con extensión .xlsx o .xls."
            ),
        )

    # ========================================================
    # LEER ARCHIVO
    # ========================================================

    try:

        contenido = await fichero.read()

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                f"No se pudo leer el archivo: {exc}"
            ),
        )

    if not contenido:

        raise HTTPException(
            status_code=400,
            detail="El archivo Excel está vacío.",
        )

    # ========================================================
    # IMPORTAR
    # ========================================================

    try:

        resultado = importar_excel_municipios(
            contenido,
            db,
        )

        return resultado

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Error durante la importación: {exc}"
            ),
        )


# ============================================================
# PUT /api/municipios/{municipio_id}
# ============================================================

@router.put(
    "/{municipio_id}",
    response_model=MunicipioResponse,
)
def actualizar_municipio(
    municipio_id: int,
    datos: MunicipioUpdate,
    db: Session = Depends(get_db),
):

    municipio_actual = (
        db.query(Municipio)
        .filter(
            Municipio.id == municipio_id
        )
        .first()
    )

    if not municipio_actual:

        raise HTTPException(
            status_code=404,
            detail="Municipio no encontrado.",
        )

    ccaa = limpiar_texto(
        datos.ccaa
    )

    provincia = limpiar_texto(
        datos.provincia
    )

    municipio_nombre = limpiar_texto(
        datos.municipio
    )

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not ccaa:

        raise HTTPException(
            status_code=400,
            detail="La comunidad autónoma es obligatoria.",
        )

    if not provincia:

        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria.",
        )

    if not municipio_nombre:

        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio.",
        )

    # --------------------------------------------------------
    # DUPLICADO
    # --------------------------------------------------------

    duplicado = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == municipio_nombre,
            Municipio.id != municipio_id,
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro municipio con "
                "la misma comunidad autónoma, "
                "provincia y municipio."
            ),
        )

    # --------------------------------------------------------
    # ACTUALIZAR
    # --------------------------------------------------------

    municipio_actual.ccaa = ccaa
    municipio_actual.provincia = provincia
    municipio_actual.municipio = municipio_nombre
    municipio_actual.activo = True

    try:

        db.commit()

        db.refresh(
            municipio_actual
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"No se pudo actualizar el municipio: {exc}"
            ),
        )

    return municipio_actual


# ============================================================
# DELETE /api/municipios/{municipio_id}
# ============================================================

@router.delete(
    "/{municipio_id}"
)
def eliminar_municipio(
    municipio_id: int,
    db: Session = Depends(get_db),
):

    municipio = (
        db.query(Municipio)
        .filter(
            Municipio.id == municipio_id
        )
        .first()
    )

    if not municipio:

        raise HTTPException(
            status_code=404,
            detail="Municipio no encontrado.",
        )

    try:

        # ----------------------------------------------------
        # BORRADO LÓGICO
        # ----------------------------------------------------

        municipio.activo = False

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"No se pudo eliminar el municipio: {exc}"
            ),
        )

    return {
        "ok": True,
        "mensaje": "Municipio eliminado correctamente.",
    }

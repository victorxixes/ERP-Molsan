import re
from typing import List, Optional

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
from backend.app.municipios.models import Municipio, MunicipioCodigoPostal
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

    # Optional para que clientes antiguos no borren los CP al editar.
    codigos_postales: Optional[List[str]] = None
    codigo_postal_principal: Optional[str] = None


class MunicipioCreate(MunicipioBase):
    pass


class MunicipioUpdate(MunicipioBase):
    pass


class MunicipioResponse(MunicipioBase):

    id: int
    activo: bool
    codigos_postales: List[str] = Field(default_factory=list)
    codigo_postal_principal: Optional[str] = None

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


def validar_codigos_postales(valores, principal=None):
    """Normaliza códigos postales sin convertirlos a número."""
    codigos = []
    for valor in valores or []:
        cp = str(valor).strip()
        if not re.fullmatch(r"\\d{5}", cp):
            raise HTTPException(
                status_code=400,
                detail=f"El código postal '{cp}' debe contener exactamente 5 dígitos.",
            )
        if cp not in codigos:
            codigos.append(cp)
    cp_principal = str(principal).strip() if principal else (codigos[0] if codigos else None)
    if cp_principal and cp_principal not in codigos:
        raise HTTPException(
            status_code=400,
            detail="El código postal principal debe estar incluido en la lista de códigos postales.",
        )
    return codigos, cp_principal


def sincronizar_codigos_postales(municipio, valores, principal=None):
    codigos, cp_principal = validar_codigos_postales(valores, principal)
    existentes = {registro.codigo_postal: registro for registro in municipio.codigos_postales}
    for registro in list(municipio.codigos_postales):
        if registro.codigo_postal not in codigos:
            municipio.codigos_postales.remove(registro)
    for cp in codigos:
        registro = existentes.get(cp)
        if registro is None:
            registro = MunicipioCodigoPostal(codigo_postal=cp, principal=(cp == cp_principal))
            municipio.codigos_postales.append(registro)
        else:
            registro.principal = cp == cp_principal
    if not codigos:
        municipio.codigos_postales.clear()


def serializar_municipio(municipio):
    codigos = sorted(municipio.codigos_postales, key=lambda item: (not item.principal, item.codigo_postal))
    return {
        "id": municipio.id,
        "ccaa": municipio.ccaa,
        "provincia": municipio.provincia,
        "municipio": municipio.municipio,
        "activo": municipio.activo,
        "codigos_postales": [item.codigo_postal for item in codigos],
        "codigo_postal_principal": next((item.codigo_postal for item in codigos if item.principal), None),
    }


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

    return [
        {
            "id": municipio.id,
            "ccaa": municipio.ccaa,
            "provincia": municipio.provincia,
            "municipio": municipio.municipio,
            **serializar_municipio(municipio),
        }
        for municipio in municipios
    ]


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

            return serializar_municipio(existente)

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
        db.flush()
        if datos.codigos_postales is not None:
            sincronizar_codigos_postales(nuevo, datos.codigos_postales, datos.codigo_postal_principal)

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

    return serializar_municipio(nuevo)


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
    # Los clientes antiguos omiten estos campos; en ese caso se conservan los CP existentes.
    if datos.codigos_postales is not None:
        sincronizar_codigos_postales(
            municipio_actual,
            datos.codigos_postales,
            datos.codigo_postal_principal,
        )

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

    return serializar_municipio(municipio_actual)


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

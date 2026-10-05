from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException,
    Query,
)

from sqlalchemy.orm import Session
from sqlalchemy import or_

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
# IMPORTAR MUNICIPIOS DESDE EXCEL
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
        nombre.endswith(".xlsx")
        or
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
# LISTADO / BÚSQUEDA DE MUNICIPIOS
# ============================================================
#
# GET /api/municipios
#
# Parámetros:
#
#   buscar
#   ccaa
#   provincia
#   pagina
#   porPagina
#
# Ejemplo:
#
# /api/municipios?buscar=Amurrio
#
# /api/municipios?ccaa=País Vasco
#
# /api/municipios?ccaa=País Vasco&provincia=Araba/Álava
#
# ============================================================

@router.get("")
def listar_municipios(

    buscar: str | None = Query(
        default=None
    ),

    ccaa: str | None = Query(
        default=None
    ),

    provincia: str | None = Query(
        default=None
    ),

    pagina: int = Query(
        default=1,
        ge=1
    ),

    porPagina: int = Query(
        default=50,
        ge=1,
        le=200
    ),

    db: Session = Depends(get_db)

):

    query = db.query(Municipio)


    # ========================================================
    # BÚSQUEDA
    # ========================================================

    if buscar:

        texto = buscar.strip()

        if texto:

            patron = f"%{texto}%"

            query = query.filter(
                or_(
                    Municipio.ccaa.ilike(patron),
                    Municipio.provincia.ilike(patron),
                    Municipio.municipio.ilike(patron)
                )
            )


    # ========================================================
    # FILTRO CCAA
    # ========================================================

    if ccaa:

        ccaa_limpia = ccaa.strip()

        if ccaa_limpia:

            query = query.filter(
                Municipio.ccaa == ccaa_limpia
            )


    # ========================================================
    # FILTRO PROVINCIA
    # ========================================================

    if provincia:

        provincia_limpia = provincia.strip()

        if provincia_limpia:

            query = query.filter(
                Municipio.provincia == provincia_limpia
            )


    # ========================================================
    # TOTAL
    # ========================================================

    total = query.count()


    # ========================================================
    # PAGINACIÓN
    # ========================================================

    offset = (
        pagina - 1
    ) * porPagina


    municipios = (
        query
        .order_by(
            Municipio.ccaa,
            Municipio.provincia,
            Municipio.municipio
        )
        .offset(offset)
        .limit(porPagina)
        .all()
    )


    total_paginas = (
        (total + porPagina - 1)
        // porPagina
        if total > 0
        else 0
    )


    # ========================================================
    # RESPUESTA
    # ========================================================

    return {

        "items": [

            {
                "id": municipio.id,
                "ccaa": municipio.ccaa,
                "provincia": municipio.provincia,
                "municipio": municipio.municipio
            }

            for municipio in municipios

        ],

        "total": total,

        "pagina": pagina,

        "porPagina": porPagina,

        "totalPaginas": total_paginas

    }


# ============================================================
# OBTENER MUNICIPIO
# ============================================================

@router.get("/{municipio_id}")
def obtener_municipio(

    municipio_id: int,

    db: Session = Depends(get_db)

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
            detail="Municipio no encontrado."
        )


    return {

        "id": municipio.id,
        "ccaa": municipio.ccaa,
        "provincia": municipio.provincia,
        "municipio": municipio.municipio

    }


# ============================================================
# DAR DE ALTA MUNICIPIO
# ============================================================

@router.post("")
def crear_municipio(

    datos: dict,

    db: Session = Depends(get_db)

):

    ccaa = str(
        datos.get("ccaa", "")
    ).strip()

    provincia = str(
        datos.get("provincia", "")
    ).strip()

    municipio_nombre = str(
        datos.get("municipio", "")
    ).strip()


    # ========================================================
    # VALIDACIONES
    # ========================================================

    if not ccaa:

        raise HTTPException(
            status_code=400,
            detail="La CCAA es obligatoria."
        )


    if not provincia:

        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria."
        )


    if not municipio_nombre:

        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio."
        )


    # ========================================================
    # COMPROBAR DUPLICADO
    # ========================================================

    existente = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == municipio_nombre
        )
        .first()
    )


    if existente:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe este municipio para la "
                "CCAA y provincia indicadas."
            )
        )


    # ========================================================
    # CREAR
    # ========================================================

    nuevo = Municipio(

        ccaa=ccaa,

        provincia=provincia,

        municipio=municipio_nombre

    )


    try:

        db.add(nuevo)

        db.commit()

        db.refresh(nuevo)


    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo crear el municipio: {e}"
        )


    return {

        "ok": True,

        "mensaje": "Municipio creado correctamente.",

        "municipio": {

            "id": nuevo.id,

            "ccaa": nuevo.ccaa,

            "provincia": nuevo.provincia,

            "municipio": nuevo.municipio

        }

    }


# ============================================================
# EDITAR MUNICIPIO
# ============================================================

@router.put("/{municipio_id}")
def editar_municipio(

    municipio_id: int,

    datos: dict,

    db: Session = Depends(get_db)

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
            detail="Municipio no encontrado."
        )


    ccaa = str(
        datos.get(
            "ccaa",
            municipio.ccaa
        )
    ).strip()


    provincia = str(
        datos.get(
            "provincia",
            municipio.provincia
        )
    ).strip()


    municipio_nombre = str(
        datos.get(
            "municipio",
            municipio.municipio
        )
    ).strip()


    # ========================================================
    # VALIDACIONES
    # ========================================================

    if not ccaa:

        raise HTTPException(
            status_code=400,
            detail="La CCAA es obligatoria."
        )


    if not provincia:

        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria."
        )


    if not municipio_nombre:

        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio."
        )


    # ========================================================
    # COMPROBAR DUPLICADO
    # ========================================================

    duplicado = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == municipio_nombre,
            Municipio.id != municipio_id
        )
        .first()
    )


    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro municipio con esos "
                "mismos datos."
            )
        )


    # ========================================================
    # ACTUALIZAR
    # ========================================================

    municipio.ccaa = ccaa

    municipio.provincia = provincia

    municipio.municipio = municipio_nombre


    try:

        db.commit()

        db.refresh(municipio)


    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo editar el municipio: {e}"
        )


    return {

        "ok": True,

        "mensaje": "Municipio actualizado correctamente.",

        "municipio": {

            "id": municipio.id,

            "ccaa": municipio.ccaa,

            "provincia": municipio.provincia,

            "municipio": municipio.municipio

        }

    }


# ============================================================
# ELIMINAR MUNICIPIO
# ============================================================

@router.delete("/{municipio_id}")
def eliminar_municipio(

    municipio_id: int,

    db: Session = Depends(get_db)

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
            detail="Municipio no encontrado."
        )


    try:

        db.delete(municipio)

        db.commit()


    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo eliminar el municipio: {e}"
        )


    return {

        "ok": True,

        "mensaje": "Municipio eliminado correctamente.",

        "id": municipio_id

    }

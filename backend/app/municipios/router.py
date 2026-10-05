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


# ============================================================
# ROUTER
# ============================================================

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
    """
    Importa municipios desde un fichero Excel.

    Columnas esperadas:

        CCAA
        PROVINCIA
        MUNICIPIO
    """

    if not fichero.filename:
        raise HTTPException(
            status_code=400,
            detail="No se ha recibido ningún fichero."
        )

    nombre = fichero.filename.lower()

    if not (
        nombre.endswith(".xlsx")
        or nombre.endswith(".xls")
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
    buscar: str | None = Query(
        default=None,
        description="Texto para buscar por CCAA, provincia o municipio."
    ),
    ccaa: str | None = Query(
        default=None,
        description="Filtrar por comunidad autónoma."
    ),
    provincia: str | None = Query(
        default=None,
        description="Filtrar por provincia."
    ),
    db: Session = Depends(get_db)
):
    """
    Devuelve el listado de municipios.

    Permite:

    - búsqueda general
    - filtro por CCAA
    - filtro por provincia
    """

    query = db.query(Municipio)

    # --------------------------------------------------------
    # BÚSQUEDA GENERAL
    # --------------------------------------------------------

    if buscar and buscar.strip():

        texto = f"%{buscar.strip()}%"

        query = query.filter(
            or_(
                Municipio.ccaa.ilike(texto),
                Municipio.provincia.ilike(texto),
                Municipio.municipio.ilike(texto)
            )
        )

    # --------------------------------------------------------
    # FILTRO CCAA
    # --------------------------------------------------------

    if ccaa and ccaa.strip():

        query = query.filter(
            Municipio.ccaa == ccaa.strip()
        )

    # --------------------------------------------------------
    # FILTRO PROVINCIA
    # --------------------------------------------------------

    if provincia and provincia.strip():

        query = query.filter(
            Municipio.provincia == provincia.strip()
        )

    # --------------------------------------------------------
    # ORDEN
    # --------------------------------------------------------

    municipios = (
        query
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
            "municipio": municipio.municipio,
        }
        for municipio in municipios
    ]


# ============================================================
# OBTENER MUNICIPIO
# ============================================================

@router.get("/{municipio_id}")
def obtener_municipio(
    municipio_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene un municipio concreto por ID.
    """

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
        "municipio": municipio.municipio,
    }


# ============================================================
# CREAR MUNICIPIO
# ============================================================

@router.post("")
def crear_municipio(
    datos: dict,
    db: Session = Depends(get_db)
):
    """
    Crea un municipio manualmente.

    Campos:

        ccaa
        provincia
        municipio
    """

    ccaa = str(
        datos.get("ccaa", "")
    ).strip()

    provincia = str(
        datos.get("provincia", "")
    ).strip()

    nombre_municipio = str(
        datos.get("municipio", "")
    ).strip()

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not ccaa:
        raise HTTPException(
            status_code=400,
            detail="La comunidad autónoma es obligatoria."
        )

    if not provincia:
        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria."
        )

    if not nombre_municipio:
        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio."
        )

    # --------------------------------------------------------
    # COMPROBAR DUPLICADO
    # --------------------------------------------------------

    existente = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == nombre_municipio
        )
        .first()
    )

    if existente:

        raise HTTPException(
            status_code=409,
            detail="Ese municipio ya existe."
        )

    # --------------------------------------------------------
    # CREAR
    # --------------------------------------------------------

    nuevo = Municipio(
        ccaa=ccaa,
        provincia=provincia,
        municipio=nombre_municipio
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
            "municipio": nuevo.municipio,
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
    """
    Edita un municipio existente.
    """

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

    # --------------------------------------------------------
    # NUEVOS VALORES
    # --------------------------------------------------------

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

    nombre_municipio = str(
        datos.get(
            "municipio",
            municipio.municipio
        )
    ).strip()

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not ccaa:
        raise HTTPException(
            status_code=400,
            detail="La comunidad autónoma es obligatoria."
        )

    if not provincia:
        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria."
        )

    if not nombre_municipio:
        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio."
        )

    # --------------------------------------------------------
    # COMPROBAR DUPLICADO
    # --------------------------------------------------------

    duplicado = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == nombre_municipio,
            Municipio.id != municipio_id
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail="Ya existe otro municipio con esos mismos datos."
        )

    # --------------------------------------------------------
    # ACTUALIZAR
    # --------------------------------------------------------

    municipio.ccaa = ccaa
    municipio.provincia = provincia
    municipio.municipio = nombre_municipio

    try:

        db.commit()
        db.refresh(municipio)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"No se pudo actualizar el municipio: {e}"
        )

    return {
        "ok": True,
        "mensaje": "Municipio actualizado correctamente.",
        "municipio": {
            "id": municipio.id,
            "ccaa": municipio.ccaa,
            "provincia": municipio.provincia,
            "municipio": municipio.municipio,
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
    """
    Elimina un municipio por ID.
    """

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


# ============================================================
# LISTAR COMUNIDADES AUTÓNOMAS
# ============================================================

@router.get("/catalogos/ccaa")
def listar_ccaa(
    db: Session = Depends(get_db)
):
    """
    Devuelve las comunidades autónomas disponibles.
    """

    resultados = (
        db.query(Municipio.ccaa)
        .distinct()
        .order_by(Municipio.ccaa)
        .all()
    )

    return [
        fila[0]
        for fila in resultados
        if fila[0]
    ]


# ============================================================
# LISTAR PROVINCIAS
# ============================================================

@router.get("/catalogos/provincias")
def listar_provincias(
    ccaa: str | None = Query(
        default=None
    ),
    db: Session = Depends(get_db)
):
    """
    Devuelve las provincias disponibles.

    Si se proporciona CCAA,
    devuelve solamente sus provincias.
    """

    query = db.query(
        Municipio.provincia
    )

    if ccaa and ccaa.strip():

        query = query.filter(
            Municipio.ccaa == ccaa.strip()
        )

    resultados = (
        query
        .distinct()
        .order_by(Municipio.provincia)
        .all()
    )

    return [
        fila[0]
        for fila in resultados
        if fila[0]
    ]

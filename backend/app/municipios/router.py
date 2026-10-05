from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Depends,
    HTTPException,
    Query,
)

from sqlalchemy.orm import Session
from sqlalchemy import func

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
# UTILIDADES INTERNAS
# ============================================================

def normalizar_texto(valor: str | None) -> str:
    """
    Normaliza textos recibidos desde frontend/API.
    """

    if valor is None:
        return ""

    return str(valor).strip()


def municipio_to_dict(municipio: Municipio):
    """
    Convierte un Municipio SQLAlchemy en un objeto JSON.
    """

    return {
        "id": municipio.id,
        "ccaa": municipio.ccaa,
        "provincia": municipio.provincia,
        "municipio": municipio.municipio,
    }


# ============================================================
# IMPORTAR MUNICIPIOS
# ============================================================

@router.post("/importar")
async def importar_municipios(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importa municipios desde un Excel.

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
    pagina: int = Query(
        1,
        ge=1,
        description="Número de página."
    ),

    porPagina: int = Query(
        50,
        ge=1,
        le=500,
        description="Municipios por página."
    ),

    buscar: str | None = Query(
        None,
        description=(
            "Texto de búsqueda en municipio, "
            "provincia o CCAA."
        )
    ),

    ccaa: str | None = Query(
        None,
        description="Filtrar por comunidad autónoma."
    ),

    provincia: str | None = Query(
        None,
        description="Filtrar por provincia."
    ),

    db: Session = Depends(get_db)
):
    """
    Listado paginado de municipios.

    Permite:

    - búsqueda general
    - filtro por CCAA
    - filtro por provincia
    - paginación
    """

    query = db.query(Municipio)

    # ========================================================
    # BÚSQUEDA GENERAL
    # ========================================================

    if buscar and buscar.strip():

        texto = f"%{buscar.strip()}%"

        query = query.filter(
            (Municipio.municipio.ilike(texto))
            | (Municipio.provincia.ilike(texto))
            | (Municipio.ccaa.ilike(texto))
        )

    # ========================================================
    # FILTRO CCAA
    # ========================================================

    if ccaa and ccaa.strip():

        query = query.filter(
            Municipio.ccaa.ilike(
                f"%{ccaa.strip()}%"
            )
        )

    # ========================================================
    # FILTRO PROVINCIA
    # ========================================================

    if provincia and provincia.strip():

        query = query.filter(
            Municipio.provincia.ilike(
                f"%{provincia.strip()}%"
            )
        )

    # ========================================================
    # TOTAL
    # ========================================================

    total = query.with_entities(
        func.count(Municipio.id)
    ).scalar() or 0

    # ========================================================
    # PAGINACIÓN
    # ========================================================

    offset = (
        pagina - 1
    ) * porPagina

    municipios = (
        query
        .order_by(
            Municipio.ccaa.asc(),
            Municipio.provincia.asc(),
            Municipio.municipio.asc()
        )
        .offset(offset)
        .limit(porPagina)
        .all()
    )

    # ========================================================
    # RESPUESTA
    # ========================================================

    return {
        "items": [
            municipio_to_dict(municipio)
            for municipio in municipios
        ],
        "total": total,
        "pagina": pagina,
        "porPagina": porPagina,
        "totalPaginas": (
            (total + porPagina - 1)
            // porPagina
            if total > 0
            else 0
        ),
    }


# ============================================================
# OBTENER MUNICIPIO POR ID
# ============================================================

@router.get("/{municipio_id}")
def obtener_municipio(
    municipio_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtiene un municipio concreto por su ID.
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

    return municipio_to_dict(municipio)


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

    Body esperado:

    {
        "ccaa": "País Vasco",
        "provincia": "Araba/Álava",
        "municipio": "Amurrio"
    }
    """

    ccaa = normalizar_texto(
        datos.get("ccaa")
    )

    provincia = normalizar_texto(
        datos.get("provincia")
    )

    municipio_nombre = normalizar_texto(
        datos.get("municipio")
    )

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
                "El municipio ya existe para "
                "esa CCAA y provincia."
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
            detail=(
                "No se pudo crear el municipio: "
                f"{e}"
            )
        )

    return {
        "ok": True,
        "mensaje": "Municipio creado correctamente.",
        "municipio": municipio_to_dict(nuevo)
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

    Body esperado:

    {
        "ccaa": "País Vasco",
        "provincia": "Araba/Álava",
        "municipio": "Amurrio"
    }

    Se pueden enviar los campos que se quieran modificar.
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

    # ========================================================
    # VALORES ACTUALES
    # ========================================================

    nueva_ccaa = (
        normalizar_texto(datos["ccaa"])
        if "ccaa" in datos
        else municipio.ccaa
    )

    nueva_provincia = (
        normalizar_texto(datos["provincia"])
        if "provincia" in datos
        else municipio.provincia
    )

    nuevo_municipio = (
        normalizar_texto(datos["municipio"])
        if "municipio" in datos
        else municipio.municipio
    )

    # ========================================================
    # VALIDACIONES
    # ========================================================

    if not nueva_ccaa:
        raise HTTPException(
            status_code=400,
            detail="La CCAA no puede estar vacía."
        )

    if not nueva_provincia:
        raise HTTPException(
            status_code=400,
            detail="La provincia no puede estar vacía."
        )

    if not nuevo_municipio:
        raise HTTPException(
            status_code=400,
            detail="El municipio no puede estar vacío."
        )

    # ========================================================
    # COMPROBAR DUPLICADO
    # ========================================================

    duplicado = (
        db.query(Municipio)
        .filter(
            Municipio.id != municipio_id,
            Municipio.ccaa == nueva_ccaa,
            Municipio.provincia == nueva_provincia,
            Municipio.municipio == nuevo_municipio
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro municipio "
                "con esos mismos datos."
            )
        )

    # ========================================================
    # ACTUALIZAR
    # ========================================================

    municipio.ccaa = nueva_ccaa
    municipio.provincia = nueva_provincia
    municipio.municipio = nuevo_municipio

    try:

        db.commit()
        db.refresh(municipio)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo actualizar el municipio: "
                f"{e}"
            )
        )

    return {
        "ok": True,
        "mensaje": "Municipio actualizado correctamente.",
        "municipio": municipio_to_dict(municipio)
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
            detail=(
                "No se pudo eliminar el municipio: "
                f"{e}"
            )
        )

    return {
        "ok": True,
        "mensaje": "Municipio eliminado correctamente.",
        "id": municipio_id
    }

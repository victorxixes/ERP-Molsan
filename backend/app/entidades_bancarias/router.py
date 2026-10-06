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
from backend.app.entidades_bancarias.models import (
    EntidadBancaria,
)
from backend.app.Utilidades.importadores.entidades_bancarias_importer import (
    importar_excel_entidades_bancarias,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/entidades-bancarias",
    tags=["Entidades Bancarias"],
)


# ============================================================
# SCHEMAS
# ============================================================

class EntidadBancariaBase(BaseModel):

    codigo_europeo: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    lei: str | None = Field(
        default=None,
        max_length=50,
    )

    nombre: str = Field(
        ...,
        min_length=1,
        max_length=250,
    )

    categoria: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    direccion: str | None = Field(
        default=None,
        max_length=400,
    )


class EntidadBancariaCreate(
    EntidadBancariaBase
):
    pass


class EntidadBancariaUpdate(
    EntidadBancariaBase
):
    pass


class EntidadBancariaResponse(
    EntidadBancariaBase
):

    id: int
    activo: bool

    class Config:
        orm_mode = True
        from_attributes = True


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def limpiar_texto(valor):

    if valor is None:
        return ""

    return " ".join(
        str(valor).strip().split()
    )


def limpiar_opcional(valor):

    texto = limpiar_texto(
        valor
    )

    return texto or None


# ============================================================
# GET /api/entidades-bancarias
# ============================================================

@router.get(
    "",
    response_model=List[
        EntidadBancariaResponse
    ],
)
def listar_entidades_bancarias(
    db: Session = Depends(get_db),
):

    registros = (
        db.query(
            EntidadBancaria
        )
        .filter(
            EntidadBancaria.activo.is_(True)
        )
        .order_by(
            EntidadBancaria.nombre.asc(),
            EntidadBancaria.codigo_europeo.asc(),
        )
        .all()
    )

    return [
        {
            "id": registro.id,
            "codigo_europeo": (
                registro.codigo_europeo
            ),
            "lei": registro.lei,
            "nombre": registro.nombre,
            "categoria": registro.categoria,
            "direccion": registro.direccion,
            "activo": registro.activo,
        }
        for registro in registros
    ]


# ============================================================
# POST /api/entidades-bancarias
# ============================================================

@router.post(
    "",
    response_model=EntidadBancariaResponse,
)
def crear_entidad_bancaria(
    datos: EntidadBancariaCreate,
    db: Session = Depends(get_db),
):

    codigo = limpiar_texto(
        datos.codigo_europeo
    )

    lei = limpiar_opcional(
        datos.lei
    )

    nombre = limpiar_texto(
        datos.nombre
    )

    categoria = limpiar_texto(
        datos.categoria
    )

    direccion = limpiar_opcional(
        datos.direccion
    )

    # --------------------------------------------------------
    # BUSCAR EXISTENTE
    # --------------------------------------------------------

    existente = (
        db.query(
            EntidadBancaria
        )
        .filter(
            EntidadBancaria.codigo_europeo
            == codigo
        )
        .first()
    )

    # --------------------------------------------------------
    # REACTIVAR SI ESTABA INACTIVA
    # --------------------------------------------------------

    if existente:

        if not existente.activo:

            existente.activo = True
            existente.lei = lei
            existente.nombre = nombre
            existente.categoria = categoria
            existente.direccion = direccion

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
                        "No se pudo reactivar "
                        f"la entidad bancaria: {exc}"
                    ),
                )

            return existente

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una entidad bancaria "
                "con ese Código Europeo."
            ),
        )

    # --------------------------------------------------------
    # CREAR
    # --------------------------------------------------------

    nueva = EntidadBancaria(
        codigo_europeo=codigo,
        lei=lei,
        nombre=nombre,
        categoria=categoria,
        direccion=direccion,
        activo=True,
    )

    try:

        db.add(
            nueva
        )

        db.commit()

        db.refresh(
            nueva
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo crear la entidad bancaria: "
                f"{exc}"
            ),
        )

    return nueva


# ============================================================
# POST /api/entidades-bancarias/importar-excel
# ============================================================

@router.post(
    "/importar-excel"
)
async def importar_entidades_bancarias_excel(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    nombre_archivo = (
        fichero.filename or ""
    ).strip().lower()

    if not (
        nombre_archivo.endswith(".xlsx")
        or nombre_archivo.endswith(".xls")
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "El archivo debe ser un Excel "
                ".xlsx o .xls."
            ),
        )

    # --------------------------------------------------------
    # LEER ARCHIVO
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # IMPORTAR
    # --------------------------------------------------------

    try:

        return importar_excel_entidades_bancarias(
            contenido,
            db,
        )

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
                "Error durante la importación: "
                f"{exc}"
            ),
        )


# ============================================================
# PUT /api/entidades-bancarias/{entidad_id}
# ============================================================

@router.put(
    "/{entidad_id}",
    response_model=EntidadBancariaResponse,
)
def actualizar_entidad_bancaria(
    entidad_id: int,
    datos: EntidadBancariaUpdate,
    db: Session = Depends(get_db),
):

    entidad = (
        db.query(
            EntidadBancaria
        )
        .filter(
            EntidadBancaria.id
            == entidad_id
        )
        .first()
    )

    if not entidad:

        raise HTTPException(
            status_code=404,
            detail=(
                "Entidad bancaria no encontrada."
            ),
        )

    codigo = limpiar_texto(
        datos.codigo_europeo
    )

    lei = limpiar_opcional(
        datos.lei
    )

    nombre = limpiar_texto(
        datos.nombre
    )

    categoria = limpiar_texto(
        datos.categoria
    )

    direccion = limpiar_opcional(
        datos.direccion
    )

    # --------------------------------------------------------
    # DUPLICADO
    # --------------------------------------------------------

    duplicado = (
        db.query(
            EntidadBancaria
        )
        .filter(
            EntidadBancaria.codigo_europeo
            == codigo,
            EntidadBancaria.id
            != entidad_id,
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otra entidad bancaria "
                "con ese Código Europeo."
            ),
        )

    # --------------------------------------------------------
    # ACTUALIZAR
    # --------------------------------------------------------

    entidad.codigo_europeo = codigo
    entidad.lei = lei
    entidad.nombre = nombre
    entidad.categoria = categoria
    entidad.direccion = direccion
    entidad.activo = True

    try:

        db.commit()

        db.refresh(
            entidad
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo actualizar la entidad bancaria: "
                f"{exc}"
            ),
        )

    return entidad


# ============================================================
# DELETE /api/entidades-bancarias/{entidad_id}
# ============================================================

@router.delete(
    "/{entidad_id}"
)
def eliminar_entidad_bancaria(
    entidad_id: int,
    db: Session = Depends(get_db),
):

    entidad = (
        db.query(
            EntidadBancaria
        )
        .filter(
            EntidadBancaria.id
            == entidad_id
        )
        .first()
    )

    if not entidad:

        raise HTTPException(
            status_code=404,
            detail=(
                "Entidad bancaria no encontrada."
            ),
        )

    try:

        entidad.activo = False

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo eliminar la entidad bancaria: "
                f"{exc}"
            ),
        )

    return {
        "ok": True,
        "mensaje": (
            "Entidad bancaria eliminada correctamente."
        ),
    }

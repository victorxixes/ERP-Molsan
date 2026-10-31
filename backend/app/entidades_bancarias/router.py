from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, aliased

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.uploads import MAX_EXCEL_UPLOAD_BYTES, read_upload_limited
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
    dependencies=[Depends(get_current_user)],
    prefix="/entidades-bancarias",
    tags=["Entidades Bancarias"],
)


# ============================================================
# SCHEMAS
# ============================================================

class EntidadBancariaBase(BaseModel):

    codigo_europeo: Optional[str] = Field(
        None,
        max_length=50,
    )

    lei: Optional[str] = Field(
        None,
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

    direccion: Optional[str] = Field(
        None,
        max_length=400,
    )

    entidad_actual_id: Optional[int] = None


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
    entidad_actual: Optional[str] = None

    class Config:
        orm_mode = True


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


def entidad_a_dict(
    entidad: EntidadBancaria,
):

    return {
        "id": entidad.id,
        "codigo_europeo": entidad.codigo_europeo,
        "lei": entidad.lei,
        "nombre": entidad.nombre,
        "categoria": entidad.categoria,
        "direccion": entidad.direccion,
        "entidad_actual_id": entidad.entidad_actual_id,
        "activo": entidad.activo,
    }


from backend.app.entidades_bancarias.sincronizar_catalogo_historico import sincronizar_catalogo_historico_caixabank

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

    EntidadActual = aliased(EntidadBancaria)
    registros = (
        db.query(
            EntidadBancaria,
            EntidadActual.nombre.label("entidad_actual"),
        )
        .outerjoin(
            EntidadActual,
            EntidadBancaria.entidad_actual_id == EntidadActual.id,
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
            **entidad_a_dict(registro),
            "entidad_actual": entidad_actual,
        }
        for registro, entidad_actual in registros
    ]


# ============================================================
# GET /api/entidades-bancarias/auditoria-sucesiones
# Devuelve el catálogo completo con el sucesor asociado, si existe.
# Facilita detectar nombres históricos que aún requieren revisión.
# ============================================================

@router.get("/auditoria-sucesiones")
def auditar_sucesiones_entidades_bancarias(
    db: Session = Depends(get_db),
):
    EntidadActual = aliased(EntidadBancaria)
    registros = (
        db.query(
            EntidadBancaria,
            EntidadActual.nombre.label("entidad_actual"),
        )
        .outerjoin(
            EntidadActual,
            EntidadBancaria.entidad_actual_id == EntidadActual.id,
        )
        .filter(EntidadBancaria.activo.is_(True))
        .order_by(EntidadBancaria.nombre.asc())
        .all()
    )

    return [
        {
            "id": entidad.id,
            "nombre": entidad.nombre,
            "categoria": entidad.categoria,
            "entidad_actual_id": entidad.entidad_actual_id,
            "entidad_actual": entidad_actual,
            "pendiente_revision": entidad.entidad_actual_id is None,
        }
        for entidad, entidad_actual in registros
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

    codigo = limpiar_opcional(
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

    entidad_actual_id = datos.entidad_actual_id or None
    if entidad_actual_id and not db.query(EntidadBancaria.id).filter(EntidadBancaria.id == entidad_actual_id, EntidadBancaria.activo.is_(True)).first():
        raise HTTPException(status_code=400, detail="La entidad actual seleccionada no existe o está inactiva.")

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio.",
        )

    if not categoria:

        raise HTTPException(
            status_code=400,
            detail="La categoría es obligatoria.",
        )

    # --------------------------------------------------------
    # BUSCAR EXISTENTE
    # --------------------------------------------------------

    existente = None
    if codigo:
        existente = (
            db.query(EntidadBancaria)
            .filter(EntidadBancaria.codigo_europeo == codigo)
            .first()
        )

    # --------------------------------------------------------
    # REACTIVAR
    # --------------------------------------------------------

    if existente:

        if not existente.activo:

            existente.activo = True
            existente.lei = lei
            existente.nombre = nombre
            existente.categoria = categoria
            existente.direccion = direccion
            existente.entidad_actual_id = entidad_actual_id

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

            return entidad_a_dict(
                existente
            )

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
        entidad_actual_id=entidad_actual_id,
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

    return entidad_a_dict(
        nueva
    )


# ============================================================
# POST /api/entidades-bancarias/importar-excel
#
# IMPORTANTE:
# Esta ruta se declara antes de /{entidad_id}
# ============================================================

@router.post(
    "/importar-excel"
)
async def importar_entidades_bancarias_excel(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # NOMBRE
    # --------------------------------------------------------

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
    # LEER
    # --------------------------------------------------------

    try:

        contenido = await read_upload_limited(
            fichero,
            MAX_EXCEL_UPLOAD_BYTES,
            "Excel de importación",
        )

    except HTTPException:
        raise
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

        resultado = (
            importar_excel_entidades_bancarias(
                contenido,
                db,
            )
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

    # El Código Europeo es opcional, especialmente para entidades históricas.
    # Normalizar vacío a None evita guardar "" y colisionar con la restricción UNIQUE.
    codigo = limpiar_opcional(
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

    entidad_actual_id = datos.entidad_actual_id or None
    if entidad_actual_id == entidad_id:
        raise HTTPException(status_code=400, detail="Una entidad no puede ser su propia entidad actual.")
    if entidad_actual_id and not db.query(EntidadBancaria.id).filter(EntidadBancaria.id == entidad_actual_id, EntidadBancaria.activo.is_(True)).first():
        raise HTTPException(status_code=400, detail="La entidad actual seleccionada no existe o está inactiva.")

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio.",
        )

    if not categoria:

        raise HTTPException(
            status_code=400,
            detail="La categoría es obligatoria.",
        )

    # --------------------------------------------------------
    # DUPLICADO
    # --------------------------------------------------------

    duplicado = None
    if codigo:
        duplicado = (
            db.query(EntidadBancaria)
            .filter(
                EntidadBancaria.codigo_europeo == codigo,
                EntidadBancaria.id != entidad_id,
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
    entidad.entidad_actual_id = entidad_actual_id
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

    return entidad_a_dict(
        entidad
    )


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


@router.on_event("startup")
def cargar_catalogo_historico_caixabank_al_arrancar():
    """Carga el listado histórico solicitado después de las migraciones del esquema."""
    sincronizar_catalogo_historico_caixabank()

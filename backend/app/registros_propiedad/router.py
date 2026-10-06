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
from backend.app.registros_propiedad.models import (
    RegistroPropiedad,
)
from backend.app.Utilidades.importadores.registros_propiedad_importer import (
    importar_excel_registros_propiedad,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/registros-propiedad",
    tags=["Registros de la Propiedad"],
)


# ============================================================
# SCHEMAS
# ============================================================

class RegistroPropiedadBase(BaseModel):

    registro_propiedad: str = Field(
        ...,
        min_length=1,
        max_length=250,
    )

    nombre_registrador: Optional[str] = Field(
        None,
        max_length=250,
    )

    direccion: Optional[str] = Field(
        None,
        max_length=400,
    )

    codigo_postal: Optional[str] = Field(
        None,
        max_length=10,
    )

    poblacion: Optional[str] = Field(
        None,
        max_length=150,
    )

    provincia: Optional[str] = Field(
        None,
        max_length=150,
    )

    telefono: Optional[str] = Field(
        None,
        max_length=50,
    )

    telefono_2: Optional[str] = Field(
        None,
        max_length=50,
    )

    fax: Optional[str] = Field(
        None,
        max_length=50,
    )

    whatsapp: Optional[str] = Field(
        None,
        max_length=50,
    )

    email_1: Optional[str] = Field(
        None,
        max_length=250,
    )

    email_2: Optional[str] = Field(
        None,
        max_length=250,
    )

    iban: Optional[str] = Field(
        None,
        max_length=100,
    )

    comentarios: Optional[str] = None

    tiene_of_liq: bool = False


class RegistroPropiedadCreate(
    RegistroPropiedadBase
):
    pass


class RegistroPropiedadUpdate(
    RegistroPropiedadBase
):
    pass


class RegistroPropiedadResponse(
    RegistroPropiedadBase
):

    id: int
    activo: bool

    class Config:
        orm_mode = True


# ============================================================
# AUXILIARES
# ============================================================

def limpiar_texto(
    valor,
):

    if valor is None:
        return ""

    return " ".join(
        str(valor).strip().split()
    )


def limpiar_opcional(
    valor,
):

    texto = limpiar_texto(
        valor
    )

    return texto or None


def registro_a_dict(
    registro: RegistroPropiedad,
):

    return {

        "id":
            registro.id,

        "registro_propiedad":
            registro.registro_propiedad,

        "nombre_registrador":
            registro.nombre_registrador,

        "direccion":
            registro.direccion,

        "codigo_postal":
            registro.codigo_postal,

        "poblacion":
            registro.poblacion,

        "provincia":
            registro.provincia,

        "telefono":
            registro.telefono,

        "telefono_2":
            registro.telefono_2,

        "fax":
            registro.fax,

        "whatsapp":
            registro.whatsapp,

        "email_1":
            registro.email_1,

        "email_2":
            registro.email_2,

        "iban":
            registro.iban,

        "comentarios":
            registro.comentarios,

        "tiene_of_liq":
            registro.tiene_of_liq,

        "activo":
            registro.activo,
    }


# ============================================================
# GET /api/registros-propiedad
# ============================================================

@router.get(
    "",
    response_model=List[
        RegistroPropiedadResponse
    ],
)
def listar_registros_propiedad(
    db: Session = Depends(get_db),
):

    registros = (
        db.query(
            RegistroPropiedad
        )
        .filter(
            RegistroPropiedad.activo.is_(True)
        )
        .order_by(
            RegistroPropiedad.provincia.asc(),
            RegistroPropiedad.poblacion.asc(),
            RegistroPropiedad.registro_propiedad.asc(),
        )
        .all()
    )

    return [
        registro_a_dict(
            registro
        )
        for registro in registros
    ]


# ============================================================
# POST /api/registros-propiedad
# ============================================================

@router.post(
    "",
    response_model=RegistroPropiedadResponse,
)
def crear_registro_propiedad(
    datos: RegistroPropiedadCreate,
    db: Session = Depends(get_db),
):

    nombre = limpiar_texto(
        datos.registro_propiedad
    )

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail=(
                "El Registro de la Propiedad "
                "es obligatorio."
            ),
        )

    existente = (
        db.query(
            RegistroPropiedad
        )
        .filter(
            RegistroPropiedad.registro_propiedad
            == nombre
        )
        .first()
    )

    if existente:

        if not existente.activo:

            existente.activo = True
            existente.nombre_registrador = (
                limpiar_opcional(
                    datos.nombre_registrador
                )
            )
            existente.direccion = (
                limpiar_opcional(
                    datos.direccion
                )
            )
            existente.codigo_postal = (
                limpiar_opcional(
                    datos.codigo_postal
                )
            )
            existente.poblacion = (
                limpiar_opcional(
                    datos.poblacion
                )
            )
            existente.provincia = (
                limpiar_opcional(
                    datos.provincia
                )
            )
            existente.telefono = (
                limpiar_opcional(
                    datos.telefono
                )
            )
            existente.telefono_2 = (
                limpiar_opcional(
                    datos.telefono_2
                )
            )
            existente.fax = (
                limpiar_opcional(
                    datos.fax
                )
            )
            existente.whatsapp = (
                limpiar_opcional(
                    datos.whatsapp
                )
            )
            existente.email_1 = (
                limpiar_opcional(
                    datos.email_1
                )
            )
            existente.email_2 = (
                limpiar_opcional(
                    datos.email_2
                )
            )
            existente.iban = (
                limpiar_opcional(
                    datos.iban
                )
            )
            existente.comentarios = (
                limpiar_opcional(
                    datos.comentarios
                )
            )
            existente.tiene_of_liq = (
                datos.tiene_of_liq
            )

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
                        f"el registro: {exc}"
                    ),
                )

            return registro_a_dict(
                existente
            )

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe un Registro de la Propiedad "
                "con ese nombre."
            ),
        )

    nuevo = RegistroPropiedad(
        registro_propiedad=nombre,
        nombre_registrador=(
            limpiar_opcional(
                datos.nombre_registrador
            )
        ),
        direccion=(
            limpiar_opcional(
                datos.direccion
            )
        ),
        codigo_postal=(
            limpiar_opcional(
                datos.codigo_postal
            )
        ),
        poblacion=(
            limpiar_opcional(
                datos.poblacion
            )
        ),
        provincia=(
            limpiar_opcional(
                datos.provincia
            )
        ),
        telefono=(
            limpiar_opcional(
                datos.telefono
            )
        ),
        telefono_2=(
            limpiar_opcional(
                datos.telefono_2
            )
        ),
        fax=(
            limpiar_opcional(
                datos.fax
            )
        ),
        whatsapp=(
            limpiar_opcional(
                datos.whatsapp
            )
        ),
        email_1=(
            limpiar_opcional(
                datos.email_1
            )
        ),
        email_2=(
            limpiar_opcional(
                datos.email_2
            )
        ),
        iban=(
            limpiar_opcional(
                datos.iban
            )
        ),
        comentarios=(
            limpiar_opcional(
                datos.comentarios
            )
        ),
        tiene_of_liq=(
            datos.tiene_of_liq
        ),
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
                "No se pudo crear el registro: "
                f"{exc}"
            ),
        )

    return registro_a_dict(
        nuevo
    )


# ============================================================
# POST /api/registros-propiedad/importar-excel
# ============================================================

@router.post(
    "/importar-excel"
)
async def importar_registros_propiedad_excel(
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
            detail=(
                "El archivo Excel está vacío."
            ),
        )

    try:

        return (
            importar_excel_registros_propiedad(
                contenido,
                db,
            )
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
# PUT /api/registros-propiedad/{registro_id}
# ============================================================

@router.put(
    "/{registro_id}",
    response_model=RegistroPropiedadResponse,
)
def actualizar_registro_propiedad(
    registro_id: int,
    datos: RegistroPropiedadUpdate,
    db: Session = Depends(get_db),
):

    registro = (
        db.query(
            RegistroPropiedad
        )
        .filter(
            RegistroPropiedad.id
            == registro_id
        )
        .first()
    )

    if not registro:

        raise HTTPException(
            status_code=404,
            detail=(
                "Registro de la Propiedad "
                "no encontrado."
            ),
        )

    nombre = limpiar_texto(
        datos.registro_propiedad
    )

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail=(
                "El Registro de la Propiedad "
                "es obligatorio."
            ),
        )

    duplicado = (
        db.query(
            RegistroPropiedad
        )
        .filter(
            RegistroPropiedad.registro_propiedad
            == nombre,
            RegistroPropiedad.id
            != registro_id,
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro Registro de la Propiedad "
                "con ese nombre."
            ),
        )

    registro.registro_propiedad = nombre

    registro.nombre_registrador = (
        limpiar_opcional(
            datos.nombre_registrador
        )
    )

    registro.direccion = (
        limpiar_opcional(
            datos.direccion
        )
    )

    registro.codigo_postal = (
        limpiar_opcional(
            datos.codigo_postal
        )
    )

    registro.poblacion = (
        limpiar_opcional(
            datos.poblacion
        )
    )

    registro.provincia = (
        limpiar_opcional(
            datos.provincia
        )
    )

    registro.telefono = (
        limpiar_opcional(
            datos.telefono
        )
    )

    registro.telefono_2 = (
        limpiar_opcional(
            datos.telefono_2
        )
    )

    registro.fax = (
        limpiar_opcional(
            datos.fax
        )
    )

    registro.whatsapp = (
        limpiar_opcional(
            datos.whatsapp
        )
    )

    registro.email_1 = (
        limpiar_opcional(
            datos.email_1
        )
    )

    registro.email_2 = (
        limpiar_opcional(
            datos.email_2
        )
    )

    registro.iban = (
        limpiar_opcional(
            datos.iban
        )
    )

    registro.comentarios = (
        limpiar_opcional(
            datos.comentarios
        )
    )

    registro.tiene_of_liq = (
        datos.tiene_of_liq
    )

    registro.activo = True

    try:

        db.commit()

        db.refresh(
            registro
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo actualizar el registro: "
                f"{exc}"
            ),
        )

    return registro_a_dict(
        registro
    )


# ============================================================
# DELETE /api/registros-propiedad/{registro_id}
# ============================================================

@router.delete(
    "/{registro_id}"
)
def eliminar_registro_propiedad(
    registro_id: int,
    db: Session = Depends(get_db),
):

    registro = (
        db.query(
            RegistroPropiedad
        )
        .filter(
            RegistroPropiedad.id
            == registro_id
        )
        .first()
    )

    if not registro:

        raise HTTPException(
            status_code=404,
            detail=(
                "Registro de la Propiedad "
                "no encontrado."
            ),
        )

    try:

        registro.activo = False

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo eliminar el registro: "
                f"{exc}"
            ),
        )

    return {
        "ok": True,
        "mensaje": (
            "Registro de la Propiedad "
            "eliminado correctamente."
        ),
    }

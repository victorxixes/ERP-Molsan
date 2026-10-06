from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.database import get_db

from backend.app.acciones_expediente.models import (
    AccionExpediente,
)

from backend.app.Utilidades.importadores.acciones_expediente_importer import (
    importar_excel_acciones_expediente,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/acciones-expediente",
    tags=[
        "Acciones del expediente"
    ],
)


# ============================================================
# SCHEMAS
# ============================================================

class AccionExpedienteBase(
    BaseModel
):
    departamento: Optional[str] = None
    seccion: Optional[str] = None
    actividad: Optional[str] = None
    descripcion: str
    activo: bool = True

    class Config:
        orm_mode = True


class AccionExpedienteCrear(
    AccionExpedienteBase
):
    pass


class AccionExpedienteActualizar(
    AccionExpedienteBase
):
    pass


# ============================================================
# SERIALIZADOR
# ============================================================

def accion_a_dict(
    accion: AccionExpediente,
):
    return {
        "id": accion.id,
        "departamento": accion.departamento,
        "seccion": accion.seccion,
        "actividad": accion.actividad,
        "descripcion": accion.descripcion,
        "activo": accion.activo,
    }


# ============================================================
# GET /api/acciones-expediente
# ============================================================

@router.get("")
def listar_acciones(
    q: Optional[str] = Query(None),
    departamento: Optional[str] = Query(None),
    seccion: Optional[str] = Query(None),
    actividad: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):

    consulta = (
        db.query(
            AccionExpediente
        )
    )

    # ========================================================
    # BÚSQUEDA GENERAL
    # ========================================================

    if q:

        texto = (
            f"%{q.strip()}%"
        )

        consulta = consulta.filter(
            or_(
                AccionExpediente
                .departamento
                .ilike(texto),

                AccionExpediente
                .seccion
                .ilike(texto),

                AccionExpediente
                .actividad
                .ilike(texto),

                AccionExpediente
                .descripcion
                .ilike(texto),
            )
        )

    # ========================================================
    # FILTRO DEPARTAMENTO
    # ========================================================

    if departamento:

        consulta = consulta.filter(
            AccionExpediente
            .departamento
            .ilike(
                f"%{departamento.strip()}%"
            )
        )

    # ========================================================
    # FILTRO SECCIÓN
    # ========================================================

    if seccion:

        consulta = consulta.filter(
            AccionExpediente
            .seccion
            .ilike(
                f"%{seccion.strip()}%"
            )
        )

    # ========================================================
    # FILTRO ACTIVIDAD
    # ========================================================

    if actividad:

        consulta = consulta.filter(
            AccionExpediente
            .actividad
            .ilike(
                f"%{actividad.strip()}%"
            )
        )

    # ========================================================
    # FILTRO ACTIVO
    # ========================================================

    if activo is not None:

        consulta = consulta.filter(
            AccionExpediente.activo
            == activo
        )

    # ========================================================
    # ORDEN
    # ========================================================

    acciones = (
        consulta
        .order_by(
            AccionExpediente
            .departamento
            .asc(),

            AccionExpediente
            .seccion
            .asc(),

            AccionExpediente
            .actividad
            .asc(),

            AccionExpediente
            .descripcion
            .asc(),
        )
        .all()
    )

    return [
        accion_a_dict(
            accion
        )
        for accion in acciones
    ]


# ============================================================
# POST /api/acciones-expediente
# ============================================================

@router.post("")
def crear_accion(
    datos: AccionExpedienteCrear,
    db: Session = Depends(get_db),
):

    descripcion = (
        datos.descripcion.strip()
    )

    if not descripcion:

        raise HTTPException(
            status_code=400,
            detail=(
                "La descripción "
                "es obligatoria."
            ),
        )

    nueva = AccionExpediente(

        departamento=(
            datos.departamento.strip()
            if datos.departamento
            and datos.departamento.strip()
            else None
        ),

        seccion=(
            datos.seccion.strip()
            if datos.seccion
            and datos.seccion.strip()
            else None
        ),

        actividad=(
            datos.actividad.strip()
            if datos.actividad
            and datos.actividad.strip()
            else None
        ),

        descripcion=descripcion,

        activo=datos.activo,
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
                "No se pudo crear "
                "la acción del expediente: "
                f"{exc}"
            ),
        )

    return accion_a_dict(
        nueva
    )


# ============================================================
# POST /api/acciones-expediente/importar-excel
# ============================================================

@router.post(
    "/importar-excel"
)
async def importar_excel(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    nombre_archivo = (
        fichero.filename
        or ""
    ).strip().lower()

    # ========================================================
    # VALIDAR EXTENSIÓN
    # ========================================================

    if not nombre_archivo.endswith(
        (
            ".xlsx",
            ".xls",
            ".xlsm",
        )
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "El fichero debe ser "
                "un Excel (.xlsx, .xls "
                "o .xlsm)."
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
                "No se pudo leer "
                "el fichero: "
                f"{exc}"
            ),
        )

    # ========================================================
    # VALIDAR CONTENIDO
    # ========================================================

    if not contenido:

        raise HTTPException(
            status_code=400,
            detail=(
                "El fichero Excel "
                "está vacío."
            ),
        )

    # ========================================================
    # ARCHIVO TEMPORAL
    # ========================================================

    import os
    import tempfile

    extension = (
        os.path.splitext(
            fichero.filename
        )[1]
        or ".xlsx"
    )

    ruta_temporal = None

    try:

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temporal:

            temporal.write(
                contenido
            )

            ruta_temporal = (
                temporal.name
            )

        # ====================================================
        # IMPORTAR
        # ====================================================

        resultado = (
            importar_excel_acciones_expediente(
                ruta_temporal,
                db,
            )
        )

        # ====================================================
        # COMPROBAR RESULTADO
        # ====================================================

        if not resultado.get(
            "ok"
        ):

            raise HTTPException(
                status_code=400,
                detail=resultado.get(
                    "mensaje",
                    "Error durante "
                    "la importación.",
                ),
            )

        return resultado

    finally:

        # ====================================================
        # BORRAR TEMPORAL
        # ====================================================

        if ruta_temporal:

            try:

                if os.path.exists(
                    ruta_temporal
                ):

                    os.remove(
                        ruta_temporal
                    )

            except Exception:

                pass


# ============================================================
# PUT /api/acciones-expediente/{accion_id}
# ============================================================

@router.put(
    "/{accion_id}"
)
def actualizar_accion(
    accion_id: int,
    datos: AccionExpedienteActualizar,
    db: Session = Depends(get_db),
):

    accion = (
        db.query(
            AccionExpediente
        )
        .filter(
            AccionExpediente.id
            == accion_id
        )
        .first()
    )

    if not accion:

        raise HTTPException(
            status_code=404,
            detail=(
                "Acción del expediente "
                "no encontrada."
            ),
        )

    descripcion = (
        datos.descripcion.strip()
    )

    if not descripcion:

        raise HTTPException(
            status_code=400,
            detail=(
                "La descripción "
                "es obligatoria."
            ),
        )

    accion.departamento = (
        datos.departamento.strip()
        if datos.departamento
        and datos.departamento.strip()
        else None
    )

    accion.seccion = (
        datos.seccion.strip()
        if datos.seccion
        and datos.seccion.strip()
        else None
    )

    accion.actividad = (
        datos.actividad.strip()
        if datos.actividad
        and datos.actividad.strip()
        else None
    )

    accion.descripcion = (
        descripcion
    )

    accion.activo = (
        datos.activo
    )

    try:

        db.commit()

        db.refresh(
            accion
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo actualizar "
                "la acción del expediente: "
                f"{exc}"
            ),
        )

    return accion_a_dict(
        accion
    )


# ============================================================
# DELETE /api/acciones-expediente/{accion_id}
# ============================================================

@router.delete(
    "/{accion_id}"
)
def eliminar_accion(
    accion_id: int,
    db: Session = Depends(get_db),
):

    accion = (
        db.query(
            AccionExpediente
        )
        .filter(
            AccionExpediente.id
            == accion_id
        )
        .first()
    )

    if not accion:

        raise HTTPException(
            status_code=404,
            detail=(
                "Acción del expediente "
                "no encontrada."
            ),
        )

    try:

        db.delete(
            accion
        )

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo eliminar "
                "la acción del expediente: "
                f"{exc}"
            ),
        )

    return {
        "ok": True,
        "mensaje": (
            "Acción del expediente "
            "eliminada correctamente."
        ),
    }

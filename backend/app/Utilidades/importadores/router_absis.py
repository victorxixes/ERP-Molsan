from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)

from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.realtime.manager import realtime_manager
from backend.app.realtime.schemas import RealtimeEvent

from backend.app.Utilidades.importadores.expedientes_importer import (
    importar_excel_expedientes,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/utilidades/importador-absis",
    tags=["Importador ABSIS"],
)


# ============================================================
# POST /api/utilidades/importador-absis/expedientes
# ============================================================

@router.post("/expedientes")
async def importar_expedientes_absis(
    fichero: UploadFile = File(...),
    fecha: str | None = Query(
        default=None,
        description=(
            "Fecha a importar en formato "
            "YYYY-MM-DD. "
            "Si no se indica, se utiliza la fecha actual."
        ),
    ),
    db: Session = Depends(get_db),
):

    # ========================================================
    # NOMBRE DEL ARCHIVO
    # ========================================================

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


    # ========================================================
    # FECHA
    # ========================================================

    if fecha:

        try:

            fecha_objetivo = date.fromisoformat(
                fecha
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail=(
                    "La fecha debe tener formato "
                    "YYYY-MM-DD."
                ),
            )

    else:

        fecha_objetivo = date.today()


    # ========================================================
    # LEER FICHERO
    # ========================================================

    try:

        contenido_excel = (
            await fichero.read()
        )

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo leer el archivo: "
                f"{exc}"
            ),
        )


    if not contenido_excel:

        raise HTTPException(
            status_code=400,
            detail=(
                "El archivo Excel está vacío."
            ),
        )


    # ========================================================
    # IMPORTAR
    # ========================================================

    try:

        resultado = importar_excel_expedientes(
            db=db,
            contenido_excel=contenido_excel,
            fecha_objetivo=fecha_objetivo,
        )

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        db.rollback()

        print(
            "[IMPORTADOR ABSIS] ERROR:",
            exc,
            flush=True,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Error durante la importación: "
                f"{exc}"
            ),
        )


    # ========================================================
    # REALTIME — IMPORTACIÓN FINALIZADA
    # ========================================================
    #
    # IMPORTANTE:
    #
    # El frontend ya escucha:
    #
    #   erp:realtime
    #
    # y ExpedientesListado.jsx filtra:
    #
    #   modulo === "expedientes"
    #   evento === "importacion_finalizada"
    #
    # Por tanto aquí publicamos exactamente ese evento.
    # ========================================================

    try:

        evento = RealtimeEvent(
            modulo="expedientes",
            evento="importacion_finalizada",
            data={
                "fecha_importada": (
                    resultado.get(
                        "fecha_importada"
                    )
                ),
                "creados": int(
                    resultado.get(
                        "creados",
                        0,
                    )
                ),
                "actualizados": int(
                    resultado.get(
                        "actualizados",
                        0,
                    )
                ),
                "errores": int(
                    resultado.get(
                        "errores",
                        0,
                    )
                ),
                "total_filtrados": int(
                    resultado.get(
                        "total_filtrados",
                        0,
                    )
                ),
                "total_procesados": int(
                    resultado.get(
                        "total_procesados",
                        0,
                    )
                ),
            },
        )


        await realtime_manager.broadcast_global(
            evento
        )


        print(
            "[REALTIME] "
            "importacion_finalizada "
            "publicada correctamente.",
            flush=True,
        )

    except Exception as realtime_error:

        # ----------------------------------------------------
        # IMPORTANTE:
        #
        # Un fallo del realtime NO debe convertir
        # una importación correcta en una importación fallida.
        # ----------------------------------------------------

        print(
            "[REALTIME] Error publicando "
            "importacion_finalizada:",
            realtime_error,
            flush=True,
        )


    # ========================================================
    # RESPUESTA
    # ========================================================

    return resultado

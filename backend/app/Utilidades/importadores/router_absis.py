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
from backend.app.Utilidades.importadores.postfirma_importer import importar_postfirma, validar_postfirma
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo


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



# ============================================================
# POST FIRMA — HISTÓRICO DE GASTOS/FACTURACIÓN
# Endpoint independiente del importador de expedientes.
# ============================================================

@router.post("/postfirma")
async def importar_postfirma_absis(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    nombre = (fichero.filename or "").strip()
    if not nombre.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="El histórico Post Firma debe ser un Excel .xlsx.")
    contenido = await fichero.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El Excel Post Firma está vacío.")
    try:
        return importar_postfirma(db, contenido, nombre)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        db.rollback()
        print("[IMPORTADOR ABSIS POST FIRMA] ERROR:", exc, flush=True)
        raise HTTPException(status_code=500, detail="Error al importar Post Firma. Se ha revertido la transacción.")



@router.post("/postfirma/validar")
async def validar_postfirma_absis(
    fichero: UploadFile = File(...),
    fecha_desde: date | None = Query(default=None, description="Fecha inicial de FECHAALTA en formato YYYY-MM-DD."),
    fecha_hasta: date | None = Query(default=None, description="Fecha final de FECHAALTA en formato YYYY-MM-DD."),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Audita Post Firma por intervalo FECHAALTA y devuelve métricas; nunca guarda filas."""
    require_perm_modulo(usuario, "utilidades", "editar")
    nombre = (fichero.filename or "").strip()
    if not nombre.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="El histórico Post Firma debe ser un Excel .xlsx.")
    if fecha_desde is None or fecha_hasta is None:
        raise HTTPException(status_code=400, detail="Selecciona las fechas desde y hasta para FECHAALTA.")
    if fecha_desde > fecha_hasta:
        raise HTTPException(status_code=400, detail="La fecha desde no puede ser posterior a la fecha hasta.")
    contenido = await fichero.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El Excel Post Firma está vacío.")
    try:
        return validar_postfirma(db, contenido, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        print("[VALIDACION ABSIS POST FIRMA] ERROR:", exc, flush=True)
        raise HTTPException(status_code=500, detail="No se pudo validar el Excel. No se han guardado cambios.")

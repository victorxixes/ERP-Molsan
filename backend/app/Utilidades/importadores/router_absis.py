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
from backend.app.Utilidades.importadores.postfirma_importer import (
    importar_postfirma, validar_postfirma, listar_cargas_postfirma, listar_registros_postfirma,
)
from backend.app.auth.dependencies import get_current_user
from backend.app.uploads import MAX_EXCEL_UPLOAD_BYTES, read_upload_limited
from backend.app.auth.permissions import require_perm_modulo


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    dependencies=[Depends(get_current_user)],
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
    usuario=Depends(get_current_user),
):

    require_perm_modulo(usuario, "utilidades", "editar")

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

        contenido_excel = await read_upload_limited(
            fichero,
            MAX_EXCEL_UPLOAD_BYTES,
            "Excel ABSIS",
        )

    except HTTPException:
        raise
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
    """Importa el histórico Post Firma completo, sin filtro de fechas."""
    require_perm_modulo(usuario, "utilidades", "editar")
    nombre = (fichero.filename or "").strip()
    if not nombre.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="El histórico Post Firma debe ser un Excel .xlsx.")
    contenido = await read_upload_limited(
        fichero,
        MAX_EXCEL_UPLOAD_BYTES,
        "Excel Post Firma",
    )
    if not contenido:
        raise HTTPException(status_code=400, detail="El Excel Post Firma está vacío.")
    try:
        return importar_postfirma(db=db, contenido_excel=contenido, nombre_archivo=nombre)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        db.rollback()
        print("[IMPORTACION ABSIS POST FIRMA] ERROR:", exc, flush=True)
        raise HTTPException(status_code=500, detail="Error durante la importación Post Firma. Revisa los logs del backend.")



@router.post("/postfirma/validar")
async def validar_postfirma_absis(
    fichero: UploadFile = File(...),
    fecha_desde: date | None = Query(default=None, description="Parámetro legado; no filtra la validación."),
    fecha_hasta: date | None = Query(default=None, description="Parámetro legado; no filtra la validación."),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Valida el contenido del Excel sin filtrar por fechas y sin guardar filas."""
    require_perm_modulo(usuario, "utilidades", "editar")
    nombre = (fichero.filename or "").strip()
    if not nombre.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="El histórico Post Firma debe ser un Excel .xlsx.")
    contenido = await read_upload_limited(
        fichero,
        MAX_EXCEL_UPLOAD_BYTES,
        "Excel Post Firma",
    )
    if not contenido:
        raise HTTPException(status_code=400, detail="El Excel Post Firma está vacío.")
    try:
        return validar_postfirma(db, contenido)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        print("[VALIDACION ABSIS POST FIRMA] ERROR:", exc, flush=True)
        raise HTTPException(status_code=500, detail="No se pudo validar el Excel. No se han guardado cambios.")


@router.get("/postfirma/cargas")
def obtener_cargas_postfirma(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Devuelve el historial de ficheros cargados en el almacén bruto."""
    require_perm_modulo(usuario, "utilidades", "ver")
    try:
        return {"items": listar_cargas_postfirma(db)}
    except Exception as exc:
        db.rollback()
        print("[CONSULTA CARGAS POST FIRMA] ERROR:", exc, flush=True)
        raise HTTPException(status_code=500, detail="No se pudo consultar el histórico Post Firma.")


@router.get("/postfirma/registros")
def obtener_registros_postfirma(
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    carga_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Consulta paginada de filas originales; no aplica filtros de negocio."""
    require_perm_modulo(usuario, "utilidades", "ver")
    try:
        return listar_registros_postfirma(db, limit=limit, offset=offset, carga_id=carga_id)
    except Exception as exc:
        db.rollback()
        print("[CONSULTA REGISTROS POST FIRMA] ERROR:", exc, flush=True)
        raise HTTPException(status_code=500, detail="No se pudo consultar el detalle del histórico Post Firma.")

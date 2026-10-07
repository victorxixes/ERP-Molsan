from datetime import date, datetime
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from backend.app.database import get_db

from backend.app.realtime.manager import (
    realtime_manager,
)
from backend.app.realtime.schemas import (
    RealtimeEvent,
)

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
# IMPORTAR EXPEDIENTES ABSIS
# ============================================================

@router.post("/expedientes")
async def importar_expedientes_absis(
    fichero: UploadFile = File(...),

    fecha: Optional[str] = Query(
        None,
        description=(
            "Fecha a importar en formato YYYY-MM-DD. "
            "Si no se indica, se utiliza la fecha actual."
        ),
    ),

    db: Session = Depends(get_db),
):
    """
    Importa expedientes desde el Excel matriz ABSIS.

    El Excel puede contener un histórico muy grande.

    El importador solamente procesa las filas cuya
    FECHAALTA coincide con la fecha indicada.

    Si no se indica fecha:
        se utiliza la fecha actual.

    Si se indica fecha:
        debe tener formato YYYY-MM-DD.
    """

    print(
        "============================================",
        flush=True,
    )

    print(
        "API IMPORTADOR ABSIS - INICIO",
        flush=True,
    )

    print(
        "============================================",
        flush=True,
    )


    # ========================================================
    # 1) COMPROBAR FICHERO
    # ========================================================

    if fichero is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "No se ha recibido ningún fichero."
            ),
        )


    print(
        f"FICHERO: {fichero.filename}",
        flush=True,
    )

    print(
        f"CONTENT TYPE: {fichero.content_type}",
        flush=True,
    )


    # ========================================================
    # 2) VALIDAR NOMBRE DEL FICHERO
    # ========================================================

    if not fichero.filename:

        raise HTTPException(
            status_code=400,
            detail=(
                "El fichero no tiene nombre."
            ),
        )


    nombre_fichero = (
        fichero.filename
        .lower()
        .strip()
    )


    if not (
        nombre_fichero.endswith(".xlsx")
        or nombre_fichero.endswith(".xlsm")
        or nombre_fichero.endswith(".xls")
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "El fichero debe ser un Excel "
                "(.xlsx, .xlsm o .xls)."
            ),
        )


    # ========================================================
    # 3) LEER FICHERO
    # ========================================================

    print(
        "API: leyendo fichero...",
        flush=True,
    )


    try:

        contenido = await fichero.read()

    except Exception as e:

        print(
            f"ERROR LEYENDO FICHERO: {e}",
            flush=True,
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo leer el fichero."
            ),
        )


    if not contenido:

        raise HTTPException(
            status_code=400,
            detail=(
                "El fichero está vacío."
            ),
        )


    print(
        f"FICHERO LEÍDO: {len(contenido)} bytes",
        flush=True,
    )


    # ========================================================
    # 4) DETERMINAR FECHA OBJETIVO
    # ========================================================

    if fecha:

        try:

            fecha_objetivo = (
                datetime.strptime(
                    fecha.strip(),
                    "%Y-%m-%d",
                ).date()
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Formato de fecha inválido. "
                    "Usa YYYY-MM-DD."
                ),
            )

    else:

        fecha_objetivo = date.today()


    print(
        f"FECHA OBJETIVO: {fecha_objetivo}",
        flush=True,
    )


    # ========================================================
    # 5) EJECUTAR IMPORTADOR
    # ========================================================

    print(
        "API: iniciando importador ABSIS...",
        flush=True,
    )


    try:

        resultado = (
            importar_excel_expedientes(
                db=db,
                contenido_excel=contenido,
                fecha_objetivo=fecha_objetivo,
            )
        )


    except ValueError as e:

        print(
            f"ERROR DE VALIDACIÓN EN IMPORTADOR: {e}",
            flush=True,
        )

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


    except HTTPException:

        db.rollback()

        raise


    except Exception as e:

        print(
            f"ERROR IMPORTANDO ABSIS: {e}",
            flush=True,
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Error durante la importación ABSIS."
            ),
        )


    # ========================================================
    # 6) VALIDAR RESULTADO
    # ========================================================

    if not isinstance(
        resultado,
        dict,
    ):

        print(
            "ERROR: el importador no devolvió un diccionario.",
            flush=True,
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "El importador ABSIS devolvió "
                "un resultado no válido."
            ),
        )


    print(
        "API: importación finalizada.",
        flush=True,
    )


    # ========================================================
    # 7) REALTIME
    #
    # IMPORTANTE:
    # El evento debe emitirse ANTES del return.
    # ========================================================

    total_procesados = int(
        resultado.get(
            "total_procesados",
            0,
        )
        or 0
    )


    if total_procesados > 0:

        try:

            evento_data = jsonable_encoder(
                resultado
            )


            await realtime_manager.broadcast_global(

                RealtimeEvent(

                    modulo="expedientes",

                    evento="importacion_finalizada",

                    data=evento_data,

                )

            )


            print(
                "REALTIME: evento "
                "'importacion_finalizada' enviado.",
                flush=True,
            )


        except Exception as e:

            # ------------------------------------------------
            # La importación YA terminó correctamente.
            # Un fallo del realtime no debe convertir
            # una importación correcta en un error 500.
            # ------------------------------------------------

            print(
                f"REALTIME: error enviando evento: {e}",
                flush=True,
            )

    else:

        print(
            "REALTIME: no se envía evento porque "
            "no hubo expedientes procesados.",
            flush=True,
        )


    # ========================================================
    # 8) FIN
    # ========================================================

    print(
        "============================================",
        flush=True,
    )

    print(
        "API IMPORTADOR ABSIS - FIN",
        flush=True,
    )

    print(
        "============================================",
        flush=True,
    )


    # ========================================================
    # 9) RESPUESTA API
    # ========================================================

    return {

        "mensaje":
            "Importación ABSIS completada",

        "fecha_importada":
            resultado.get(
                "fecha_importada"
            ),

        "expedientes_creados":
            resultado.get(
                "creados",
                0,
            ),

        "expedientes_actualizados":
            resultado.get(
                "actualizados",
                0,
            ),

        "total_filtrados":
            resultado.get(
                "total_filtrados",
                0,
            ),

        "total_procesados":
            resultado.get(
                "total_procesados",
                0,
            ),

        "errores":
            resultado.get(
                "errores",
                0,
            ),

    }

import io

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.municipios.models import Municipio

================================================================
IMPORTADOR DE MUNICIPIOS — MOLSAN ERP
================================================================

Lee un Excel con las columnas:

    CCAA
    PROVINCIA
    MUNICIPIO

y sincroniza los datos con la tabla:

    municipios

Reglas:

- CCAA obligatoria
- PROVINCIA obligatoria
- MUNICIPIO obligatorio
- Los espacios exteriores se eliminan
- Las filas vacías se ignoran
- Los duplicados del Excel se ignoran
- Los municipios existentes se actualizan
- Los nuevos municipios se crean
- La combinación CCAA + PROVINCIA + MUNICIPIO es única

================================================================
"""

from io import BytesIO
from typing import Any, Dict

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.municipios.models import Municipio


# ============================================================
# CONFIGURACIÓN
# ============================================================

BATCH_SIZE = 500


# ============================================================
# NORMALIZAR TEXTO
# ============================================================

def normalizar_texto(valor: Any) -> str:

    if valor is None:
        return ""

    try:

        if pd.isna(valor):
            return ""

    except Exception:
        pass

    texto = str(valor).strip()

    # Evitar valores típicos de Excel
    if texto.lower() in {
        "nan",
        "none",
        "null",
    }:
        return ""

    return texto


# ============================================================
# NORMALIZAR NOMBRE DE COLUMNA
# ============================================================

def normalizar_nombre_columna(nombre: Any) -> str:

    if nombre is None:
        return ""

    texto = str(nombre).strip().upper()

    # Eliminamos espacios internos para tolerar:
    #
    # "COMUNIDAD AUTÓNOMA"
    # "COMUNIDAD AUTONOMA"
    #
    # aunque nuestro Excel esperado sea CCAA.

    texto = (
        texto
        .replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
        .replace("Ü", "U")
    )

    texto = (
        texto
        .replace(" ", "")
        .replace("_", "")
        .replace("-", "")
    )

    return texto


# ============================================================
# DETECTAR COLUMNAS
# ============================================================

def detectar_columnas(df: pd.DataFrame):

    columnas = {}

    for columna in df.columns:

        normalizada = normalizar_nombre_columna(
            columna
        )

        columnas[normalizada] = columna


    aliases = {

        "CCAA": [
            "CCAA",
            "COMUNIDADAUTONOMA",
            "COMUNIDADAUTONOMA",
        ],

        "PROVINCIA": [
            "PROVINCIA",
            "PROVINCIA",
        ],

        "MUNICIPIO": [
            "MUNICIPIO",
            "MUNICIPIOS",
        ],

    }


    resultado = {}


    for campo, posibles in aliases.items():

        encontrada = None

        for posible in posibles:

            if posible in columnas:

                encontrada = columnas[posible]

                break


        if encontrada is None:

            raise ValueError(
                f"No se encuentra la columna obligatoria "
                f"'{campo}' en el Excel."
            )


        resultado[campo] = encontrada


    return resultado


# ============================================================
# IMPORTADOR PRINCIPAL
# ============================================================

def importar_excel_municipios(
    contenido: bytes,
    db: Session,
) -> Dict[str, Any]:

    creados = 0
    actualizados = 0
    errores = 0
    procesados = 0
    omitidos = 0

    errores_detalle = []


    # ========================================================
    # LEER EXCEL
    # ========================================================

    try:

        archivo = BytesIO(
            contenido
        )


        try:

            df = pd.read_excel(
                archivo,
                engine="openpyxl",
            )

        except Exception:

            archivo.seek(0)

            df = pd.read_excel(
                archivo,
            )


    except Exception as exc:

        raise ValueError(
            f"No se pudo leer el archivo Excel: {exc}"
        )


    # ========================================================
    # VALIDAR EXCEL
    # ========================================================

    if df is None or df.empty:

        return {
            "ok": True,
            "mensaje": "El Excel no contiene filas.",
            "procesados": 0,
            "creados": 0,
            "actualizados": 0,
            "errores": 0,
            "omitidos": 0,
            "errores_detalle": [],
        }


    columnas = detectar_columnas(
        df
    )


    columna_ccaa =
        columnas["CCAA"]

    columna_provincia =
        columnas["PROVINCIA"]

    columna_municipio =
        columnas["MUNICIPIO"]


    # ========================================================
    # RENOMBRAR COLUMNAS
    # ========================================================

    df = df.rename(
        columns={
            columna_ccaa: "CCAA",
            columna_provincia: "PROVINCIA",
            columna_municipio: "MUNICIPIO",
        }
    )


    # ========================================================
    # LIMPIEZA
    # ========================================================

    df["CCAA"] = (
        df["CCAA"]
        .map(normalizar_texto)
    )

    df["PROVINCIA"] = (
        df["PROVINCIA"]
        .map(normalizar_texto)
    )

    df["MUNICIPIO"] = (
        df["MUNICIPIO"]
        .map(normalizar_texto)
    )


    # ========================================================
    # ELIMINAR FILAS COMPLETAMENTE VACÍAS
    # ========================================================

    df = df[
        ~(
            (df["CCAA"] == "") &
            (df["PROVINCIA"] == "") &
            (df["MUNICIPIO"] == "")
        )
    ].copy()


    # ========================================================
    # ELIMINAR FILAS SIN MUNICIPIO
    # ========================================================

    filas_sin_municipio = (
        df["MUNICIPIO"] == ""
    ).sum()


    omitidos += int(
        filas_sin_municipio
    )


    df = df[
        df["MUNICIPIO"] != ""
    ].copy()


    if df.empty:

        return {
            "ok": True,
            "mensaje": "No hay municipios válidos para importar.",
            "procesados": 0,
            "creados": 0,
            "actualizados": 0,
            "errores": 0,
            "omitidos": omitidos,
            "errores_detalle": [],
        }


    # ========================================================
    # DEDUPLICAR EXCEL
    # ========================================================

    antes_deduplicacion = len(df)


    df = df.drop_duplicates(
        subset=[
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO",
        ],
        keep="first",
    ).copy()


    omitidos += (
        antes_deduplicacion -
        len(df)
    )


    # ========================================================
    # PROCESAMIENTO POR LOTES
    # ========================================================

    registros_lote = []


    for indice, fila in df.iterrows():

        try:

            ccaa = normalizar_texto(
                fila["CCAA"]
            )

            provincia = normalizar_texto(
                fila["PROVINCIA"]
            )

            municipio_nombre = normalizar_texto(
                fila["MUNICIPIO"]
            )


            # ----------------------------------------------
            # VALIDACIÓN
            # ----------------------------------------------

            if not ccaa:

                errores += 1

                errores_detalle.append({
                    "fila": int(indice) + 2,
                    "error": "CCAA vacía.",
                    "municipio": municipio_nombre,
                })

                continue


            if not provincia:

                errores += 1

                errores_detalle.append({
                    "fila": int(indice) + 2,
                    "error": "PROVINCIA vacía.",
                    "municipio": municipio_nombre,
                })

                continue


            if not municipio_nombre:

                errores += 1

                errores_detalle.append({
                    "fila": int(indice) + 2,
                    "error": "MUNICIPIO vacío.",
                })

                continue


            registros_lote.append(
                (
                    ccaa,
                    provincia,
                    municipio_nombre,
                )
            )


            # ----------------------------------------------
            # PROCESAR LOTE
            # ----------------------------------------------

            if len(registros_lote) >= BATCH_SIZE:

                c, a, e = _procesar_lote(
                    db,
                    registros_lote,
                    errores_detalle,
                )

                creados += c
                actualizados += a
                errores += e

                procesados += len(
                    registros_lote
                )

                registros_lote = []


        except Exception as exc:

            errores += 1

            errores_detalle.append({
                "fila": int(indice) + 2,
                "error": str(exc),
            })


    # ========================================================
    # ÚLTIMO LOTE
    # ========================================================

    if registros_lote:

        cantidad_lote = len(
            registros_lote
        )


        c, a, e = _procesar_lote(
            db,
            registros_lote,
            errores_detalle,
        )


        creados += c
        actualizados += a
        errores += e

        procesados += cantidad_lote


    # ========================================================
    # COMMIT FINAL
    # ========================================================

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        raise ValueError(
            f"Error guardando los municipios: {exc}"
        )


    # ========================================================
    # RESULTADO
    # ========================================================

    return {

        "ok": True,

        "mensaje":
            "Importación de municipios completada.",

        "procesados":
            procesados,

        "creados":
            creados,

        "actualizados":
            actualizados,

        "errores":
            errores,

        "omitidos":
            omitidos,

        "total_excel":
            int(len(df)),

        "errores_detalle":
            errores_detalle[:100],

    }


# ============================================================
# PROCESAR LOTE
# ============================================================

def _procesar_lote(
    db: Session,
    registros,
    errores_detalle,
):

    creados = 0
    actualizados = 0
    errores = 0


    # ========================================================
    # CLAVES DEL LOTE
    # ========================================================

    claves = [
        (
            ccaa,
            provincia,
            municipio,
        )
        for (
            ccaa,
            provincia,
            municipio,
        ) in registros
    ]


    # ========================================================
    # BUSCAR EXISTENTES
    # ========================================================

    existentes = {}


    for (
        ccaa,
        provincia,
        municipio,
    ) in claves:

        try:

            registro =
                db.query(Municipio).filter(
                    Municipio.ccaa == ccaa,
                    Municipio.provincia == provincia,
                    Municipio.municipio == municipio,
                ).first()


            if registro:

                existentes[
                    (
                        ccaa,
                        provincia,
                        municipio,
                    )
                ] = registro


        except Exception as exc:

            errores += 1

            errores_detalle.append({
                "ccaa": ccaa,
                "provincia": provincia,
                "municipio": municipio,
                "error": str(exc),
            })


    # ========================================================
    # INSERTAR / ACTUALIZAR
    # ========================================================

    for (
        ccaa,
        provincia,
        municipio_nombre,
    ) in registros:

        clave = (
            ccaa,
            provincia,
            municipio_nombre,
        )


        try:

            existente =
                existentes.get(
                    clave
                )


            if existente:

                # ------------------------------------------
                # EXISTENTE
                # ------------------------------------------

                cambio = False


                if existente.ccaa != ccaa:

                    existente.ccaa = ccaa

                    cambio = True


                if existente.provincia != provincia:

                    existente.provincia = provincia

                    cambio = True


                if existente.municipio != municipio_nombre:

                    existente.municipio =
                        municipio_nombre

                    cambio = True


                # Un municipio que vuelve a entrar
                # mediante Excel debe quedar activo.

                if existente.activo is not True:

                    existente.activo = True

                    cambio = True


                if cambio:

                    actualizados += 1

                else:

                    # Aunque no haya cambios, contamos
                    # el registro como actualizado/
                    # procesado sin generar una inserción.

                    actualizados += 1


            else:

                nuevo = Municipio(

                    ccaa=ccaa,

                    provincia=provincia,

                    municipio=municipio_nombre,

                    activo=True,
                )


                db.add(
                    nuevo
                )


                creados += 1


        except Exception as exc:

            errores += 1

            errores_detalle.append({
                "ccaa": ccaa,
                "provincia": provincia,
                "municipio": municipio_nombre,
                "error": str(exc),
            })


    # ========================================================
    # FLUSH
    # ========================================================

    try:

        db.flush()

    except Exception as exc:

        db.rollback()

        errores += len(
            registros
        )

        errores_detalle.append({
            "error":
                f"Error procesando lote: {exc}",
        })


    return (
        creados,
        actualizados,
        errores,
    )


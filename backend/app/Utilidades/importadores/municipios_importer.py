from io import BytesIO
import re
import unicodedata
from typing import Any, Dict, List, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.municipios.models import Municipio


# ============================================================
# IMPORTADOR DE MUNICIPIOS
# MOLSAN ERP
# ============================================================
#
# Excel esperado:
#
#   CCAA
#   PROVINCIA
#   MUNICIPIO
#
# Reglas:
#
# - CCAA obligatoria
# - PROVINCIA obligatoria
# - MUNICIPIO obligatorio
# - Se eliminan espacios exteriores
# - Se normalizan espacios internos
# - Filas completamente vacías -> omitidas
# - Duplicados del Excel -> omitidos
# - Municipios existentes -> actualizados/reactivados
# - Municipios nuevos -> creados
#
# ============================================================


BATCH_SIZE = 500


# ============================================================
# NORMALIZAR TEXTO
# ============================================================

def normalizar_texto(
    valor: Any,
) -> str:

    if valor is None:
        return ""

    try:

        if pd.isna(valor):
            return ""

    except Exception:
        pass

    texto = str(valor).strip()

    if texto.lower() in {
        "nan",
        "none",
        "null",
    }:

        return ""

    # --------------------------------------------------------
    # Normalizar espacios
    # --------------------------------------------------------

    texto = re.sub(
        r"\s+",
        " ",
        texto,
    )

    return texto.strip()


# ============================================================
# NORMALIZAR NOMBRE DE COLUMNA
# ============================================================

def normalizar_nombre_columna(
    nombre: Any,
) -> str:

    if nombre is None:
        return ""

    texto = str(
        nombre
    ).strip().upper()

    # --------------------------------------------------------
    # Quitar acentos
    # --------------------------------------------------------

    texto = unicodedata.normalize(
        "NFKD",
        texto,
    )

    texto = (
        texto
        .encode(
            "ascii",
            "ignore",
        )
        .decode("ascii")
    )

    # --------------------------------------------------------
    # Dejar únicamente letras y números
    # --------------------------------------------------------

    texto = re.sub(
        r"[^A-Z0-9]",
        "",
        texto,
    )

    return texto


# ============================================================
# DETECTAR COLUMNAS
# ============================================================

def detectar_columnas(
    df: pd.DataFrame,
) -> Dict[str, Any]:

    columnas = {}

    for columna in df.columns:

        normalizada = normalizar_nombre_columna(
            columna
        )

        columnas[
            normalizada
        ] = columna

    # --------------------------------------------------------
    # ALIAS ADMITIDOS
    # --------------------------------------------------------

    aliases = {

        "CCAA": {
            "CCAA",
            "COMUNIDADAUTONOMA",
            "COMUNIDADESAUTONOMAS",
        },

        "PROVINCIA": {
            "PROVINCIA",
        },

        "MUNICIPIO": {
            "MUNICIPIO",
            "MUNICIPIOS",
        },

    }

    resultado = {}

    for campo, posibles in aliases.items():

        encontrada = None

        for posible in posibles:

            if posible in columnas:

                encontrada = columnas[
                    posible
                ]

                break

        if encontrada is None:

            disponibles = ", ".join(
                str(columna)
                for columna in df.columns
            )

            raise ValueError(
                "No se encuentra la columna obligatoria "
                f"'{campo}' en el Excel. "
                f"Columnas detectadas: {disponibles}"
            )

        resultado[campo] = encontrada

    return resultado


# ============================================================
# CLAVE NORMALIZADA
# ============================================================

def clave_municipio(
    ccaa: str,
    provincia: str,
    municipio: str,
) -> Tuple[str, str, str]:

    return (
        ccaa.casefold(),
        provincia.casefold(),
        municipio.casefold(),
    )


# ============================================================
# IMPORTADOR PRINCIPAL
# ============================================================

def importar_excel_municipios(
    contenido: bytes,
    db: Session,
) -> Dict[str, Any]:

    # ========================================================
    # CONTADORES
    # ========================================================

    total_excel = 0

    procesados = 0
    creados = 0
    actualizados = 0
    sin_cambios = 0
    errores = 0
    omitidos = 0

    errores_detalle: List[
        Dict[str, Any]
    ] = []

    # ========================================================
    # VALIDAR CONTENIDO
    # ========================================================

    if not contenido:

        raise ValueError(
            "El archivo Excel está vacío."
        )

    # ========================================================
    # LEER EXCEL
    # ========================================================

    try:

        df = pd.read_excel(
            BytesIO(contenido),
            engine="openpyxl",
        )

    except Exception as exc_openpyxl:

        # ----------------------------------------------------
        # Segundo intento
        # ----------------------------------------------------

        try:

            df = pd.read_excel(
                BytesIO(contenido)
            )

        except Exception as exc:

            raise ValueError(
                "No se pudo leer el archivo Excel: "
                f"{exc}"
            ) from exc

    # ========================================================
    # TOTAL ORIGINAL
    # ========================================================

    total_excel = int(
        len(df)
    )

    # ========================================================
    # EXCEL VACÍO
    # ========================================================

    if df is None or df.empty:

        return {
            "ok": True,
            "mensaje": (
                "El Excel no contiene filas."
            ),
            "total_excel": total_excel,
            "procesados": 0,
            "creados": 0,
            "actualizados": 0,
            "sin_cambios": 0,
            "errores": 0,
            "omitidos": 0,
            "errores_detalle": [],
        }

    # ========================================================
    # DETECTAR COLUMNAS
    # ========================================================

    columnas = detectar_columnas(
        df
    )

    # ========================================================
    # RENOMBRAR
    # ========================================================

    df = df.rename(
        columns={
            columnas["CCAA"]: "CCAA",
            columnas["PROVINCIA"]: "PROVINCIA",
            columnas["MUNICIPIO"]: "MUNICIPIO",
        }
    )

    # --------------------------------------------------------
    # Trabajaremos únicamente con estas tres columnas
    # --------------------------------------------------------

    df = df[
        [
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO",
        ]
    ].copy()

    # ========================================================
    # NORMALIZAR DATOS
    # ========================================================

    for columna in [
        "CCAA",
        "PROVINCIA",
        "MUNICIPIO",
    ]:

        df[columna] = df[
            columna
        ].map(
            normalizar_texto
        )

    # ========================================================
    # PREPARAR FILAS VÁLIDAS
    # ========================================================

    filas_validas = []

    claves_excel = set()

    for fila_excel, fila in enumerate(
        df.itertuples(
            index=False
        ),
        start=2,
    ):

        ccaa = normalizar_texto(
            fila.CCAA
        )

        provincia = normalizar_texto(
            fila.PROVINCIA
        )

        municipio_nombre = normalizar_texto(
            fila.MUNICIPIO
        )

        # ----------------------------------------------------
        # FILA COMPLETAMENTE VACÍA
        # ----------------------------------------------------

        if (
            not ccaa
            and not provincia
            and not municipio_nombre
        ):

            omitidos += 1

            continue

        # ----------------------------------------------------
        # VALIDAR CAMPOS OBLIGATORIOS
        # ----------------------------------------------------

        if not ccaa:

            errores += 1

            if len(errores_detalle) < 100:

                errores_detalle.append(
                    {
                        "fila": fila_excel,
                        "error": (
                            "CCAA vacía."
                        ),
                        "provincia": provincia,
                        "municipio": municipio_nombre,
                    }
                )

            continue

        if not provincia:

            errores += 1

            if len(errores_detalle) < 100:

                errores_detalle.append(
                    {
                        "fila": fila_excel,
                        "error": (
                            "PROVINCIA vacía."
                        ),
                        "ccaa": ccaa,
                        "municipio": municipio_nombre,
                    }
                )

            continue

        if not municipio_nombre:

            errores += 1

            if len(errores_detalle) < 100:

                errores_detalle.append(
                    {
                        "fila": fila_excel,
                        "error": (
                            "MUNICIPIO vacío."
                        ),
                        "ccaa": ccaa,
                        "provincia": provincia,
                    }
                )

            continue

        # ----------------------------------------------------
        # CLAVE
        # ----------------------------------------------------

        clave = clave_municipio(
            ccaa,
            provincia,
            municipio_nombre,
        )

        # ----------------------------------------------------
        # DUPLICADO EN EXCEL
        # ----------------------------------------------------

        if clave in claves_excel:

            omitidos += 1

            continue

        claves_excel.add(
            clave
        )

        filas_validas.append(
            (
                ccaa,
                provincia,
                municipio_nombre,
            )
        )

    # ========================================================
    # NO HAY FILAS VÁLIDAS
    # ========================================================

    if not filas_validas:

        return {
            "ok": errores == 0,
            "mensaje": (
                "No hay municipios válidos "
                "para importar."
            ),
            "total_excel": total_excel,
            "procesados": 0,
            "creados": 0,
            "actualizados": 0,
            "sin_cambios": 0,
            "errores": errores,
            "omitidos": omitidos,
            "errores_detalle": (
                errores_detalle[:100]
            ),
        }

    # ========================================================
    # CARGAR MUNICIPIOS EXISTENTES
    # ========================================================
    #
    # España tiene un catálogo manejable de municipios,
    # por lo que una lectura completa de la tabla es mucho
    # más eficiente que lanzar una consulta SQL por cada fila.
    #
    # ========================================================

    existentes = (
        db.query(Municipio)
        .all()
    )

    existentes_por_clave = {}

    for registro in existentes:

        clave = clave_municipio(
            normalizar_texto(
                registro.ccaa
            ),
            normalizar_texto(
                registro.provincia
            ),
            normalizar_texto(
                registro.municipio
            ),
        )

        existentes_por_clave[
            clave
        ] = registro

    # ========================================================
    # PROCESAMIENTO POR LOTES
    # ========================================================

    try:

        for inicio in range(
            0,
            len(filas_validas),
            BATCH_SIZE,
        ):

            lote = filas_validas[
                inicio:inicio + BATCH_SIZE
            ]

            for (
                ccaa,
                provincia,
                municipio_nombre,
            ) in lote:

                clave = clave_municipio(
                    ccaa,
                    provincia,
                    municipio_nombre,
                )

                existente = (
                    existentes_por_clave.get(
                        clave
                    )
                )

                # ============================================
                # EXISTENTE
                # ============================================

                if existente is not None:

                    cambio = False

                    if existente.ccaa != ccaa:

                        existente.ccaa = ccaa

                        cambio = True

                    if existente.provincia != provincia:

                        existente.provincia = provincia

                        cambio = True

                    if (
                        existente.municipio
                        != municipio_nombre
                    ):

                        existente.municipio = (
                            municipio_nombre
                        )

                        cambio = True

                    # ----------------------------------------
                    # Reactivar si estaba borrado lógicamente
                    # ----------------------------------------

                    if existente.activo is not True:

                        existente.activo = True

                        cambio = True

                    if cambio:

                        actualizados += 1

                    else:

                        sin_cambios += 1

                # ============================================
                # NUEVO
                # ============================================

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

                    # Añadimos inmediatamente al diccionario
                    # para que no vuelva a intentarse insertar.
                    existentes_por_clave[
                        clave
                    ] = nuevo

                    creados += 1

            # ------------------------------------------------
            # FLUSH DEL LOTE
            # ------------------------------------------------

            db.flush()

            procesados += len(
                lote
            )

        # ====================================================
        # COMMIT FINAL
        # ====================================================

        db.commit()

    except Exception as exc:

        db.rollback()

        raise ValueError(
            "Error guardando los municipios: "
            f"{exc}"
        ) from exc

    # ========================================================
    # RESULTADO
    # ========================================================

    return {

        "ok": True,

        "mensaje": (
            "Importación de municipios "
            "completada correctamente."
        ),

        "total_excel": total_excel,

        "procesados": procesados,

        "creados": creados,

        "actualizados": actualizados,

        "sin_cambios": sin_cambios,

        "errores": errores,

        "omitidos": omitidos,

        "errores_detalle": (
            errores_detalle[:100]
        ),

    }

# ============================================================
# IMPORTADOR DE MUNICIPIOS
# MOLSAN ERP
#
# Excel esperado:
#
# CCAA | PROVINCIA | MUNICIPIO
#
# ============================================================

from __future__ import annotations

from io import BytesIO
from typing import BinaryIO

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.Utilidades.models import Municipio


# ============================================================
# CONFIGURACIÓN
# ============================================================

BATCH_SIZE = 1000


# ============================================================
# NORMALIZACIÓN DE TEXTO
# ============================================================

def normalizar_texto(valor) -> str | None:
    """
    Convierte cualquier valor a texto limpio.

    - None / NaN / vacíos -> None
    - Elimina espacios al principio y final
    - Reduce espacios dobles
    """

    if valor is None:
        return None

    try:
        if pd.isna(valor):
            return None
    except Exception:
        pass

    texto = str(valor).strip()

    if not texto:
        return None

    # Eliminar espacios duplicados
    texto = " ".join(texto.split())

    return texto


# ============================================================
# NORMALIZACIÓN DE COLUMNAS
# ============================================================

def normalizar_nombre_columna(nombre) -> str:
    """
    Normaliza el nombre de una columna del Excel.

    Ejemplos:

        " CCAA "       -> "CCAA"
        "Provincia"    -> "PROVINCIA"
        "Municipio"    -> "MUNICIPIO"
    """

    if nombre is None:
        return ""

    return str(nombre).strip().upper()


# ============================================================
# BUSCAR COLUMNA
# ============================================================

def obtener_columna(df: pd.DataFrame, nombre: str) -> str | None:
    """
    Busca una columna independientemente de mayúsculas,
    minúsculas o espacios.
    """

    objetivo = normalizar_nombre_columna(nombre)

    for columna in df.columns:

        if normalizar_nombre_columna(columna) == objetivo:
            return columna

    return None


# ============================================================
# IMPORTADOR PRINCIPAL
# ============================================================

def importar_excel_municipios(
    fichero: BinaryIO | bytes | BytesIO,
    db: Session,
) -> dict:
    """
    Importa municipios desde un Excel.

    Excel esperado:

        CCAA
        PROVINCIA
        MUNICIPIO

    Devuelve un resumen con:

        total_excel
        procesados
        creados
        actualizados
        ignorados
        errores
    """

    resultado = {
        "total_excel": 0,
        "procesados": 0,
        "creados": 0,
        "actualizados": 0,
        "ignorados": 0,
        "errores": 0,
    }

    # ========================================================
    # LEER EXCEL
    # ========================================================

    try:

        if isinstance(fichero, bytes):
            fichero = BytesIO(fichero)

        df = pd.read_excel(
            fichero,
            engine="openpyxl",
        )

    except Exception as exc:

        raise RuntimeError(
            f"No se pudo leer el Excel de municipios: {exc}"
        ) from exc

    # ========================================================
    # VALIDAR EXCEL VACÍO
    # ========================================================

    if df is None or df.empty:

        return resultado

    resultado["total_excel"] = len(df)

    # ========================================================
    # NORMALIZAR NOMBRES DE COLUMNAS
    # ========================================================

    columnas = {}

    for columna in df.columns:

        nombre_normalizado = normalizar_nombre_columna(
            columna
        )

        columnas[nombre_normalizado] = columna

    # ========================================================
    # VALIDAR COLUMNAS OBLIGATORIAS
    # ========================================================

    columnas_obligatorias = [
        "CCAA",
        "PROVINCIA",
        "MUNICIPIO",
    ]

    faltantes = [
        columna
        for columna in columnas_obligatorias
        if columna not in columnas
    ]

    if faltantes:

        raise ValueError(
            "El Excel de municipios no contiene las "
            "columnas obligatorias: "
            + ", ".join(faltantes)
        )

    # ========================================================
    # RENOMBRAR COLUMNAS
    # ========================================================

    df = df.rename(
        columns={
            columnas["CCAA"]: "CCAA",
            columnas["PROVINCIA"]: "PROVINCIA",
            columnas["MUNICIPIO"]: "MUNICIPIO",
        }
    )

    # ========================================================
    # LIMPIAR DATOS
    # ========================================================

    df["CCAA"] = df["CCAA"].apply(
        normalizar_texto
    )

    df["PROVINCIA"] = df["PROVINCIA"].apply(
        normalizar_texto
    )

    df["MUNICIPIO"] = df["MUNICIPIO"].apply(
        normalizar_texto
    )

    # ========================================================
    # ELIMINAR FILAS SIN DATOS
    # ========================================================

    df = df.dropna(
        subset=[
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO",
        ]
    )

    # ========================================================
    # ELIMINAR DUPLICADOS DEL PROPIO EXCEL
    #
    # Una misma combinación:
    #
    # CCAA + PROVINCIA + MUNICIPIO
    #
    # solo debe aparecer una vez.
    # ========================================================

    df = df.drop_duplicates(
        subset=[
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO",
        ],
        keep="first",
    )

    # ========================================================
    # PROCESAMIENTO POR LOTES
    # ========================================================

    registros = df[
        [
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO",
        ]
    ].to_dict("records")

    total_registros = len(registros)

    # ========================================================
    # PROCESAR BATCHES
    # ========================================================

    for inicio in range(
        0,
        total_registros,
        BATCH_SIZE,
    ):

        lote = registros[
            inicio:inicio + BATCH_SIZE
        ]

        try:

            # ==================================================
            # BUSCAR EXISTENTES
            # ==================================================

            for registro in lote:

                ccaa = registro["CCAA"]
                provincia = registro["PROVINCIA"]
                municipio = registro["MUNICIPIO"]

                resultado["procesados"] += 1

                try:

                    existente = (
                        db.query(Municipio)
                        .filter(
                            Municipio.ccaa == ccaa,
                            Municipio.provincia == provincia,
                            Municipio.municipio == municipio,
                        )
                        .first()
                    )

                    # ==========================================
                    # EXISTENTE
                    # ==========================================

                    if existente:

                        # No modificamos nada de momento.
                        #
                        # El catálogo es estático y la existencia
                        # del registro significa que ya está
                        # correctamente importado.

                        resultado["actualizados"] += 1

                    # ==========================================
                    # NUEVO
                    # ==========================================

                    else:

                        nuevo = Municipio(
                            ccaa=ccaa,
                            provincia=provincia,
                            municipio=municipio,
                            activo=True,
                        )

                        db.add(nuevo)

                        resultado["creados"] += 1

                except Exception as exc:

                    resultado["errores"] += 1

                    print(
                        "ERROR IMPORTANDO MUNICIPIO:",
                        {
                            "ccaa": ccaa,
                            "provincia": provincia,
                            "municipio": municipio,
                            "error": str(exc),
                        },
                    )

            # ==================================================
            # COMMIT DEL LOTE
            # ==================================================

            db.commit()

        except Exception as exc:

            db.rollback()

            resultado["errores"] += len(lote)

            print(
                "ERROR EN LOTE DE MUNICIPIOS:",
                str(exc),
            )

    # ========================================================
    # IGNORADOS
    # ========================================================

    resultado["ignorados"] = (
        resultado["total_excel"]
        - total_registros
    )

    return resultado


# ============================================================
# ALIAS COMPATIBLE
# ============================================================

importar_municipios = importar_excel_municipios

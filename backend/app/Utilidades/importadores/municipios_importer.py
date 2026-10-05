import io

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.municipios.models import Municipio


# ============================================================
# IMPORTADOR DE MUNICIPIOS
# ============================================================

def importar_municipios_desde_excel(
    db: Session,
    contenido: bytes
):
    """
    Importa municipios desde un Excel.

    Columnas esperadas:

        CCAA
        PROVINCIA
        MUNICIPIO

    Si un municipio ya existe para una determinada provincia,
    no se duplica.

    Devuelve estadísticas de la importación.
    """

    # ========================================================
    # LEER EXCEL
    # ========================================================

    try:

        df = pd.read_excel(
            io.BytesIO(contenido),
            dtype=str
        )

    except Exception as e:

        raise ValueError(
            f"No se pudo leer el Excel de municipios: {e}"
        )


    # ========================================================
    # NORMALIZAR NOMBRES DE COLUMNAS
    # ========================================================

    df.columns = [
        str(col).strip().upper()
        for col in df.columns
    ]


    columnas_obligatorias = {
        "CCAA",
        "PROVINCIA",
        "MUNICIPIO"
    }

    columnas_faltantes = (
        columnas_obligatorias -
        set(df.columns)
    )

    if columnas_faltantes:

        raise ValueError(
            "Faltan columnas obligatorias en el Excel: "
            + ", ".join(sorted(columnas_faltantes))
        )


    # ========================================================
    # QUEDARNOS SOLO CON LAS COLUMNAS NECESARIAS
    # ========================================================

    df = df[
        [
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO"
        ]
    ].copy()


    # ========================================================
    # LIMPIEZA
    # ========================================================

    for columna in [
        "CCAA",
        "PROVINCIA",
        "MUNICIPIO"
    ]:

        df[columna] = (
            df[columna]
            .fillna("")
            .astype(str)
            .str.strip()
        )


    # Eliminar filas sin municipio

    df = df[
        df["MUNICIPIO"] != ""
    ]


    # Eliminar filas completamente inválidas

    df = df[
        (df["CCAA"] != "") &
        (df["PROVINCIA"] != "")
    ]


    # Eliminar duplicados dentro del propio Excel

    df = df.drop_duplicates(
        subset=[
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO"
        ]
    )


    # ========================================================
    # IMPORTACIÓN
    # ========================================================

    creados = 0
    existentes = 0
    errores = 0


    for _, fila in df.iterrows():

        try:

            ccaa = fila["CCAA"]
            provincia = fila["PROVINCIA"]
            municipio = fila["MUNICIPIO"]


            existente = (
                db.query(Municipio)
                .filter(
                    Municipio.ccaa == ccaa,
                    Municipio.provincia == provincia,
                    Municipio.municipio == municipio
                )
                .first()
            )


            if existente:

                existentes += 1
                continue


            nuevo = Municipio(
                ccaa=ccaa,
                provincia=provincia,
                municipio=municipio
            )

            db.add(nuevo)

            creados += 1


        except Exception:

            errores += 1


    # ========================================================
    # COMMIT
    # ========================================================

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        raise ValueError(
            f"Error guardando municipios en la base de datos: {e}"
        )


    # ========================================================
    # RESULTADO
    # ========================================================

    return {
        "total_excel": len(df),
        "creados": creados,
        "existentes": existentes,
        "errores": errores,
        "total_final": creados + existentes
    }

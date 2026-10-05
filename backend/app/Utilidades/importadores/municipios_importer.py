import io

import pandas as pd

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

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

    La combinación:

        CCAA + PROVINCIA + MUNICIPIO

    se considera única.

    Si ya existe, no se vuelve a crear.
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
    # NORMALIZAR COLUMNAS
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
        columnas_obligatorias
        - set(df.columns)
    )


    if columnas_faltantes:

        raise ValueError(
            "Faltan columnas obligatorias en el Excel: "
            + ", ".join(sorted(columnas_faltantes))
        )


    # ========================================================
    # SOLO COLUMNAS NECESARIAS
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


    # ========================================================
    # ELIMINAR FILAS INVÁLIDAS
    # ========================================================

    df = df[
        (df["CCAA"] != "") &
        (df["PROVINCIA"] != "") &
        (df["MUNICIPIO"] != "")
    ].copy()


    # ========================================================
    # ELIMINAR DUPLICADOS DEL EXCEL
    # ========================================================

    df = df.drop_duplicates(
        subset=[
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO"
        ]
    )


    total_excel = len(df)

    creados = 0
    existentes = 0
    errores = 0

    primer_error = None


    # ========================================================
    # IMPORTACIÓN
    # ========================================================

    for _, fila in df.iterrows():

        ccaa = fila["CCAA"]
        provincia = fila["PROVINCIA"]
        municipio = fila["MUNICIPIO"]


        try:

            # ------------------------------------------------
            # COMPROBAR EXISTENCIA
            # ------------------------------------------------

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


            # ------------------------------------------------
            # CREAR MUNICIPIO
            # ------------------------------------------------

            nuevo = Municipio(
                ccaa=ccaa,
                provincia=provincia,
                municipio=municipio
            )


            db.add(nuevo)

            # IMPORTANTE:
            # Comprobamos inmediatamente si PostgreSQL
            # acepta el registro.
            db.flush()

            creados += 1


        except SQLAlchemyError as e:

            # ------------------------------------------------
            # ERROR DE BASE DE DATOS
            # ------------------------------------------------

            db.rollback()

            errores += 1

            if primer_error is None:

                primer_error = (
                    f"CCAA='{ccaa}', "
                    f"PROVINCIA='{provincia}', "
                    f"MUNICIPIO='{municipio}': "
                    f"{str(e)}"
                )


        except Exception as e:

            db.rollback()

            errores += 1

            if primer_error is None:

                primer_error = (
                    f"CCAA='{ccaa}', "
                    f"PROVINCIA='{provincia}', "
                    f"MUNICIPIO='{municipio}': "
                    f"{str(e)}"
                )


    # ========================================================
    # COMMIT FINAL
    # ========================================================

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        raise ValueError(
            "Error guardando municipios en la base de datos: "
            f"{e}"
        )


    # ========================================================
    # RESULTADO
    # ========================================================

    resultado = {
        "ok": True,
        "total_excel": total_excel,
        "creados": creados,
        "existentes": existentes,
        "errores": errores,
        "total_final": creados + existentes
    }


    # ========================================================
    # MOSTRAR PRIMER ERROR
    # ========================================================

    if primer_error:

        resultado["primer_error"] = primer_error


    return resultado

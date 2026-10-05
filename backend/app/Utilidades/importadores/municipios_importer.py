import io

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.municipios.models import Municipio


# ============================================================
# IMPORTADOR DE MUNICIPIOS
# ============================================================
#
# Excel esperado:
#
#   CCAA
#   PROVINCIA
#   MUNICIPIO
#
# Características:
#
# - Lee el Excel completo
# - Normaliza las columnas
# - Limpia espacios
# - Elimina filas inválidas
# - Elimina duplicados del propio Excel
# - Consulta los registros existentes en bloque
# - Inserta los nuevos en bloque
# - Evita una consulta SQL por cada municipio
# - Hace commit una sola vez
# - Devuelve estadísticas detalladas
#
# ============================================================


def importar_municipios_desde_excel(
    db: Session,
    contenido: bytes
):
    """
    Importa municipios desde un fichero Excel.

    Columnas obligatorias:

        CCAA
        PROVINCIA
        MUNICIPIO

    La combinación:

        CCAA + PROVINCIA + MUNICIPIO

    se considera un municipio único.

    Si ya existe, se cuenta como existente.
    Si no existe, se crea.

    Devuelve estadísticas de la importación.
    """

    # ========================================================
    # 1. LEER EXCEL
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
    # 2. COMPROBAR QUE EL EXCEL NO ESTÁ VACÍO
    # ========================================================

    if df is None or df.empty:

        raise ValueError(
            "El Excel de municipios está vacío."
        )


    # ========================================================
    # 3. NORMALIZAR NOMBRES DE COLUMNAS
    # ========================================================

    df.columns = [
        str(col)
        .strip()
        .upper()
        for col in df.columns
    ]


    columnas_obligatorias = [
        "CCAA",
        "PROVINCIA",
        "MUNICIPIO"
    ]


    columnas_faltantes = [
        columna
        for columna in columnas_obligatorias
        if columna not in df.columns
    ]


    if columnas_faltantes:

        raise ValueError(
            "Faltan columnas obligatorias en el Excel: "
            + ", ".join(columnas_faltantes)
        )


    # ========================================================
    # 4. QUEDARNOS SOLO CON LAS COLUMNAS NECESARIAS
    # ========================================================

    df = df[
        [
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO"
        ]
    ].copy()


    total_excel_original = len(df)


    # ========================================================
    # 5. LIMPIEZA DE DATOS
    # ========================================================

    for columna in columnas_obligatorias:

        df[columna] = (
            df[columna]
            .fillna("")
            .astype(str)
            .str.strip()
        )


    # ========================================================
    # 6. ELIMINAR FILAS COMPLETAMENTE VACÍAS
    # ========================================================

    df = df[
        ~(
            (df["CCAA"] == "")
            &
            (df["PROVINCIA"] == "")
            &
            (df["MUNICIPIO"] == "")
        )
    ].copy()


    # ========================================================
    # 7. ELIMINAR FILAS SIN DATOS OBLIGATORIOS
    # ========================================================

    df = df[
        (df["CCAA"] != "")
        &
        (df["PROVINCIA"] != "")
        &
        (df["MUNICIPIO"] != "")
    ].copy()


    # ========================================================
    # 8. ELIMINAR DUPLICADOS DEL EXCEL
    # ========================================================

    df = df.drop_duplicates(
        subset=[
            "CCAA",
            "PROVINCIA",
            "MUNICIPIO"
        ],
        keep="first"
    ).copy()


    # ========================================================
    # 9. COMPROBAR QUE QUEDAN DATOS
    # ========================================================

    if df.empty:

        return {
            "total_excel": total_excel_original,
            "filas_validas": 0,
            "creados": 0,
            "existentes": 0,
            "errores": 0,
            "total_final": 0
        }


    # ========================================================
    # 10. CONSTRUIR CLAVES ÚNICAS
    # ========================================================
    #
    # Usamos una tupla:
    #
    #   (CCAA, PROVINCIA, MUNICIPIO)
    #
    # para poder comparar rápidamente contra la BD.
    #
    # ========================================================

    claves_excel = [
        (
            fila["CCAA"],
            fila["PROVINCIA"],
            fila["MUNICIPIO"]
        )
        for _, fila in df.iterrows()
    ]


    # ========================================================
    # 11. OBTENER DATOS EXISTENTES
    # ========================================================
    #
    # No hacemos:
    #
    #   SELECT ... por cada fila
    #
    # porque con 8.132 municipios sería muy lento.
    #
    # En su lugar obtenemos los municipios existentes
    # y hacemos la comparación en memoria.
    #
    # ========================================================

    try:

        existentes_db = (
            db.query(
                Municipio.ccaa,
                Municipio.provincia,
                Municipio.municipio
            )
            .all()
        )

    except Exception as e:

        db.rollback()

        raise ValueError(
            "No se pudieron consultar los municipios existentes "
            f"en la base de datos: {e}"
        )


    # ========================================================
    # 12. CREAR SET DE MUNICIPIOS EXISTENTES
    # ========================================================

    claves_existentes = {
        (
            registro.ccaa,
            registro.provincia,
            registro.municipio
        )
        for registro in existentes_db
    }


    # ========================================================
    # 13. PREPARAR NUEVOS MUNICIPIOS
    # ========================================================

    nuevos = []

    existentes = 0

    errores = 0

    errores_detalle = []


    for clave in claves_excel:

        try:

            ccaa = clave[0]
            provincia = clave[1]
            municipio = clave[2]


            # ------------------------------------------------
            # YA EXISTE
            # ------------------------------------------------

            if clave in claves_existentes:

                existentes += 1

                continue


            # ------------------------------------------------
            # NUEVO
            # ------------------------------------------------

            nuevos.append(
                Municipio(
                    ccaa=ccaa,
                    provincia=provincia,
                    municipio=municipio
                )
            )


            # Lo añadimos también al conjunto para evitar
            # duplicados durante esta misma ejecución.

            claves_existentes.add(clave)


        except Exception as e:

            errores += 1

            if len(errores_detalle) < 20:

                errores_detalle.append(
                    {
                        "ccaa": clave[0],
                        "provincia": clave[1],
                        "municipio": clave[2],
                        "error": str(e)
                    }
                )


    # ========================================================
    # 14. INSERTAR NUEVOS MUNICIPIOS
    # ========================================================

    creados = 0


    if nuevos:

        try:

            # ------------------------------------------------
            # Añadir en bloque
            # ------------------------------------------------

            db.add_all(nuevos)

            db.commit()

            creados = len(nuevos)


        except Exception as e:

            db.rollback()

            raise ValueError(
                "Error guardando los municipios en la base "
                f"de datos: {e}"
            )


    # ========================================================
    # 15. RESULTADO
    # ========================================================

    resultado = {
        "total_excel": total_excel_original,
        "filas_validas": len(df),
        "creados": creados,
        "existentes": existentes,
        "errores": errores,
        "total_final": creados + existentes
    }


    # ========================================================
    # 16. INCLUIR DETALLE DE ERRORES SI LOS HUBIERA
    # ========================================================

    if errores_detalle:

        resultado["errores_detalle"] = errores_detalle


    return resultado

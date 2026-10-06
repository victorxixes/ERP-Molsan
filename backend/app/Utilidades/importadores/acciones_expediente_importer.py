import unicodedata
from pathlib import Path
from typing import Any, Dict

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.acciones_expediente.models import (
    AccionExpediente,
)


# ============================================================
# CABECERAS
# ============================================================

COLUMNAS_REQUERIDAS = {
    "descripcion",
}


COLUMNAS_MAPEO = {

    "departamento":
        "departamento",

    "seccion":
        "seccion",

    "actividad":
        "actividad",

    "descripcion":
        "descripcion",

}


# ============================================================
# UTILIDADES
# ============================================================

def normalizar_cabecera(
    valor: Any,
) -> str:

    if valor is None:
        return ""

    texto = str(
        valor
    ).strip().lower()

    texto = unicodedata.normalize(
        "NFD",
        texto,
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(
            caracter
        ) != "Mn"
    )

    texto = " ".join(
        texto.split()
    )

    return texto


def limpiar_texto(
    valor: Any,
) -> str | None:

    if valor is None:
        return None

    try:

        if pd.isna(valor):
            return None

    except Exception:
        pass

    texto = str(
        valor
    ).strip()

    if not texto:
        return None

    if texto.lower() in {
        "nan",
        "none",
        "null",
    }:
        return None

    return texto


def normalizar_clave(
    valor: Any,
) -> str:

    texto = limpiar_texto(
        valor
    )

    if not texto:
        return ""

    texto = unicodedata.normalize(
        "NFD",
        texto,
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(
            caracter
        ) != "Mn"
    )

    texto = " ".join(
        texto.lower().split()
    )

    return texto


def resolver_columnas(
    df: pd.DataFrame,
) -> pd.DataFrame:

    nuevas_columnas = {}

    for columna in df.columns:

        normalizada = (
            normalizar_cabecera(
                columna
            )
        )

        if (
            normalizada
            in COLUMNAS_MAPEO
        ):

            nuevas_columnas[
                columna
            ] = COLUMNAS_MAPEO[
                normalizada
            ]

    return df.rename(
        columns=nuevas_columnas
    )


def fila_vacia(
    row: pd.Series,
) -> bool:

    for valor in row.tolist():

        if (
            limpiar_texto(
                valor
            )
            is not None
        ):
            return False

    return True


# ============================================================
# IMPORTADOR
# ============================================================

def importar_excel_acciones_expediente(
    fichero: str | Path,
    db: Session,
) -> Dict[str, Any]:

    resultado = {

        "ok": False,

        "mensaje": "",

        "total_excel": 0,

        "procesados": 0,

        "creados": 0,

        "actualizados": 0,

        "sin_cambios": 0,

        "errores": 0,

        "omitidos": 0,

        "errores_detalle": [],

    }


    try:

        # ====================================================
        # LEER EXCEL
        # ====================================================

        df = pd.read_excel(
            fichero,
            dtype=object,
        )


        resultado[
            "total_excel"
        ] = int(
            len(df)
        )


        if df.empty:

            resultado["ok"] = True

            resultado[
                "mensaje"
            ] = (
                "El Excel no contiene "
                "filas de datos."
            )

            return resultado


        # ====================================================
        # CABECERAS
        # ====================================================

        df = resolver_columnas(
            df
        )


        columnas_disponibles = set(
            df.columns
        )


        faltantes = [

            columna

            for columna
            in COLUMNAS_REQUERIDAS

            if columna
            not in columnas_disponibles

        ]


        if faltantes:

            raise ValueError(
                "Faltan columnas obligatorias "
                "en el Excel: "
                + ", ".join(
                    faltantes
                )
            )


        # ====================================================
        # EXISTENTES
        # ====================================================

        existentes = (
            db.query(
                AccionExpediente
            )
            .all()
        )


        existentes_por_clave = {}

        for accion in existentes:

            clave = (
                normalizar_clave(
                    accion.departamento
                ),
                normalizar_clave(
                    accion.seccion
                ),
                normalizar_clave(
                    accion.actividad
                ),
                normalizar_clave(
                    accion.descripcion
                ),
            )

            existentes_por_clave[
                clave
            ] = accion


        # ====================================================
        # DUPLICADOS DEL PROPIO EXCEL
        # ====================================================

        claves_excel = set()


        # ====================================================
        # FILAS
        # ====================================================

        for indice, row in df.iterrows():

            try:

                if fila_vacia(
                    row
                ):

                    resultado[
                        "omitidos"
                    ] += 1

                    continue


                # ------------------------------------------------
                # CAMPOS
                # ------------------------------------------------

                departamento = (
                    limpiar_texto(
                        row.get(
                            "departamento"
                        )
                    )
                )

                seccion = (
                    limpiar_texto(
                        row.get(
                            "seccion"
                        )
                    )
                )

                actividad = (
                    limpiar_texto(
                        row.get(
                            "actividad"
                        )
                    )
                )

                descripcion = (
                    limpiar_texto(
                        row.get(
                            "descripcion"
                        )
                    )
                )


                # ------------------------------------------------
                # DESCRIPCIÓN OBLIGATORIA
                # ------------------------------------------------

                if not descripcion:

                    resultado[
                        "omitidos"
                    ] += 1

                    continue


                # ------------------------------------------------
                # CLAVE
                # ------------------------------------------------

                clave = (

                    normalizar_clave(
                        departamento
                    ),

                    normalizar_clave(
                        seccion
                    ),

                    normalizar_clave(
                        actividad
                    ),

                    normalizar_clave(
                        descripcion
                    ),

                )


                # ------------------------------------------------
                # DUPLICADO EXCEL
                # ------------------------------------------------

                if clave in claves_excel:

                    resultado[
                        "omitidos"
                    ] += 1

                    continue


                claves_excel.add(
                    clave
                )


                # ------------------------------------------------
                # EXISTENTE
                # ------------------------------------------------

                existente = (
                    existentes_por_clave.get(
                        clave
                    )
                )


                if existente:

                    valores_nuevos = {

                        "departamento":
                            departamento,

                        "seccion":
                            seccion,

                        "actividad":
                            actividad,

                        "descripcion":
                            descripcion,

                        "activo":
                            True,

                    }


                    cambios = False


                    for campo, valor in (
                        valores_nuevos.items()
                    ):

                        valor_actual = getattr(
                            existente,
                            campo,
                            None,
                        )

                        if (
                            valor_actual
                            != valor
                        ):

                            setattr(
                                existente,
                                campo,
                                valor,
                            )

                            cambios = True


                    if cambios:

                        resultado[
                            "actualizados"
                        ] += 1

                    else:

                        resultado[
                            "sin_cambios"
                        ] += 1


                # ------------------------------------------------
                # NUEVO
                # ------------------------------------------------

                else:

                    nueva_accion = (
                        AccionExpediente(
                            departamento=
                                departamento,

                            seccion=
                                seccion,

                            actividad=
                                actividad,

                            descripcion=
                                descripcion,

                            activo=True,
                        )
                    )


                    db.add(
                        nueva_accion
                    )


                    existentes_por_clave[
                        clave
                    ] = nueva_accion


                    resultado[
                        "creados"
                    ] += 1


                resultado[
                    "procesados"
                ] += 1


            except Exception as error_fila:

                resultado[
                    "errores"
                ] += 1


                if len(
                    resultado[
                        "errores_detalle"
                    ]
                ) < 100:

                    resultado[
                        "errores_detalle"
                    ].append(
                        {
                            "fila":
                                int(
                                    indice
                                ) + 2,

                            "error":
                                str(
                                    error_fila
                                ),
                        }
                    )


        # ====================================================
        # GUARDAR
        # ====================================================

        db.commit()


        resultado["ok"] = True


        resultado[
            "mensaje"
        ] = (
            "Importación de Acciones "
            "del expediente completada "
            "correctamente."
        )


        return resultado


    except Exception as error:

        db.rollback()

        resultado[
            "ok"
        ] = False

        resultado[
            "mensaje"
        ] = (
            "Error durante la importación: "
            f"{str(error)}"
        )

        return resultado

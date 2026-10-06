from io import BytesIO
import re
import unicodedata
from typing import Any, Dict, List, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.entidades_bancarias.models import (
    EntidadBancaria,
)


# ============================================================
# CONFIGURACIÓN
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

    texto = re.sub(
        r"\s+",
        " ",
        texto,
    )

    return texto.strip()


# ============================================================
# NORMALIZAR NOMBRE COLUMNA
# ============================================================

def normalizar_nombre_columna(
    nombre: Any,
) -> str:

    if nombre is None:
        return ""

    texto = str(
        nombre
    ).strip().upper()

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

    return re.sub(
        r"[^A-Z0-9]",
        "",
        texto,
    )


# ============================================================
# CLAVE
# ============================================================

def clave(
    valor: str,
) -> str:

    return normalizar_texto(
        valor
    ).casefold()


# ============================================================
# DETECTAR COLUMNAS
# ============================================================

def detectar_columnas(
    df: pd.DataFrame,
) -> Dict[str, Any]:

    columnas = {
        normalizar_nombre_columna(
            columna
        ): columna
        for columna in df.columns
    }

    aliases = {

        "codigo_europeo": {
            "CODIGOEUROPEO",
            "CODIGOEUR",
        },

        "lei": {
            "LEI",
        },

        "nombre": {
            "NOMBRE",
            "NOMBREENTIDAD",
            "ENTIDAD",
        },

        "categoria": {
            "CATEGORIA",
            "CATEGORIAENTIDAD",
        },

        "direccion": {
            "DIRECCION",
            "DOMICILIO",
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

        if encontrada is not None:

            resultado[
                campo
            ] = encontrada

    # ========================================================
    # FORMATO DESPLAZADO
    # ========================================================
    #
    # Compatible con el formato que aparece en tu tabla:
    #
    # [columna vacía, Código Europeo, LEI, Nombre,
    #  Categoría, Dirección]
    #
    # pero cuyos datos reales están en:
    #
    # [Código Europeo, LEI, Nombre, Categoría, Dirección]
    #
    # ========================================================

    if (
        "codigo_europeo" not in resultado
        or "lei" not in resultado
        or "nombre" not in resultado
    ):

        if len(df.columns) >= 5:

            primera = (
                df.iloc[:, 0]
                .map(normalizar_texto)
            )

            segunda = (
                df.iloc[:, 1]
                .map(normalizar_texto)
            )

            porcentaje_es = (
                primera
                .str.match(
                    r"^ES",
                    case=False,
                    na=False,
                )
                .mean()
            )

            porcentaje_lei = (
                segunda
                .str.len()
                .ge(15)
                .mean()
            )

            if (
                porcentaje_es > 0.5
                and porcentaje_lei > 0.5
            ):

                resultado = {
                    "codigo_europeo":
                        df.columns[0],

                    "lei":
                        df.columns[1],

                    "nombre":
                        df.columns[2],

                    "categoria":
                        df.columns[3],

                    "direccion":
                        df.columns[4],
                }

    # ========================================================
    # VALIDAR OBLIGATORIAS
    # ========================================================

    faltantes = [
        campo
        for campo in [
            "codigo_europeo",
            "nombre",
            "categoria",
        ]
        if campo not in resultado
    ]

    if faltantes:

        raise ValueError(
            "Faltan columnas obligatorias en el Excel: "
            + ", ".join(
                faltantes
            )
        )

    # --------------------------------------------------------
    # OPCIONALES
    # --------------------------------------------------------

    if "lei" not in resultado:
        resultado["lei"] = None

    if "direccion" not in resultado:
        resultado["direccion"] = None

    return resultado


# ============================================================
# IMPORTADOR
# ============================================================

def importar_excel_entidades_bancarias(
    contenido: bytes,
    db: Session,
) -> Dict[str, Any]:

    # ========================================================
    # VALIDAR
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

    except Exception:

        try:

            df = pd.read_excel(
                BytesIO(contenido)
            )

        except Exception as exc:

            raise ValueError(
                f"No se pudo leer el archivo Excel: {exc}"
            ) from exc

    total_excel = int(
        len(df)
    )

    # ========================================================
    # EXCEL VACÍO
    # ========================================================

    if df.empty:

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
    # COLUMNAS
    # ========================================================

    columnas = detectar_columnas(
        df
    )

    datos = pd.DataFrame()

    for campo in [
        "codigo_europeo",
        "lei",
        "nombre",
        "categoria",
        "direccion",
    ]:

        columna = columnas.get(
            campo
        )

        if columna is None:

            datos[campo] = ""

        else:

            datos[campo] = (
                df[columna]
            )

        datos[campo] = (
            datos[campo]
            .map(normalizar_texto)
        )

    # ========================================================
    # PREPARAR FILAS
    # ========================================================

    filas_validas: List[
        Tuple[
            str,
            str | None,
            str,
            str,
            str | None,
        ]
    ] = []

    claves_excel = set()

    errores = 0
    omitidos = 0

    errores_detalle: List[
        Dict[str, Any]
    ] = []

    # ========================================================
    # VALIDAR FILAS
    # ========================================================

    for fila_excel, fila in enumerate(
        datos.itertuples(
            index=False
        ),
        start=2,
    ):

        codigo = normalizar_texto(
            fila.codigo_europeo
        )

        lei = (
            normalizar_texto(
                fila.lei
            )
            or None
        )

        nombre = normalizar_texto(
            fila.nombre
        )

        categoria = normalizar_texto(
            fila.categoria
        )

        direccion = (
            normalizar_texto(
                fila.direccion
            )
            or None
        )

        # ----------------------------------------------------
        # FILA VACÍA
        # ----------------------------------------------------

        if not any(
            [
                codigo,
                lei,
                nombre,
                categoria,
                direccion,
            ]
        ):

            omitidos += 1

            continue

        # ----------------------------------------------------
        # CÓDIGO OBLIGATORIO
        # ----------------------------------------------------

        if not codigo:

            errores += 1

            if len(
                errores_detalle
            ) < 100:

                errores_detalle.append(
                    {
                        "fila":
                            fila_excel,

                        "error":
                            "Código Europeo vacío.",
                    }
                )

            continue

        # ----------------------------------------------------
        # NOMBRE OBLIGATORIO
        # ----------------------------------------------------

        if not nombre:

            errores += 1

            if len(
                errores_detalle
            ) < 100:

                errores_detalle.append(
                    {
                        "fila":
                            fila_excel,

                        "error":
                            "Nombre vacío.",

                        "codigo_europeo":
                            codigo,
                    }
                )

            continue

        # ----------------------------------------------------
        # CATEGORÍA OBLIGATORIA
        # ----------------------------------------------------

        if not categoria:

            errores += 1

            if len(
                errores_detalle
            ) < 100:

                errores_detalle.append(
                    {
                        "fila":
                            fila_excel,

                        "error":
                            "Categoría vacía.",

                        "codigo_europeo":
                            codigo,
                    }
                )

            continue

        # ----------------------------------------------------
        # DUPLICADO EXCEL
        # ----------------------------------------------------

        clave_codigo = clave(
            codigo
        )

        if (
            clave_codigo
            in claves_excel
        ):

            omitidos += 1

            continue

        claves_excel.add(
            clave_codigo
        )

        filas_validas.append(
            (
                codigo,
                lei,
                nombre,
                categoria,
                direccion,
            )
        )

    # ========================================================
    # CARGAR EXISTENTES
    # ========================================================

    existentes = (
        db.query(
            EntidadBancaria
        )
        .all()
    )

    existentes_por_codigo = {
        clave(
            registro.codigo_europeo
        ): registro
        for registro in existentes
    }

    # ========================================================
    # CONTADORES
    # ========================================================

    procesados = 0
    creados = 0
    actualizados = 0
    sin_cambios = 0

    # ========================================================
    # IMPORTACIÓN POR LOTES
    # ========================================================

    try:

        for inicio in range(
            0,
            len(filas_validas),
            BATCH_SIZE,
        ):

            lote = filas_validas[
                inicio:
                inicio + BATCH_SIZE
            ]

            for (
                codigo,
                lei,
                nombre,
                categoria,
                direccion,
            ) in lote:

                existente = (
                    existentes_por_codigo.get(
                        clave(codigo)
                    )
                )

                # ==========================================
                # NUEVA
                # ==========================================

                if existente is None:

                    nueva = EntidadBancaria(
                        codigo_europeo=codigo,
                        lei=lei,
                        nombre=nombre,
                        categoria=categoria,
                        direccion=direccion,
                        activo=True,
                    )

                    db.add(
                        nueva
                    )

                    existentes_por_codigo[
                        clave(codigo)
                    ] = nueva

                    creados += 1

                    continue

                # ==========================================
                # EXISTENTE
                # ==========================================

                cambio = False

                if existente.lei != lei:

                    existente.lei = lei

                    cambio = True

                if existente.nombre != nombre:

                    existente.nombre = nombre

                    cambio = True

                if existente.categoria != categoria:

                    existente.categoria = (
                        categoria
                    )

                    cambio = True

                if existente.direccion != direccion:

                    existente.direccion = (
                        direccion
                    )

                    cambio = True

                if existente.activo is not True:

                    existente.activo = True

                    cambio = True

                if cambio:

                    actualizados += 1

                else:

                    sin_cambios += 1

            # ------------------------------------------------
            # FLUSH
            # ------------------------------------------------

            db.flush()

            procesados += len(
                lote
            )

        # ====================================================
        # COMMIT
        # ====================================================

        db.commit()

    except Exception as exc:

        db.rollback()

        raise ValueError(
            "Error guardando las entidades bancarias: "
            f"{exc}"
        ) from exc

    # ========================================================
    # RESPUESTA
    # ========================================================

    return {

        "ok": True,

        "mensaje": (
            "Importación de entidades bancarias "
            "completada correctamente."
        ),

        "total_excel":
            total_excel,

        "procesados":
            procesados,

        "creados":
            creados,

        "actualizados":
            actualizados,

        "sin_cambios":
            sin_cambios,

        "errores":
            errores,

        "omitidos":
            omitidos,

        "errores_detalle":
            errores_detalle[:100],
    }

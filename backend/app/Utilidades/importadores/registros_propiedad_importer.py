from io import BytesIO
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.registros_propiedad.models import (
    RegistroPropiedad,
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
# NORMALIZAR COLUMNA
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

    texto = re.sub(
        r"[^A-Z0-9]",
        "",
        texto,
    )

    return texto


# ============================================================
# NORMALIZAR SÍ / NO
# ============================================================

def normalizar_booleano(
    valor: Any,
) -> bool:

    texto = normalizar_texto(
        valor
    ).casefold()

    if texto in {
        "si",
        "sí",
        "s",
        "yes",
        "y",
        "true",
        "1",
        "x",
        "si/no",
    }:

        # "Si/No" que aparece como ejemplo de encabezado
        # no debería llegar como dato real. Si llega en una
        # fila, no lo consideramos afirmativo.
        if texto == "si/no":
            return False

        return True

    return False


# ============================================================
# CLAVE REGISTRO
# ============================================================

def clave_registro(
    valor: str,
) -> str:

    return (
        normalizar_texto(
            valor
        )
        .casefold()
    )


# ============================================================
# DETECTAR COLUMNAS
# ============================================================

def detectar_columnas(
    df: pd.DataFrame,
) -> Dict[str, Optional[Any]]:

    columnas = {}

    for columna in df.columns:

        normalizada = (
            normalizar_nombre_columna(
                columna
            )
        )

        columnas[
            normalizada
        ] = columna

    aliases = {

        "registro_propiedad": {
            "REGISTRODELAPROPIEDAD",
            "REGISTROPROPIEDAD",
            "REGISTRO",
        },

        "nombre_registrador": {
            "NOMBREREGISTRADOR",
            "REGISTRADOR",
        },

        "direccion": {
            "DIRECCION",
            "DOMICILIO",
        },

        "codigo_postal": {
            "CODIGOPOSTAL",
            "CP",
        },

        "poblacion": {
            "POBLACION",
            "LOCALIDAD",
        },

        "provincia": {
            "PROVINCIA",
        },

        "telefono": {
            "TELEFONO",
            "TEL",
        },

        "telefono_2": {
            "TELEFONO2",
            "TEL2",
            "TELEFONOSECUNDARIO",
        },

        "fax": {
            "FAX",
        },

        "whatsapp": {
            "WHATSAPP",
        },

        "email_1": {
            "EMAIL1",
            "EMAIL",
            "CORREO",
            "CORREOELECTRONICO",
        },

        "email_2": {
            "EMAIL2",
        },

        "iban": {
            "IBAN",
        },

        "comentarios": {
            "COMENTARIOS",
            "OBSERVACIONES",
        },

        "tiene_of_liq": {
            "TIENEOFLIQ",
            "TIENEOFLIQUIDADORA",
            "TIENEOFLIQUIDADORAS",
            "OFICINALIQUIDADORA",
            "OFICINASLIQUIDADORAS",
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

        resultado[
            campo
        ] = encontrada

    # --------------------------------------------------------
    # OBLIGATORIO
    # --------------------------------------------------------

    if (
        resultado[
            "registro_propiedad"
        ] is None
    ):

        disponibles = ", ".join(
            str(columna)
            for columna in df.columns
        )

        raise ValueError(
            "No se encuentra la columna obligatoria "
            "'Registro de la propiedad'. "
            f"Columnas detectadas: {disponibles}"
        )

    return resultado


# ============================================================
# IMPORTADOR PRINCIPAL
# ============================================================

def importar_excel_registros_propiedad(
    contenido: bytes,
    db: Session,
) -> Dict[str, Any]:

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
                "No se pudo leer el archivo Excel: "
                f"{exc}"
            ) from exc

    total_excel = int(
        len(df)
    )

    # ========================================================
    # VACÍO
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
    # DETECTAR COLUMNAS
    # ========================================================

    columnas = detectar_columnas(
        df
    )

    # ========================================================
    # PREPARAR DATOS
    # ========================================================

    def obtener_columna(
        campo,
    ):

        columna = columnas.get(
            campo
        )

        if columna is None:

            return pd.Series(
                [""] * len(df)
            )

        return df[
            columna
        ]

    registros = []

    errores = 0
    omitidos = 0

    errores_detalle: List[
        Dict[str, Any]
    ] = []

    claves_excel = set()

    # ========================================================
    # RECORRER EXCEL
    # ========================================================

    for numero_fila, valores in enumerate(
        zip(
            obtener_columna(
                "registro_propiedad"
            ),
            obtener_columna(
                "nombre_registrador"
            ),
            obtener_columna(
                "direccion"
            ),
            obtener_columna(
                "codigo_postal"
            ),
            obtener_columna(
                "poblacion"
            ),
            obtener_columna(
                "provincia"
            ),
            obtener_columna(
                "telefono"
            ),
            obtener_columna(
                "telefono_2"
            ),
            obtener_columna(
                "fax"
            ),
            obtener_columna(
                "whatsapp"
            ),
            obtener_columna(
                "email_1"
            ),
            obtener_columna(
                "email_2"
            ),
            obtener_columna(
                "iban"
            ),
            obtener_columna(
                "comentarios"
            ),
            obtener_columna(
                "tiene_of_liq"
            ),
        ),
        start=2,
    ):

        (
            registro_propiedad,
            nombre_registrador,
            direccion,
            codigo_postal,
            poblacion,
            provincia,
            telefono,
            telefono_2,
            fax,
            whatsapp,
            email_1,
            email_2,
            iban,
            comentarios,
            tiene_of_liq,
        ) = valores

        registro_propiedad = normalizar_texto(
            registro_propiedad
        )

        nombre_registrador = (
            normalizar_texto(
                nombre_registrador
            )
            or None
        )

        direccion = (
            normalizar_texto(
                direccion
            )
            or None
        )

        codigo_postal = (
            normalizar_texto(
                codigo_postal
            )
            or None
        )

        # ----------------------------------------------------
        # CORREGIR CÓDIGO POSTAL NUMÉRICO TIPO 8038.0
        # ----------------------------------------------------

        if codigo_postal:

            if re.fullmatch(
                r"\d+\.0",
                codigo_postal,
            ):

                codigo_postal = (
                    codigo_postal[:-2]
                )

        poblacion = (
            normalizar_texto(
                poblacion
            )
            or None
        )

        provincia = (
            normalizar_texto(
                provincia
            )
            or None
        )

        telefono = (
            normalizar_texto(
                telefono
            )
            or None
        )

        telefono_2 = (
            normalizar_texto(
                telefono_2
            )
            or None
        )

        fax = (
            normalizar_texto(
                fax
            )
            or None
        )

        whatsapp = (
            normalizar_texto(
                whatsapp
            )
            or None
        )

        email_1 = (
            normalizar_texto(
                email_1
            )
            or None
        )

        email_2 = (
            normalizar_texto(
                email_2
            )
            or None
        )

        iban = (
            normalizar_texto(
                iban
            )
            or None
        )

        comentarios = (
            normalizar_texto(
                comentarios
            )
            or None
        )

        tiene_of_liq_bool = (
            normalizar_booleano(
                tiene_of_liq
            )
        )

        # ----------------------------------------------------
        # FILA VACÍA
        # ----------------------------------------------------

        if not any(
            [
                registro_propiedad,
                nombre_registrador,
                direccion,
                codigo_postal,
                poblacion,
                provincia,
                telefono,
                telefono_2,
                fax,
                whatsapp,
                email_1,
                email_2,
                iban,
                comentarios,
            ]
        ):

            omitidos += 1

            continue

        # ----------------------------------------------------
        # REGISTRO OBLIGATORIO
        # ----------------------------------------------------

        if not registro_propiedad:

            errores += 1

            if len(
                errores_detalle
            ) < 100:

                errores_detalle.append(
                    {
                        "fila": numero_fila,
                        "error": (
                            "Registro de la propiedad "
                            "vacío."
                        ),
                    }
                )

            continue

        # ----------------------------------------------------
        # DUPLICADO
        # ----------------------------------------------------

        clave = clave_registro(
            registro_propiedad
        )

        if clave in claves_excel:

            omitidos += 1

            continue

        claves_excel.add(
            clave
        )

        registros.append(
            (
                registro_propiedad,
                nombre_registrador,
                direccion,
                codigo_postal,
                poblacion,
                provincia,
                telefono,
                telefono_2,
                fax,
                whatsapp,
                email_1,
                email_2,
                iban,
                comentarios,
                tiene_of_liq_bool,
            )
        )

    # ========================================================
    # CARGAR EXISTENTES
    # ========================================================

    existentes = (
        db.query(
            RegistroPropiedad
        )
        .all()
    )

    existentes_por_clave = {
        clave_registro(
            registro.registro_propiedad
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
    # PROCESAR
    # ========================================================

    try:

        for inicio in range(
            0,
            len(registros),
            BATCH_SIZE,
        ):

            lote = registros[
                inicio:
                inicio + BATCH_SIZE
            ]

            for datos in lote:

                (
                    registro_propiedad,
                    nombre_registrador,
                    direccion,
                    codigo_postal,
                    poblacion,
                    provincia,
                    telefono,
                    telefono_2,
                    fax,
                    whatsapp,
                    email_1,
                    email_2,
                    iban,
                    comentarios,
                    tiene_of_liq,
                ) = datos

                clave_actual = clave_registro(
                    registro_propiedad
                )

                existente = (
                    existentes_por_clave.get(
                        clave_actual
                    )
                )

                # =========================================
                # NUEVO
                # =========================================

                if existente is None:

                    nuevo = RegistroPropiedad(
                        registro_propiedad=(
                            registro_propiedad
                        ),
                        nombre_registrador=(
                            nombre_registrador
                        ),
                        direccion=direccion,
                        codigo_postal=(
                            codigo_postal
                        ),
                        poblacion=poblacion,
                        provincia=provincia,
                        telefono=telefono,
                        telefono_2=telefono_2,
                        fax=fax,
                        whatsapp=whatsapp,
                        email_1=email_1,
                        email_2=email_2,
                        iban=iban,
                        comentarios=comentarios,
                        tiene_of_liq=(
                            tiene_of_liq
                        ),
                        activo=True,
                    )

                    db.add(
                        nuevo
                    )

                    existentes_por_clave[
                        clave_actual
                    ] = nuevo

                    creados += 1

                    continue

                # =========================================
                # EXISTENTE
                # =========================================

                cambio = False

                campos = {
                    "nombre_registrador":
                        nombre_registrador,

                    "direccion":
                        direccion,

                    "codigo_postal":
                        codigo_postal,

                    "poblacion":
                        poblacion,

                    "provincia":
                        provincia,

                    "telefono":
                        telefono,

                    "telefono_2":
                        telefono_2,

                    "fax":
                        fax,

                    "whatsapp":
                        whatsapp,

                    "email_1":
                        email_1,

                    "email_2":
                        email_2,

                    "iban":
                        iban,

                    "comentarios":
                        comentarios,

                    "tiene_of_liq":
                        tiene_of_liq,
                }

                for campo, valor in (
                    campos.items()
                ):

                    if getattr(
                        existente,
                        campo,
                    ) != valor:

                        setattr(
                            existente,
                            campo,
                            valor,
                        )

                        cambio = True

                # ------------------------------------------------
                # REACTIVAR
                # ------------------------------------------------

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
            "Error guardando los registros de la propiedad: "
            f"{exc}"
        ) from exc

    # ========================================================
    # RESULTADO
    # ========================================================

    return {

        "ok": True,

        "mensaje": (
            "Importación de registros de la propiedad "
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

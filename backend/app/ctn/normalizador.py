import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(valor) -> str:
    """
    Limpieza general de texto.

    IMPORTANTE:
    NO elimina números.

    Los números son imprescindibles en las direcciones
    postales y especialmente para geocodificación.
    """

    if valor is None:
        return ""

    texto = str(valor).strip()

    if not texto:
        return ""

    # --------------------------------------------------------
    # Unicode / acentos
    # --------------------------------------------------------

    texto = unicodedata.normalize(
        "NFKC",
        texto
    )

    # --------------------------------------------------------
    # Espacios múltiples
    # --------------------------------------------------------

    texto = re.sub(
        r"\s+",
        " ",
        texto
    )

    # --------------------------------------------------------
    # Espacios antes de comas
    # --------------------------------------------------------

    texto = re.sub(
        r"\s+,",
        ",",
        texto
    )

    # --------------------------------------------------------
    # Comas duplicadas
    # --------------------------------------------------------

    texto = re.sub(
        r",\s*,+",
        ",",
        texto
    )

    return texto.strip(" ,")


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección sin eliminar el número de la calle.

    IMPORTANTE:
    Nunca se eliminan números de calle ni códigos postales.
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(
        direccion
    )

    if not direccion:
        return ""

    # --------------------------------------------------------
    # Eliminar únicamente elementos de interior
    # --------------------------------------------------------
    #
    # NO eliminamos números generales.
    #
    # Google recomienda utilizar direcciones postales completas
    # y evitar elementos adicionales como piso/local cuando
    # no formen parte de la dirección postal principal.
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b("
        r"planta|"
        r"piso|"
        r"bajo|"
        r"local|"
        r"entresuelo|"
        r"izq|"
        r"izquierda|"
        r"izd|"
        r"dch|"
        r"dcha|"
        r"derecha|"
        r"puerta|"
        r"escalera|"
        r"esc|"
        r"bloque|"
        r"oficina|"
        r"despacho"
        r")\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Eliminar ordinales de interior:
    #
    # 3ºA
    # 2º
    # 4ª
    #
    # PERO no eliminar el número de calle.
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Normalizar espacios
    # --------------------------------------------------------

    direccion = re.sub(
        r"\s+",
        " ",
        direccion
    )

    # --------------------------------------------------------
    # Limpiar comas
    # --------------------------------------------------------

    direccion = re.sub(
        r"\s+,",
        ",",
        direccion
    )

    direccion = re.sub(
        r",\s*,+",
        ",",
        direccion
    )

    direccion = direccion.strip(
        " ,"
    )

    return direccion

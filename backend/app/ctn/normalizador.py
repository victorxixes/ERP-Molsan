import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(s: str) -> str:
    """
    Normaliza texto sin eliminar información importante
    de la dirección.

    IMPORTANTE:
    NO elimina números porque los números pueden ser
    el número de la calle.
    """

    if not s:
        return ""

    s = str(s)

    # --------------------------------------------------------
    # Normalizar acentos
    # --------------------------------------------------------

    s = unicodedata.normalize(
        "NFKD",
        s
    ).encode(
        "ascii",
        "ignore"
    ).decode(
        "ascii"
    )

    # --------------------------------------------------------
    # Espacios
    # --------------------------------------------------------

    s = re.sub(
        r"\s+",
        " ",
        s
    )

    # --------------------------------------------------------
    # Espacios antes de comas
    # --------------------------------------------------------

    s = re.sub(
        r"\s+,",
        ",",
        s
    )

    # --------------------------------------------------------
    # Espacios después de comas
    # --------------------------------------------------------

    s = re.sub(
        r",\s*",
        ", ",
        s
    )

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección para geocodificación.

    IMPORTANTE:
    Conserva el número de la calle.

    Ejemplo:

        Carrer de Mallorca 123, 08036 Barcelona

    NO debe convertirse en:

        Carrer de Mallorca, Barcelona
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(
        direccion
    )

    if not direccion:
        return ""

    # ========================================================
    # ABREVIATURAS DE INTERIOR
    # ========================================================
    #
    # Solo eliminamos palabras que representan información
    # interior del edificio.
    #
    # NO eliminamos números generales.
    #
    # ========================================================

    direccion = re.sub(
        r"\b(planta|piso|bajo|local|entresuelo|"
        r"izq|izquierda|izd|"
        r"dch|derecha|"
        r"apto|apta|apt|"
        r"puerta|"
        r"escalera|"
        r"bloque|"
        r"oficina|"
        r"despacho)\b",
        "",
        direccion,
        flags=re.IGNORECASE
    )

    # ========================================================
    # ORDINALES DE INTERIOR
    # ========================================================
    #
    # Ejemplos:
    #
    # 3º
    # 4ª
    #
    # Esto sí puede eliminarse porque normalmente corresponde
    # a piso/planta.
    #
    # ========================================================

    direccion = re.sub(
        r"\b\d+\s*[ºª]\b",
        "",
        direccion,
        flags=re.IGNORECASE
    )

    # ========================================================
    # LETRAS SUELTAS DE INTERIOR
    # ========================================================
    #
    # NO eliminamos números.
    #
    # Solamente eliminamos letras aisladas que normalmente
    # aparecen como:
    #
    # "3 A"
    # "2 B"
    #
    # pero intentamos no tocar nombres de calles.
    #
    # ========================================================

    direccion = re.sub(
        r"(?<=\d)\s+[A-Za-z]\b",
        "",
        direccion
    )

    # ========================================================
    # PARÉNTESIS
    # ========================================================

    direccion = re.sub(
        r"\([^)]*\)",
        "",
        direccion
    )

    # ========================================================
    # COMAS DUPLICADAS
    # ========================================================

    direccion = re.sub(
        r",\s*,+",
        ",",
        direccion
    )

    # ========================================================
    # ESPACIOS DUPLICADOS
    # ========================================================

    direccion = re.sub(
        r"\s+",
        " ",
        direccion
    )

    # ========================================================
    # ESPACIOS ANTES DE COMAS
    # ========================================================

    direccion = re.sub(
        r"\s+,",
        ",",
        direccion
    )

    # ========================================================
    # COMAS AL PRINCIPIO / FINAL
    # ========================================================

    direccion = direccion.strip(
        " ,"
    )

    return direccion

import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(s: str) -> str:
    """
    Normaliza un texto manteniendo la información útil
    para geocodificación.
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
    # Espacios antes/después de comas
    # --------------------------------------------------------

    s = re.sub(
        r"\s*,\s*",
        ", ",
        s
    )

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección para Google Maps.

    IMPORTANTE:
    NO elimina números de calle ni códigos postales.
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(
        direccion
    )

    if not direccion:
        return ""

    # ========================================================
    # ELIMINAR INFORMACIÓN INTERIOR
    # ========================================================
    #
    # Eliminamos solamente referencias que pueden confundir
    # a Google dentro de una dirección.
    #
    # Ejemplo:
    #
    # "Calle Mayor 25, 3º A"
    #
    # -> "Calle Mayor 25"
    #
    # PERO mantenemos:
    #
    # "Calle Mayor 25"
    #
    # ========================================================

    direccion = re.sub(
        r"""
        \b(
            planta|
            piso|
            bajo|
            local|
            entresuelo|
            puerta|
            escalera|
            bloque|
            oficina|
            despacho|
            apta|
            apt|
            apartamento|
            izq|
            izd|
            dcha|
            dch
        )\b
        [\s\.-]*[A-Za-z0-9ºª\-]*
        """,
        " ",
        direccion,
        flags=re.IGNORECASE | re.VERBOSE
    )

    # ========================================================
    # ELIMINAR ORDINALES DE PISO
    # ========================================================

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        " ",
        direccion,
        flags=re.IGNORECASE
    )

    # ========================================================
    # ELIMINAR LETRA SUELTA SOLO DESPUÉS DE UN NÚMERO
    # ========================================================
    #
    # "25 A" -> "25"
    #
    # NO eliminar letras normales de nombres de calles.
    #
    # ========================================================

    direccion = re.sub(
        r"(\d+)\s+[A-Za-z]\b",
        r"\1",
        direccion
    )

    # ========================================================
    # LIMPIAR COMAS
    # ========================================================

    direccion = re.sub(
        r"\s*,\s*,+",
        ", ",
        direccion
    )

    direccion = re.sub(
        r",\s*,+",
        ", ",
        direccion
    )

    direccion = re.sub(
        r"\s+",
        " ",
        direccion
    )

    direccion = direccion.strip(
        " ,"
    )

    return direccion

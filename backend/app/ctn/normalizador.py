import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(s: str) -> str:
    if not s:
        return ""

    s = str(s)

    # Normalizar acentos
    s = (
        unicodedata
        .normalize("NFKD", s)
        .encode("ascii", "ignore")
        .decode("ascii")
    )

    # Espacios múltiples
    s = re.sub(r"\s+", " ", s)

    # Espacios antes de comas
    s = re.sub(r"\s+,", ",", s)

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección para geocodificación.

    IMPORTANTE:
    NO elimina el número principal de la calle.

    Ejemplo:

        "C/ Mallorca 123, 2º A"
        ->
        "C Mallorca 123"
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(direccion)

    if not direccion:
        return ""

    # ========================================================
    # NORMALIZAR ABREVIATURAS
    # ========================================================

    direccion = re.sub(
        r"\bC\/\b",
        "Calle",
        direccion,
        flags=re.IGNORECASE,
    )

    direccion = re.sub(
        r"\bC\.\b",
        "Calle",
        direccion,
        flags=re.IGNORECASE,
    )

    direccion = re.sub(
        r"\bAVDA\.\b",
        "Avenida",
        direccion,
        flags=re.IGNORECASE,
    )

    direccion = re.sub(
        r"\bAV\.\b",
        "Avenida",
        direccion,
        flags=re.IGNORECASE,
    )

    direccion = re.sub(
        r"\bPZA\.\b",
        "Plaza",
        direccion,
        flags=re.IGNORECASE,
    )

    # ========================================================
    # ELIMINAR INFORMACIÓN DE PISO / PUERTA
    # ========================================================

    direccion = re.sub(
        r"\b(planta|piso|bajo|local|entresuelo|puerta|escalera|bloque|oficina|despacho)\s*[:.]?\s*[0-9A-Za-zºª\-]*",
        "",
        direccion,
        flags=re.IGNORECASE,
    )

    # ========================================================
    # ELIMINAR ORDINALES DE PISO
    #
    # 3º
    # 4ª
    # 2ºA
    # ========================================================

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        "",
        direccion,
        flags=re.IGNORECASE,
    )

    # ========================================================
    # ELIMINAR LETRAS SUELTAS QUE REPRESENTAN PUERTA
    #
    # Solo si están separadas y aparecen al final.
    # NO eliminamos números normales.
    # ========================================================

    direccion = re.sub(
        r"\s+[A-Za-z]\s*$",
        "",
        direccion,
    )

    # ========================================================
    # LIMPIAR COMAS
    # ========================================================

    direccion = re.sub(
        r"\s*,\s*",
        ", ",
        direccion,
    )

    direccion = re.sub(
        r",\s*,+",
        ",",
        direccion,
    )

    direccion = direccion.strip(" ,")

    # ========================================================
    # ESPACIOS
    # ========================================================

    direccion = re.sub(
        r"\s+",
        " ",
        direccion,
    )

    return direccion.strip()

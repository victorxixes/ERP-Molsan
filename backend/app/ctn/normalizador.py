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

    # Normalizar espacios
    s = re.sub(r"\s+", " ", s)

    # Quitar espacios antes de comas
    s = re.sub(r"\s+,", ",", s)

    # Quitar espacios después de comas
    s = re.sub(r",\s*", ", ", s)

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección para geocodificación.

    IMPORTANTE:
    NO elimina números de calle ni códigos postales.

    Ejemplo:

        Carrer Mallorca 123, 08036, Barcelona

    debe conservar:

        123
        08036
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(direccion)

    # ========================================================
    # ELIMINAR INFORMACIÓN INTERIOR DEL INMUEBLE
    # ========================================================

    direccion = re.sub(
        r"\b(planta|piso|bajo|local|entresuelo|"
        r"izq|izda|izd|dcha|dch|"
        r"apto|apt|ap|"
        r"puerta|pta|"
        r"escalera|esc|"
        r"bloque|blq|"
        r"oficina|of|"
        r"despacho)\b"
        r"[\s\.:,-]*"
        r"[A-Za-z0-9ºª\-]*",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # ========================================================
    # ELIMINAR SOLO INDICADORES DE PISO
    #
    # 3º
    # 4ª
    # 2ºA
    # ========================================================

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # ========================================================
    # ELIMINAR LETRAS SUELTAS DE PUERTA
    #
    # PERO NO ELIMINAR NÚMEROS NORMALES.
    # ========================================================

    direccion = re.sub(
        r"(?i)(?:,\s*|\s+)[A-Za-z]\s*$",
        "",
        direccion,
    )

    # ========================================================
    # LIMPIEZA FINAL
    # ========================================================

    direccion = re.sub(
        r"\s+",
        " ",
        direccion,
    )

    direccion = re.sub(
        r",\s*,+",
        ", ",
        direccion,
    )

    direccion = re.sub(
        r"\s+,",
        ",",
        direccion,
    )

    direccion = direccion.strip(" ,")

    return direccion.strip()

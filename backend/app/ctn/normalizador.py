import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(s: str) -> str:
    """
    Normaliza un texto para utilizarlo en búsquedas/geocodificación.
    """

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

    # Comas repetidas
    s = re.sub(r",+", ",", s)

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección antes de enviarla a Google Maps.

    IMPORTANTE:
    No elimina números de calle.
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(direccion)

    if not direccion:
        return ""

    # --------------------------------------------------------
    # Eliminar información de piso / puerta / oficina
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b("
        r"planta|"
        r"piso|"
        r"bajo|"
        r"local|"
        r"entresuelo|"
        r"izq|"
        r"izd|"
        r"dch|"
        r"apta|"
        r"apt|"
        r"ap|"
        r"aplanta|"
        r"puerta|"
        r"escalera|"
        r"bloque|"
        r"oficina|"
        r"despacho"
        r")\b",
        "",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Eliminar ordinales de piso
    # Ejemplo:
    # 3º
    # 4ª
    # 2ºA
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        "",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Limpiar espacios
    # --------------------------------------------------------

    direccion = re.sub(r"\s+", " ", direccion)

    # --------------------------------------------------------
    # Limpiar comas
    # --------------------------------------------------------

    direccion = re.sub(r"\s+,", ",", direccion)
    direccion = re.sub(r",\s*,+", ",", direccion)

    direccion = direccion.strip(" ,")

    return direccion.strip()

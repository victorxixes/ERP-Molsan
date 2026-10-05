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

    # Espacio antes de coma
    s = re.sub(r"\s+,", ",", s)

    # Espacio después de coma
    s = re.sub(r",\s*", ", ", s)

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN PARA GOOGLE
#
# IMPORTANTE:
# NO ELIMINAR LOS NÚMEROS DE PORTAL.
#
# Ejemplo:
#
# "Carrer Mallorca 123, 08013 Barcelona"
#
# DEBE CONSERVARSE COMO:
#
# "Carrer Mallorca 123, 08013 Barcelona"
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    if not direccion:
        return ""

    direccion = limpiar_texto(direccion)

    # --------------------------------------------------------
    # Eliminar únicamente información de piso/puerta/etc.
    #
    # NO eliminamos números normales porque pueden ser
    # números de portal.
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b(planta|piso|bajo|local|entresuelo|"
        r"izd|izquierda|dch|derecha|"
        r"apta|apt|ap|aplanta|"
        r"puerta|escalera|bloque|"
        r"oficina|despacho)\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Eliminar ordinales de piso:
    #
    # 3º
    # 4ª
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b\d+\s*[ºª]\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Eliminar combinaciones típicas de puerta:
    #
    # 3ºA
    # 4ªB
    #
    # PERO NO eliminar:
    #
    # 123
    # 12
    # 45A
    #
    # porque pueden ser números de portal.
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # Limpiar comas duplicadas
    # --------------------------------------------------------

    direccion = re.sub(
        r",\s*,+",
        ", ",
        direccion,
    )

    # --------------------------------------------------------
    # Limpiar espacios
    # --------------------------------------------------------

    direccion = re.sub(
        r"\s+",
        " ",
        direccion,
    )

    # --------------------------------------------------------
    # Limpiar espacios alrededor de comas
    # --------------------------------------------------------

    direccion = re.sub(
        r"\s*,\s*",
        ", ",
        direccion,
    )

    # --------------------------------------------------------
    # Quitar comas repetidas / extremos
    # --------------------------------------------------------

    direccion = re.sub(
        r",\s*,+",
        ", ",
        direccion,
    )

    direccion = direccion.strip(" ,")

    return direccion.strip()

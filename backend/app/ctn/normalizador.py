import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(s: str) -> str:
    """
    Normaliza un texto sin destruir información útil
    para geocodificación.

    IMPORTANTE:
    NO elimina números porque pueden ser:
    - número de portal
    - código postal
    - carretera
    - kilómetro
    """

    if not s:
        return ""

    s = str(s)

    # --------------------------------------------------------
    # NORMALIZAR UNICODE
    # --------------------------------------------------------

    s = unicodedata.normalize(
        "NFKD",
        s
    )

    # --------------------------------------------------------
    # ELIMINAR ACENTOS
    # --------------------------------------------------------

    s = (
        s
        .encode("ascii", "ignore")
        .decode("ascii")
    )

    # --------------------------------------------------------
    # NORMALIZAR ESPACIOS
    # --------------------------------------------------------

    s = re.sub(
        r"\s+",
        " ",
        s
    )

    # --------------------------------------------------------
    # ESPACIOS ANTES DE COMAS
    # --------------------------------------------------------

    s = re.sub(
        r"\s+,",
        ",",
        s
    )

    # --------------------------------------------------------
    # ESPACIOS DESPUÉS DE COMAS
    # --------------------------------------------------------

    s = re.sub(
        r",\s*",
        ", ",
        s
    )

    # --------------------------------------------------------
    # COMAS DUPLICADAS
    # --------------------------------------------------------

    s = re.sub(
        r",\s*,+",
        ", ",
        s
    )

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección para enviarla a Google Maps.

    MUY IMPORTANTE:
    No elimina números de portal ni códigos postales.
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(
        direccion
    )

    if not direccion:
        return ""

    # ========================================================
    # ELIMINAR INFORMACIÓN INTERIOR DEL INMUEBLE
    # ========================================================
    #
    # Solo eliminamos elementos que pueden perjudicar
    # la búsqueda:
    #
    # piso, puerta, escalera, oficina, etc.
    #
    # NO eliminamos números de calle.
    #
    # ========================================================

    direccion = re.sub(
        r"\b("
        r"planta|"
        r"piso|"
        r"bajo|"
        r"local|"
        r"entresuelo|"
        r"izquierda|"
        r"derecha|"
        r"izq|"
        r"dch|"
        r"apto|"
        r"apta|"
        r"apt|"
        r"puerta|"
        r"escalera|"
        r"bloque|"
        r"oficina|"
        r"despacho"
        r")\b"
        r"[^,]*",
        "",
        direccion,
        flags=re.IGNORECASE
    )

    # ========================================================
    # ELIMINAR ORDINALES DE PISO
    # ========================================================
    #
    # Ejemplo:
    # 3ºA
    # 4ª
    #
    # PERO NO tocar:
    # 123
    # 08036
    #
    # ========================================================

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        "",
        direccion
    )

    # ========================================================
    # NORMALIZAR ESPACIOS
    # ========================================================

    direccion = re.sub(
        r"\s+",
        " ",
        direccion
    )

    # ========================================================
    # NORMALIZAR COMAS
    # ========================================================

    direccion = re.sub(
        r"\s+,",
        ",",
        direccion
    )

    direccion = re.sub(
        r",\s*,+",
        ", ",
        direccion
    )

    # ========================================================
    # QUITAR COMAS INICIALES / FINALES
    # ========================================================

    direccion = direccion.strip(
        " ,"
    )

    return direccion

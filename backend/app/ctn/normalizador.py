import re
import unicodedata


# ============================================================
# NORMALIZACIÓN GENERAL
# ============================================================

def limpiar_texto(valor) -> str:
    """
    Normaliza un texto para utilizarlo en búsquedas.

    - Convierte None en ""
    - Elimina acentos
    - Normaliza espacios
    - Limpia espacios alrededor de comas
    """

    if valor is None:
        return ""

    texto = str(valor).strip()

    if not texto:
        return ""

    texto = unicodedata.normalize(
        "NFKD",
        texto
    ).encode(
        "ascii",
        "ignore"
    ).decode(
        "ascii"
    )

    texto = re.sub(
        r"\s+",
        " ",
        texto
    )

    texto = re.sub(
        r"\s+,",
        ",",
        texto
    )

    texto = re.sub(
        r",\s*",
        ", ",
        texto
    )

    return texto.strip()


# ============================================================
# NORMALIZAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion) -> str:
    """
    Limpia una dirección sin destruir información útil.

    IMPORTANTE:
    NO elimina los números de portal.

    Una dirección como:

        Carrer Mallorca 123, 2º A

    debe conservar el 123 porque es necesario para
    localizar correctamente la notaría.
    """

    direccion = limpiar_texto(direccion)

    if not direccion:
        return ""

    # --------------------------------------------------------
    # Eliminar información secundaria de piso/puerta
    # --------------------------------------------------------

    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        "",
        direccion,
        flags=re.IGNORECASE
    )

    direccion = re.sub(
        r"\b(planta|piso|bajo|local|entresuelo|"
        r"izquierda|izq|derecha|dcha|dch|"
        r"puerta|pta|escalera|esc|bloque|"
        r"oficina|despacho)\b"
        r"\s*[A-Za-z0-9ºª\-]*",
        "",
        direccion,
        flags=re.IGNORECASE
    )

    # --------------------------------------------------------
    # Limpiar espacios
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
        r"\s*,\s*",
        ", ",
        direccion
    )

    direccion = re.sub(
        r",\s*,+",
        ", ",
        direccion
    )

    direccion = direccion.strip(
        " ,"
    )

    return direccion


# ============================================================
# CONSTRUIR DIRECCIÓN COMPLETA
# ============================================================

def construir_direccion_busqueda(
    direccion=None,
    cp=None,
    municipio=None,
    provincia=None,
) -> str:
    """
    Construye una dirección completa para geocodificación.

    Ejemplo:

        direccion = "Carrer Mallorca 123"
        cp = "08036"
        municipio = "Barcelona"
        provincia = "Barcelona"

    Resultado:

        Carrer Mallorca 123, 08036 Barcelona, Barcelona, Espana
    """

    partes = []

    direccion_limpia = limpiar_direccion(
        direccion
    )

    cp_limpio = limpiar_texto(
        cp
    )

    municipio_limpio = limpiar_texto(
        municipio
    )

    provincia_limpia = limpiar_texto(
        provincia
    )

    # --------------------------------------------------------
    # DIRECCIÓN
    # --------------------------------------------------------

    if direccion_limpia:
        partes.append(
            direccion_limpia
        )

    # --------------------------------------------------------
    # CP + MUNICIPIO
    # --------------------------------------------------------

    if cp_limpio and municipio_limpio:
        partes.append(
            f"{cp_limpio} {municipio_limpio}"
        )

    elif municipio_limpio:
        partes.append(
            municipio_limpio
        )

    elif cp_limpio:
        partes.append(
            cp_limpio
        )

    # --------------------------------------------------------
    # PROVINCIA
    # --------------------------------------------------------

    if provincia_limpia:
        partes.append(
            provincia_limpia
        )

    # --------------------------------------------------------
    # PAÍS
    # --------------------------------------------------------

    partes.append(
        "Espana"
    )

    return ", ".join(
        p for p in partes
        if p
    ).strip()

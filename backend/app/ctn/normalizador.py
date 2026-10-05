import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(valor) -> str:
    """
    Limpia un texto sin destruir información útil
    para geocodificación.

    IMPORTANTE:
    NO elimina números.
    """

    if valor is None:
        return ""

    texto = str(valor).strip()

    if not texto:
        return ""

    # Normalizar Unicode manteniendo caracteres válidos.
    texto = unicodedata.normalize(
        "NFKC",
        texto
    )

    # Espacios múltiples.
    texto = re.sub(
        r"\s+",
        " ",
        texto
    )

    # Espacios antes de comas.
    texto = re.sub(
        r"\s+,",
        ",",
        texto
    )

    # Espacios después de comas.
    texto = re.sub(
        r",\s*",
        ", ",
        texto
    )

    return texto.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(valor) -> str:
    """
    Normaliza una dirección para Google Maps.

    IMPORTANTE:
    NO elimina:
        - números de calle
        - códigos postales
        - letras de portal
        - números de puerta

    Solamente elimina información claramente
    administrativa que puede perjudicar la búsqueda.
    """

    direccion = limpiar_texto(valor)

    if not direccion:
        return ""

    # Palabras administrativas que no aportan
    # información geográfica relevante.
    direccion = re.sub(
        r"\b("
        r"planta|"
        r"piso|"
        r"bajo|"
        r"local|"
        r"entresuelo|"
        r"puerta|"
        r"escalera|"
        r"bloque|"
        r"oficina|"
        r"despacho"
        r")\b",
        " ",
        direccion,
        flags=re.IGNORECASE
    )

    # Abreviaturas de mano izquierda/derecha.
    direccion = re.sub(
        r"\b(izq|izda|izd|dcha|dch)\.?\b",
        " ",
        direccion,
        flags=re.IGNORECASE
    )

    # Normalizar espacios.
    direccion = re.sub(
        r"\s+",
        " ",
        direccion
    )

    # Normalizar comas.
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

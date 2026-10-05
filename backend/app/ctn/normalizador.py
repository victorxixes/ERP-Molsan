import re
import unicodedata


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(s: str) -> str:
    """
    Normaliza un texto:

    - elimina acentos
    - convierte caracteres especiales
    - elimina espacios duplicados
    - elimina espacios antes de comas
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

    # Espacios duplicados
    s = re.sub(
        r"\s+",
        " ",
        s,
    )

    # Espacios antes de comas
    s = re.sub(
        r"\s+,",
        ",",
        s,
    )

    # Comas duplicadas
    s = re.sub(
        r",+",
        ",",
        s,
    )

    return s.strip()


# ============================================================
# LIMPIAR DIRECCIÓN
# ============================================================

def limpiar_direccion(direccion: str) -> str:
    """
    Limpia una dirección manteniendo el número de calle.

    IMPORTANTE:
    No debemos eliminar todos los números porque el número
    de la calle es precisamente uno de los datos más
    importantes para Google Geocoding.
    """

    if not direccion:
        return ""

    direccion = limpiar_texto(direccion)

    # Eliminar palabras accesorias de piso/local,
    # pero NO eliminar el número principal de la calle.
    direccion = re.sub(
        r"\b("
        r"planta|"
        r"piso|"
        r"bajo|"
        r"local|"
        r"entresuelo|"
        r"izq|"
        r"izd|"
        r"dcha|"
        r"dch|"
        r"apta|"
        r"apt|"
        r"ap|"
        r"puerta|"
        r"escalera|"
        r"bloque|"
        r"oficina|"
        r"despacho"
        r")\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # Ordinales de piso: 3º, 4ª, etc.
    direccion = re.sub(
        r"\b\d+\s*[ºª]\s*[A-Za-z]?\b",
        " ",
        direccion,
        flags=re.IGNORECASE,
    )

    # Combinaciones típicas de piso: 3A, 2B
    # SOLO si aparecen después de una coma.
    direccion = re.sub(
        r",\s*\d+\s*[A-Za-z]\b",
        ",",
        direccion,
        flags=re.IGNORECASE,
    )

    # Letras sueltas después de coma
    direccion = re.sub(
        r",\s*[A-Za-z]\b",
        ",",
        direccion,
        flags=re.IGNORECASE,
    )

    # Espacios duplicados
    direccion = re.sub(
        r"\s+",
        " ",
        direccion,
    )

    # Comas duplicadas
    direccion = re.sub(
        r",+",
        ",",
        direccion,
    )

    # Espacios antes de comas
    direccion = re.sub(
        r"\s+,",
        ",",
        direccion,
    )

    # Comas al principio/final
    direccion = direccion.strip(" ,")

    return direccion.strip()


# ============================================================
# CONSTRUIR DIRECCIÓN DE BÚSQUEDA
# ============================================================

def construir_direccion_busqueda(
    direccion: str | None = None,
    cp: str | None = None,
    municipio: str | None = None,
    provincia: str | None = None,
) -> str:
    """
    Construye una dirección completa para Google Geocoding.

    Ejemplo:

        direccion:
            "Carrer de Mallorca 123"

        cp:
            "08036"

        municipio:
            "Barcelona"

        provincia:
            "Barcelona"

    Resultado:

        "Carrer de Mallorca 123, 08036 Barcelona,
         Barcelona, Espana"

    Si algún campo está vacío, simplemente se omite.

    Nunca devuelve una dirección formada únicamente por
    ", Espana".
    """

    partes = []

    # --------------------------------------------------------
    # DIRECCIÓN
    # --------------------------------------------------------

    direccion_limpia = limpiar_direccion(
        direccion or ""
    )

    if direccion_limpia:
        partes.append(
            direccion_limpia
        )

    # --------------------------------------------------------
    # CÓDIGO POSTAL
    # --------------------------------------------------------

    cp_limpio = limpiar_texto(
        cp or ""
    )

    # --------------------------------------------------------
    # MUNICIPIO
    # --------------------------------------------------------

    municipio_limpio = limpiar_texto(
        municipio or ""
    )

    # --------------------------------------------------------
    # CP + MUNICIPIO
    # --------------------------------------------------------

    if cp_limpio and municipio_limpio:

        partes.append(
            f"{cp_limpio} {municipio_limpio}"
        )

    elif cp_limpio:

        partes.append(
            cp_limpio
        )

    elif municipio_limpio:

        partes.append(
            municipio_limpio
        )

    # --------------------------------------------------------
    # PROVINCIA
    # --------------------------------------------------------

    provincia_limpia = limpiar_texto(
        provincia or ""
    )

    if provincia_limpia:
        partes.append(
            provincia_limpia
        )

    # --------------------------------------------------------
    # COMPROBAR QUE REALMENTE TENEMOS DATOS
    # --------------------------------------------------------

    if not partes:
        return ""

    # --------------------------------------------------------
    # PAÍS
    # --------------------------------------------------------

    partes.append(
        "Espana"
    )

    return ", ".join(
        partes
    )

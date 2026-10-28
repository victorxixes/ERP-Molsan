"""Reglas compartidas de clasificación del importador e informe ABSIS Post Firma."""
import unicodedata


def normalizar_tipo_operacion(valor):
    texto = str(valor or "").strip().casefold()
    texto = "".join(
        caracter
        for caracter in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(caracter)
    )
    return "".join(caracter for caracter in texto if caracter.isalnum())


def clasificar_tipo_operacion(valor):
    """Solo 'Cancelación sin provision' (ignorando tildes/espacios) va sin provisión."""
    if normalizar_tipo_operacion(valor) == "cancelacionsinprovision":
        return "sin_provision"
    return "con_provision"

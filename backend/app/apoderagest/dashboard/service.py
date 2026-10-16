
"""Indicadores del cuadro de mando de ApoderaGest."""

import unicodedata
from datetime import date, datetime

from backend.app.apoderagest.encargos.service import listar_encargos


def _fecha(valor):
    """Normaliza una fecha o fecha-hora."""
    if not valor:
        return None

    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    try:
        return date.fromisoformat(str(valor)[:10])
    except (TypeError, ValueError):
        return None


def _normalizar(valor):
    """Normaliza texto para comparar modalidades con acentos o variantes."""
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(
        caracter
        for caracter in texto
        if not unicodedata.combining(caracter)
    )
    return texto.strip().lower().replace(" ", "").replace("-", "").replace("_", "")


def _clasificar_firma(tipo_firma):
    """Devuelve VC, PRESENCIAL o SIN_CLASIFICAR."""
    valor = _normalizar(tipo_firma)

    if not valor:
        return "SIN_CLASIFICAR"

    if (
        "videoconferencia" in valor
        or "videoconference" in valor
        or valor in {"vc", "video"}
    ):
        return "VC"

    if (
        "presencial" in valor
        or valor in {"p", "fisica"}
    ):
        return "PRESENCIAL"

    return "SIN_CLASIFICAR"


def obtener_dashboard(db, usuario):
    """Calcula indicadores usando los encargos reales del apoderado."""
    encargos = listar_encargos(db, usuario)

    # Solo se considera firmada una operación cuando tiene fecha_firma.
    firmados = [
        encargo
        for encargo in encargos
        if _fecha(encargo.get("fecha_firma")) is not None
    ]

    pendientes = len(encargos) - len(firmados)

    duraciones = []

    for encargo in firmados:
        inicio = _fecha(encargo.get("fecha_alta"))
        fin = _fecha(encargo.get("fecha_firma"))

        if inicio and fin and fin >= inicio:
            duraciones.append((fin - inicio).days)

    media_dias = (
        round(sum(duraciones) / len(duraciones), 1)
        if duraciones
        else None
    )

    firmas_presenciales = 0
    firmas_videoconferencia = 0

    for encargo in firmados:
        modalidad = _clasificar_firma(encargo.get("tipo_firma"))

        if modalidad == "PRESENCIAL":
            firmas_presenciales += 1
        elif modalidad == "VC":
            firmas_videoconferencia += 1

    return {
        "total_encargos": len(encargos),
        "firmados": len(firmados),
        "pendientes": pendientes,
        "media_dias_hasta_firma": media_dias,
        "firmas_presenciales": firmas_presenciales,
        "firmas_videoconferencia": firmas_videoconferencia,

        # No se dispone aquí de una distancia real asociada a cada
        # firma realizada. Se mantiene sin calcular para no inventarla.
        "kilometros_presenciales": None,
    }


"""Indicadores del cuadro de mando de ApoderaGest."""

from datetime import date, datetime

from backend.app.apoderagest.encargos.service import listar_encargos


def _fecha(valor):
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


def obtener_dashboard(db, usuario):
    encargos = listar_encargos(db, usuario)

    firmados = [
        encargo for encargo in encargos
        if encargo.get("fecha_firma")
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
        if duraciones else None
    )

    return {
        "total_encargos": len(encargos),
        "firmados": len(firmados),
        "pendientes": pendientes,
        "media_dias_hasta_firma": media_dias,
        "firmas_presenciales": None,
        "firmas_videoconferencia": None,
        "kilometros_presenciales": None,
    }

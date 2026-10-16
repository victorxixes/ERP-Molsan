
from datetime import date, datetime

from backend.app.notargest.encargos.service import (
    listar_encargos_usuario,
)


def _convertir_fecha(valor):
    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    if isinstance(valor, str) and valor.strip():
        try:
            return date.fromisoformat(valor[:10])
        except ValueError:
            return None

    return None


def resumen_usuario(db, usuario):
    encargos = listar_encargos_usuario(db, usuario)

    firmados = [
        expediente
        for expediente in encargos
        if getattr(expediente, "fecha_firma", None)
    ]

    pendientes = len(encargos) - len(firmados)

    diferencias = []

    for expediente in firmados:
        alta = _convertir_fecha(
            getattr(expediente, "fecha_alta", None)
        )
        firma = _convertir_fecha(
            getattr(expediente, "fecha_firma", None)
        )

        if alta and firma and firma >= alta:
            diferencias.append((firma - alta).days)

    dias_medios = (
        round(sum(diferencias) / len(diferencias), 2)
        if diferencias
        else None
    )

    return {
        "total_encargos": len(encargos),
        "firmados": len(firmados),
        "pendientes": pendientes,
        "firmas_presenciales": None,
        "firmas_videoconferencia": None,
        "kilometros_presenciales": None,
        "dias_medios_hasta_firma": dias_medios,
    }

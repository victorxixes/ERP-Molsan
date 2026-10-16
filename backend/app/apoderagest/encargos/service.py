
"""Servicios de consulta de encargos de ApoderaGest."""

from sqlalchemy import func

from backend.app.expedientes.models import Expediente
from backend.app.apoderagest.permissions import obtener_nombre_apoderado


def _campo_apoderado():
    """Comprueba si el modelo actual contiene el campo esperado."""
    return getattr(Expediente, "apoderado", None)


def listar_encargos(db, usuario):
    """
    Devuelve exclusivamente expedientes cuyo campo apoderado
    coincide con el nombre identificativo del usuario autenticado.

    Importante: si en la base de datos se almacena un ID en vez
    de un nombre, habrá que adaptar el filtro al modelo real.
    """
    nombre = obtener_nombre_apoderado(usuario)
    campo = _campo_apoderado()

    if not nombre or campo is None:
        return []

    expedientes = (
        db.query(Expediente)
        .filter(func.lower(func.trim(campo)) == nombre.lower())
        .all()
    )

    resultado = []

    for expediente in expedientes:
        cliente = getattr(expediente, "cliente", None)

        titular = None
        if cliente is not None:
            titular = getattr(cliente, "nombre_completo", None)

            if not titular:
                partes = [
                    getattr(cliente, "nombre", None),
                    getattr(cliente, "apellidos", None),
                ]
                titular = " ".join(
                    str(parte).strip()
                    for parte in partes
                    if parte
                ) or None

        resultado.append({
            "id": getattr(expediente, "id", None),
            "id_expediente": getattr(
                expediente, "id_expediente", None
            ),
            "estado": getattr(
                expediente, "estado_expediente", None
            ) or getattr(expediente, "estado", None),
            "fecha_alta": (
                str(getattr(expediente, "fecha_alta", ""))
                if getattr(expediente, "fecha_alta", None)
                else None
            ),
            "fecha_firma": (
                str(getattr(expediente, "fecha_firma", ""))
                if getattr(expediente, "fecha_firma", None)
                else None
            ),
            "apoderado": getattr(expediente, "apoderado", None),
            "notario": getattr(expediente, "notario", None),
            "titular": titular,
        })

    return resultado

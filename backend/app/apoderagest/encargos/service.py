
"""Servicios de consulta de encargos de ApoderaGest.

Consulta los expedientes asignados al apoderado autenticado y devuelve
los datos necesarios para el listado, el Dashboard y el histórico de firmas.
"""

from sqlalchemy import func

from backend.app.expedientes.models import Expediente
from backend.app.apoderagest.permissions import obtener_nombre_apoderado


def _texto(valor):
    """Convierte un valor a texto, conservando los valores vacíos como None."""
    if valor is None:
        return None

    resultado = str(valor).strip()
    return resultado or None


def _fecha_texto(valor):
    """Serializa fechas sin generar cadenas vacías."""
    if valor is None:
        return None

    return valor.isoformat() if hasattr(valor, "isoformat") else str(valor)


def _nombre_titular(expediente):
    """Obtiene el titular desde los datos del expediente o del cliente."""
    nombre = _texto(getattr(expediente, "nombre_titular", None))
    if nombre:
        return nombre

    cliente = getattr(expediente, "cliente", None)
    if cliente is None:
        return None

    nombre_completo = _texto(getattr(cliente, "nombre_completo", None))
    if nombre_completo:
        return nombre_completo

    partes = [
        _texto(getattr(cliente, "nombre", None)),
        _texto(getattr(cliente, "apellidos", None)),
    ]

    return " ".join(parte for parte in partes if parte) or None


def _nombre_notario(expediente):
    """Devuelve el nombre del notario usando los campos disponibles."""
    nombre = _texto(getattr(expediente, "nombre_notario", None))
    if nombre:
        return nombre

    return _texto(getattr(expediente, "notario", None))


def _expediente_a_dict(expediente):
    """Convierte un expediente en el formato consumido por ApoderaGest."""
    return {
        "id": getattr(expediente, "id", None),
        "id_expediente": _texto(
            getattr(expediente, "id_expediente", None)
        ),
        "estado": (
            _texto(getattr(expediente, "estado_expediente", None))
            or _texto(getattr(expediente, "estado", None))
        ),
        "fecha_alta": _fecha_texto(
            getattr(expediente, "fecha_alta", None)
        ),
        "fecha_firma": _fecha_texto(
            getattr(expediente, "fecha_firma", None)
        ),
        "tipo_firma": _texto(
            getattr(expediente, "tipo_firma", None)
        ),
        "apoderado": _texto(
            getattr(expediente, "apoderado", None)
        ),
        "notario": _nombre_notario(expediente),
        "nombre_notario": _texto(
            getattr(expediente, "nombre_notario", None)
        ),
        "nif_notario": _texto(
            getattr(expediente, "nif_notario", None)
        ),
        "titular": _nombre_titular(expediente),
        "nif_titular": _texto(
            getattr(expediente, "nif_titular", None)
        ),
        "observaciones": _texto(
            getattr(expediente, "observaciones", None)
        ),
    }


def listar_encargos(db, usuario):
    """Devuelve los expedientes asociados al apoderado autenticado.

    La búsqueda por nombre ignora diferencias entre mayúsculas y minúsculas
    y espacios exteriores. No devuelve todos los expedientes si no se puede
    identificar al apoderado.
    """
    nombre = _texto(obtener_nombre_apoderado(usuario))
    campo_apoderado = getattr(Expediente, "apoderado", None)

    if not nombre or campo_apoderado is None:
        return []

    expedientes = (
        db.query(Expediente)
        .filter(
            func.lower(func.trim(campo_apoderado))
            == nombre.lower()
        )
        .order_by(
            Expediente.fecha_alta.desc().nullslast(),
            Expediente.id.desc(),
        )
        .all()
    )

    return [_expediente_a_dict(expediente) for expediente in expedientes]

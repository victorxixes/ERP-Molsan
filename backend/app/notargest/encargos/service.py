
from backend.app.expedientes.models import Expediente
from backend.app.notargest.permissions import obtener_nombre_usuario


def listar_encargos_usuario(db, usuario):
    """
    Devuelve los expedientes asignados al apoderado autenticado.

    Comparación exacta del nombre, sin distinguir mayúsculas.
    Si no hay usuario o campo de asignación, devuelve una lista vacía.
    """
    nombre = obtener_nombre_usuario(usuario).strip().casefold()

    campo_apoderado = getattr(Expediente, "apoderado", None)

    if not nombre or campo_apoderado is None:
        return []

    expedientes = (
        db.query(Expediente)
        .filter(campo_apoderado.isnot(None))
        .all()
    )

    resultado = []

    for expediente in expedientes:
        apoderado = str(
            getattr(expediente, "apoderado", "") or ""
        ).strip().casefold()

        if apoderado == nombre:
            resultado.append(expediente)

    return resultado


def serializar_encargo(expediente):
    """Convierte un expediente en un objeto JSON sencillo."""
    cliente = getattr(expediente, "cliente", None)

    titular = (
        getattr(cliente, "nombre_completo", None)
        if cliente is not None
        else None
    )

    return {
        "id": getattr(expediente, "id", None),
        "id_expediente": getattr(
            expediente, "id_expediente", None
        ),
        "estado_expediente": getattr(
            expediente, "estado_expediente", None
        ),
        "fecha_alta": (
            str(expediente.fecha_alta)
            if getattr(expediente, "fecha_alta", None)
            else None
        ),
        "fecha_firma": (
            str(expediente.fecha_firma)
            if getattr(expediente, "fecha_firma", None)
            else None
        ),
        "apoderado": getattr(expediente, "apoderado", None),
        "notario": getattr(expediente, "notario", None),
        "titular": titular,
    }


from backend.app.agenda.models import Cita

from backend.app.notargest.permissions import (
    obtener_nombre_usuario,
    obtener_id_empleado,
)


def listar_citas_usuario(db, usuario):
    """
    Consulta la agenda existente.

    Prioriza apoderado_id cuando está disponible.
    Como alternativa, compara el nombre exacto del apoderado.
    """
    empleado_id = obtener_id_empleado(usuario)
    nombre = obtener_nombre_usuario(usuario).strip().casefold()

    campo_id = getattr(Cita, "apoderado_id", None)

    if campo_id is not None and empleado_id is not None:
        return (
            db.query(Cita)
            .filter(campo_id == empleado_id)
            .all()
        )

    campo_nombre = getattr(Cita, "apoderado", None)

    if campo_nombre is None or not nombre:
        return []

    citas = (
        db.query(Cita)
        .filter(campo_nombre.isnot(None))
        .all()
    )

    return [
        cita
        for cita in citas
        if str(
            getattr(cita, "apoderado", "") or ""
        ).strip().casefold() == nombre
    ]


def serializar_cita(cita):
    return {
        "id": getattr(cita, "id", None),
        "fecha": (
            str(cita.fecha)
            if getattr(cita, "fecha", None)
            else None
        ),
        "hora_inicio": (
            str(cita.hora_inicio)
            if getattr(cita, "hora_inicio", None)
            else None
        ),
        "hora_fin": (
            str(cita.hora_fin)
            if getattr(cita, "hora_fin", None)
            else None
        ),
        "tipo_cita": getattr(cita, "tipo_cita", None),
        "apoderado": getattr(cita, "apoderado", None),
        "apoderado_id": getattr(cita, "apoderado_id", None),
        "expediente_id": getattr(cita, "expediente_id", None),
        "observaciones": getattr(cita, "observaciones", None),
    }

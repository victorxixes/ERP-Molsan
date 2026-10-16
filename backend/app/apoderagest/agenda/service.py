
"""Consultas de agenda para ApoderaGest."""

from backend.app.agenda.models import Cita
from backend.app.apoderagest.permissions import (
    obtener_id_empleado,
    obtener_nombre_apoderado,
)


def listar_citas_apoderado(db, usuario):
    empleado_id = obtener_id_empleado(usuario)
    nombre = obtener_nombre_apoderado(usuario)

    campo_id = getattr(Cita, "apoderado_id", None)
    campo_nombre = getattr(Cita, "apoderado", None)

    if empleado_id is not None and campo_id is not None:
        citas = db.query(Cita).filter(
            campo_id == empleado_id
        ).all()
    elif nombre and campo_nombre is not None:
        # Solo se usa el nombre cuando no hay ID de empleado explícito.
        from sqlalchemy import func

        citas = db.query(Cita).filter(
            func.lower(func.trim(campo_nombre)) == nombre.lower()
        ).all()
    else:
        return []

    resultado = []

    for cita in citas:
        fecha = getattr(cita, "fecha", None)
        hora_inicio = getattr(cita, "hora_inicio", None)
        hora_fin = getattr(cita, "hora_fin", None)

        resultado.append({
            "id": getattr(cita, "id", None),
            "fecha": str(fecha) if fecha else None,
            "hora_inicio": (
                str(hora_inicio) if hora_inicio else None
            ),
            "hora_fin": str(hora_fin) if hora_fin else None,
            "tipo_cita": getattr(cita, "tipo_cita", None),
            "apoderado": getattr(cita, "apoderado", None),
            "apoderado_id": getattr(cita, "apoderado_id", None),
            "expediente_id": getattr(cita, "expediente_id", None),
            "observaciones": getattr(cita, "observaciones", None),
        })

    return resultado

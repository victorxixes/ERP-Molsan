
"""Consultas de agenda para ApoderaGest.

Utiliza la tabla compartida agenda_citas y devuelve datos relacionados
del expediente y de la notaría cuando están disponibles.
"""

from sqlalchemy import and_, func, or_

from backend.app.agenda.models import Cita
from backend.app.apoderagest.permissions import (
    obtener_id_empleado,
    obtener_nombre_apoderado,
)


def _texto(valor):
    """Convierte valores simples a texto sin provocar errores."""
    if valor is None:
        return None
    return str(valor)


def _nombre_notario(notario):
    """Obtiene el nombre visible de una notaría, si está relacionada."""
    if not notario:
        return None

    partes = [
        getattr(notario, "nombre", None),
        getattr(notario, "apellidos", None),
    ]
    nombre = " ".join(
        str(parte).strip()
        for parte in partes
        if parte and str(parte).strip()
    )

    return nombre or None


def _cita_a_dict(cita):
    """Serializa una cita sin crear ni modificar registros."""
    expediente = getattr(cita, "expediente", None)
    notario = getattr(cita, "notario", None)

    id_expediente = (
        getattr(expediente, "id_expediente", None)
        if expediente is not None
        else None
    )

    nombre_notario = _nombre_notario(notario)

    # Compatibilidad con datos históricos que guardan el nombre
    # del notario únicamente en el campo observaciones o en la cita.
    if not nombre_notario and expediente is not None:
        nombre_notario = (
            getattr(expediente, "nombre_notario", None)
            or getattr(expediente, "notario", None)
        )

    return {
        "id": getattr(cita, "id", None),
        "fecha": _texto(getattr(cita, "fecha", None)),
        "hora_inicio": _texto(getattr(cita, "hora_inicio", None)),
        "hora_fin": _texto(getattr(cita, "hora_fin", None)),
        "tipo_cita": getattr(cita, "tipo_cita", None),
        "tipo_firma": getattr(cita, "tipo_firma", None),
        "apoderado": getattr(cita, "apoderado", None),
        "apoderado_id": getattr(cita, "apoderado_id", None),
        "expediente_id": getattr(cita, "expediente_id", None),
        "id_expediente": id_expediente,
        "estado_expediente": (
            getattr(expediente, "estado_expediente", None)
            if expediente is not None
            else None
        ),
        "fecha_firma": (
            _texto(getattr(expediente, "fecha_firma", None))
            if expediente is not None
            else None
        ),
        "nombre_notario": nombre_notario,
        "notario_id": getattr(cita, "notario_id", None),
        "observaciones": getattr(cita, "observaciones", None),
    }


def _filtro_asignacion_apoderado(campo_id, campo_nombre, empleado_id, nombre):
    """El ID es autoritativo; el nombre solo recupera citas históricas sin FK."""
    nombre_limpio = str(nombre or "").strip()
    filtro_nombre = None
    if nombre_limpio and campo_nombre is not None:
        filtro_nombre = (
            func.translate(
                func.lower(func.trim(campo_nombre)),
                "áéíóúüñ",
                "aeiouun",
            )
            == func.translate(
                nombre_limpio.lower(),
                "áéíóúüñ",
                "aeiouun",
            )
        )

    if empleado_id is not None and campo_id is not None:
        filtro_id = campo_id == int(empleado_id)
        if filtro_nombre is not None:
            return or_(filtro_id, and_(campo_id.is_(None), filtro_nombre))
        return filtro_id

    return filtro_nombre


def listar_citas_apoderado(db, usuario, todas=False):
    """Lista las citas del apoderado autenticado.

    La clave foránea del empleado es la asignación autoritativa. El nombre
    solo sirve como compatibilidad para citas históricas sin apoderado_id.
    """
    empleado_id = obtener_id_empleado(usuario)
    nombre = obtener_nombre_apoderado(usuario)

    consulta = db.query(Cita)

    if not todas:
        filtro = _filtro_asignacion_apoderado(
            getattr(Cita, "apoderado_id", None),
            getattr(Cita, "apoderado", None),
            empleado_id,
            nombre,
        )
        if filtro is None:
            return []
        consulta = consulta.filter(filtro)

    citas = (
        consulta
        .order_by(Cita.fecha.asc(), Cita.hora_inicio.asc())
        .all()
    )

    return [_cita_a_dict(cita) for cita in citas]

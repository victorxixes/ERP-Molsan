
"""Servicios de consulta de encargos de ApoderaGest.

Consulta los expedientes asignados al apoderado autenticado y devuelve
los datos necesarios para el listado, el Dashboard y el histórico de firmas.
"""

import unicodedata

from sqlalchemy import func, or_

from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca

from backend.app.expedientes.models import Expediente
from backend.app.apoderagest.permissions import obtener_nombre_apoderado


def _normalizar(valor):
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    return "".join(c for c in texto if not unicodedata.combining(c)).strip().casefold()


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


def _expediente_a_dict(expediente, fincas=None):
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
        "fecha_envio_notario": _fecha_texto(
            getattr(expediente, "fecha_envio_notario", None)
            or getattr(expediente, "fecha_envio", None)
        ),
        "fecha_prevista_firma": _fecha_texto(
            getattr(expediente, "fecha_prevista_firma", None)
        ),
        "protocolo": _texto(getattr(expediente, "protocolo", None)),
        "fincas": fincas or [],
        "registros": list(dict.fromkeys(
            finca.get("registro") for finca in (fincas or []) if finca.get("registro")
        )),
    }


def listar_encargos(db, usuario, solo_pendientes=False):
    """Devuelve los expedientes asociados al apoderado autenticado.

    La búsqueda por nombre ignora diferencias entre mayúsculas y minúsculas
    y espacios exteriores. No devuelve todos los expedientes si no se puede
    identificar al apoderado.
    """
    nombre = _texto(obtener_nombre_apoderado(usuario))
    campo_apoderado = getattr(Expediente, "apoderado", None)

    if not nombre or campo_apoderado is None:
        return []

    # La normalización evita diferencias por mayúsculas, espacios y acentos.
    candidatos = (
        db.query(Expediente)
        .filter(
            func.lower(func.trim(campo_apoderado)).in_(
                {nombre.lower(), _normalizar(nombre)}
            )
        )
        .order_by(
            Expediente.fecha_prevista_firma.asc().nullslast(),
            Expediente.fecha_alta.desc().nullslast(),
            Expediente.id.desc(),
        )
        .all()
    )

    resultados = []
    nombre_normalizado = _normalizar(nombre)
    for expediente in candidatos:
        apoderado = _texto(getattr(expediente, "apoderado", None))
        # La comparación final normalizada es importante para los nombres con tildes.
        if _normalizar(apoderado) != nombre_normalizado:
            continue

        fecha_envio = getattr(expediente, "fecha_envio_notario", None) or getattr(expediente, "fecha_envio", None)
        if solo_pendientes:
            # Debe existir envío guardado y no constar firma real ni protocolo.
            if not fecha_envio:
                continue
            if getattr(expediente, "fecha_firma", None):
                continue
            if _texto(getattr(expediente, "protocolo", None)):
                continue

        filas_fincas = (
            db.query(ExpedienteFinca)
            .filter(ExpedienteFinca.expediente_id == expediente.id)
            .order_by(ExpedienteFinca.id.asc())
            .all()
        )
        fincas = [
            {
                "finca": _texto(getattr(f, "finca", None)),
                "registro": _texto(getattr(f, "registro", None)),
                "provincia": _texto(getattr(f, "provincia", None)),
                "poblacion": _texto(getattr(f, "poblacion", None)),
                "cru_idufir": _texto(getattr(f, "cru_idufir", None)),
            }
            for f in filas_fincas
        ]
        resultados.append(_expediente_a_dict(expediente, fincas))

    return resultados

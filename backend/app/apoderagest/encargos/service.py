
"""Servicios de consulta de encargos de ApoderaGest.

Consulta los expedientes asignados al apoderado autenticado y devuelve
los datos necesarios para el listado, el Dashboard y el histórico de firmas.
"""

import unicodedata

from sqlalchemy import func

from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.expediente_observaciones.models import ExpedienteObservacion

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


def _expediente_a_dict(expediente, fincas=None, documentos=None, observaciones_apoderado=None):
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
        "fecha_alta": _fecha_texto(getattr(expediente, "fecha_alta", None)),
        "fecha_inscripcion": _fecha_texto(getattr(expediente, "fecha_inscripcion", None)),
        "oficina": _texto(getattr(expediente, "oficina", None)),
        "capital": getattr(expediente, "capital", None),
        "importe": getattr(expediente, "importe", None),
        "saldo_real": getattr(expediente, "saldo_real", None),
        "saldo_disponible": getattr(expediente, "saldo_disponible", None),
        "contrato": _texto(getattr(expediente, "contrato", None)),
        "tipo_operacion": _texto(getattr(expediente, "tipo_operacion", None)),
        "tipo_documento": _texto(getattr(expediente, "tipo_documento", None)),
        "tipo_tramite": _texto(getattr(expediente, "tipo_tramite", None)),
        "formato_escritura": _texto(getattr(expediente, "formato_escritura", None)),
        "idioma_documento": _texto(getattr(expediente, "idioma_documento", None)),
        "cuantia_documento": getattr(expediente, "importe", None),
        "documentos_escritura": [
            {
                "id": getattr(documento, "id", None),
                "tipo_documento": _texto(getattr(documento, "tipo_documento", None)),
                "cuantia": getattr(documento, "cuantia", None),
            }
            for documento in (getattr(expediente, "documentos_escritura", None) or [])
        ],
        "facturacion": {
            "nombre": _texto(getattr(expediente, "facturacion_nombre", None)),
            "apellidos": _texto(getattr(expediente, "facturacion_apellidos", None)),
            "dni_nif": _texto(getattr(expediente, "facturacion_dni_nif", None)),
            "direccion": _texto(getattr(expediente, "facturacion_direccion", None)),
            "codigo_postal": _texto(getattr(expediente, "facturacion_codigo_postal", None)),
            "poblacion": _texto(getattr(expediente, "facturacion_poblacion", None)),
            "provincia": _texto(getattr(expediente, "facturacion_provincia", None)),
            "telefono": _texto(getattr(expediente, "facturacion_telefono", None)),
            "email": _texto(getattr(expediente, "facturacion_email", None)),
            "estado": _texto(getattr(expediente, "facturacion_estado", None)),
            "fecha": _fecha_texto(getattr(expediente, "facturacion_fecha", None)),
        },
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
        "nombre": _texto(getattr(expediente, "nombre", None)) or _texto(getattr(expediente, "nombre_titular", None)),
        "apellidos": _texto(getattr(expediente, "apellidos", None)) or _texto(getattr(expediente, "facturacion_apellidos", None)),
        "dni": _texto(getattr(expediente, "dni", None)) or _texto(getattr(expediente, "nif_titular", None)),
        "finca": _texto(getattr(expediente, "finca", None)),
        "bloqueado": bool(getattr(expediente, "bloqueo_manual", False) or str(getattr(expediente, "estado_expediente", "") or "").strip().upper().startswith(("LST", "RST")) or getattr(expediente, "liquidado_sin_tramitar", False) or getattr(expediente, "cambio_gestoria", False)),
        "motivo_bloqueo_efectivo": (_texto(getattr(expediente, "motivo_bloqueo", None)) or ("LIQUIDADO SIN TRAMITAR" if str(getattr(expediente, "estado_expediente", "") or "").strip().upper().startswith("LST") or getattr(expediente, "liquidado_sin_tramitar", False) else "RETENCIÓN SIN TRAMITAR" if str(getattr(expediente, "estado_expediente", "") or "").strip().upper().startswith("RST") else "CAMBIO DE GESTORÍA" if getattr(expediente, "cambio_gestoria", False) else "BLOQUEO MANUAL" if getattr(expediente, "bloqueo_manual", False) else None)),
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
        "documentos": documentos or [],
        "observaciones_apoderado": observaciones_apoderado or [],
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

    # Normalización SQL compatible con PostgreSQL: elimina tildes frecuentes
    # sin depender de que la extensión unaccent esté instalada.
    # La comparación final en Python cubre además espacios y variantes Unicode.
    alfabeto_con_tildes = "áéíóúüñ"
    alfabeto_normal = "aeiouun"
    nombre_sql = nombre.strip().lower()
    candidatos = (
        db.query(Expediente)
        .filter(
            func.translate(
                func.lower(func.trim(campo_apoderado)),
                alfabeto_con_tildes,
                alfabeto_normal,
            ) == func.translate(
                nombre_sql,
                alfabeto_con_tildes,
                alfabeto_normal,
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
                "seccion": _texto(getattr(f, "seccion", None)),
                "cuantia": _texto(getattr(f, "cuantia", None)),
                "inscripcion": _texto(getattr(f, "inscripcion", None)),
                "contrato": _texto(getattr(f, "contrato", None)),
                "fecha_constitucion": _fecha_texto(getattr(f, "fecha_constitucion", None)),
                "subrogado": _texto(getattr(f, "subrogado", None)),
                "entidad_original": _texto(getattr(f, "entidad_original", None)),
            }
            for f in filas_fincas
        ]
        documentos = (
            db.query(DocumentoCarpetaDigital)
            .filter(DocumentoCarpetaDigital.expediente_id == str(getattr(expediente, "id_expediente", "")))
            .order_by(DocumentoCarpetaDigital.fecha_subida.desc())
            .all()
        )
        categorias_apoderado = {
            "Hoja de Encargo firmada",
            "Justificante de cancelación",
            "Nota simple registral",
            "Escrituras/borradores",
            "Borradores de escrituras",
        }
        documentos_apoderado = [
            {
                "id": documento.id,
                "categoria": documento.categoria,
                "nombre_original": documento.nombre_original,
                "fecha_subida": _fecha_texto(documento.fecha_subida),
                "url_descarga": f"/expedientes/{getattr(expediente, 'id_expediente', '')}/carpeta-digital/{documento.id}/descargar",
            }
            for documento in documentos
            if documento.categoria in categorias_apoderado
        ]

        observaciones = (
            db.query(ExpedienteObservacion)
            .filter(
                ExpedienteObservacion.expediente_id == expediente.id,
                ExpedienteObservacion.activo.is_(True),
                ExpedienteObservacion.visibilidad == "Visible apoderado",
            )
            .order_by(ExpedienteObservacion.fecha.desc(), ExpedienteObservacion.id.desc())
            .all()
        )
        observaciones_apoderado = [
            {
                "id": item.id,
                "comentario": item.comentario,
                "fecha": _fecha_texto(item.fecha),
            }
            for item in observaciones
        ]
        resultados.append(_expediente_a_dict(expediente, fincas, documentos_apoderado, observaciones_apoderado))

    return resultados

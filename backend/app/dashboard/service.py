from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.expedientes.models import Expediente
from .schemas import (
    DashboardExpedientesResponse,
    ExpedientesPorActividad,
    MediaFirmaPorTipoOperacion,
)


ACTIVIDADES = (
    {
        "key": "documentacion_previa",
        "nombre": "Documentación previa",
    },
    {
        "key": "sede_notarial",
        "nombre": "Sede notarial",
    },
    {
        "key": "sede_notarial_con_protocolo",
        "nombre": "Sede notarial con protocolo",
    },
    {
        "key": "liquidacion_impuestos",
        "nombre": "Liquidación de impuestos",
    },
    {
        "key": "tramitacion_inscripcion",
        "nombre": "Tramitación inscripción",
    },
    {
        "key": "defectos_registrales",
        "nombre": "Defectos registrales",
    },
    {
        "key": "facturacion_cierre",
        "nombre": "Facturación y cierre",
    },
)


def _normalizar_actividad(valor: str | None) -> str:
    """
    Normaliza el texto de actividad para poder agrupar valores
    procedentes de ABSIS/ERP aunque cambien mayúsculas, espacios
    o acentos.
    """
    if not valor:
        return ""

    texto = " ".join(str(valor).strip().lower().split())

    reemplazos = {
        "á": "a",
        "é": "e",
        "í": "i",
        "ó": "o",
        "ú": "u",
        "ü": "u",
    }

    return "".join(reemplazos.get(c, c) for c in texto)


def _actividad_dashboard(
    actividad: str | None,
    fecha_firma,
) -> str | None:
    """
    Devuelve la actividad canónica del dashboard.

    Regla especial:
    - Sede notarial sin fecha de firma -> Sede notarial
    - Sede notarial con fecha de firma -> Sede notarial con protocolo
    """
    valor = _normalizar_actividad(actividad)

    if valor in {
        "documentacion previa",
        "documentacion_previa",
    }:
        return "documentacion_previa"

    if valor == "sede notarial":
        if fecha_firma is not None:
            return "sede_notarial_con_protocolo"
        return "sede_notarial"

    if valor in {
        "sede notarial con protocolo",
        "sede_notarial_con_protocolo",
    }:
        return "sede_notarial_con_protocolo"

    if valor in {
        "liquidacion de impuestos",
        "liquidacion impuestos",
        "liquidacion_de_impuestos",
    }:
        return "liquidacion_impuestos"

    if valor in {
        "tramitacion inscripcion",
        "tramitacion inscripción",
        "tramitacion_inscripcion",
    }:
        return "tramitacion_inscripcion"

    if valor in {
        "defectos registrales",
        "defectos_registrales",
    }:
        return "defectos_registrales"

    if valor in {
        "facturacion y cierre",
        "facturación y cierre",
        "facturacion_cierre",
    }:
        return "facturacion_cierre"

    return None


def obtener_dashboard_expedientes(
    db: Session,
) -> DashboardExpedientesResponse:
    """
    Construye los indicadores del dashboard de Expedientes.

    Fecha de envío:
        Expediente.fecha_inicio_actividad

    Media de firma:
        fecha_firma - fecha_inicio_actividad

    Solo se incluyen en la media aquellos expedientes que tienen
    ambas fechas informadas.
    """

    total_expedientes = (
        db.query(func.count(Expediente.id))
        .scalar()
        or 0
    )

    filas_actividad = (
        db.query(
            Expediente.actividad_actual,
            Expediente.fecha_firma,
        )
        .all()
    )

    actividad_totales = defaultdict(int)

    for actividad, fecha_firma in filas_actividad:
        key = _actividad_dashboard(
            actividad,
            fecha_firma,
        )

        if key:
            actividad_totales[key] += 1

    expedientes_por_actividad = [
        ExpedientesPorActividad(
            key=actividad["key"],
            nombre=actividad["nombre"],
            total=actividad_totales.get(
                actividad["key"],
                0,
            ),
        )
        for actividad in ACTIVIDADES
    ]

    filas_firma = (
        db.query(
            Expediente.tipo_operacion,
            Expediente.fecha_inicio_actividad,
            Expediente.fecha_firma,
        )
        .filter(
            Expediente.fecha_inicio_actividad.isnot(None),
            Expediente.fecha_firma.isnot(None),
        )
        .all()
    )

    acumulado = defaultdict(
        lambda: {
            "total": 0,
            "dias": 0.0,
        }
    )

    for tipo_operacion, fecha_envio, fecha_firma in filas_firma:
        tipo = (
            str(tipo_operacion).strip()
            if tipo_operacion
            else "Sin tipo de operación"
        )

        diferencia = (
            fecha_firma - fecha_envio
        ).days

        # Evitamos que datos anómalos generen medias negativas.
        if diferencia < 0:
            continue

        acumulado[tipo]["total"] += 1
        acumulado[tipo]["dias"] += diferencia

    media_firma_por_tipo_operacion = []

    for tipo, datos in sorted(
        acumulado.items(),
        key=lambda item: item[0].lower(),
    ):
        total = datos["total"]

        media = (
            round(datos["dias"] / total, 1)
            if total
            else None
        )

        media_firma_por_tipo_operacion.append(
            MediaFirmaPorTipoOperacion(
                tipo_operacion=tipo,
                expedientes_firmados=total,
                media_dias=media,
            )
        )

    return DashboardExpedientesResponse(
        total_expedientes=total_expedientes,
        expedientes_por_actividad=expedientes_por_actividad,
        media_firma_por_tipo_operacion=media_firma_por_tipo_operacion,
    )

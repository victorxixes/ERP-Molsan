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
        "key": "gestion_economica",
        "nombre": "Gestión económica",
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

    if valor in {"gestion economica", "gestion_economica"}:
        return "gestion_economica"

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
        "cierre del expediente",
        "cierre_del_expediente",
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
            Expediente.subtipo_operacion,
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
    # Las dos modalidades de entidad aparecen como filas estables aunque
    # todavía no existan firmas registradas; no se inventan medias.
    acumulado["Cancelación Otra entidad"]
    acumulado["Cancelación propia entidad"]

    for tipo_operacion, subtipo_operacion, fecha_envio, fecha_firma in filas_firma:
        tipo_original = (
            " ".join(str(tipo_operacion).strip().split())
            if tipo_operacion
            else " ".join(str(subtipo_operacion or "").strip().split()) or "Sin tipo de operación"
        )
        texto_clasificacion = " ".join(
            str(valor).strip()
            for valor in (tipo_operacion, subtipo_operacion)
            if valor and str(valor).strip()
        )
        tipo_normalizado = _normalizar_actividad(texto_clasificacion)
        tipo_base_normalizado = _normalizar_actividad(tipo_original)

        # La modalidad de entidad tiene prioridad para agruparla en una fila
        # propia, incluso cuando el subtipo es el que aporta esa información.
        if any(
            termino in tipo_normalizado
            for termino in (
                "otra entidad",
                "otras entidades",
                "entidad externa",
                "entidades externas",
            )
        ):
            tipo = "Cancelación Otra entidad"
        elif any(
            termino in tipo_normalizado
            for termino in (
                "propia entidad",
                "entidad propia",
                "misma entidad",
            )
        ):
            tipo = "Cancelación propia entidad"
        elif "cancelacion con provision" in tipo_base_normalizado:
            tipo = "Cancelación con provisión"
        elif "cancelacion sin provision" in tipo_base_normalizado:
            tipo = "Cancelación sin provisión"
        else:
            tipo = tipo_original

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



def obtener_dashboard_cancelagest(db: Session) -> dict:
    """Indicadores del circuito de cancelaciones y tiempos entre hitos."""
    from collections import defaultdict

    filas = (
        db.query(
            Expediente.id_expediente,
            Expediente.tipo_operacion,
            Expediente.subtipo_operacion,
            Expediente.tipo_provision,
            Expediente.id_provision,
            Expediente.fecha_envio_notario,
            Expediente.fecha_envio,
            Expediente.fecha_inicio_actividad,
            Expediente.fecha_firma,
            Expediente.fecha_presentacion_tributaria,
            Expediente.fecha_presentacion,
            Expediente.fecha_inscripcion,
            Expediente.notargest_fecha_cierre,
            Expediente.escritura_simple_cancelacion,
            Expediente.tipo_acta,
            Expediente.origen_bankia,
            Expediente.producto_gtg,
        )
        .all()
    )

    def norm(value):
        value = str(value or "").strip().lower()
        for old, new in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ü", "u")):
            value = value.replace(old, new)
        return " ".join(value.split())

    def es_cancelacion(row):
        texto = " ".join(filter(None, [
            row.tipo_operacion, row.subtipo_operacion,
            row.escritura_simple_cancelacion, row.tipo_acta,
        ]))
        return "cancel" in norm(texto) or bool(row.escritura_simple_cancelacion)

    def categoria(row):
        operacion = norm(" ".join(filter(None, [
            row.tipo_operacion, row.subtipo_operacion, row.tipo_acta,
            row.origen_bankia, row.producto_gtg,
        ])))
        if any(term in operacion for term in ("otra entidad", "otras entidades", "entidad externa", "entidades externas")):
            return "otras_entidades"
        tipo_provision = norm(row.tipo_provision)
        provision_explicita_no = any(term in tipo_provision for term in ("sin provision", "no hay provision", "sin provisiones", "no aplica"))
        if row.id_provision or (tipo_provision and not provision_explicita_no and tipo_provision not in {"no", "ninguna", "ninguno", "sin", "n/a"}):
            return "con_provision"
        return "sin_provision"

    nombres = {
        "con_provision": "Cancelaciones con provisión",
        "sin_provision": "Cancelaciones sin provisión",
        "otras_entidades": "Cancelaciones de otras entidades",
    }
    categoria_stats = {key: {"total": 0, "firmadas": 0, "dias": 0, "casos": 0} for key in nombres}
    firmas_por_mes = defaultdict(int)
    intervalos = {
        "firma_presentacion_tributaria": {"nombre": "Firma → presentación tributaria", "dias": 0, "total": 0},
        "presentacion_tributaria_registro": {"nombre": "Presentación tributaria → presentación en Registro", "dias": 0, "total": 0},
        "registro_inscripcion": {"nombre": "Presentación en Registro → inscripción", "dias": 0, "total": 0},
        "inscripcion_cierre": {"nombre": "Inscripción → cierre", "dias": 0, "total": 0},
    }

    def acumular_intervalo(key, inicio, fin):
        if not inicio or not fin:
            return
        dias = (fin - inicio).days
        if dias < 0:
            return
        intervalos[key]["dias"] += dias
        intervalos[key]["total"] += 1

    total_cancelaciones = 0
    for row in filas:
        if not es_cancelacion(row):
            continue
        total_cancelaciones += 1
        key = categoria(row)
        stat = categoria_stats[key]
        stat["total"] += 1
        envio = row.fecha_envio_notario or row.fecha_envio
        firma = row.fecha_firma
        if firma:
            stat["firmadas"] += 1
            firmas_por_mes[firma.strftime("%Y-%m")] += 1
        if envio and firma:
            dias = (firma - envio).days
            if dias >= 0:
                stat["dias"] += dias
                stat["casos"] += 1
        acumular_intervalo("firma_presentacion_tributaria", firma, row.fecha_presentacion_tributaria)
        acumular_intervalo("presentacion_tributaria_registro", row.fecha_presentacion_tributaria, row.fecha_presentacion)
        acumular_intervalo("registro_inscripcion", row.fecha_presentacion, row.fecha_inscripcion)
        acumular_intervalo("inscripcion_cierre", row.fecha_inscripcion, row.notargest_fecha_cierre)

    categorias = []
    for key, nombre in nombres.items():
        stat = categoria_stats[key]
        categorias.append({
            "key": key,
            "nombre": nombre,
            "total": stat["total"],
            "firmadas": stat["firmadas"],
            "media_dias_envio_firma": round(stat["dias"] / stat["casos"], 1) if stat["casos"] else None,
            "casos_media": stat["casos"],
        })

    return {
        "total_cancelaciones": total_cancelaciones,
        "total_firmadas": sum(item["firmadas"] for item in categorias),
        "firmas_mensuales": [
            {"mes": mes, "total": total}
            for mes, total in sorted(firmas_por_mes.items())
        ],
        "categorias_firma": categorias,
        "tiempos_circuito": [
            {
                "key": key,
                "nombre": data["nombre"],
                "total_casos": data["total"],
                "media_dias": round(data["dias"] / data["total"], 1) if data["total"] else None,
            }
            for key, data in intervalos.items()
        ],
    }

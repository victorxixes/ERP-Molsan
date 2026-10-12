from datetime import datetime, date, time, timedelta
from typing import Optional
import io
import json
import unicodedata

import openpyxl
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import or_, func, and_, text
from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente


router = APIRouter(
    prefix="/expedientes",
    tags=["Expedientes"],
)


# ============================================================
# MODELO DE DATOS: ENVÍO A NOTARIO
# ============================================================

class EnvioANotarioRequest(BaseModel):
    escritura_firmada: bool = False

    fecha_envio: date
    fecha_solicitud_pnc: date
    numero_solicitud_pnc: str

    fecha_firma: Optional[date] = None
    protocolo: Optional[str] = None

    notario_id: Optional[int] = None
    nombre_notario: str
    nif_notario: Optional[str] = None
    notario: Optional[str] = None

    apoderado: Optional[str] = None

    tipo_firma: str
    tipo_documento: str

    idioma_documento: Optional[str] = None
    formato_escritura: Optional[str] = None
    tipo_tramite: Optional[str] = None

    poblacion: Optional[str] = None
    provincia: Optional[str] = None

    fecha_prevista_firma: Optional[date] = None
    hora_prevista_firma: Optional[time] = time(9, 0)

    # DATOS DE FACTURACIÓN DEL EXPEDIENTE
    facturacion_nombre: Optional[str] = None
    facturacion_apellidos: Optional[str] = None
    facturacion_dni_nif: Optional[str] = None
    facturacion_direccion: Optional[str] = None
    facturacion_codigo_postal: Optional[str] = None
    facturacion_poblacion: Optional[str] = None
    facturacion_provincia: Optional[str] = None
    facturacion_telefono: Optional[str] = None
    facturacion_email: Optional[str] = None


# ============================================================
# ACTIVIDADES DEL EXPEDIENTE
# ============================================================

ACTIVIDADES_EXPEDIENTES = [
    {
        "key": "documentacion-previa",
        "label": "Documentación previa",
        "aliases": [
            "Documentación previa",
            "Documentacion previa",
        ],
    },
    {
        "key": "sede-notarial",
        "label": "Sede notarial",
        "aliases": [
            "Sede notarial",
            "Sede Notarial",
            "Sede NOTARIAL",
        ],
    },
    {
        "key": "sede-notarial-protocolo",
        "label": "Sede notarial con protocolo",
        "aliases": [
            "Sede notarial con protocolo",
            "Sede Notarial con protocolo",
            "Sede NOTARIAL con protocolo",
        ],
    },
    {
        "key": "liquidacion-impuestos",
        "label": "Liquidación de impuestos",
        "aliases": [
            "Liquidación de impuestos",
            "Liquidacion de impuestos",
            "Liquidación impuestos",
            "Liquidacion impuestos",
        ],
    },
    {
        "key": "tramitacion-inscripcion",
        "label": "Tramitación inscripción",
        "aliases": [
            "Tramitación inscripción",
            "Tramitacion inscripcion",
            "Tramitación de inscripción",
            "Tramitacion de inscripcion",
        ],
    },
    {
        "key": "defectos-registrales",
        "label": "Defectos registrales",
        "aliases": [
            "Defectos registrales",
            "Defectos Registrales",
        ],
    },
    {
        "key": "facturacion-cierre",
        "label": "Facturación y cierre",
        "aliases": [
            "Facturación y cierre",
            "Facturacion y cierre",
        ],
    },
]


def normalizar_actividad_texto(valor: Optional[str]) -> str:
    if valor is None:
        return ""

    texto = unicodedata.normalize(
        "NFD",
        str(valor).strip().lower(),
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )

    return " ".join(texto.split())


def resolver_actividad(valor: Optional[str]) -> Optional[str]:
    normalizada = normalizar_actividad_texto(valor)

    if not normalizada:
        return None

    for actividad in ACTIVIDADES_EXPEDIENTES:
        valores = [
            actividad["key"],
            actividad["label"],
            *actividad["aliases"],
        ]

        if any(
            normalizada == normalizar_actividad_texto(item)
            for item in valores
        ):
            return actividad["key"]

    return None


def condicion_actividad(clave_actividad: str):
    actividad = func.trim(Expediente.actividad_actual)

    if clave_actividad == "documentacion-previa":
        return or_(
            actividad.ilike("Documentación previa"),
            actividad.ilike("Documentacion previa"),
        )

    if clave_actividad == "sede-notarial":
        return and_(
            or_(
                actividad.ilike("Sede notarial"),
                actividad.ilike("Sede Notarial"),
            ),
            Expediente.fecha_firma.is_(None),
        )

    if clave_actividad == "sede-notarial-protocolo":
        return and_(
            or_(
                actividad.ilike("Sede notarial"),
                actividad.ilike("Sede Notarial"),
                actividad.ilike("Sede notarial con protocolo"),
                actividad.ilike("Sede Notarial con protocolo"),
            ),
            Expediente.fecha_firma.isnot(None),
        )

    if clave_actividad == "liquidacion-impuestos":
        return or_(
            actividad.ilike("Liquidación de impuestos"),
            actividad.ilike("Liquidacion de impuestos"),
            actividad.ilike("Liquidación impuestos"),
            actividad.ilike("Liquidacion impuestos"),
        )

    if clave_actividad == "tramitacion-inscripcion":
        return or_(
            actividad.ilike("Tramitación inscripción"),
            actividad.ilike("Tramitacion inscripcion"),
            actividad.ilike("Tramitación de inscripción"),
            actividad.ilike("Tramitacion de inscripcion"),
        )

    if clave_actividad == "defectos-registrales":
        return or_(
            actividad.ilike("Defectos registrales"),
            actividad.ilike("Defectos Registrales"),
        )

    if clave_actividad == "facturacion-cierre":
        return or_(
            actividad.ilike("Facturación y cierre"),
            actividad.ilike("Facturacion y cierre"),
        )

    return None


# ============================================================
# CAMPOS DEVUELTOS POR LA API
# ============================================================

CAMPOS_EXPEDIENTE = [
    "id",
    "cliente_id",
    "id_expediente",
    "estado_expediente",
    "estado_expediente_ancert",

    "fecha_alta",
    "fecha_firma",
    "fecha_inscripcion",
    "fecha_entregado_cliente",
    "fecha_prevista_firma",
    "fecha_vencimiento",
    "fecha_sol_cgn",
    "fecha_firma_prev_val",
    "fecha_firma_prev_cli",
    "fecha_inicio_actividad",
    "fecha_fin_actividad",

    "fecha_envio_notario",
    "fecha_solicitud_pnc",
    "numero_solicitud_pnc",
    "escritura_firmada",
    "hora_prevista_firma",

    "nombre_titular",
    "nif_titular",
    "nombre_solicitante",
    "nif_solicitante",
    "apoderado",

    "nombre_notario",
    "nif_notario",
    "notario",

    "tipo_firma",
    "tipo_documento",
    "idioma_documento",
    "formato_escritura",
    "tipo_tramite",
    "poblacion",
    "provincia",

    "oficina",
    "dan",
    "oficina_alta",

    "capital",
    "importe",
    "saldo_real",
    "saldo_disponible",
    "id_provision",
    "tipo_provision",

    "contrato",
    "num_solicitud_sia",
    "tipo_operacion",
    "subtipo_operacion",
    "vinccanc",
    "protocolo",
    "origen_bankia",
    "producto_gtg",
    "dt",

    "actividad_actual",
    "estado_actividad",
    "id_gestoria_tramite",
    "nombre_gestoria",
    "gestoria",
    "finca",

    "tiene_defectos_abiertos",
    "tipo_error",
    "descripcion_error",
    "falta_defecto",
    "fcierre_defecto",

    "id_expediente_cgn",
    "tipo_acta",
    "lucy",
    "indicador_tt",
    "observaciones",

    "facturacion_nombre",
    "facturacion_apellidos",
    "facturacion_dni_nif",
    "facturacion_direccion",
    "facturacion_codigo_postal",
    "facturacion_poblacion",
    "facturacion_provincia",
    "facturacion_telefono",
    "facturacion_email",
    "facturacion_estado",
    "facturacion_fecha",

    "registral_estado",
    "registral_fecha",
]


COLUMNAS_ORDENABLES = {
    campo: getattr(Expediente, campo)
    for campo in CAMPOS_EXPEDIENTE
    if hasattr(Expediente, campo)
}


# ============================================================
# COLUMNAS DEL EXCEL
# ============================================================

COLUMNAS_EXCEL = [
    ("ID", "id"),
    ("CLIENTEID", "cliente_id"),
    ("IDEXPEDIENTE", "id_expediente"),
    ("ESTADOEXPEDIENTE", "estado_expediente"),
    ("ESTADOEXPEDIENTEANCERT", "estado_expediente_ancert"),

    ("FECHAALTA", "fecha_alta"),
    ("FECHAFIRMA", "fecha_firma"),
    ("FECHAINSCRIPCION", "fecha_inscripcion"),
    ("FECHAENTREGADOCLIENTE", "fecha_entregado_cliente"),
    ("FECHAPREVISTAFIRMA", "fecha_prevista_firma"),
    ("FECHAVENCIMIENTO", "fecha_vencimiento"),
    ("FECHASOLCGN", "fecha_sol_cgn"),
    ("FECHAFIRMAPREVVAL", "fecha_firma_prev_val"),
    ("FECHAFIRMAPREVCLI", "fecha_firma_prev_cli"),
    ("FECHAINICIOACTIVIDAD", "fecha_inicio_actividad"),
    ("FECHAFINACTIVIDAD", "fecha_fin_actividad"),
    ("FECHAENVIONOTARIO", "fecha_envio_notario"),
    ("FECHASOLICITUDPNC", "fecha_solicitud_pnc"),
    ("NUMEROSOLICITUDPNC", "numero_solicitud_pnc"),

    ("NOMBRETITULAR", "nombre_titular"),
    ("NIFTITULAR", "nif_titular"),
    ("NOMBRESOLICITANTE", "nombre_solicitante"),
    ("NIFSOLICITANTE", "nif_solicitante"),
    ("APODERADO", "apoderado"),

    ("NOMBRENOTARIO", "nombre_notario"),
    ("NIFNOTARIO", "nif_notario"),
    ("NOTARIO", "notario"),

    ("TIPOFIRMA", "tipo_firma"),
    ("TIPODOCUMENTO", "tipo_documento"),
    ("IDIOMADOCUMENTO", "idioma_documento"),
    ("FORMATOESCRITURA", "formato_escritura"),
    ("TIPOTRAMITE", "tipo_tramite"),
    ("POBLACION", "poblacion"),
    ("PROVINCIA", "provincia"),

    ("OFICINA", "oficina"),
    ("DAN", "dan"),
    ("OFICINAALTA", "oficina_alta"),

    ("CAPITAL", "capital"),
    ("IMPORTE", "importe"),
    ("SALDOREAL", "saldo_real"),
    ("SALDODISPONIBLE", "saldo_disponible"),
    ("IDPROVISION", "id_provision"),
    ("TIPOPROVISION", "tipo_provision"),

    ("CONTRATO", "contrato"),
    ("NUMSOLICITUDSIA", "num_solicitud_sia"),
    ("TIPOOPERACION", "tipo_operacion"),
    ("SUBTIPOOPERACION", "subtipo_operacion"),
    ("VINCCANC", "vinccanc"),
    ("PROTOCOLO", "protocolo"),
    ("ORIGENBANKIA", "origen_bankia"),
    ("PRODUCTOGTG", "producto_gtg"),
    ("DT", "dt"),

    ("ACTIVIDADACTUAL", "actividad_actual"),
    ("ESTADOACTIVIDAD", "estado_actividad"),
    ("IDGESTORIATRAMITE", "id_gestoria_tramite"),
    ("NOMBREGESTORIA", "nombre_gestoria"),
    ("GESTORIA", "gestoria"),
    ("FINCA", "finca"),

    ("TIENEDEFECTOSABIERTOS", "tiene_defectos_abiertos"),
    ("TIPOERROR", "tipo_error"),
    ("DESCRIPCIONERROR", "descripcion_error"),
    ("FALTADEFECTO", "falta_defecto"),
    ("FCIERREDEFECTO", "fcierre_defecto"),

    ("IDEXPEDIENTECGN", "id_expediente_cgn"),
    ("TIPOACTA", "tipo_acta"),
    ("LUCY", "lucy"),
    ("INDICADORTT", "indicador_tt"),
    ("OBSERVACIONES", "observaciones"),

    ("FACTURACIONNOMBRE", "facturacion_nombre"),
    ("FACTURACIONAPELLIDOS", "facturacion_apellidos"),
    ("FACTURACIONDNINIF", "facturacion_dni_nif"),
    ("FACTURACIONDIRECCION", "facturacion_direccion"),
    ("FACTURACIONCODIGOPOSTAL", "facturacion_codigo_postal"),
    ("FACTURACIONPOBLACION", "facturacion_poblacion"),
    ("FACTURACIONPROVINCIA", "facturacion_provincia"),
    ("FACTURACIONTELEFONO", "facturacion_telefono"),
    ("FACTURACIONEMAIL", "facturacion_email"),
    ("FACTURACIONESTADO", "facturacion_estado"),
    ("FACTURACIONFECHA", "facturacion_fecha"),

    ("REGISTRALESTADO", "registral_estado"),
    ("REGISTRALFECHA", "registral_fecha"),
]


# ============================================================
# SERIALIZACIÓN DE EXPEDIENTES
# ============================================================

def expediente_a_dict(expediente: Expediente) -> dict:
    resultado = {}

    for campo in CAMPOS_EXPEDIENTE:
        valor = getattr(expediente, campo, None)

        if isinstance(valor, (date, datetime, time)):
            valor = valor.isoformat()

        resultado[campo] = valor

    return resultado


# ============================================================
# FILTROS
# ============================================================

def parsear_fecha(
    valor: Optional[str],
    nombre_campo: str,
) -> Optional[date]:

    if not valor:
        return None

    try:
        return datetime.strptime(
            valor,
            "%Y-%m-%d",
        ).date()

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"{nombre_campo} debe tener formato YYYY-MM-DD.",
        )


def aplicar_filtros(
    
def aplicar_filtros(
    q,
    nif=None,
    actividad=None,
    fechaInicio=None,
    fechaFin=None,
    notario=None,
    oficina=None,
    importeMin=None,
    importeMax=None,
    nombreTitular=None,
    nifTitular=None,
    nombreSolicitante=None,
    nifSolicitante=None,
    nombreNotario=None,
    nifNotario=None,
    finca=None,
    saldoReal=None,
    saldoDisponible=None,
    estadoActividad=None,
    estadoExpediente=None,
    observaciones=None,
):
    fecha_inicio = parsear_fecha(fechaInicio, "fechaInicio")
    fecha_fin = parsear_fecha(fechaFin, "fechaFin")

    if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio no puede ser posterior a la fecha de fin.",
        )

    if (
        importeMin is not None
        and importeMax is not None
        and importeMin > importeMax
    ):
        raise HTTPException(
            status_code=400,
            detail="El importe mínimo no puede ser superior al máximo.",
        )

    def contiene(campo, valor):
        if valor is not None and str(valor).strip():
            return campo.ilike(f"%{str(valor).strip()}%")
        return None

    # Compatibilidad con el filtro antiguo NIF
    if nif and nif.strip():
        patron = f"%{nif.strip()}%"
        q = q.filter(
            or_(
                Expediente.nif_titular.ilike(patron),
                Expediente.nif_solicitante.ilike(patron),
            )
        )

    # Titular
    condicion = contiene(Expediente.nombre_titular, nombreTitular)
    if condicion is not None:
        q = q.filter(condicion)

    condicion = contiene(Expediente.nif_titular, nifTitular)
    if condicion is not None:
        q = q.filter(condicion)

    # Solicitante
    condicion = contiene(Expediente.nombre_solicitante, nombreSolicitante)
    if condicion is not None:
        q = q.filter(condicion)

    condicion = contiene(Expediente.nif_solicitante, nifSolicitante)
    if condicion is not None:
        q = q.filter(condicion)

    # Fechas de alta
    if fecha_inicio:
        q = q.filter(Expediente.fecha_alta >= fecha_inicio)

    if fecha_fin:
        q = q.filter(
            Expediente.fecha_alta < (
                datetime.combine(fecha_fin, time.min) + timedelta(days=1)
            )
        )

    # Notario
    condicion = contiene(Expediente.nombre_notario, nombreNotario)
    if condicion is not None:
        q = q.filter(condicion)

    condicion = contiene(Expediente.nif_notario, nifNotario)
    if condicion is not None:
        q = q.filter(condicion)

    # Compatibilidad con el filtro antiguo de notario
    if notario and notario.strip():
        patron = f"%{notario.strip()}%"
        q = q.filter(
            or_(
                Expediente.nombre_notario.ilike(patron),
                Expediente.nif_notario.ilike(patron),
                Expediente.notario.ilike(patron),
            )
        )

    # Oficina
    condicion = contiene(Expediente.oficina, oficina)
    if condicion is not None:
        q = q.filter(condicion)

    # Actividad actual
    if actividad and actividad.strip():
        clave = resolver_actividad(actividad)
        if clave is None:
            raise HTTPException(
                status_code=400,
                detail=f"Actividad no válida: {actividad}",
            )

        condicion = condicion_actividad(clave)
        if condicion is not None:
            q = q.filter(condicion)

    # Estado de actividad y estado del expediente
    condicion = contiene(Expediente.estado_actividad, estadoActividad)
    if condicion is not None:
        q = q.filter(condicion)

    condicion = contiene(Expediente.estado_expediente, estadoExpediente)
    if condicion is not None:
        q = q.filter(condicion)

    # Finca
    condicion = contiene(Expediente.finca, finca)
    if condicion is not None:
        q = q.filter(condicion)

    # Observaciones
    condicion = contiene(Expediente.observaciones, observaciones)
    if condicion is not None:
        q = q.filter(condicion)

    # Importe
    if importeMin is not None:
        q = q.filter(Expediente.importe >= importeMin)

    if importeMax is not None:
        q = q.filter(Expediente.importe <= importeMax)

    # Saldos: permiten buscar por valor exacto
    if saldoReal is not None:
        q = q.filter(Expediente.saldo_real == saldoReal)

    if saldoDisponible is not None:
        q = q.filter(Expediente.saldo_disponible == saldoDisponible)

    return q


# ============================================================
# LISTADO DE EXPEDIENTES
# ============================================================

@router.get("/listado")
def listado_expedientes
    nombreTitular: Optional[str] = None,
    nifTitular: Optional[str] = None,
    nombreSolicitante: Optional[str] = None,
    nifSolicitante: Optional[str] = None,
    nombreNotario: Optional[str] = None,
    nifNotario: Optional[str] = None,
    finca: Optional[str] = None,
    saldoReal: Optional[float] = None,
    saldoDisponible: Optional[float] = None,
    estadoActividad: Optional[str] = None,
    estadoExpediente: Optional[str] = None,
    observaciones: Optional[str] = None,
    pagina: int = Query(1, ge=1),
    porPagina: int = Query(20, ge=1, le=200),
    nif: Optional[str] = None,
    actividad: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    notario: Optional[str] = None,
    oficina: Optional[str] = None,
    importeMin: Optional[float] = None,
    importeMax: Optional[float] = None,
    ordenMultiple: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
        q = aplicar_filtros(
        db.query(Expediente),
        nif=nif,
        actividad=actividad,
        fechaInicio=fechaInicio,
        fechaFin=fechaFin,
        notario=notario,
        oficina=oficina,
        importeMin=importeMin,
        importeMax=importeMax,
        nombreTitular=nombreTitular,
        nifTitular=nifTitular,
        nombreSolicitante=nombreSolicitante,
        nifSolicitante=nifSolicitante,
        nombreNotario=nombreNotario,
        nifNotario=nifNotario,
        finca=finca,
        saldoReal=saldoReal,
        saldoDisponible=saldoDisponible,
        estadoActividad=estadoActividad,
        estadoExpediente=estadoExpediente,
        observaciones=observaciones,
    )

    orden_aplicado = False

    if ordenMultiple:
        try:
            ordenes = json.loads(ordenMultiple)

        except (json.JSONDecodeError, TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="ordenMultiple no contiene un JSON válido.",
            )

        if not isinstance(ordenes, list):
            raise HTTPException(
                status_code=400,
                detail="ordenMultiple debe ser una lista.",
            )

        for orden in ordenes:
            if not isinstance(orden, dict):
                continue

            campo = COLUMNAS_ORDENABLES.get(
                orden.get("columna")
            )

            if campo is None:
                continue

            direccion = str(
                orden.get("direccion", "asc")
            ).lower()

            q = q.order_by(
                campo.desc()
                if direccion == "desc"
                else campo.asc()
            )

            orden_aplicado = True

    if not orden_aplicado:
        q = q.order_by(
            Expediente.fecha_alta.desc(),
            Expediente.id_expediente.desc(),
            Expediente.id.desc(),
        )

    total = q.count()

    total_paginas = max(
        1,
        (total + porPagina - 1) // porPagina,
    )

    pagina_real = min(
        pagina,
        total_paginas,
    )

    items_db = (
        q.offset((pagina_real - 1) * porPagina)
        .limit(porPagina)
        .all()
    )

    return {
        "items": [
            expediente_a_dict(expediente)
            for expediente in items_db
        ],
        "total": total,
        "pagina": pagina_real,
        "porPagina": porPagina,
        "total_paginas": total_paginas,
    }


# ============================================================
# RESUMEN DE EXPEDIENTES POR ACTIVIDAD
# ============================================================

@router.get("/resumen")
def resumen_expedientes(
    db: Session = Depends(get_db),
):
    total_expedientes = (
        db.query(func.count(Expediente.id)).scalar() or 0
    )

    actividades = []

    for actividad in ACTIVIDADES_EXPEDIENTES:
        condicion = condicion_actividad(
            actividad["key"]
        )

        if condicion is not None:
            total = (
                db.query(func.count(Expediente.id))
                .filter(condicion)
                .scalar()
                or 0
            )
        else:
            total = 0

        actividades.append(
            {
                "key": actividad["key"],
                "actividad": actividad["label"],
                "total": int(total),
            }
        )

    return {
        "total": int(total_expedientes),
        "actividades": actividades,
    }


# ============================================================
# EXPORTACIÓN A EXCEL
# ============================================================

@router.get("/exportar-excel")
def exportar_excel_expedientes(
    nif: Optional[str] = None,
    actividad: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    notario: Optional[str] = None,
    oficina: Optional[str] = None,
    importeMin: Optional[float] = None,
    importeMax: Optional[float] = None,
    db: Session = Depends(get_db),
):
    q = aplicar_filtros(
        db.query(Expediente),
        nif,
        actividad,
        fechaInicio,
        fechaFin,
        notario,
        oficina,
        importeMin,
        importeMax,
    )

    expedientes = (
        q.order_by(
            Expediente.fecha_alta.desc(),
            Expediente.id_expediente.desc(),
            Expediente.id.desc(),
        )
        .all()
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Expedientes"

    for col, (cabecera, _) in enumerate(
        COLUMNAS_EXCEL,
        start=1,
    ):
        ws.cell(
            row=1,
            column=col,
            value=cabecera,
        ).font = Font(bold=True)

    for fila, expediente in enumerate(
        expedientes,
        start=2,
    ):
        for col, (_, atributo) in enumerate(
            COLUMNAS_EXCEL,
            start=1,
        ):
            valor = getattr(
                expediente,
                atributo,
                None,
            )

            cell = ws.cell(
                row=fila,
                column=col,
                value=valor,
            )

            if isinstance(valor, (date, datetime)):
                cell.number_format = "dd/mm/yyyy"

            elif isinstance(valor, time):
                cell.number_format = "hh:mm"

    ws.freeze_panes = "A2"

    ultima_columna = get_column_letter(
        len(COLUMNAS_EXCEL)
    )

    ws.auto_filter.ref = (
        f"A1:{ultima_columna}{len(expedientes) + 1}"
    )

    for col, (cabecera, _) in enumerate(
        COLUMNAS_EXCEL,
        start=1,
    ):
        max_length = len(str(cabecera))

        for fila in range(
            2,
            min(len(expedientes) + 2, 500),
        ):
            valor = ws.cell(
                row=fila,
                column=col,
            ).value

            if valor is not None:
                max_length = max(
                    max_length,
                    len(str(valor)),
                )

        ws.column_dimensions[
            get_column_letter(col)
        ].width = min(
            max(max_length + 2, 12),
            45,
        )

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                'attachment; filename="expedientes.xlsx"'
            )
        },
    )


# ============================================================
# CREAR O ACTUALIZAR CITA DE AGENDA
# ============================================================

def crear_o_actualizar_cita_agenda(
    db: Session,
    expediente: Expediente,
    datos: EnvioANotarioRequest,
):
    if not datos.fecha_prevista_firma:
        return None

    hora_inicio = (
        datos.hora_prevista_firma
        or time(9, 0)
    )

    minutos_inicio = (
        hora_inicio.hour * 60
        + hora_inicio.minute
    )

    minutos_fin = min(
        minutos_inicio + 60,
        23 * 60 + 59,
    )

    hora_fin = time(
        minutos_fin // 60,
        minutos_fin % 60,
    )

    cita = (
        db.query(Cita)
        .filter(
            Cita.expediente_id == expediente.id
        )
        .order_by(Cita.id.desc())
        .first()
    )

    observaciones = (
        f"Firma prevista — Expediente "
        f"{expediente.id_expediente}"
    )

    if cita:
        cita.fecha = datos.fecha_prevista_firma
        cita.hora_inicio = hora_inicio
        cita.hora_fin = hora_fin
        cita.tipo_cita = "Firma notarial"
        cita.notario_id = datos.notario_id
        cita.tipo_firma = datos.tipo_firma
        cita.apoderado = datos.apoderado
        cita.observaciones = observaciones

        return cita

    cita = Cita(
        fecha=datos.fecha_prevista_firma,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        tipo_cita="Firma notarial",
        notario_id=datos.notario_id,
        tipo_firma=datos.tipo_firma,
        apoderado=datos.apoderado,
        expediente_id=expediente.id,
        observaciones=observaciones,
    )

    db.add(cita)

    return cita


# ============================================================
# ENVÍO A NOTARIO
# ============================================================

@router.put("/{id_expediente}/enviar-a-notario")
def enviar_a_notario(
    id_expediente: str,
    datos: EnvioANotarioRequest,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(
            Expediente.id_expediente == id_expediente
        )
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    if not datos.nombre_notario.strip():
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar un notario.",
        )

    if not datos.tipo_firma.strip():
        raise HTTPException(
            status_code=400,
            detail="El Tipo de firma es obligatorio.",
        )

    if not datos.tipo_documento.strip():
        raise HTTPException(
            status_code=400,
            detail="El Tipo documento es obligatorio.",
        )

    if datos.fecha_solicitud_pnc > datos.fecha_envio:
        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha de solicitud PNC no puede ser "
                "posterior a la fecha de envío."
            ),
        )

    if not datos.numero_solicitud_pnc.strip():
        raise HTTPException(
            status_code=400,
            detail="El número de solicitud PNC es obligatorio.",
        )

    if (
        datos.fecha_prevista_firma
        and datos.fecha_prevista_firma < datos.fecha_envio
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La Fecha prevista de firma no puede ser "
                "anterior a la Fecha de envío."
            ),
        )

    if datos.escritura_firmada:
        if not datos.fecha_firma:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Si la escritura está firmada debes indicar "
                    "la Fecha de firma."
                ),
            )

        if datos.fecha_envio > datos.fecha_firma:
            raise HTTPException(
                status_code=400,
                detail=(
                    "La Fecha de envío no puede ser posterior "
                    "a la Fecha de firma."
                ),
            )

        if not datos.protocolo or not datos.protocolo.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Si la escritura está firmada debes indicar "
                    "el Protocolo."
                ),
            )

    try:
        # ESTADO DE LA ESCRITURA
        if datos.escritura_firmada:
            expediente.fecha_firma = datos.fecha_firma
            expediente.protocolo = datos.protocolo.strip()
            expediente.actividad_actual = (
                "Sede notarial con protocolo"
            )
        else:
            expediente.fecha_firma = None
            expediente.protocolo = None
            expediente.actividad_actual = "Sede notarial"

        # DATOS DEL ENVÍO
        expediente.fecha_envio_notario = datos.fecha_envio
        expediente.fecha_solicitud_pnc = datos.fecha_solicitud_pnc
        expediente.numero_solicitud_pnc = (
            datos.numero_solicitud_pnc.strip()
        )
        expediente.escritura_firmada = datos.escritura_firmada
        expediente.hora_prevista_firma = (
            datos.hora_prevista_firma or time(9, 0)
        )
        expediente.fecha_inicio_actividad = datos.fecha_envio

        # DATOS DEL NOTARIO
        expediente.nombre_notario = datos.nombre_notario.strip()

        expediente.nif_notario = (
            datos.nif_notario.strip()
            if datos.nif_notario and datos.nif_notario.strip()
            else None
        )

        expediente.notario = (
            datos.notario.strip()
            if datos.notario and datos.notario.strip()
            else datos.nombre_notario.strip()
        )

        expediente.apoderado = (
            datos.apoderado.strip()
            if datos.apoderado and datos.apoderado.strip()
            else None
        )

        # DATOS DEL DOCUMENTO
        expediente.tipo_firma = datos.tipo_firma.strip()
        expediente.tipo_documento = datos.tipo_documento.strip()

        expediente.idioma_documento = (
            datos.idioma_documento.strip()
            if datos.idioma_documento
            and datos.idioma_documento.strip()
            else None
        )

        expediente.formato_escritura = (
            datos.formato_escritura.strip()
            if datos.formato_escritura
            and datos.formato_escritura.strip()
            else None
        )

        expediente.tipo_tramite = (
            datos.tipo_tramite.strip()
            if datos.tipo_tramite
            and datos.tipo_tramite.strip()
            else None
        )

        expediente.poblacion = (
            datos.poblacion.strip()
            if datos.poblacion and datos.poblacion.strip()
            else None
        )

        expediente.provincia = (
            datos.provincia.strip()
            if datos.provincia and datos.provincia.strip()
            else None
        )

        if datos.fecha_prevista_firma:
            expediente.fecha_prevista_firma = (
                datos.fecha_prevista_firma
            )

        # DATOS DE FACTURACIÓN
        campos_facturacion = [
            "facturacion_nombre",
            "facturacion_apellidos",
            "facturacion_dni_nif",
            "facturacion_direccion",
            "facturacion_codigo_postal",
            "facturacion_poblacion",
            "facturacion_provincia",
            "facturacion_telefono",
            "facturacion_email",
        ]

        for campo in campos_facturacion:
            valor = getattr(datos, campo, None)

            if valor is not None:
                valor = valor.strip() or None

            setattr(
                expediente,
                campo,
                valor,
            )

        # CITA VINCULADA A AGENDA
        cita = crear_o_actualizar_cita_agenda(
            db,
            expediente,
            datos,
        )

        db.add(expediente)
        db.commit()
        db.refresh(expediente)

        if cita is not None:
            db.refresh(cita)

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        print(
            "ERROR ENVIANDO EXPEDIENTE A NOTARIO:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo guardar el envío a notario "
                "ni crear la cita de Agenda."
            ),
        )

    respuesta = expediente_a_dict(expediente)

    respuesta["agenda_cita_creada"] = (
        cita is not None
    )

    respuesta["agenda_cita_id"] = (
        cita.id
        if cita is not None
        else None
    )

    return respuesta

# ============================================================
# DIAGNÓSTICO TEMPORAL DE BLOQUEOS POSTGRESQL
# ============================================================

@router.get("/diagnostico-bloqueos")
def diagnostico_bloqueos(
    db: Session = Depends(get_db),
):
    try:
        resultado = db.execute(text("""
            SELECT
                a.pid AS proceso,
                a.usename AS usuario_bd,
                a.application_name AS aplicacion,
                a.client_addr AS direccion_cliente,
                a.state AS estado,
                a.wait_event_type AS tipo_espera,
                a.wait_event AS evento_espera,
                CASE
                    WHEN a.xact_start IS NOT NULL
                    THEN EXTRACT(
                        EPOCH FROM (NOW() - a.xact_start)
                    )::integer
                    ELSE NULL
                END AS segundos_transaccion,
                CASE
                    WHEN a.query_start IS NOT NULL
                    THEN EXTRACT(
                        EPOCH FROM (NOW() - a.query_start)
                    )::integer
                    ELSE NULL
                END AS segundos_consulta,
                pg_blocking_pids(a.pid) AS bloqueado_por,
                LEFT(a.query, 300) AS consulta
            FROM pg_stat_activity a
            WHERE a.datname = current_database()
              AND a.pid <> pg_backend_pid()
            ORDER BY
                cardinality(pg_blocking_pids(a.pid)) DESC,
                a.xact_start NULLS LAST,
                a.query_start NULLS LAST
            LIMIT 100
        """))

        filas = [
            dict(fila)
            for fila in resultado.mappings().all()
        ]

        return {
            "ok": True,
            "total_sesiones": len(filas),
            "sesiones": filas,
        }

    except Exception as exc:
        db.rollback()
        print("ERROR DIAGNÓSTICO BLOQUEOS:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="No se pudieron consultar las sesiones de PostgreSQL."
        )


@router.get("/diagnostico-bloqueos-expedientes")
def diagnostico_bloqueos_expedientes(db: Session = Depends(get_db)):
    try:
        resultado = db.execute(text("""
            SELECT
                a.pid AS proceso,
                a.usename AS usuario,
                a.state AS estado,
                a.wait_event_type AS tipo_espera,
                a.wait_event AS evento_espera,
                l.mode AS tipo_bloqueo,
                l.granted AS bloqueo_concedido,
                n.nspname AS esquema,
                c.relname AS tabla,
                CASE
                    WHEN a.xact_start IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (NOW() - a.xact_start))::integer
                    ELSE NULL
                END AS segundos_transaccion,
                pg_blocking_pids(a.pid) AS bloqueado_por,
                LEFT(a.query, 250) AS consulta
            FROM pg_locks l
            JOIN pg_stat_activity a ON a.pid = l.pid
            JOIN pg_class c ON c.oid = l.relation
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = 'expedientes'
              AND n.nspname = 'public'
            ORDER BY l.granted ASC, a.xact_start NULLS LAST
        """))

        filas = [dict(fila) for fila in resultado.mappings().all()]

        return {
            "ok": True,
            "tabla": "public.expedientes",
            "total_bloqueos": len(filas),
            "bloqueos": filas
        }

    except Exception as exc:
        db.rollback()
        print("ERROR DIAGNÓSTICO BLOQUEOS EXPEDIENTES:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="No se pudieron consultar los bloqueos de expedientes."
        )


@router.get("/diagnostico-espera-migracion")
def diagnostico_espera_migracion(db: Session = Depends(get_db)):
    try:
        resultado = db.execute(text("""
            SELECT
                bloqueado.pid AS proceso_bloqueado,
                bloqueado.state AS estado_bloqueado,
                bloqueado.wait_event_type AS tipo_espera,
                bloqueado.wait_event AS evento_espera,
                LEFT(bloqueado.query, 300) AS consulta_bloqueada,
                bloqueador.pid AS proceso_bloqueador,
                bloqueador.state AS estado_bloqueador,
                CASE
                    WHEN bloqueador.xact_start IS NOT NULL
                    THEN EXTRACT(
                        EPOCH FROM (NOW() - bloqueador.xact_start)
                    )::integer
                    ELSE NULL
                END AS segundos_transaccion_bloqueador,
                LEFT(bloqueador.query, 300) AS consulta_bloqueador
            FROM pg_stat_activity bloqueado
            JOIN pg_stat_activity bloqueador
              ON bloqueador.pid = ANY(
                  pg_blocking_pids(bloqueado.pid)
              )
            WHERE bloqueado.datname = current_database()
              AND bloqueado.pid <> pg_backend_pid()
            ORDER BY bloqueado.query_start NULLS LAST
        """))

        filas = [dict(fila) for fila in resultado.mappings().all()]

        return {
            "ok": True,
            "total_esperas": len(filas),
            "esperas": filas
        }

    except Exception as exc:
        db.rollback()
        print("ERROR DIAGNOSTICO ESPERA MIGRACION:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="No se pudieron consultar las esperas de la base de datos."
        )
# ============================================================
# CONSULTAR UN EXPEDIENTE
# ============================================================

@router.get("/{id_expediente}")
def obtener_expediente(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(
            Expediente.id_expediente == id_expediente
        )
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    return expediente_a_dict(expediente)


# ============================================================
# MIGRACIÓN DE COLUMNAS
# ============================================================

@router.post("/migraciones/actualizar-envio-notario")
def actualizar_columnas_envio_notario(
    db: Session = Depends(get_db),
):
    columnas = [
        ("idioma_documento", "VARCHAR(100)"),
        ("formato_escritura", "VARCHAR(200)"),
        ("tipo_tramite", "VARCHAR(200)"),
        ("facturacion_nombre", "VARCHAR(300)"),
        ("facturacion_apellidos", "VARCHAR(300)"),
        ("facturacion_dni_nif", "VARCHAR(50)"),
        ("facturacion_direccion", "VARCHAR(500)"),
        ("facturacion_codigo_postal", "VARCHAR(30)"),
        ("facturacion_poblacion", "VARCHAR(200)"),
        ("facturacion_provincia", "VARCHAR(200)"),
        ("facturacion_telefono", "VARCHAR(50)"),
        ("facturacion_email", "VARCHAR(320)"),
        ("facturacion_estado", "VARCHAR(200)"),
        ("facturacion_fecha", "DATE"),
    ]

    print(
        "INICIO MIGRACIÓN ENVÍO A NOTARIO: "
        f"{len(columnas)} columnas",
        flush=True,
    )

    try:
        # PostgreSQL: no dejar la petición esperando indefinidamente
        # si otra operación mantiene bloqueada la tabla expedientes.
        db.execute(text("SET LOCAL lock_timeout = '5s'"))
        db.execute(text("SET LOCAL statement_timeout = '20s'"))

        for indice, (columna, tipo_sql) in enumerate(columnas, start=1):
            print(
                f"MIGRACIÓN ENVÍO A NOTARIO "
                f"[{indice}/{len(columnas)}]: comprobando {columna}",
                flush=True,
            )

            db.execute(
                text(
                    f"ALTER TABLE expedientes "
                    f"ADD COLUMN IF NOT EXISTS {columna} {tipo_sql}"
                )
            )

            print(
                f"MIGRACIÓN ENVÍO A NOTARIO: {columna} OK",
                flush=True,
            )

        db.commit()

        print(
            "FIN MIGRACIÓN ENVÍO A NOTARIO: completada correctamente",
            flush=True,
        )

        return {
            "ok": True,
            "mensaje": "Base de datos actualizada correctamente.",
            "tabla": "expedientes",
            "columnas": [columna for columna, _ in columnas],
        }

    except Exception as exc:
        db.rollback()

        print(
            "ERROR EN MIGRACIÓN DE ENVÍO A NOTARIO:",
            repr(exc),
            flush=True,
        )

        mensaje_error = str(exc).lower()
        if (
            "lock timeout" in mensaje_error
            or "statement timeout" in mensaje_error
            or "canceling statement due to" in mensaje_error
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "La migración no pudo completarse porque PostgreSQL "
                    "está esperando un bloqueo o ha superado el tiempo "
                    "máximo de ejecución. No se han confirmado cambios. "
                    "Revisa los logs de Render y vuelve a intentarlo."
                ),
            )

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudieron añadir las columnas a la base de datos. "
                "Revisa los logs del backend de Render."
            ),
        )

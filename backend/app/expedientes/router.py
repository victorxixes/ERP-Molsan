from datetime import date, datetime, time, timedelta
from typing import Optional, List, Any, Dict
import io
import json
import unicodedata

import openpyxl
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import or_, func, and_, text, cast, String
from sqlalchemy.sql.sqltypes import Date, DateTime, Time, Integer, Float, Numeric, Boolean
from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.database import get_db
from backend.app.expedientes.models import (
    Expediente,
    ExpedienteDocumentoEscritura,
)
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.expedientes.defectos.models import ExpedienteDefecto
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital


router = APIRouter(
    prefix="/expedientes",
    tags=["Expedientes"],
)


@router.post("/migraciones/actividades")
def migrar_campos_workflow_actividades(db: Session = Depends(get_db)):
    """Migración idempotente para columnas del circuito de actividades.

    Debe ejecutarse una vez desde Swagger después de desplegar el modelo y el router.
    No consulta el ORM antes de crear las columnas, por lo que también sirve si aún faltan.
    """
    columnas = {
        "fecha_envio": "DATE",
        "asiento_presentacion_libro_diario": "VARCHAR(300)",
        "fecha_presentacion": "DATE",
        "numero_entrada": "VARCHAR(200)",
        "fecha_recogida_notario_presentacion_telematica": "DATE",
        "copia_simple_escritura": "VARCHAR(500)",
        "fecha_presentacion_tributaria": "DATE",
        "fecha_liquidacion_tributaria": "DATE",
        "oficina_liquidadora": "VARCHAR(200)",
        "base_imponible": "DOUBLE PRECISION",
        "tributacion": "VARCHAR(100)",
        "impuesto_ajd_itp": "VARCHAR(20)",
        "fecha_vencimiento_asiento": "DATE",
        "escritura_simple_cancelacion": "VARCHAR(500)",
        # Campos usados por el formulario y el listado de actividades.
        "ultima_accion": "VARCHAR(500)",
        "fecha_ultima_accion": "DATE",
        "sol": "VARCHAR(100)",
        "cs": "VARCHAR(100)",
        "ns": "VARCHAR(100)",
    }
    try:
        for nombre, tipo_sql in columnas.items():
            db.execute(text(f"ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS {nombre} {tipo_sql}"))
        db.commit()
        return {"ok": True, "mensaje": "Migración de actividades completada.", "columnas_creadas_o_verificadas": list(columnas.keys())}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo migrar las columnas de actividades: {str(exc)[:400]}")


# ============================================================
# DOCUMENTACIÓN PREVIA: REQUISITOS
# ============================================================

DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA = [
    "Hoja de Encargo firmada",
    "Justificante de cancelación",
    "Nota simple registral",
]


def documentos_pendientes_documentacion_previa(
    db: Session,
    id_expediente: str,
) -> list[str]:
    """
    Comprueba las categorías obligatorias existentes en la
    carpeta digital del expediente.

    Se considera presente una categoría cuando existe al menos
    un registro documental asociado a ella.
    """
    encontrados = (
        db.query(DocumentoCarpetaDigital.categoria)
        .filter(
            DocumentoCarpetaDigital.expediente_id == str(id_expediente),
            DocumentoCarpetaDigital.categoria.in_(
                DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
            ),
        )
        .distinct()
        .all()
    )

    categorias_guardadas = {
        categoria
        for (categoria,) in encontrados
    }

    return [
        categoria
        for categoria in DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
        if categoria not in categorias_guardadas
    ]


def envio_notario_guardado(expediente: Expediente) -> bool:
    """
    Comprueba que el expediente contiene los datos básicos
    necesarios para considerar guardado el envío a notario.
    """
    return bool(
        expediente.fecha_envio_notario
        and expediente.fecha_solicitud_pnc
        and expediente.numero_solicitud_pnc
        and expediente.numero_solicitud_pnc.strip()
        and expediente.nombre_notario
        and expediente.nombre_notario.strip()
    )


# ============================================================
# MODELO DE DATOS: ENVÍO A NOTARIO
# ============================================================

class DocumentoEscrituraRequest(BaseModel):
    tipo_documento: str
    cuantia: Optional[float] = None


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
    documentos_escritura: Optional[List[DocumentoEscrituraRequest]] = None

    # Alias compatible con el modal frontend que envía "documentos".
    documentos: Optional[List[DocumentoEscrituraRequest]] = None
    cuantia: Optional[float] = None

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
            "Sede notarial sin protocolo",
            "Sede Notarial sin protocolo",
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
            "Cierre del expediente",
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
                actividad.ilike("Sede notarial sin protocolo"),
                actividad.ilike("Sede Notarial sin protocolo"),
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
            actividad.ilike("Cierre del expediente"),
        )

    return None


# ============================================================
# CAMPOS DEVUELTOS POR LA API
# ============================================================

CAMPOS_EXPEDIENTE = [
    "id",
    "cliente_id",
    "id_expediente",
    "notario_id",
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
    "fecha_envio",
    "fecha_solicitud_pnc",
    "numero_solicitud_pnc",
    "escritura_firmada",
    "hora_prevista_firma",
    "asiento_presentacion_libro_diario",
    "fecha_presentacion",
    "numero_entrada",
    "fecha_recogida_notario_presentacion_telematica",
    "copia_simple_escritura",
    "fecha_presentacion_tributaria",
    "fecha_liquidacion_tributaria",
    "oficina_liquidadora",
    "base_imponible",
    "tributacion",
    "impuesto_ajd_itp",
    "fecha_vencimiento_asiento",
    "escritura_simple_cancelacion",

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

    # Campos del flujo de actividades (si existen en el modelo).
    "ultima_accion",
    "fecha_ultima_accion",
    "sol",
    "cs",
    "ns",
    "asiento_presentacion_libro_diario",
    "numero_entrada",
    "fecha_recogida_notario_presentacion_telematica",
    "copia_simple_escritura",
    "fecha_presentacion_tributaria",
    "fecha_liquidacion_tributaria",
    "oficina_liquidadora",
    "base_imponible",
    "tributacion",
    "impuesto_ajd_itp",
    "fecha_vencimiento_asiento",
    "escritura_simple_cancelacion",
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
    ("ULTIMAACCION", "ultima_accion"),
    ("FECHAULTIMAACCION", "fecha_ultima_accion"),
    ("SOL", "sol"),
    ("CS", "cs"),
    ("NS", "ns"),
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

    try:
        resultado["documentos_escritura"] = [
            {
                "id": documento.id,
                "tipo_documento": documento.tipo_documento,
                "cuantia": documento.cuantia,
            }
            for documento in (
                getattr(expediente, "documentos_escritura", None) or []
            )
        ]
    except Exception:
        resultado["documentos_escritura"] = []

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
    q,
    nif=None,
    actividad=None,
    fechaInicio=None,
    fechaFin=None,
    notario=None,
    oficina=None,
    importeMin=None,
    importeMax=None,
    numeroExpediente=None,
    nifTitular=None,
    nombreTitular=None,
    nifSolicitante=None,
    nombreSolicitante=None,
    nifNotario=None,
    finca=None,
    registroPropiedad=None,
    saldoReal=None,
    saldoDisponible=None,
    importe=None,
    observaciones=None,
    estadoActividad=None,
    estadoExpediente=None,
):
    """Aplica los mismos filtros a listado y exportación Excel."""
    fecha_inicio = parsear_fecha(fechaInicio, "fechaInicio")
    fecha_fin = parsear_fecha(fechaFin, "fechaFin")

    if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio no puede ser posterior a la fecha de fin.",
        )

    if importeMin is not None and importeMax is not None and importeMin > importeMax:
        raise HTTPException(
            status_code=400,
            detail="El importe mínimo no puede ser superior al importe máximo.",
        )

    def texto(valor):
        return str(valor).strip() if valor is not None else ""

    def filtro_texto(columna, valor):
        patron = f"%{texto(valor)}%"
        return columna.ilike(patron)

    if numeroExpediente and texto(numeroExpediente):
        q = q.filter(cast(Expediente.id_expediente, String).ilike(f"%{texto(numeroExpediente)}%"))

    # Filtro legado mantenido para llamadas existentes.
    if texto(nif):
        patron = f"%{texto(nif)}%"
        q = q.filter(or_(Expediente.nif_titular.ilike(patron), Expediente.nif_solicitante.ilike(patron)))

    if texto(nifTitular):
        q = q.filter(filtro_texto(Expediente.nif_titular, nifTitular))
    if texto(nombreTitular):
        q = q.filter(filtro_texto(Expediente.nombre_titular, nombreTitular))
    if texto(nifSolicitante):
        q = q.filter(filtro_texto(Expediente.nif_solicitante, nifSolicitante))
    if texto(nombreSolicitante):
        q = q.filter(filtro_texto(Expediente.nombre_solicitante, nombreSolicitante))

    if texto(actividad):
        clave = resolver_actividad(texto(actividad))
        if clave is None:
            raise HTTPException(status_code=400, detail=f"Actividad no válida: {actividad}")
        condicion = condicion_actividad(clave)
        if condicion is not None:
            q = q.filter(condicion)

    if fecha_inicio:
        q = q.filter(Expediente.fecha_alta >= fecha_inicio)
    if fecha_fin:
        q = q.filter(Expediente.fecha_alta <= fecha_fin)

    if texto(notario):
        patron = f"%{texto(notario)}%"
        q = q.filter(or_(Expediente.nombre_notario.ilike(patron), Expediente.nif_notario.ilike(patron), Expediente.notario.ilike(patron)))
    if texto(nifNotario):
        q = q.filter(filtro_texto(Expediente.nif_notario, nifNotario))
    if texto(oficina):
        q = q.filter(Expediente.oficina.ilike(f"%{texto(oficina)}%"))

    # Finca y Registro también se buscan en la relación ExpedienteFinca.
    # Se usa IN/EXISTS lógico para no duplicar expedientes con varias fincas.
    if texto(finca):
        patron_finca = f"%{texto(finca)}%"
        ids_finca = q.session.query(ExpedienteFinca.expediente_id).filter(
            ExpedienteFinca.finca.ilike(patron_finca)
        )
        q = q.filter(or_(Expediente.finca.ilike(patron_finca), Expediente.id.in_(ids_finca)))

    if texto(registroPropiedad):
        patron_registro = f"%{texto(registroPropiedad)}%"
        ids_registro = q.session.query(ExpedienteFinca.expediente_id).filter(
            ExpedienteFinca.registro.ilike(patron_registro)
        )
        q = q.filter(Expediente.id.in_(ids_registro))

    if saldoReal is not None:
        q = q.filter(Expediente.saldo_real == saldoReal)
    if saldoDisponible is not None:
        q = q.filter(Expediente.saldo_disponible == saldoDisponible)
    if importe is not None:
        q = q.filter(Expediente.importe == importe)
    if importeMin is not None:
        q = q.filter(Expediente.importe >= importeMin)
    if importeMax is not None:
        q = q.filter(Expediente.importe <= importeMax)

    if texto(observaciones):
        patron_obs = f"%{texto(observaciones)}%"
        q = q.filter(Expediente.observaciones.ilike(patron_obs))
    if texto(estadoActividad):
        q = q.filter(Expediente.estado_actividad.ilike(f"%{texto(estadoActividad)}%"))
    if texto(estadoExpediente):
        q = q.filter(Expediente.estado_expediente.ilike(f"%{texto(estadoExpediente)}%"))

    return q


# ============================================================
# LISTADO DE EXPEDIENTES
# ============================================================

@router.get("/listado")
def listado_expedientes(
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
    numeroExpediente: Optional[str] = Query(None, description="Número completo o parcial del expediente"),
    nifTitular: Optional[str] = None,
    nombreTitular: Optional[str] = None,
    nifSolicitante: Optional[str] = None,
    nombreSolicitante: Optional[str] = None,
    nifNotario: Optional[str] = None,
    finca: Optional[str] = None,
    registroPropiedad: Optional[str] = None,
    saldoReal: Optional[float] = None,
    saldoDisponible: Optional[float] = None,
    importe: Optional[float] = None,
    observaciones: Optional[str] = None,
    estadoActividad: Optional[str] = None,
    estadoExpediente: Optional[str] = None,
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
        numeroExpediente=numeroExpediente,
        nifTitular=nifTitular,
        nombreTitular=nombreTitular,
        nifSolicitante=nifSolicitante,
        nombreSolicitante=nombreSolicitante,
        nifNotario=nifNotario,
        finca=finca,
        registroPropiedad=registroPropiedad,
        saldoReal=saldoReal,
        saldoDisponible=saldoDisponible,
        importe=importe,
        observaciones=observaciones,
        estadoActividad=estadoActividad,
        estadoExpediente=estadoExpediente,
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

            campo = COLUMNAS_ORDENABLES.get(orden.get("columna"))

            if campo is None:
                continue

            direccion = str(
                orden.get("direccion", "asc")
            ).lower()

            q = q.order_by(
                campo.desc() if direccion == "desc" else campo.asc()
            )

            orden_aplicado = True

    if not orden_aplicado:
        q = q.order_by(
            Expediente.fecha_alta.desc(),
            Expediente.id_expediente.desc(),
            Expediente.id.desc(),
        )

    total = q.count()
    total_paginas = max(1, (total + porPagina - 1) // porPagina)
    pagina_real = min(pagina, total_paginas)

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
        condicion = condicion_actividad(actividad["key"])

        if condicion is not None:
            total = (
                db.query(func.count(Expediente.id))
                .filter(condicion)
                .scalar()
                or 0
            )
        else:
            total = 0

        actividades.append({
            "key": actividad["key"],
            "actividad": actividad["label"],
            "total": int(total),
        })

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
    numeroExpediente: Optional[str] = Query(None, description="Número completo o parcial del expediente"),
    nifTitular: Optional[str] = None,
    nombreTitular: Optional[str] = None,
    nifSolicitante: Optional[str] = None,
    nombreSolicitante: Optional[str] = None,
    nifNotario: Optional[str] = None,
    finca: Optional[str] = None,
    registroPropiedad: Optional[str] = None,
    saldoReal: Optional[float] = None,
    saldoDisponible: Optional[float] = None,
    importe: Optional[float] = None,
    observaciones: Optional[str] = None,
    estadoActividad: Optional[str] = None,
    estadoExpediente: Optional[str] = None,
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
        numeroExpediente=numeroExpediente,
        nifTitular=nifTitular,
        nombreTitular=nombreTitular,
        nifSolicitante=nifSolicitante,
        nombreSolicitante=nombreSolicitante,
        nifNotario=nifNotario,
        finca=finca,
        registroPropiedad=registroPropiedad,
        saldoReal=saldoReal,
        saldoDisponible=saldoDisponible,
        importe=importe,
        observaciones=observaciones,
        estadoActividad=estadoActividad,
        estadoExpediente=estadoExpediente,
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

    for col, (cabecera, _) in enumerate(COLUMNAS_EXCEL, start=1):
        ws.cell(
            row=1,
            column=col,
            value=cabecera,
        ).font = Font(bold=True)

    for fila, expediente in enumerate(expedientes, start=2):
        for col, (_, atributo) in enumerate(COLUMNAS_EXCEL, start=1):
            valor = getattr(expediente, atributo, None)

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

    ultima_columna = get_column_letter(len(COLUMNAS_EXCEL))
    ws.auto_filter.ref = f"A1:{ultima_columna}{len(expedientes) + 1}"

    for col, (cabecera, _) in enumerate(COLUMNAS_EXCEL, start=1):
        max_length = len(str(cabecera))

        for fila in range(2, min(len(expedientes) + 2, 500)):
            valor = ws.cell(row=fila, column=col).value

            if valor is not None:
                max_length = max(max_length, len(str(valor)))

        ws.column_dimensions[
            get_column_letter(col)
        ].width = min(max(max_length + 2, 12), 45)

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

    hora_inicio = datos.hora_prevista_firma or time(9, 0)

    minutos_inicio = (
        hora_inicio.hour * 60
        + hora_inicio.minute
    )

    minutos_fin = min(minutos_inicio + 60, 23 * 60 + 59)

    hora_fin = time(
        minutos_fin // 60,
        minutos_fin % 60,
    )

    cita = (
        db.query(Cita)
        .filter(Cita.expediente_id == expediente.id)
        .order_by(Cita.id.desc())
        .first()
    )

    observaciones = (
        f"Firma prevista — Expediente {expediente.id_expediente}"
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
        .filter(Expediente.id_expediente == id_expediente)
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

    # Swagger suele proponer 0 como valor de ejemplo. No es un ID
    # válido de notario y no debe llegar a la clave foránea de Agenda.
    # El identificador solo es imprescindible si se va a crear una cita.
    if datos.fecha_prevista_firma and (
        datos.notario_id is None or datos.notario_id <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Para crear la cita de firma debes indicar el ID real "
                "de un notario. No utilices 0; selecciona un notario "
                "del catálogo."
            ),
        )

    documentos_recibidos = (
        datos.documentos_escritura
        or datos.documentos
        or []
    )

    documentos_limpios = []

    for documento in documentos_recibidos:
        tipo = (documento.tipo_documento or "").strip()

        if not tipo:
            continue

        cuantia = documento.cuantia

        if cuantia is not None and cuantia < 0:
            raise HTTPException(
                status_code=400,
                detail="La cuantía de un documento no puede ser negativa.",
            )

        documentos_limpios.append({
            "tipo_documento": tipo,
            "cuantia": cuantia,
        })

    if not documentos_limpios and datos.tipo_documento.strip():
        documentos_limpios = [{
            "tipo_documento": datos.tipo_documento.strip(),
            "cuantia": None,
        }]

    if not documentos_limpios:
        raise HTTPException(
            status_code=400,
            detail="Debes indicar al menos un Tipo de documento.",
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
        # Guardar los datos de firma, pero no cambiar la actividad.
        # La transición se realiza por separado tras validar
        # los documentos obligatorios.
        if datos.escritura_firmada:
            expediente.fecha_firma = datos.fecha_firma
            expediente.protocolo = datos.protocolo.strip()
        else:
            expediente.fecha_firma = None
            expediente.protocolo = None

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
        expediente.tipo_documento = (
            documentos_limpios[0]["tipo_documento"]
        )

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

            setattr(expediente, campo, valor)

        # DOCUMENTOS DE ESCRITURA
        db.query(ExpedienteDocumentoEscritura).filter(
            ExpedienteDocumentoEscritura.expediente_id == expediente.id
        ).delete(synchronize_session=False)

        for documento in documentos_limpios:
            db.add(
                ExpedienteDocumentoEscritura(
                    expediente_id=expediente.id,
                    tipo_documento=documento["tipo_documento"],
                    cuantia=documento["cuantia"],
                )
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
            flush=True,
        )

        # Devolvemos una causa legible para que el frontend no oculte
        # el motivo real (por ejemplo, una clave foránea de notario).
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo guardar el envío a notario ni crear la cita "
                "de Agenda. Causa técnica: "
                f"{str(exc)[:500]}"
            ),
        )

    respuesta = expediente_a_dict(expediente)
    respuesta["agenda_cita_creada"] = cita is not None
    respuesta["agenda_cita_id"] = cita.id if cita is not None else None

    return respuesta


# ============================================================
# VALIDACIÓN DE DOCUMENTACIÓN PREVIA
# ============================================================

@router.get("/{id_expediente}/documentacion-previa/validacion")
def validar_documentacion_previa(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    pendientes = documentos_pendientes_documentacion_previa(
        db,
        id_expediente,
    )

    envio_guardado = envio_notario_guardado(expediente)

    return {
        "id_expediente": expediente.id_expediente,
        "actividad_actual": expediente.actividad_actual,
        "fecha_envio_notario": (
            expediente.fecha_envio_notario.isoformat()
            if expediente.fecha_envio_notario
            else None
        ),
        "envio_notario_guardado": envio_guardado,
        "documentos_obligatorios": (
            DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
        ),
        "documentos_pendientes": pendientes,
        "documentacion_completa": len(pendientes) == 0,
        "puede_avanzar": (
            envio_guardado and len(pendientes) == 0
        ),
    }


# ============================================================
# DATOS DE COMUNICACIÓN A ABSIS — DOCUMENTACIÓN PREVIA
# ============================================================

CAMPOS_ABSIS_DOCUMENTACION_PREVIA = {
    "certificado_saldo_cero_erroneo",
    "solicitud_cancelacion_notarial",
    "certificado_cancelacion_administrativo",
    "nota_simple_registral",
    "mover_siguiente_actividad",
}


def asegurar_tabla_estado_absis(db: Session) -> None:
    """Crea la tabla auxiliar si todavía no existe en PostgreSQL."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS expediente_documentacion_previa_absis (
            expediente_id VARCHAR(100) PRIMARY KEY,
            certificado_saldo_cero_erroneo BOOLEAN NOT NULL DEFAULT FALSE,
            solicitud_cancelacion_notarial BOOLEAN NOT NULL DEFAULT FALSE,
            certificado_cancelacion_administrativo BOOLEAN NOT NULL DEFAULT FALSE,
            nota_simple_registral BOOLEAN NOT NULL DEFAULT FALSE,
            mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE,
            enviado_a_absis BOOLEAN NOT NULL DEFAULT FALSE,
            fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # Compatibilidad si la tabla ya existía antes de incorporar el selector Sí/No.
    db.execute(text("ALTER TABLE expediente_documentacion_previa_absis ADD COLUMN IF NOT EXISTS mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE"))
    db.flush()


def leer_estado_absis(db: Session, id_expediente: str) -> dict:
    asegurar_tabla_estado_absis(db)
    fila = db.execute(text("""
        SELECT certificado_saldo_cero_erroneo,
               solicitud_cancelacion_notarial,
               certificado_cancelacion_administrativo,
               nota_simple_registral,
               mover_siguiente_actividad,
               enviado_a_absis,
               fecha_actualizacion
        FROM expediente_documentacion_previa_absis
        WHERE expediente_id = :expediente_id
    """), {"expediente_id": str(id_expediente)}).mappings().first()
    if not fila:
        return {
            "certificado_saldo_cero_erroneo": False,
            "solicitud_cancelacion_notarial": False,
            "certificado_cancelacion_administrativo": False,
            "nota_simple_registral": False,
            "mover_siguiente_actividad": False,
            "enviado_a_absis": False,
            "fecha_actualizacion": None,
        }
    return dict(fila)


@router.get("/{id_expediente}/documentacion-previa/absis")
def obtener_estado_absis_documentacion_previa(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    try:
        estado = leer_estado_absis(db, id_expediente)
        db.commit()
        return estado
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el estado de ABSIS: {str(exc)[:300]}")


@router.put("/{id_expediente}/documentacion-previa/absis")
def guardar_estado_absis_documentacion_previa(
    id_expediente: str,
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    valores = {campo: bool(datos.get(campo, False)) for campo in CAMPOS_ABSIS_DOCUMENTACION_PREVIA}
    try:
        asegurar_tabla_estado_absis(db)
        db.execute(text("""
            INSERT INTO expediente_documentacion_previa_absis (
                expediente_id, certificado_saldo_cero_erroneo,
                solicitud_cancelacion_notarial, certificado_cancelacion_administrativo,
                nota_simple_registral, mover_siguiente_actividad, enviado_a_absis, fecha_actualizacion
            ) VALUES (
                :expediente_id, :certificado_saldo_cero_erroneo,
                :solicitud_cancelacion_notarial, :certificado_cancelacion_administrativo,
                :nota_simple_registral, :mover_siguiente_actividad, FALSE, CURRENT_TIMESTAMP
            )
            ON CONFLICT (expediente_id) DO UPDATE SET
                certificado_saldo_cero_erroneo = EXCLUDED.certificado_saldo_cero_erroneo,
                solicitud_cancelacion_notarial = EXCLUDED.solicitud_cancelacion_notarial,
                certificado_cancelacion_administrativo = EXCLUDED.certificado_cancelacion_administrativo,
                nota_simple_registral = EXCLUDED.nota_simple_registral,
                mover_siguiente_actividad = EXCLUDED.mover_siguiente_actividad,
                enviado_a_absis = FALSE,
                fecha_actualizacion = CURRENT_TIMESTAMP
        """), {"expediente_id": str(id_expediente), **valores})
        db.commit()
        return leer_estado_absis(db, id_expediente)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudieron guardar los datos de ABSIS: {str(exc)[:300]}")


@router.post("/{id_expediente}/documentacion-previa/enviar-a-absis")
def registrar_envio_absis_documentacion_previa(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    try:
        asegurar_tabla_estado_absis(db)
        # Este endpoint registra el estado de preparación local. La transmisión real
        # requiere una API/credencial ABSIS, que no está definida en este proyecto.
        db.execute(text("""
            INSERT INTO expediente_documentacion_previa_absis (expediente_id, enviado_a_absis)
            VALUES (:expediente_id, TRUE)
            ON CONFLICT (expediente_id) DO UPDATE SET
                enviado_a_absis = TRUE,
                fecha_actualizacion = CURRENT_TIMESTAMP
        """), {"expediente_id": str(id_expediente)})
        db.commit()
        return {**leer_estado_absis(db, id_expediente), "mensaje": "Información registrada localmente para ABSIS; no se ha transmitido a un sistema ABSIS externo."}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo registrar el envío a ABSIS: {str(exc)[:300]}")


# ============================================================
# AVANZAR DE DOCUMENTACIÓN PREVIA A SEDE NOTARIAL SIN PROTOCOLO
# ============================================================

class AvanzarActividadRequest(BaseModel):
    actividad_destino: Optional[str] = None


def _valor_no_vacio(valor):
    return valor is not None and str(valor).strip() != ""


def _validar_campos_obligatorios(expediente, nombres, etiquetas):
    pendientes = [etiquetas.get(nombre, nombre) for nombre in nombres
                  if not _valor_no_vacio(getattr(expediente, nombre, None))]
    if pendientes:
        raise HTTPException(
            status_code=409,
            detail={"mensaje": "No se puede avanzar: faltan campos obligatorios.", "campos_pendientes": pendientes},
        )


def _categorias_documentales(db: Session, id_expediente: str) -> list[str]:
    return [str(categoria or "") for (categoria,) in db.query(DocumentoCarpetaDigital.categoria).filter(
        DocumentoCarpetaDigital.expediente_id == str(id_expediente)
    ).all()]


def _tiene_categoria_documental(categorias: list[str], *terminos: str) -> bool:
    normalizadas = [normalizar_actividad_texto(categoria) for categoria in categorias]
    return any(all(normalizar_actividad_texto(termino) in categoria for termino in terminos)
               for categoria in normalizadas)


def _defectos_abiertos(db: Session, expediente) -> list:
    columnas = {c.name for c in ExpedienteDefecto.__table__.columns}
    consulta = db.query(ExpedienteDefecto)
    if "expediente_id" in columnas:
        consulta = consulta.filter(ExpedienteDefecto.expediente_id == expediente.id)
    elif "id_expediente" in columnas:
        consulta = consulta.filter(ExpedienteDefecto.id_expediente == str(expediente.id_expediente))
    else:
        raise HTTPException(status_code=500, detail="No se puede verificar la relación de los defectos con el expediente.")
    defectos = consulta.all()
    abiertos = []
    for defecto in defectos:
        cerrado = any(_valor_no_vacio(getattr(defecto, campo, None)) for campo in (
            "fecha_cierre_defecto", "fecha_subsanacion", "fecha_entrada_subsanacion", "fcierre_defecto"
        ))
        if not cerrado:
            abiertos.append(defecto)
    return abiertos


@router.post("/{id_expediente}/avanzar-actividad")
def avanzar_actividad_expediente(
    id_expediente: str,
    datos: Optional[AvanzarActividadRequest] = None,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    actual = resolver_actividad(expediente.actividad_actual)
    destino_solicitado = (datos.actividad_destino if datos else None)
    destino = resolver_actividad(destino_solicitado) if destino_solicitado else None
    categorias = _categorias_documentales(db, id_expediente)

    if actual == "documentacion-previa":
        if destino not in (None, "sede-notarial"):
            raise HTTPException(status_code=409, detail="Desde Documentación previa solo se puede pasar a Sede notarial.")
        if not envio_notario_guardado(expediente):
            raise HTTPException(status_code=409, detail="Primero debes completar y guardar el modal «Enviar a notario».")
        estado_absis = leer_estado_absis(db, id_expediente)
        if not estado_absis.get("mover_siguiente_actividad", False):
            raise HTTPException(status_code=409, detail="Confirma Sí en «Mover el expediente a la siguiente actividad» antes de avanzar.")
        pendientes = documentos_pendientes_documentacion_previa(db, id_expediente)
        if pendientes:
            raise HTTPException(status_code=409, detail={"mensaje": "Faltan documentos obligatorios en la carpeta digital.", "documentos_pendientes": pendientes})
        fincas = db.query(ExpedienteFinca).filter(ExpedienteFinca.expediente_id == expediente.id).all()
        if not fincas:
            raise HTTPException(status_code=409, detail="Antes de avanzar debes informar al menos una finca y su registro de la propiedad.")
        fincas_incompletas = [
            f for f in fincas
            if not _valor_no_vacio(getattr(f, "finca", None))
            or not _valor_no_vacio(getattr(f, "registro", None))
        ]
        if fincas_incompletas:
            raise HTTPException(status_code=409, detail="Todas las fincas deben tener informados el número de finca y el Registro de la Propiedad.")
        expediente.actividad_actual = "Sede notarial"

    elif actual == "sede-notarial":
        if not (_valor_no_vacio(expediente.protocolo) and _valor_no_vacio(expediente.fecha_firma)):
            raise HTTPException(status_code=409, detail="Sede notarial permanece activa hasta informar protocolo y fecha de firma.")
        expediente.actividad_actual = "Sede notarial con protocolo"

    elif actual == "sede-notarial-protocolo":
        requeridos = ["apoderado", "tipo_documento", "poblacion", "provincia", "tipo_firma", "fecha_firma", "protocolo", "asiento_presentacion_libro_diario", "fecha_presentacion", "numero_entrada", "fecha_recogida_notario_presentacion_telematica"]
        etiquetas = {"apoderado":"Apoderado", "tipo_documento":"Tipo documento", "poblacion":"Población", "provincia":"Provincia", "tipo_firma":"Tipo firma", "fecha_firma":"Fecha firma", "protocolo":"Protocolo", "asiento_presentacion_libro_diario":"Asiento presentación / Libro diario", "fecha_presentacion":"Fecha presentación", "numero_entrada":"Número de entrada", "fecha_recogida_notario_presentacion_telematica":"Fecha recogida notario o presentación telemática"}
        _validar_campos_obligatorios(expediente, requeridos, etiquetas)
        if str(expediente.apoderado).strip() not in ("Gestoría", "CaixaBank"):
            raise HTTPException(status_code=409, detail="Apoderado debe ser Gestoría o CaixaBank.")
        if not (_tiene_categoria_documental(categorias, "copia simple") or _tiene_categoria_documental(categorias, "copia", "escritura")):
            raise HTTPException(status_code=409, detail={"mensaje":"No se puede avanzar sin la copia simple de escritura en la carpeta digital.", "documentos_pendientes":["Copia simple de escritura"]})
        expediente.actividad_actual = "Liquidación de impuestos"

    elif actual == "liquidacion-impuestos":
        requeridos = ["fecha_presentacion_tributaria", "fecha_liquidacion_tributaria", "oficina_liquidadora", "base_imponible", "tributacion", "impuesto_ajd_itp"]
        etiquetas = {"fecha_presentacion_tributaria":"Fecha presentación tributaria", "fecha_liquidacion_tributaria":"Fecha liquidación tributaria", "oficina_liquidadora":"Oficina liquidadora / comunidad autónoma", "base_imponible":"Base imponible (€)", "tributacion":"Tributación", "impuesto_ajd_itp":"Impuesto (AJD / ITP)"}
        _validar_campos_obligatorios(expediente, requeridos, etiquetas)
        comunidades = {"andalucia", "aragon", "asturias", "illes balears", "canarias", "cantabria", "castilla-la mancha", "castilla y leon", "cataluna", "comunitat valenciana", "extremadura", "galicia", "comunidad de madrid", "region de murcia", "comunidad foral de navarra", "pais vasco", "la rioja", "ceuta", "melilla"}
        if normalizar_actividad_texto(expediente.oficina_liquidadora) not in comunidades:
            raise HTTPException(status_code=409, detail="Selecciona una oficina liquidadora o comunidad autónoma válida.")
        if normalizar_actividad_texto(expediente.tributacion) not in {"prescrito", "exento", "bonificacion", "renuncia", "ajd", "tpo"}:
            raise HTTPException(status_code=409, detail="Selecciona una opción válida en Tributación.")
        if str(expediente.impuesto_ajd_itp).strip().upper() not in ("AJD", "ITP"):
            raise HTTPException(status_code=409, detail="El impuesto debe ser AJD o ITP.")
        if float(expediente.base_imponible or 0) < 0:
            raise HTTPException(status_code=409, detail="La base imponible no puede ser negativa.")
        expediente.actividad_actual = "Tramitación inscripción"
        if not getattr(expediente, "fecha_presentacion", None):
            expediente.fecha_presentacion = expediente.fecha_liquidacion_tributaria

    elif actual == "tramitacion-inscripcion":
        requeridos = ["fecha_presentacion", "fecha_vencimiento_asiento", "fecha_inscripcion", "escritura_simple_cancelacion", "registral_estado", "registral_fecha"]
        etiquetas = {"fecha_presentacion":"Fecha presentación", "fecha_vencimiento_asiento":"Fecha vencimiento asiento", "fecha_inscripcion":"Fecha inscripción", "escritura_simple_cancelacion":"Hoja de inscripción", "registral_estado":"Estado registral", "registral_fecha":"Fecha registral"}
        _validar_campos_obligatorios(expediente, requeridos, etiquetas)
        if not (_tiene_categoria_documental(categorias, "hoja de inscripcion") or _tiene_categoria_documental(categorias, "inscripcion")):
            raise HTTPException(status_code=409, detail={"mensaje":"Falta incorporar la hoja de inscripción a la carpeta digital.", "documentos_pendientes":["Hoja de inscripción"]})
        abiertos = _defectos_abiertos(db, expediente)
        if abiertos:
            expediente.actividad_actual = "Defectos registrales"
        else:
            expediente.actividad_actual = "Cierre del expediente"

    elif actual == "defectos-registrales":
        abiertos = _defectos_abiertos(db, expediente)
        if abiertos:
            raise HTTPException(status_code=409, detail="No se puede avanzar al cierre mientras existan defectos registrales abiertos.")
        expediente.actividad_actual = "Cierre del expediente"

    elif actual == "facturacion-cierre":
        if not (str(getattr(expediente, "facturacion_estado", "") or "").strip().lower() in ("generada", "generado", "registrada", "registrado", "cerrada", "cerrado") and getattr(expediente, "facturacion_fecha", None) and getattr(expediente, "fecha_fin_actividad", None)):
            raise HTTPException(status_code=409, detail="El cierre solo se completa después de generar y registrar los honorarios de gestoría.")
        expediente.estado_actividad = "Cerrada"
    else:
        raise HTTPException(status_code=409, detail=f"No se puede avanzar desde la actividad actual: {expediente.actividad_actual or 'sin actividad'}.")

    try:
        db.add(expediente)
        db.commit()
        db.refresh(expediente)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar la actividad: {str(exc)[:300]}")

    respuesta = expediente_a_dict(expediente)
    respuesta["actividad_actualizada"] = True
    respuesta["actividad_actual"] = expediente.actividad_actual
    return respuesta


# ============================================================
# GUARDAR CAMPOS DE LAS ACTIVIDADES
# ============================================================

class ActualizarCamposActividadRequest(BaseModel):
    campos: Dict[str, Any]


CAMPOS_EDITABLES_ACTIVIDAD = {
    campo
    for actividad in ACTIVIDADES_EXPEDIENTES
    for campo in {
        "fecha_inicio_actividad", "fecha_fin_actividad",
        "ultima_accion", "fecha_ultima_accion", "sol", "cs", "ns",
        "fecha_envio_notario", "fecha_envio", "apoderado", "observaciones",
        "tipo_documento", "poblacion", "provincia", "tipo_firma",
        "fecha_prevista_firma", "fecha_firma", "protocolo",
        "asiento_presentacion_libro_diario", "fecha_presentacion",
        "numero_entrada", "fecha_recogida_notario_presentacion_telematica",
        "copia_simple_escritura", "fecha_presentacion_tributaria",
        "fecha_liquidacion_tributaria", "oficina_liquidadora",
        "base_imponible", "tributacion", "impuesto_ajd_itp",
        "fecha_vencimiento_asiento", "fecha_inscripcion",
        "escritura_simple_cancelacion", "registral_estado", "registral_fecha",
        "tiene_defectos_abiertos", "tipo_error", "falta_defecto",
        "descripcion_error", "fcierre_defecto", "facturacion_estado",
        "facturacion_fecha", "fecha_entregado_cliente",
    }
}


def convertir_valor_actividad(columna, valor):
    if valor == "":
        return None
    tipo = columna.type
    if isinstance(tipo, DateTime):
        return datetime.fromisoformat(valor) if isinstance(valor, str) else valor
    if isinstance(tipo, Date):
        return date.fromisoformat(valor[:10]) if isinstance(valor, str) else valor
    if isinstance(tipo, Time):
        return time.fromisoformat(valor) if isinstance(valor, str) else valor
    if isinstance(tipo, Boolean):
        if isinstance(valor, bool):
            return valor
        return str(valor).strip().lower() in ("1", "true", "sí", "si", "yes", "on")
    if isinstance(tipo, (Integer,)):
        return int(valor) if valor is not None else None
    if isinstance(tipo, (Float, Numeric)):
        return float(valor) if valor is not None else None
    return valor


@router.put("/{id_expediente}/actividad")
def actualizar_campos_actividad(
    id_expediente: str,
    datos: ActualizarCamposActividadRequest,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    if not datos.campos:
        raise HTTPException(status_code=400, detail="No se han enviado campos para guardar.")

    columnas = {col.name: col for col in Expediente.__table__.columns}
    guardados = []
    no_disponibles = []

    for nombre, valor in datos.campos.items():
        if nombre not in CAMPOS_EDITABLES_ACTIVIDAD:
            continue
        columna = columnas.get(nombre)
        if columna is None:
            no_disponibles.append(nombre)
            continue
        try:
            setattr(expediente, nombre, convertir_valor_actividad(columna, valor))
            guardados.append(nombre)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Valor no válido para {nombre}: {exc}",
            )

    if not guardados:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": "Ninguno de los campos enviados existe en el modelo de expediente.",
                "campos_no_disponibles": no_disponibles,
            },
        )

    if "fecha_presentacion" in guardados and resolver_actividad(expediente.actividad_actual) == "tramitacion-inscripcion" and expediente.fecha_presentacion:
        expediente.fecha_vencimiento_asiento = expediente.fecha_presentacion + timedelta(days=60)

    try:
        db.add(expediente)
        db.commit()
        db.refresh(expediente)
    except Exception as exc:
        db.rollback()
        print("ERROR GUARDANDO CAMPOS DE ACTIVIDAD:", repr(exc), flush=True)
        raise HTTPException(
            status_code=500,
            detail=f"No se pudieron guardar los campos de la actividad: {str(exc)[:400]}",
        )

    respuesta = expediente_a_dict(expediente)
    respuesta["campos_guardados"] = guardados
    respuesta["campos_no_disponibles"] = no_disponibles
    return respuesta


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
        .filter(Expediente.id_expediente == id_expediente)
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
    """Migra el esquema del envío a notario en pasos confirmados por separado.

    Primero crea y confirma la tabla de documentos de escritura. Después añade
    las columnas de expedientes una a una, para que un timeout en una columna
    no deshaga la creación de la tabla ni el trabajo ya confirmado.
    """
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
        f"{len(columnas)} columnas; creando primero la tabla documental",
        flush=True,
    )

    # PASO 1: crear la tabla que utiliza enviar_a_notario y confirmar este
    # cambio por separado. Así, un fallo posterior al añadir columnas no
    # provoca que PostgreSQL deshaga la creación de la tabla.
    try:
        db.execute(text("SET LOCAL lock_timeout = '5s'"))
        db.execute(text("SET LOCAL statement_timeout = '20s'"))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS expediente_documentos_escritura (
                id SERIAL PRIMARY KEY,
                expediente_id INTEGER NOT NULL
                    REFERENCES expedientes(id) ON DELETE CASCADE,
                tipo_documento VARCHAR(300) NOT NULL,
                cuantia DOUBLE PRECISION NULL
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS
            ix_expediente_documentos_escritura_expediente_id
            ON expediente_documentos_escritura (expediente_id)
        """))
        db.commit()
        print(
            "MIGRACIÓN ENVÍO A NOTARIO: tabla e índice confirmados",
            flush=True,
        )
    except Exception as exc:
        db.rollback()
        print(
            "ERROR CREANDO expediente_documentos_escritura:",
            repr(exc),
            flush=True,
        )
        mensaje = str(exc).lower()
        if any(
            token in mensaje
            for token in (
                "lock timeout",
                "statement timeout",
                "canceling statement due to",
                "could not obtain lock",
            )
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "PostgreSQL no pudo crear/verificar "
                    "expediente_documentos_escritura porque está esperando "
                    "un bloqueo o ha superado el tiempo máximo. La tabla "
                    "no se ha confirmado; revisa los logs de Render."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo crear/verificar la tabla "
                "expediente_documentos_escritura. Causa técnica: "
                f"{str(exc)[:400]}"
            ),
        )

    # PASO 2: añadir cada columna en su propia transacción. Se vuelve a
    # configurar lock_timeout/statement_timeout porque SET LOCAL termina
    # al hacer commit o rollback.
    columnas_confirmadas = []
    columnas_pendientes = []

    for indice, (columna, tipo_sql) in enumerate(columnas, start=1):
        try:
            print(
                f"MIGRACIÓN ENVÍO A NOTARIO [{indice}/{len(columnas)}]: "
                f"comprobando {columna}",
                flush=True,
            )
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            db.execute(text("SET LOCAL statement_timeout = '20s'"))
            db.execute(text(
                f"ALTER TABLE expedientes "
                f"ADD COLUMN IF NOT EXISTS {columna} {tipo_sql}"
            ))
            db.commit()
            columnas_confirmadas.append(columna)
            print(
                f"MIGRACIÓN ENVÍO A NOTARIO: {columna} confirmada",
                flush=True,
            )
        except Exception as exc:
            db.rollback()
            columnas_pendientes.append({
                "columna": columna,
                "error": str(exc)[:300],
            })
            print(
                f"ERROR MIGRANDO COLUMNA {columna}: {repr(exc)}",
                flush=True,
            )
            # No seguir intentando bloquear expedientes si ya se ha
            # detectado un timeout; devolver el diagnóstico al operador.
            mensaje = str(exc).lower()
            if any(
                token in mensaje
                for token in (
                    "lock timeout",
                    "statement timeout",
                    "canceling statement due to",
                    "could not obtain lock",
                )
            ):
                break

    if columnas_pendientes:
        timeout = any(
            any(
                token in pendiente["error"].lower()
                for token in (
                    "lock timeout",
                    "statement timeout",
                    "canceling statement due to",
                    "could not obtain lock",
                )
            )
            for pendiente in columnas_pendientes
        )
        raise HTTPException(
            status_code=503 if timeout else 500,
            detail={
                "mensaje": (
                    "La tabla expediente_documentos_escritura está creada "
                    "y confirmada, pero la migración de columnas no ha "
                    "terminado. Puedes volver a ejecutar este endpoint; "
                    "ADD COLUMN IF NOT EXISTS permite reintentarlo."
                ),
                "tabla_confirmada": "expediente_documentos_escritura",
                "columnas_confirmadas": columnas_confirmadas,
                "columnas_pendientes": columnas_pendientes,
            },
        )

    print(
        "FIN MIGRACIÓN ENVÍO A NOTARIO: tabla y columnas confirmadas",
        flush=True,
    )
    return {
        "ok": True,
        "mensaje": "Base de datos actualizada correctamente.",
        "tabla_documentos": "expediente_documentos_escritura",
        "tabla_documentos_confirmada": True,
        "tabla_expedientes": "expedientes",
        "columnas_confirmadas": columnas_confirmadas,
        "columnas_pendientes": [],
    }


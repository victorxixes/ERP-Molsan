from fastapi import (
    APIRouter,
    Query,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session
from sqlalchemy import (
    or_,
    func,
    and_,
)

from typing import Optional
from datetime import datetime, date

import json
import io
import unicodedata

import openpyxl
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from fastapi.responses import StreamingResponse

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/expedientes",
    tags=["Expedientes"],
)


# ============================================================
# ACTIVIDADES DEL MÓDULO EXPEDIENTES
#
# IMPORTANTE:
#
# Estas son las actividades de trabajo que verá el usuario
# en el módulo Expedientes.
#
# No todas tienen por qué coincidir literalmente con el valor
# almacenado en Expediente.actividad_actual.
#
# Especialmente:
#
#   Sede notarial
#       = actividad Sede notarial + fecha_firma vacía
#
#   Sede notarial con protocolo
#       = actividad Sede notarial + fecha_firma informada
#
# Las claves son internas y estables para el frontend.
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
            "Sede notarial",
            "Sede Notarial",
            "Sede NOTARIAL",
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
            "Defectos registrales ",
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


# ============================================================
# NORMALIZAR TEXTO DE ACTIVIDAD
#
# Se utiliza para interpretar correctamente la actividad
# recibida desde el frontend.
#
# Ejemplos:
#
#   "Sede Notarial"
#   "sede notarial"
#   "SÉDE NOTARIAL"   -> misma clave normalizada
#
# NO modifica los datos de la base de datos.
# ============================================================

def normalizar_actividad_texto(
    valor: Optional[str],
) -> str:

    if valor is None:
        return ""

    texto = str(valor).strip().lower()

    texto = unicodedata.normalize(
        "NFD",
        texto,
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )

    texto = " ".join(
        texto.split()
    )

    return texto


# ============================================================
# RESOLVER ACTIVIDAD
#
# Convierte lo que llega desde frontend en una clave interna.
#
# Puede recibir:
#
#   documentacion-previa
#   Documentación previa
#   Documentacion previa
#
# etc.
# ============================================================

def resolver_actividad(
    valor: Optional[str],
) -> Optional[str]:

    normalizada = normalizar_actividad_texto(
        valor
    )

    if not normalizada:
        return None

    for actividad in ACTIVIDADES_EXPEDIENTES:

        if (
            normalizada
            == normalizar_actividad_texto(
                actividad["key"]
            )
        ):
            return actividad["key"]

        if (
            normalizada
            == normalizar_actividad_texto(
                actividad["label"]
            )
        ):
            return actividad["key"]

        for alias in actividad["aliases"]:

            if (
                normalizada
                == normalizar_actividad_texto(
                    alias
                )
            ):
                return actividad["key"]

    return None


# ============================================================
# CONSTRUIR CONDICIÓN DE ACTIVIDAD
#
# Esta función contiene las reglas reales del módulo.
#
# Es utilizada tanto por:
#
#   /listado
#
# como por:
#
#   /resumen
#
# para garantizar que los contadores y el listado siempre
# coincidan.
# ============================================================

def condicion_actividad(
    clave_actividad: str,
):

    # ========================================================
    # DOCUMENTACIÓN PREVIA
    # ========================================================

    if clave_actividad == "documentacion-previa":

        return or_(

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Documentación previa"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Documentacion previa"
            ),

        )


    # ========================================================
    # SEDE NOTARIAL
    #
    # IMPORTANTE:
    #
    # Sede notarial = actividad Sede notarial
    #                 y fecha_firma VACÍA.
    #
    # No debe incluir expedientes que ya tengan fecha de firma.
    # ========================================================

    if clave_actividad == "sede-notarial":

        return and_(

            or_(

                func.trim(
                    Expediente.actividad_actual
                ).ilike(
                    "Sede notarial"
                ),

                func.trim(
                    Expediente.actividad_actual
                ).ilike(
                    "Sede Notarial"
                ),

            ),

            Expediente.fecha_firma.is_(None),

        )


    # ========================================================
    # SEDE NOTARIAL CON PROTOCOLO
    #
    # IMPORTANTE:
    #
    # Es la misma actividad base "Sede notarial",
    # pero con fecha_firma INFORMADA.
    # ========================================================

    if clave_actividad == "sede-notarial-protocolo":

        return and_(

            or_(

                func.trim(
                    Expediente.actividad_actual
                ).ilike(
                    "Sede notarial"
                ),

                func.trim(
                    Expediente.actividad_actual
                ).ilike(
                    "Sede Notarial"
                ),

            ),

            Expediente.fecha_firma.isnot(None),

        )


    # ========================================================
    # LIQUIDACIÓN DE IMPUESTOS
    # ========================================================

    if clave_actividad == "liquidacion-impuestos":

        return or_(

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Liquidación de impuestos"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Liquidacion de impuestos"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Liquidación impuestos"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Liquidacion impuestos"
            ),

        )


    # ========================================================
    # TRAMITACIÓN INSCRIPCIÓN
    # ========================================================

    if clave_actividad == "tramitacion-inscripcion":

        return or_(

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Tramitación inscripción"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Tramitacion inscripcion"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Tramitación de inscripción"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Tramitacion de inscripcion"
            ),

        )


    # ========================================================
    # DEFECTOS REGISTRALES
    # ========================================================

    if clave_actividad == "defectos-registrales":

        return or_(

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Defectos registrales"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Defectos Registrales"
            ),

        )


    # ========================================================
    # FACTURACIÓN Y CIERRE
    # ========================================================

    if clave_actividad == "facturacion-cierre":

        return or_(

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Facturación y cierre"
            ),

            func.trim(
                Expediente.actividad_actual
            ).ilike(
                "Facturacion y cierre"
            ),

        )


    # ========================================================
    # ACTIVIDAD DESCONOCIDA
    # ========================================================

    return None


# ============================================================
# CAMPOS DEL EXPEDIENTE
#
# Se mantienen centralizados para que:
#
# - listado
# - ficha
# - Excel
#
# trabajen siempre con la misma información.
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

    "nombre_titular",
    "nif_titular",

    "nombre_solicitante",
    "nif_solicitante",

    "apoderado",

    "nombre_notario",
    "nif_notario",
    "notario",

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

    "facturacion_estado",
    "facturacion_fecha",

    "registral_estado",
    "registral_fecha",
]


# ============================================================
# COLUMNAS ORDENABLES
# ============================================================

COLUMNAS_ORDENABLES = {

    "id":
        Expediente.id,

    "cliente_id":
        Expediente.cliente_id,

    "id_expediente":
        Expediente.id_expediente,


    # --------------------------------------------------------
    # ESTADOS
    # --------------------------------------------------------

    "estado_expediente":
        Expediente.estado_expediente,

    "estado_expediente_ancert":
        Expediente.estado_expediente_ancert,


    # --------------------------------------------------------
    # FECHAS
    # --------------------------------------------------------

    "fecha_alta":
        Expediente.fecha_alta,

    "fecha_firma":
        Expediente.fecha_firma,

    "fecha_inscripcion":
        Expediente.fecha_inscripcion,

    "fecha_entregado_cliente":
        Expediente.fecha_entregado_cliente,

    "fecha_prevista_firma":
        Expediente.fecha_prevista_firma,

    "fecha_vencimiento":
        Expediente.fecha_vencimiento,

    "fecha_sol_cgn":
        Expediente.fecha_sol_cgn,

    "fecha_firma_prev_val":
        Expediente.fecha_firma_prev_val,

    "fecha_firma_prev_cli":
        Expediente.fecha_firma_prev_cli,

    "fecha_inicio_actividad":
        Expediente.fecha_inicio_actividad,

    "fecha_fin_actividad":
        Expediente.fecha_fin_actividad,

    "fcierre_defecto":
        Expediente.fcierre_defecto,

    "facturacion_fecha":
        Expediente.facturacion_fecha,

    "registral_fecha":
        Expediente.registral_fecha,


    # --------------------------------------------------------
    # ACTIVIDAD
    # --------------------------------------------------------

    "actividad_actual":
        Expediente.actividad_actual,

    "estado_actividad":
        Expediente.estado_actividad,


    # --------------------------------------------------------
    # SOLICITANTE
    # --------------------------------------------------------

    "nombre_solicitante":
        Expediente.nombre_solicitante,

    "nif_solicitante":
        Expediente.nif_solicitante,


    # --------------------------------------------------------
    # TITULAR
    # --------------------------------------------------------

    "nombre_titular":
        Expediente.nombre_titular,

    "nif_titular":
        Expediente.nif_titular,


    # --------------------------------------------------------
    # APODERADO
    # --------------------------------------------------------

    "apoderado":
        Expediente.apoderado,


    # --------------------------------------------------------
    # NOTARIO
    # --------------------------------------------------------

    "nombre_notario":
        Expediente.nombre_notario,

    "nif_notario":
        Expediente.nif_notario,

    "notario":
        Expediente.notario,


    # --------------------------------------------------------
    # OFICINA
    # --------------------------------------------------------

    "oficina":
        Expediente.oficina,

    "dan":
        Expediente.dan,

    "oficina_alta":
        Expediente.oficina_alta,


    # --------------------------------------------------------
    # ECONÓMICOS
    # --------------------------------------------------------

    "capital":
        Expediente.capital,

    "importe":
        Expediente.importe,

    "saldo_real":
        Expediente.saldo_real,

    "saldo_disponible":
        Expediente.saldo_disponible,


    # --------------------------------------------------------
    # PROVISIÓN
    # --------------------------------------------------------

    "id_provision":
        Expediente.id_provision,

    "tipo_provision":
        Expediente.tipo_provision,


    # --------------------------------------------------------
    # OPERACIÓN
    # --------------------------------------------------------

    "contrato":
        Expediente.contrato,

    "num_solicitud_sia":
        Expediente.num_solicitud_sia,

    "tipo_operacion":
        Expediente.tipo_operacion,

    "subtipo_operacion":
        Expediente.subtipo_operacion,

    "vinccanc":
        Expediente.vinccanc,

    "protocolo":
        Expediente.protocolo,


    # --------------------------------------------------------
    # BANKIA / GTG
    # --------------------------------------------------------

    "origen_bankia":
        Expediente.origen_bankia,

    "producto_gtg":
        Expediente.producto_gtg,

    "dt":
        Expediente.dt,


    # --------------------------------------------------------
    # GESTORÍA
    # --------------------------------------------------------

    "id_gestoria_tramite":
        Expediente.id_gestoria_tramite,

    "nombre_gestoria":
        Expediente.nombre_gestoria,

    "gestoria":
        Expediente.gestoria,


    # --------------------------------------------------------
    # FINCA
    # --------------------------------------------------------

    "finca":
        Expediente.finca,


    # --------------------------------------------------------
    # DEFECTOS
    # --------------------------------------------------------

    "tiene_defectos_abiertos":
        Expediente.tiene_defectos_abiertos,

    "tipo_error":
        Expediente.tipo_error,

    "descripcion_error":
        Expediente.descripcion_error,

    "falta_defecto":
        Expediente.falta_defecto,


    # --------------------------------------------------------
    # CGN
    # --------------------------------------------------------

    "id_expediente_cgn":
        Expediente.id_expediente_cgn,


    # --------------------------------------------------------
    # ACTA
    # --------------------------------------------------------

    "tipo_acta":
        Expediente.tipo_acta,


    # --------------------------------------------------------
    # OTROS
    # --------------------------------------------------------

    "lucy":
        Expediente.lucy,

    "indicador_tt":
        Expediente.indicador_tt,


    # --------------------------------------------------------
    # OBSERVACIONES
    # --------------------------------------------------------

    "observaciones":
        Expediente.observaciones,


    # --------------------------------------------------------
    # FACTURACIÓN
    # --------------------------------------------------------

    "facturacion_estado":
        Expediente.facturacion_estado,

    "facturacion_fecha":
        Expediente.facturacion_fecha,


    # --------------------------------------------------------
    # REGISTRAL
    # --------------------------------------------------------

    "registral_estado":
        Expediente.registral_estado,

    "registral_fecha":
        Expediente.registral_fecha,
}


# ============================================================
# COLUMNAS DEL EXCEL ABSIS
# ============================================================

COLUMNAS_EXCEL = [

    ("ID", "id"),
    ("CLIENTEID", "cliente_id"),

    ("IDEXPEDIENTE", "id_expediente"),

    ("ESTADOEXPEDIENTE", "estado_expediente"),
    (
        "ESTADOEXPEDIENTEANCERT",
        "estado_expediente_ancert",
    ),

    ("FECHAALTA", "fecha_alta"),
    ("FECHAFIRMA", "fecha_firma"),
    (
        "FECHAINSCRIPCION",
        "fecha_inscripcion",
    ),
    (
        "FECHAENTREGADOCLIENTE",
        "fecha_entregado_cliente",
    ),
    (
        "FECHAPREVISTAFIRMA",
        "fecha_prevista_firma",
    ),
    (
        "FECHAVENCIMIENTO",
        "fecha_vencimiento",
    ),
    (
        "FECHASOLCGN",
        "fecha_sol_cgn",
    ),
    (
        "FECHAFIRMAPREVVAL",
        "fecha_firma_prev_val",
    ),
    (
        "FECHAFIRMAPREVCLI",
        "fecha_firma_prev_cli",
    ),
    (
        "FECHAINICIOACTIVIDAD",
        "fecha_inicio_actividad",
    ),
    (
        "FECHAFINACTIVIDAD",
        "fecha_fin_actividad",
    ),

    (
        "NOMBRETITULAR",
        "nombre_titular",
    ),
    (
        "NIFTITULAR",
        "nif_titular",
    ),

    (
        "NOMBRESOLICITANTE",
        "nombre_solicitante",
    ),
    (
        "NIFSOLICITANTE",
        "nif_solicitante",
    ),

    (
        "APODERADO",
        "apoderado",
    ),

    (
        "NOMBRENOTARIO",
        "nombre_notario",
    ),
    (
        "NIFNOTARIO",
        "nif_notario",
    ),
    (
        "NOTARIO",
        "notario",
    ),

    (
        "OFICINA",
        "oficina",
    ),
    (
        "DAN",
        "dan",
    ),
    (
        "OFICINAALTA",
        "oficina_alta",
    ),

    (
        "CAPITAL",
        "capital",
    ),
    (
        "IMPORTE",
        "importe",
    ),
    (
        "SALDOREAL",
        "saldo_real",
    ),
    (
        "SALDODISPONIBLE",
        "saldo_disponible",
    ),

    (
        "IDPROVISION",
        "id_provision",
    ),
    (
        "TIPOPROVISION",
        "tipo_provision",
    ),

    (
        "CONTRATO",
        "contrato",
    ),
    (
        "NUMSOLICITUDSIA",
        "num_solicitud_sia",
    ),
    (
        "TIPOOPERACION",
        "tipo_operacion",
    ),
    (
        "SUBTIPOOPERACION",
        "subtipo_operacion",
    ),
    (
        "VINCCANC",
        "vinccanc",
    ),
    (
        "PROTOCOLO",
        "protocolo",
    ),

    (
        "ORIGENBANKIA",
        "origen_bankia",
    ),
    (
        "PRODUCTOGTG",
        "producto_gtg",
    ),
    (
        "DT",
        "dt",
    ),

    (
        "ACTIVIDADACTUAL",
        "actividad_actual",
    ),
    (
        "ESTADOACTIVIDAD",
        "estado_actividad",
    ),

    (
        "IDGESTORIATRAMITE",
        "id_gestoria_tramite",
    ),
    (
        "NOMBREGESTORIA",
        "nombre_gestoria",
    ),
    (
        "GESTORIA",
        "gestoria",
    ),

    (
        "FINCA",
        "finca",
    ),

    (
        "TIENEDEFECTOSABIERTOS",
        "tiene_defectos_abiertos",
    ),
    (
        "TIPOERROR",
        "tipo_error",
    ),
    (
        "DESCRIPCIONERROR",
        "descripcion_error",
    ),
    (
        "FALTADEFECTO",
        "falta_defecto",
    ),
    (
        "FCIERREDEFECTO",
        "fcierre_defecto",
    ),

    (
        "IDEXPEDIENTECGN",
        "id_expediente_cgn",
    ),

    (
        "TIPOACTA",
        "tipo_acta",
    ),

    (
        "LUCY",
        "lucy",
    ),
    (
        "INDICADORTT",
        "indicador_tt",
    ),

    (
        "OBSERVACIONES",
        "observaciones",
    ),

    (
        "FACTURACIONESTADO",
        "facturacion_estado",
    ),
    (
        "FACTURACIONFECHA",
        "facturacion_fecha",
    ),

    (
        "REGISTRALESTADO",
        "registral_estado",
    ),
    (
        "REGISTRALFECHA",
        "registral_fecha",
    ),
]


# ============================================================
# SERIALIZAR EXPEDIENTE
# ============================================================

def expediente_a_dict(
    expediente: Expediente,
) -> dict:

    resultado = {}

    for campo in CAMPOS_EXPEDIENTE:

        valor = getattr(
            expediente,
            campo,
            None,
        )

        if isinstance(
            valor,
            (date, datetime),
        ):

            valor = valor.isoformat()

        resultado[campo] = valor

    return resultado


# ============================================================
# PARSEAR FECHA
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
            detail=(
                f"{nombre_campo} debe tener formato "
                f"YYYY-MM-DD."
            ),
        )


# ============================================================
# APLICAR FILTROS
# ============================================================

def aplicar_filtros(
    q,
    nif: Optional[str] = None,
    actividad: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    notario: Optional[str] = None,
    oficina: Optional[str] = None,
    importeMin: Optional[float] = None,
    importeMax: Optional[float] = None,
):

    # ========================================================
    # NIF TITULAR
    # ========================================================

    if nif and nif.strip():

        patron = f"%{nif.strip()}%"

        q = q.filter(
            Expediente.nif_titular.ilike(
                patron
            )
        )


    # ========================================================
    # ACTIVIDAD
    #
    # IMPORTANTE:
    #
    # Aquí ya NO hacemos simplemente:
    #
    # actividad_actual LIKE '%...%'
    #
    # Ahora utilizamos las reglas reales de cada actividad.
    # ========================================================

    if actividad and actividad.strip():

        clave_actividad = resolver_actividad(
            actividad
        )

        if clave_actividad is None:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Actividad no válida: "
                    f"{actividad}"
                ),
            )

        condicion = condicion_actividad(
            clave_actividad
        )

        if condicion is not None:

            q = q.filter(
                condicion
            )


    # ========================================================
    # FECHA INICIO
    # ========================================================

    fecha_inicio = parsear_fecha(
        fechaInicio,
        "fechaInicio",
    )

    if fecha_inicio:

        q = q.filter(
            Expediente.fecha_alta
            >= fecha_inicio
        )


    # ========================================================
    # FECHA FIN
    # ========================================================

    fecha_fin = parsear_fecha(
        fechaFin,
        "fechaFin",
    )

    if fecha_fin:

        q = q.filter(
            Expediente.fecha_alta
            <= fecha_fin
        )


    # ========================================================
    # VALIDACIÓN DE RANGO DE FECHAS
    # ========================================================

    if (
        fecha_inicio
        and fecha_fin
        and fecha_inicio > fecha_fin
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha de inicio no puede ser "
                "posterior a la fecha de fin."
            ),
        )


    # ========================================================
    # NOTARIO
    # ========================================================

    if notario and notario.strip():

        patron = f"%{notario.strip()}%"

        q = q.filter(
            or_(
                Expediente.nombre_notario.ilike(
                    patron
                ),
                Expediente.nif_notario.ilike(
                    patron
                ),
                Expediente.notario.ilike(
                    patron
                ),
            )
        )


    # ========================================================
    # OFICINA
    # ========================================================

    if oficina and oficina.strip():

        patron = f"%{oficina.strip()}%"

        q = q.filter(
            Expediente.oficina.ilike(
                patron
            )
        )


    # ========================================================
    # IMPORTE MÍNIMO
    # ========================================================

    if importeMin is not None:

        q = q.filter(
            Expediente.importe
            >= importeMin
        )


    # ========================================================
    # IMPORTE MÁXIMO
    # ========================================================

    if importeMax is not None:

        q = q.filter(
            Expediente.importe
            <= importeMax
        )


    # ========================================================
    # VALIDACIÓN IMPORTE
    # ========================================================

    if (
        importeMin is not None
        and importeMax is not None
        and importeMin > importeMax
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "El importe mínimo no puede ser "
                "superior al importe máximo."
            ),
        )

    return q


# ============================================================
# LISTADO
# ============================================================

@router.get("/listado")
def listado_expedientes(

    pagina: int = Query(
        1,
        ge=1,
    ),

    porPagina: int = Query(
        20,
        ge=1,
        le=200,
    ),

    nif: Optional[str] = None,
    actividad: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    notario: Optional[str] = None,
    oficina: Optional[str] = None,

    importeMin: Optional[float] = None,
    importeMax: Optional[float] = None,

    ordenMultiple: Optional[str] = Query(
        None
    ),

    db: Session = Depends(
        get_db
    ),
):

    # ========================================================
    # QUERY BASE
    # ========================================================

    q = db.query(
        Expediente
    )


    # ========================================================
    # FILTROS
    # ========================================================

    q = aplicar_filtros(

        q,

        nif=nif,

        actividad=actividad,

        fechaInicio=fechaInicio,

        fechaFin=fechaFin,

        notario=notario,

        oficina=oficina,

        importeMin=importeMin,

        importeMax=importeMax,
    )


    # ========================================================
    # ORDENACIÓN MÚLTIPLE
    # ========================================================

    orden_aplicado = False

    if ordenMultiple:

        try:

            ordenes = json.loads(
                ordenMultiple
            )

        except (
            json.JSONDecodeError,
            TypeError,
            ValueError,
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "ordenMultiple no contiene "
                    "un JSON válido."
                ),
            )


        if not isinstance(
            ordenes,
            list,
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "ordenMultiple debe ser "
                    "una lista."
                ),
            )


        for orden in ordenes:

            if not isinstance(
                orden,
                dict,
            ):
                continue


            columna = orden.get(
                "columna"
            )


            direccion = str(
                orden.get(
                    "direccion",
                    "asc",
                )
            ).lower()


            campo = COLUMNAS_ORDENABLES.get(
                columna
            )


            if campo is None:
                continue


            if direccion == "desc":

                q = q.order_by(
                    campo.desc()
                )

            else:

                q = q.order_by(
                    campo.asc()
                )


            orden_aplicado = True


    # ========================================================
    # ORDEN POR DEFECTO
    # ========================================================

    if not orden_aplicado:

        q = q.order_by(

            Expediente.fecha_alta.desc(),

            Expediente.id_expediente.desc(),

            Expediente.id.desc(),

        )


    # ========================================================
    # TOTAL
    # ========================================================

    total = q.count()


    total_paginas = max(

        1,

        (
            total
            + porPagina
            - 1
        )
        // porPagina,

    )


    # ========================================================
    # PÁGINA REAL
    # ========================================================

    pagina_real = min(

        pagina,

        total_paginas,

    )


    # ========================================================
    # PAGINACIÓN
    # ========================================================

    items_db = (

        q

        .offset(

            (
                pagina_real
                - 1
            )
            * porPagina

        )

        .limit(
            porPagina
        )

        .all()

    )


    # ========================================================
    # SERIALIZAR
    # ========================================================

    items = [

        expediente_a_dict(
            expediente
        )

        for expediente
        in items_db

    ]


    # ========================================================
    # RESPUESTA
    # ========================================================

    return {

        "items":
            items,

        "total":
            total,

        "pagina":
            pagina_real,

        "porPagina":
            porPagina,

        "total_paginas":
            total_paginas,
    }


# ============================================================
# RESUMEN DE ACTIVIDADES
#
# IMPORTANTE:
#
# Los contadores utilizan EXACTAMENTE las mismas reglas que
# /listado.
#
# De esta manera:
#
# contador "Sede notarial"
#
# coincide con:
#
# listado actividad=sede-notarial
#
# y:
#
# contador "Sede notarial con protocolo"
#
# coincide con:
#
# listado actividad=sede-notarial-protocolo
# ============================================================

@router.get("/resumen")
def resumen_expedientes(

    db: Session = Depends(
        get_db
    ),

):

    # ========================================================
    # TOTAL GENERAL
    # ========================================================

    total_expedientes = (

        db.query(

            func.count(
                Expediente.id
            )

        )

        .scalar()

        or 0

    )


    # ========================================================
    # CONTADORES DE LAS 7 ACTIVIDADES
    # ========================================================

    actividades = []


    for actividad in ACTIVIDADES_EXPEDIENTES:

        condicion = condicion_actividad(
            actividad["key"]
        )

        if condicion is None:

            total = 0

        else:

            total = (

                db.query(
                    func.count(
                        Expediente.id
                    )
                )

                .filter(
                    condicion
                )

                .scalar()

                or 0

            )


        actividades.append({

            "key":
                actividad["key"],

            "actividad":
                actividad["label"],

            "total":
                int(
                    total
                ),

        })


    # ========================================================
    # RESPUESTA
    # ========================================================

    return {

        "total":
            int(
                total_expedientes
            ),

        "actividades":
            actividades,

    }


# ============================================================
# EXPORTAR EXCEL
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

    db: Session = Depends(
        get_db
    ),

):

    # ========================================================
    # QUERY
    # ========================================================

    q = db.query(
        Expediente
    )


    q = aplicar_filtros(

        q,

        nif=nif,

        actividad=actividad,

        fechaInicio=fechaInicio,

        fechaFin=fechaFin,

        notario=notario,

        oficina=oficina,

        importeMin=importeMin,

        importeMax=importeMax,

    )


    expedientes = (

        q

        .order_by(

            Expediente.fecha_alta.desc(),

            Expediente.id_expediente.desc(),

            Expediente.id.desc(),

        )

        .all()

    )


    # ========================================================
    # CREAR LIBRO
    # ========================================================

    wb = openpyxl.Workbook()


    ws = wb.active

    ws.title = "Expedientes"


    # ========================================================
    # CABECERAS
    # ========================================================

    for (
        numero_columna,
        (
            cabecera,
            _,
        ),
    ) in enumerate(

        COLUMNAS_EXCEL,

        start=1,

    ):

        cell = ws.cell(

            row=1,

            column=numero_columna,

            value=cabecera,

        )


        cell.font = Font(
            bold=True
        )


    # ========================================================
    # DATOS
    # ========================================================

    for (
        numero_fila,
        expediente,
    ) in enumerate(

        expedientes,

        start=2,

    ):

        for (
            numero_columna,
            (
                _,
                atributo,
            ),
        ) in enumerate(

            COLUMNAS_EXCEL,

            start=1,

        ):

            valor = getattr(

                expediente,

                atributo,

                None,

            )


            cell = ws.cell(

                row=numero_fila,

                column=numero_columna,

                value=valor,

            )


            # -----------------------------------------------
            # FECHAS
            # -----------------------------------------------

            if isinstance(

                valor,

                (date, datetime),

            ):

                cell.number_format = (
                    "dd/mm/yyyy"
                )


    # ========================================================
    # INMOVILIZAR CABECERA
    # ========================================================

    ws.freeze_panes = "A2"


    # ========================================================
    # FILTROS DEL EXCEL
    # ========================================================

    ultima_columna = (
        get_column_letter(
            len(
                COLUMNAS_EXCEL
            )
        )
    )


    if expedientes:

        ws.auto_filter.ref = (

            f"A1:{ultima_columna}"
            f"{len(expedientes) + 1}"

        )

    else:

        ws.auto_filter.ref = (

            f"A1:{ultima_columna}1"

        )


    # ========================================================
    # ANCHO DE COLUMNAS
    # ========================================================

    for (
        numero_columna,
        (
            cabecera,
            _,
        ),
    ) in enumerate(

        COLUMNAS_EXCEL,

        start=1,

    ):

        max_length = len(
            str(cabecera)
        )


        limite_filas = min(

            len(expedientes) + 2,

            500,

        )


        for numero_fila in range(

            2,

            limite_filas,

        ):

            valor = ws.cell(

                row=numero_fila,

                column=numero_columna,

            ).value


            if valor is not None:

                max_length = max(

                    max_length,

                    len(
                        str(valor)
                    ),

                )


        ws.column_dimensions[

            get_column_letter(
                numero_columna
            )

        ].width = min(

            max(
                max_length + 2,
                12,
            ),

            45,

        )


    # ========================================================
    # GENERAR ARCHIVO
    # ========================================================

    buffer = io.BytesIO()


    wb.save(
        buffer
    )


    buffer.seek(0)


    return StreamingResponse(

        buffer,

        media_type=(

            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"

        ),

        headers={

            "Content-Disposition":
                'attachment; filename="expedientes.xlsx"'

        },

    )


# ============================================================
# OBTENER EXPEDIENTE
#
# IMPORTANTE:
# Esta ruta está después de:
#
# /listado
# /resumen
# /exportar-excel
#
# para que esas rutas no sean interpretadas como
# {id_expediente}.
# ============================================================

@router.get("/{id_expediente}")
def obtener_expediente(

    id_expediente: str,

    db: Session = Depends(
        get_db
    ),

):

    expediente = (

        db.query(
            Expediente
        )

        .filter(

            Expediente.id_expediente
            == id_expediente

        )

        .first()

    )


    if expediente is None:

        raise HTTPException(

            status_code=404,

            detail=(
                "Expediente no encontrado"
            ),

        )


    # ========================================================
    # DEVOLVER TODOS LOS CAMPOS
    # ========================================================

    return expediente_a_dict(
        expediente
    )

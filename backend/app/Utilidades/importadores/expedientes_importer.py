import io
import unicodedata
from datetime import date, datetime
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.expedientes.models import Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado
from backend.app.expedientes.reparto import asignar_gestor_automaticamente, resolver_key_actividad


# ============================================================
# CONFIGURACIÓN
# ============================================================

BATCH_SIZE = 200


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def limpiar_valor(valor: Any):
    """
    Convierte valores de pandas/numpy a valores Python normales.
    """
    if valor is None:
        return None

    try:
        if pd.isna(valor):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(valor, pd.Timestamp):
        return valor.to_pydatetime()

    return valor


def limpiar_texto(valor: Any):
    """
    Convierte cualquier valor a texto limpio.
    """
    valor = limpiar_valor(valor)

    if valor is None:
        return None

    texto = str(valor).strip()

    if not texto:
        return None

    return texto


def normalizar_nombre_columna(nombre: Any) -> str:
    """
    Normaliza el nombre de una columna para poder comparar
    variantes del Excel.

    Ejemplos:

        FECHAALTA
        FechaAlta
        FECHA ALTA
        fecha_alta

    terminan siendo equivalentes.
    """

    if nombre is None:
        return ""

    texto = str(nombre).strip().upper()

    # Elimina tildes para que OBSERVACIÓN y OBSERVACION,
    # por ejemplo, se reconozcan como el mismo encabezado.
    texto = "".join(
        caracter
        for caracter in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(caracter)
    )

    reemplazos = {
        " ": "",
        "_": "",
        "-": "",
        ".": "",
        "/": "",
        "\\": "",
    }

    for viejo, nuevo in reemplazos.items():
        texto = texto.replace(viejo, nuevo)

    return texto


def obtener_columna_real(
    columnas,
    *nombres_posibles,
):
    """
    Busca la columna real del Excel utilizando nombres
    normalizados.

    Devuelve el nombre REAL de la columna.
    """

    mapa = {}

    for columna in columnas:

        clave = normalizar_nombre_columna(
            columna
        )

        if clave:
            mapa[clave] = columna

    for nombre in nombres_posibles:

        clave = normalizar_nombre_columna(
            nombre
        )

        if clave in mapa:
            return mapa[clave]

    return None


def _asignar_si_informado(objeto, campo: str, valor):
    """No sobrescribe datos existentes con celdas Excel vacías o fechas inválidas."""
    if valor is not None:
        setattr(objeto, campo, valor)


def obtener_valor(row, *columnas):
    """
    Devuelve el primer valor válido encontrado.
    """

    for columna in columnas:

        columna_real = obtener_columna_real(
            row.index,
            columna,
        )

        if columna_real is None:
            continue

        valor = limpiar_valor(
            row[columna_real]
        )

        if valor is None:
            continue

        if isinstance(valor, str):

            valor = valor.strip()

            if not valor:
                continue

        return valor

    return None


def convertir_fecha(valor):
    """
    Convierte cualquier fecha procedente del Excel a date.
    """

    valor = limpiar_valor(valor)

    if valor is None:
        return None

    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    try:

        fecha = pd.to_datetime(
            valor,
            dayfirst=True,
            errors="coerce",
        )

        if pd.isna(fecha):
            return None

        return fecha.date()

    except Exception:
        return None


def convertir_numero(valor):
    """
    Convierte números procedentes del Excel.
    """

    valor = limpiar_valor(valor)

    if valor is None:
        return None

    if isinstance(valor, str):

        valor = valor.strip()

        if not valor:
            return None

        if "," in valor:

            valor = (
                valor
                .replace(".", "")
                .replace(",", ".")
            )

        else:

            valor = valor.replace(" ", "")

    try:

        return float(valor)

    except (TypeError, ValueError):

        return None


# ============================================================

def clave_vinculacion(valor: Any) -> str:
    """Normaliza nombres para resolver vínculos con los catálogos internos."""
    texto = limpiar_texto(valor) or ""
    texto = "".join(
        ch for ch in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(ch)
    )
    return " ".join(texto.casefold().replace("-", " ").split())


def normalizar_nif(valor: Any) -> str:
    return "".join(
        ch for ch in (limpiar_texto(valor) or "").upper()
        if ch.isalnum()
    )


def vincular_catalogos_expediente(expediente, row, notarios, empleados):
    """Vincula IDs solo si el valor de ABSIS identifica un único registro."""
    nombre = obtener_valor(row, "NOMBRENOTARIO", "NOTARIO")
    nif = normalizar_nif(obtener_valor(row, "NIFNOTARIO"))
    if nombre or nif:
        coincidencias = []
        for notario in notarios:
            nif_catalogo = normalizar_nif(getattr(notario, "nif", None))
            nombre_catalogo = " ".join(
                p for p in [
                    limpiar_texto(getattr(notario, "nombre", None)),
                    limpiar_texto(getattr(notario, "apellidos", None)),
                ] if p
            )
            por_nif = bool(nif and nif_catalogo and nif == nif_catalogo)
            por_nombre = bool(nombre and not nif and clave_vinculacion(nombre) in {
                clave_vinculacion(nombre_catalogo),
                clave_vinculacion(getattr(notario, "nombre", None)),
            })
            if por_nif or por_nombre:
                coincidencias.append(notario)
        if len(coincidencias) == 1:
            expediente.notario_id = coincidencias[0].id

    nombre_apoderado = obtener_valor(row, "APODERADO")
    if nombre_apoderado:
        clave = clave_vinculacion(nombre_apoderado)
        coincidencias = []
        for empleado in empleados:
            nombre_completo = " ".join(
                p for p in [
                    limpiar_texto(getattr(empleado, "nombre", None)),
                    limpiar_texto(getattr(empleado, "apellidos", None)),
                ] if p
            )
            if clave in {
                clave_vinculacion(nombre_completo),
                clave_vinculacion(getattr(empleado, "usuario", None)),
            }:
                coincidencias.append(empleado)
        if len(coincidencias) == 1:
            expediente.apoderado_empleado_id = coincidencias[0].id



def importar_finca_relacionada(db, expediente, row):
    """Sincroniza fincas/registros cuando la fila ABSIS contiene datos registrales."""
    finca = limpiar_texto(obtener_valor(row, "FINCA", "NUMEROFINCA"))
    registro = limpiar_texto(obtener_valor(
        row, "REGISTROPROPIEDAD", "REGISTRODELAPROPIEDAD",
        "REGISTRO", "NOMBREREGISTRO", "REGISTROPROPIEDADNOMBRE"
    ))
    provincia = limpiar_texto(obtener_valor(row, "PROVINCIAREGISTRO", "PROVINCIADELREGISTRO"))
    poblacion = limpiar_texto(obtener_valor(
        row, "MUNICIPIOREGISTRO", "POBLACIONREGISTRO",
        "MUNICIPIODELREGISTRO", "POBLACIONDELREGISTRO"
    ))
    cru = limpiar_texto(obtener_valor(row, "CRU", "CRUIDUFIR", "IDUFIR"))
    if not any((finca, registro, provincia, poblacion, cru)):
        return

    if getattr(expediente, "id", None) is None:
        db.flush()

    existentes = (
        db.query(ExpedienteFinca)
        .filter(ExpedienteFinca.expediente_id == expediente.id)
        .all()
    )
    clave_finca = clave_vinculacion(finca)
    clave_registro = clave_vinculacion(registro)
    destino = next((
        item for item in existentes
        if (
            (clave_finca and clave_vinculacion(getattr(item, "finca", None)) == clave_finca)
            or (
                not clave_finca and clave_registro
                and clave_vinculacion(getattr(item, "registro", None)) == clave_registro
            )
        )
        and (not clave_registro or clave_vinculacion(getattr(item, "registro", None)) == clave_registro)
    ), None)
    if destino is None:
        destino = ExpedienteFinca(expediente_id=expediente.id)
        db.add(destino)

    campos = (
        ("finca", finca), ("registro", registro),
        ("provincia", provincia), ("poblacion", poblacion),
        ("cru_idufir", cru),
        ("contrato", limpiar_texto(obtener_valor(row, "CONTRATO"))),
        ("cuantia", limpiar_texto(obtener_valor(row, "CUANTIAFINCA", "CUANTIAREGISTRAL"))),
        ("inscripcion", limpiar_texto(obtener_valor(row, "INSCRIPCION", "INSCRIPCIONREGISTRAL"))),
        ("seccion", limpiar_texto(obtener_valor(row, "SECCIONREGISTRAL", "SECCION"))),
        ("entidad_original", limpiar_texto(obtener_valor(row, "ENTIDADORIGINAL"))),
        ("subrogado", limpiar_texto(obtener_valor(row, "SUBROGADO"))),
    )
    for campo, valor in campos:
        if valor is not None:
            setattr(destino, campo, valor)

    fecha_constitucion = convertir_fecha(obtener_valor(row, "FECHACONSTITUCION"))
    if fecha_constitucion is not None:
        destino.fecha_constitucion = fecha_constitucion


# IMPORTADOR PRINCIPAL
# ============================================================

def importar_excel_expedientes(
    db: Session,
    contenido_excel: bytes,
    fecha_objetivo: date = None,
):
    """
    Importa expedientes desde el Excel matriz ABSIS.

    El Excel puede contener un histórico grande.

    Solo se procesan las filas cuya FECHAALTA coincide
    con fecha_objetivo.

    Los datos se guardan directamente en Expediente.
    """

    print("============================================", flush=True)
    print("IMPORTADOR ABSIS - INICIO", flush=True)
    print("============================================", flush=True)

    # ========================================================
    # 0) FECHA OBJETIVO
    # ========================================================

    if fecha_objetivo is None:
        fecha_objetivo = date.today()

    print(
        f"FECHA OBJETIVO: {fecha_objetivo}",
        flush=True,
    )

    print(
        f"TAMAÑO DEL FICHERO: {len(contenido_excel)} bytes",
        flush=True,
    )

    # ========================================================
    # 1) LEER EXCEL
    # ========================================================

    print(
        "IMPORTADOR: leyendo Excel...",
        flush=True,
    )

    try:

        df = pd.read_excel(
            io.BytesIO(contenido_excel),
            sheet_name=0,
            header=0,
            engine="openpyxl",
        )

    except Exception as e:

        print(
            f"ERROR LEYENDO EXCEL: {e}",
            flush=True,
        )

        raise ValueError(
            f"No se pudo leer el Excel: {e}"
        )

    print(
        "IMPORTADOR: Excel leído correctamente.",
        flush=True,
    )

    print(
        f"TOTAL FILAS EXCEL: {len(df)}",
        flush=True,
    )

    print(
        f"TOTAL COLUMNAS EXCEL: {len(df.columns)}",
        flush=True,
    )

    # Detectar explícitamente la columna de observaciones. Se aceptan
    # distintas denominaciones habituales del Excel de origen.
    columna_observaciones = obtener_columna_real(
        df.columns,
        "OBSERVACIONES",
        "OBSERVACION",
        "OBSERVACIÓN",
        "OBSERVACIONS",
        "OBSERVATION",
        "OBSERVACIONES EXPEDIENTE",
        "OBSERVACION EXPEDIENTE",
        "OBSERVACIONES DEL EXPEDIENTE",
        "OBSERVACION DEL EXPEDIENTE",
    )

    if columna_observaciones is None:
        print(
            "IMPORTADOR: no se ha detectado una columna de observaciones "
            "con los nombres conocidos. Se revisarán los encabezados del log.",
            flush=True,
        )
    else:
        print(
            "COLUMNA OBSERVACIONES DETECTADA: "
            f"[{columna_observaciones}]",
            flush=True,
        )

    # ========================================================
    # 2) MOSTRAR COLUMNAS REALES
    # ========================================================

    print(
        "============================================",
        flush=True,
    )

    print(
        "COLUMNAS DETECTADAS EN EL EXCEL:",
        flush=True,
    )

    for numero, columna in enumerate(
        df.columns,
        start=1,
    ):

        print(
            f"  {numero}: [{columna}]",
            flush=True,
        )

    print(
        "============================================",
        flush=True,
    )

    # ========================================================
    # 3) LOCALIZAR FECHAALTA
    # ========================================================

    columna_fecha_alta = obtener_columna_real(
        df.columns,
        "FECHAALTA",
        "FECHA ALTA",
        "FECHA_ALTA",
        "FECHA-ALTA",
    )

    if columna_fecha_alta is None:

        print(
            "ERROR: no se ha encontrado FECHAALTA.",
            flush=True,
        )

        print(
            "COLUMNAS NORMALIZADAS:",
            flush=True,
        )

        for columna in df.columns:

            print(
                f"  [{columna}] -> "
                f"[{normalizar_nombre_columna(columna)}]",
                flush=True,
            )

        raise ValueError(
            "El Excel no contiene una columna "
            "reconocible como FECHAALTA. "
            "Revisa los logs para ver las columnas detectadas."
        )

    print(
        f"COLUMNA FECHAALTA DETECTADA: "
        f"[{columna_fecha_alta}]",
        flush=True,
    )

    # ========================================================
    # 4) LOCALIZAR IDEXPEDIENTE
    # ========================================================

    columna_id_expediente = obtener_columna_real(
        df.columns,
        "IDEXPEDIENTE",
        "ID EXPEDIENTE",
        "ID_EXPEDIENTE",
        "ID-EXPEDIENTE",
    )

    if columna_id_expediente is None:

        print(
            "ERROR: no se ha encontrado IDEXPEDIENTE.",
            flush=True,
        )

        raise ValueError(
            "El Excel no contiene una columna "
            "reconocible como IDEXPEDIENTE."
        )

    print(
        f"COLUMNA IDEXPEDIENTE DETECTADA: "
        f"[{columna_id_expediente}]",
        flush=True,
    )

    # ========================================================
    # 5) CONVERTIR FECHAALTA
    # ========================================================

    print(
        "IMPORTADOR: convirtiendo FECHAALTA...",
        flush=True,
    )

    df["_FECHAALTA_IMPORTADOR"] = pd.to_datetime(
        df[columna_fecha_alta],
        dayfirst=True,
        errors="coerce",
    )

    fechas_validas = int(
        df["_FECHAALTA_IMPORTADOR"]
        .notna()
        .sum()
    )

    print(
        f"FECHAS VÁLIDAS EN EXCEL: {fechas_validas}",
        flush=True,
    )

    # ========================================================
    # 6) FILTRAR POR FECHA
    # ========================================================

    print(
        f"IMPORTADOR: filtrando por {fecha_objetivo}...",
        flush=True,
    )

    fecha_timestamp = pd.Timestamp(
        fecha_objetivo
    )

    df_filtrado = df[
        df["_FECHAALTA_IMPORTADOR"].dt.normalize()
        == fecha_timestamp
    ].copy()

    total_filtrados_fecha = len(
        df_filtrado
    )

    print(
        f"FILAS ENCONTRADAS PARA "
        f"{fecha_objetivo}: "
        f"{total_filtrados_fecha}",
        flush=True,
    )

    # ========================================================
    # 7) SI NO HAY FILAS
    # ========================================================

    if total_filtrados_fecha == 0:

        print(
            "IMPORTADOR: no existen expedientes "
            "para la fecha indicada.",
            flush=True,
        )

        return {
            "creados": 0,
            "actualizados": 0,
            "errores": 0,
            "fecha_importada": fecha_objetivo.isoformat(),
            "total_filtrados": 0,
            "total_procesados": 0,
        }

    # ========================================================
    # 8) LIMPIAR IDENTIFICADORES
    # ========================================================

    df_filtrado["_IDEXPEDIENTE_IMPORTADOR"] = (
        df_filtrado[
            columna_id_expediente
        ].apply(limpiar_texto)
    )

    df_filtrado = df_filtrado[
        df_filtrado[
            "_IDEXPEDIENTE_IMPORTADOR"
        ].notna()
    ].copy()

    total_filtrados = len(
        df_filtrado
    )

    print(
        f"FILAS VÁLIDAS CON IDEXPEDIENTE: "
        f"{total_filtrados}",
        flush=True,
    )

    if total_filtrados == 0:

        return {
            "creados": 0,
            "actualizados": 0,
            "errores": 0,
            "fecha_importada": fecha_objetivo.isoformat(),
            "total_filtrados": 0,
            "total_procesados": 0,
        }

    # ========================================================
    # 9) IDS ÚNICOS
    # ========================================================

    ids_excel = (
        df_filtrado[
            "_IDEXPEDIENTE_IMPORTADOR"
        ]
        .drop_duplicates()
        .tolist()
    )

    print(
        f"IDS ÚNICOS EN EL EXCEL: "
        f"{len(ids_excel)}",
        flush=True,
    )

    # ========================================================
    # 10) BUSCAR EXISTENTES
    # ========================================================

    existentes_por_id = {}

    for inicio in range(
        0,
        len(ids_excel),
        BATCH_SIZE,
    ):

        bloque_ids = ids_excel[
            inicio:inicio + BATCH_SIZE
        ]

        existentes = (
            db.query(Expediente)
            .filter(
                Expediente.id_expediente.in_(
                    bloque_ids
                )
            )
            .all()
        )

        for exp in existentes:

            clave = limpiar_texto(
                exp.id_expediente
            )

            if clave:
                existentes_por_id[
                    clave
                ] = exp

    # Cargar catálogos una sola vez para enlazar IDs estables.
    notarios_catalogo = db.query(Notaria).all()
    empleados_catalogo = db.query(Empleado).filter(Empleado.activo.is_(True)).all()

    print(
        f"EXPEDIENTES YA EXISTENTES: "
        f"{len(existentes_por_id)}",
        flush=True,
    )

    # ========================================================
    # 11) CONTADORES
    # ========================================================

    creados = 0
    actualizados = 0
    errores = 0
    procesados = 0

    # ========================================================
    # 12) PROCESAR EXPEDIENTES
    # ========================================================

    for _, row in df_filtrado.iterrows():

        idexp = limpiar_texto(
            row[
                "_IDEXPEDIENTE_IMPORTADOR"
            ]
        )

        if not idexp:
            continue

        try:

            exp = existentes_por_id.get(
                idexp
            )

            # ------------------------------------------------
            # CREAR
            # ------------------------------------------------

            if exp is None:

                exp = Expediente(
                    id_expediente=idexp
                )

                db.add(exp)

                existentes_por_id[
                    idexp
                ] = exp

                creados += 1

            else:

                actualizados += 1

            # ------------------------------------------------
            # ESTADOS
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "estado_expediente",
                obtener_valor(
                    row,
                    "ESTADOEXPEDIENTE",
                )
            )

            _asignar_si_informado(
                exp,
                "estado_expediente_ancert",
                obtener_valor(
                    row,
                    "ESTADOEXPEDIENTEANCERT",
                )
            )

            # ------------------------------------------------
            # FECHAS
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "fecha_alta",
                convertir_fecha(
                    row.get(
                        columna_fecha_alta
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_firma",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAFIRMA",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_inscripcion",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAINSCRIPCION",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_entregado_cliente",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAENTREGADOCLIENTE",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_prevista_firma",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAPREVISTAFIRMA",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_vencimiento",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAVENCIMIENTO",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_sol_cgn",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHASOLCGN",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_firma_prev_val",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAFIRMAPREVVAL",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_firma_prev_cli",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAFIRMAPREVCLI",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_inicio_actividad",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAINICIOACTIVIDAD",
                    )
                )
            )

            _asignar_si_informado(
                exp,
                "fecha_fin_actividad",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FECHAFINACTIVIDAD",
                    )
                )
            )

            # Datos de seguimiento que pueden venir en la matriz ABSIS.
            valor_ultima_accion = obtener_valor(row, "ULTIMAACCION")
            if valor_ultima_accion is not None:
                _asignar_si_informado(
                    exp,
                    "ultima_accion",
                    str(valor_ultima_accion).strip()[:500] or None
                )
            fecha_ultima_accion = convertir_fecha(obtener_valor(row, "FECHAULTIMAACCION"))
            if fecha_ultima_accion is not None:
                _asignar_si_informado(
                    exp,
                    "fecha_ultima_accion",
                    fecha_ultima_accion
                )
            for campo, encabezado in (("sol", "SOL"), ("cs", "CS"), ("ns", "NS")):
                valor = obtener_valor(row, encabezado)
                if valor is not None:
                    setattr(exp, campo, str(valor).strip()[:100] or None)
            fecha_solicitud_pnc = convertir_fecha(obtener_valor(row, "FECHASOLICITUDPNC"))
            if fecha_solicitud_pnc is not None:
                _asignar_si_informado(
                    exp,
                    "fecha_solicitud_pnc",
                    fecha_solicitud_pnc
                )
            numero_solicitud_pnc = obtener_valor(row, "NUMEROSOLICITUDPNC")
            if numero_solicitud_pnc is not None:
                _asignar_si_informado(
                    exp,
                    "numero_solicitud_pnc",
                    str(numero_solicitud_pnc).strip()[:200] or None
                )

            # Importar las fechas de envío si están presentes en la matriz ABSIS.
            fecha_envio_notario = convertir_fecha(obtener_valor(row, "FECHAENVIONOTARIO"))
            if fecha_envio_notario is not None:
                _asignar_si_informado(
                    exp,
                    "fecha_envio_notario",
                    fecha_envio_notario
                )
            fecha_envio = convertir_fecha(obtener_valor(row, "FECHAENVIO"))
            if fecha_envio is not None:
                _asignar_si_informado(
                    exp,
                    "fecha_envio",
                    fecha_envio
                )

            _asignar_si_informado(
                exp,
                "fcierre_defecto",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "FCIERREDEFECTO",
                    )
                )
            )

            # ------------------------------------------------
            # ACTIVIDAD
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "actividad_actual",
                obtener_valor(
                    row,
                    "ACTIVIDADACTUAL",
                )
            )

            _asignar_si_informado(
                exp,
                "estado_actividad",
                obtener_valor(
                    row,
                    "ESTADOACTIVIDAD",
                )
            )

            # ------------------------------------------------
            # SOLICITANTE
            # ------------------------------------------------

            valor = obtener_valor(row, "NOMBRESOLICITANTE")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "nombre_solicitante",
                    valor
                )

            valor = obtener_valor(row, "NIFSOLICITANTE")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "nif_solicitante",
                    valor
                )

            # ------------------------------------------------
            # TITULAR
            # ------------------------------------------------

            valor = obtener_valor(row, "NOMBRETITULAR")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "nombre_titular",
                    valor
                )

            valor = obtener_valor(row, "NIFTITULAR")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "nif_titular",
                    valor
                )

            # ------------------------------------------------
            # APODERADO
            # ------------------------------------------------

            valor = obtener_valor(row, "APODERADO")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "apoderado",
                    valor
                )

            # ------------------------------------------------
            # NOTARIO
            # ------------------------------------------------

            valor = obtener_valor(row, "NOMBRENOTARIO")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "nombre_notario",
                    valor
                )

            valor = obtener_valor(row, "NIFNOTARIO")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "nif_notario",
                    valor
                )

            valor = obtener_valor(row, "NOTARIO", "NOMBRENOTARIO")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "notario",
                    valor
                )

            # Campos de firma/documento que ABSIS pueda aportar. Solo se
            # actualizan si vienen informados para no borrar datos operativos.
            for campo, encabezado in (
                ("tipo_firma", "TIPOFIRMA"),
                ("tipo_documento", "TIPODOCUMENTO"),
                ("idioma_documento", "IDIOMADOCUMENTO"),
                ("formato_escritura", "FORMATOESCRITURA"),
                ("tipo_tramite", "TIPOTRAMITE"),
                ("poblacion", "POBLACION"),
                ("provincia", "PROVINCIA"),
            ):
                valor = obtener_valor(row, encabezado)
                if valor is not None:
                    setattr(exp, campo, str(valor).strip() or None)

            # Vincular los IDs de catálogo además de conservar el texto de ABSIS.
            vincular_catalogos_expediente(
                exp, row, notarios_catalogo, empleados_catalogo
            )

            # ------------------------------------------------
            # OFICINA
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "oficina",
                obtener_valor(
                    row,
                    "OFICINA",
                )
            )

            _asignar_si_informado(
                exp,
                "oficina_alta",
                obtener_valor(
                    row,
                    "OFICINAALTA",
                )
            )

            _asignar_si_informado(
                exp,
                "dan",
                obtener_valor(
                    row,
                    "DAN",
                )
            )

            # ------------------------------------------------
            # ECONÓMICOS
            # ------------------------------------------------

            valor = convertir_numero(obtener_valor(row, "CAPITAL"))
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "capital",
                    valor
                )

            valor = convertir_numero(obtener_valor(row, "IMPORTE"))
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "importe",
                    valor
                )

            valor = convertir_numero(obtener_valor(row, "SALDOREAL"))
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "saldo_real",
                    valor
                )

            valor = convertir_numero(obtener_valor(row, "SALDODISPONIBLE"))
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "saldo_disponible",
                    valor
                )

            # ------------------------------------------------
            # PROVISIÓN
            # ------------------------------------------------

            valor = obtener_valor(row, "IDPROVISION")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "id_provision",
                    valor
                )

            valor = obtener_valor(row, "TIPOPROVISION")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "tipo_provision",
                    valor
                )

            # ------------------------------------------------
            # OPERACIÓN
            # ------------------------------------------------

            valor = obtener_valor(row, "CONTRATO")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "contrato",
                    valor
                )

            valor = obtener_valor(row, "NUMSOLICITUDSIA")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "num_solicitud_sia",
                    valor
                )

            valor = obtener_valor(row, "TIPOOPERACION")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "tipo_operacion",
                    valor
                )

            valor = obtener_valor(row, "SUBTIPOOPERACION")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "subtipo_operacion",
                    valor
                )

            _asignar_si_informado(
                exp,
                "vinccanc",
                obtener_valor(
                    row,
                    "VINCCANC",
                )
            )

            _asignar_si_informado(
                exp,
                "protocolo",
                obtener_valor(
                    row,
                    "PROTOCOLO",
                )
            )

            # ------------------------------------------------
            # GTG / BANKIA
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "origen_bankia",
                obtener_valor(
                    row,
                    "ORIGENBANKIA",
                )
            )

            _asignar_si_informado(
                exp,
                "producto_gtg",
                obtener_valor(
                    row,
                    "PRODUCTOGTG",
                )
            )

            _asignar_si_informado(
                exp,
                "dt",
                obtener_valor(
                    row,
                    "DT",
                )
            )

            # ------------------------------------------------
            # GESTORÍA
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "id_gestoria_tramite",
                obtener_valor(
                    row,
                    "IDGESTORIATRAMITE",
                )
            )

            _asignar_si_informado(
                exp,
                "nombre_gestoria",
                obtener_valor(
                    row,
                    "NOMBREGESTORIA",
                )
            )

            _asignar_si_informado(
                exp,
                "gestoria",
                obtener_valor(
                    row,
                    "GESTORIA",
                    "NOMBREGESTORIA",
                )
            )

            # ------------------------------------------------
            # FINCA
            # ------------------------------------------------

            valor = obtener_valor(row, "FINCA")
            if valor is not None:
                _asignar_si_informado(
                    exp,
                    "finca",
                    valor
                )

            # Crear/actualizar el vínculo finca-registro si ABSIS aporta
            # columnas registrales explícitas; nunca borrar fincas existentes.
            importar_finca_relacionada(db, exp, row)

            # ------------------------------------------------
            # DEFECTOS
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "tiene_defectos_abiertos",
                obtener_valor(
                    row,
                    "TIENEDEFECTOSABIERTOS",
                )
            )

            _asignar_si_informado(
                exp,
                "tipo_error",
                obtener_valor(
                    row,
                    "TIPOERROR",
                )
            )

            _asignar_si_informado(
                exp,
                "descripcion_error",
                obtener_valor(
                    row,
                    "DESCRIPCIONERROR",
                )
            )

            # ABSIS: FALTADEFECTO es un indicador SI/NO, no una fecha.
            # Normalizamos espacios y mayúsculas para que los filtros sean fiables.
            falta_defecto = obtener_valor(row, "FALTADEFECTO")
            if falta_defecto is not None:
                falta_defecto = str(falta_defecto).strip().upper()
                if falta_defecto not in ("SI", "NO"):
                    falta_defecto = str(obtener_valor(row, "FALTADEFECTO")).strip()
            _asignar_si_informado(
                exp,
                "falta_defecto",
                falta_defecto or None
            )

            # ------------------------------------------------
            # CGN
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "id_expediente_cgn",
                obtener_valor(
                    row,
                    "IDEXPEDIENTECGN",
                )
            )

            # ------------------------------------------------
            # ACTA
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "tipo_acta",
                obtener_valor(
                    row,
                    "TIPOACTA",
                )
            )

            # ------------------------------------------------
            # OTROS
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "lucy",
                obtener_valor(
                    row,
                    "LUCY",
                )
            )

            _asignar_si_informado(
                exp,
                "indicador_tt",
                obtener_valor(
                    row,
                    "INDICADORTT",
                )
            )

            # ------------------------------------------------
            # OBSERVACIONES
            # ------------------------------------------------

            valor_observaciones = obtener_valor(
                row,
                "OBSERVACIONES",
                "OBSERVACION",
                "OBSERVACIÓN",
                "OBSERVACIONS",
                "OBSERVATION",
                "OBSERVACIONES EXPEDIENTE",
                "OBSERVACION EXPEDIENTE",
                "OBSERVACIONES DEL EXPEDIENTE",
                "OBSERVACION DEL EXPEDIENTE",
            )

            # No borrar el dato que ya existe en la base de datos si la
            # fila del Excel no trae observaciones o viene vacía.
            # El modelo limita el campo a 2.000 caracteres.
            if valor_observaciones is not None:
                _asignar_si_informado(
                    exp,
                    "observaciones",
                    str(valor_observaciones).strip()[:2000]
                )

            # ------------------------------------------------
            # FACTURACIÓN
            # ------------------------------------------------

            for campo, encabezado in (
                ("facturacion_nombre", "FACTURACIONNOMBRE"),
                ("facturacion_apellidos", "FACTURACIONAPELLIDOS"),
                ("facturacion_dni_nif", "FACTURACIONDNINIF"),
                ("facturacion_direccion", "FACTURACIONDIRECCION"),
                ("facturacion_codigo_postal", "FACTURACIONCODIGOPOSTAL"),
                ("facturacion_poblacion", "FACTURACIONPOBLACION"),
                ("facturacion_provincia", "FACTURACIONPROVINCIA"),
                ("facturacion_telefono", "FACTURACIONTELEFONO"),
                ("facturacion_email", "FACTURACIONEMAIL"),
                ("facturacion_estado", "FACTURACIONESTADO"),
            ):
                valor = obtener_valor(row, encabezado)
                if valor is not None:
                    setattr(exp, campo, str(valor).strip() or None)

            facturacion_fecha = convertir_fecha(obtener_valor(row, "FACTURACIONFECHA"))
            if facturacion_fecha is not None:
                _asignar_si_informado(
                    exp,
                    "facturacion_fecha",
                    facturacion_fecha
                )

            # ------------------------------------------------
            # REGISTRAL
            # ------------------------------------------------

            _asignar_si_informado(
                exp,
                "registral_estado",
                obtener_valor(
                    row,
                    "REGISTRALESTADO",
                )
            )

            _asignar_si_informado(
                exp,
                "registral_fecha",
                convertir_fecha(
                    obtener_valor(
                        row,
                        "REGISTRALFECHA",
                    )
                )
            )

            # Reparto inicial de expedientes nuevos o todavía sin responsable.
            if not getattr(exp, "gestor_asignado_id", None):
                actividad_reparto = resolver_key_actividad(exp.actividad_actual, exp.fecha_firma)
                if actividad_reparto:
                    asignar_gestor_automaticamente(db, exp, actividad_reparto, "alta_importacion")

            procesados += 1

            # ------------------------------------------------
            # PROGRESO
            # ------------------------------------------------

            if (
                procesados % 25 == 0
                or procesados == total_filtrados
            ):

                print(
                    f"PROGRESO: "
                    f"{procesados}/{total_filtrados} "
                    f"| creados={creados} "
                    f"| actualizados={actualizados} "
                    f"| errores={errores}",
                    flush=True,
                )

            # ------------------------------------------------
            # COMMIT CADA 200
            # ------------------------------------------------

            if procesados % BATCH_SIZE == 0:

                print(
                    f"IMPORTADOR: "
                    f"commit lote "
                    f"{procesados // BATCH_SIZE}",
                    flush=True,
                )

                db.commit()

        except Exception as e:

            errores += 1

            print(
                f"ERROR PROCESANDO EXPEDIENTE "
                f"{idexp}: {e}",
                flush=True,
            )

            db.rollback()

            # Después del rollback volvemos a cargar
            # los existentes para evitar objetos inválidos.

            existentes_por_id = {}

            try:

                existentes_db = (
                    db.query(Expediente)
                    .filter(
                        Expediente.id_expediente.in_(
                            ids_excel
                        )
                    )
                    .all()
                )

                for expediente_db in existentes_db:

                    clave = limpiar_texto(
                        expediente_db.id_expediente
                    )

                    if clave:

                        existentes_por_id[
                            clave
                        ] = expediente_db

            except Exception as reconstruccion_error:

                print(
                    "ERROR RECONSTRUYENDO MAPA: "
                    f"{reconstruccion_error}",
                    flush=True,
                )

                raise

    # ========================================================
    # 13) COMMIT FINAL
    # ========================================================

    print(
        "IMPORTADOR: commit final...",
        flush=True,
    )

    try:

        db.commit()

    except Exception as e:

        print(
            f"ERROR EN COMMIT FINAL: {e}",
            flush=True,
        )

        db.rollback()

        raise

    # ========================================================
    # 14) RESULTADO
    # ========================================================

    print("============================================", flush=True)
    print("IMPORTADOR ABSIS - FINALIZADO", flush=True)

    print(
        f"FECHA: {fecha_objetivo}",
        flush=True,
    )

    print(
        f"FILAS ENCONTRADAS: {total_filtrados}",
        flush=True,
    )

    print(
        f"PROCESADOS: {procesados}",
        flush=True,
    )

    print(
        f"CREADOS: {creados}",
        flush=True,
    )

    print(
        f"ACTUALIZADOS: {actualizados}",
        flush=True,
    )

    print(
        f"ERRORES: {errores}",
        flush=True,
    )

    print("============================================", flush=True)

    return {
        "creados": creados,
        "actualizados": actualizados,
        "errores": errores,
        "fecha_importada": fecha_objetivo.isoformat(),
        "total_filtrados": total_filtrados,
        "total_procesados": procesados,
    }

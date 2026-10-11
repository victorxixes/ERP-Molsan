import io
import unicodedata
from datetime import date, datetime
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.expedientes.models import Expediente


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

            exp.estado_expediente = obtener_valor(
                row,
                "ESTADOEXPEDIENTE",
            )

            exp.estado_expediente_ancert = obtener_valor(
                row,
                "ESTADOEXPEDIENTEANCERT",
            )

            # ------------------------------------------------
            # FECHAS
            # ------------------------------------------------

            exp.fecha_alta = convertir_fecha(
                row.get(
                    columna_fecha_alta
                )
            )

            exp.fecha_firma = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAFIRMA",
                )
            )

            exp.fecha_inscripcion = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAINSCRIPCION",
                )
            )

            exp.fecha_entregado_cliente = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAENTREGADOCLIENTE",
                )
            )

            exp.fecha_prevista_firma = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAPREVISTAFIRMA",
                )
            )

            exp.fecha_vencimiento = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAVENCIMIENTO",
                )
            )

            exp.fecha_sol_cgn = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHASOLCGN",
                )
            )

            exp.fecha_firma_prev_val = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAFIRMAPREVVAL",
                )
            )

            exp.fecha_firma_prev_cli = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAFIRMAPREVCLI",
                )
            )

            exp.fecha_inicio_actividad = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAINICIOACTIVIDAD",
                )
            )

            exp.fecha_fin_actividad = convertir_fecha(
                obtener_valor(
                    row,
                    "FECHAFINACTIVIDAD",
                )
            )

            exp.fcierre_defecto = convertir_fecha(
                obtener_valor(
                    row,
                    "FCIERREDEFECTO",
                )
            )

            # ------------------------------------------------
            # ACTIVIDAD
            # ------------------------------------------------

            exp.actividad_actual = obtener_valor(
                row,
                "ACTIVIDADACTUAL",
            )

            exp.estado_actividad = obtener_valor(
                row,
                "ESTADOACTIVIDAD",
            )

            # ------------------------------------------------
            # SOLICITANTE
            # ------------------------------------------------

            exp.nombre_solicitante = obtener_valor(
                row,
                "NOMBRESOLICITANTE",
            )

            exp.nif_solicitante = obtener_valor(
                row,
                "NIFSOLICITANTE",
            )

            # ------------------------------------------------
            # TITULAR
            # ------------------------------------------------

            exp.nombre_titular = obtener_valor(
                row,
                "NOMBRETITULAR",
            )

            exp.nif_titular = obtener_valor(
                row,
                "NIFTITULAR",
            )

            # ------------------------------------------------
            # APODERADO
            # ------------------------------------------------

            exp.apoderado = obtener_valor(
                row,
                "APODERADO",
            )

            # ------------------------------------------------
            # NOTARIO
            # ------------------------------------------------

            exp.nombre_notario = obtener_valor(
                row,
                "NOMBRENOTARIO",
            )

            exp.nif_notario = obtener_valor(
                row,
                "NIFNOTARIO",
            )

            exp.notario = obtener_valor(
                row,
                "NOTARIO",
                "NOMBRENOTARIO",
            )

            # ------------------------------------------------
            # OFICINA
            # ------------------------------------------------

            exp.oficina = obtener_valor(
                row,
                "OFICINA",
            )

            exp.oficina_alta = obtener_valor(
                row,
                "OFICINAALTA",
            )

            exp.dan = obtener_valor(
                row,
                "DAN",
            )

            # ------------------------------------------------
            # ECONÓMICOS
            # ------------------------------------------------

            exp.capital = convertir_numero(
                obtener_valor(
                    row,
                    "CAPITAL",
                )
            )

            exp.importe = convertir_numero(
                obtener_valor(
                    row,
                    "IMPORTE",
                )
            )

            exp.saldo_real = convertir_numero(
                obtener_valor(
                    row,
                    "SALDOREAL",
                )
            )

            exp.saldo_disponible = convertir_numero(
                obtener_valor(
                    row,
                    "SALDODISPONIBLE",
                )
            )

            # ------------------------------------------------
            # PROVISIÓN
            # ------------------------------------------------

            exp.id_provision = obtener_valor(
                row,
                "IDPROVISION",
            )

            exp.tipo_provision = obtener_valor(
                row,
                "TIPOPROVISION",
            )

            # ------------------------------------------------
            # OPERACIÓN
            # ------------------------------------------------

            exp.contrato = obtener_valor(
                row,
                "CONTRATO",
            )

            exp.num_solicitud_sia = obtener_valor(
                row,
                "NUMSOLICITUDSIA",
            )

            exp.tipo_operacion = obtener_valor(
                row,
                "TIPOOPERACION",
            )

            exp.subtipo_operacion = obtener_valor(
                row,
                "SUBTIPOOPERACION",
            )

            exp.vinccanc = obtener_valor(
                row,
                "VINCCANC",
            )

            exp.protocolo = obtener_valor(
                row,
                "PROTOCOLO",
            )

            # ------------------------------------------------
            # GTG / BANKIA
            # ------------------------------------------------

            exp.origen_bankia = obtener_valor(
                row,
                "ORIGENBANKIA",
            )

            exp.producto_gtg = obtener_valor(
                row,
                "PRODUCTOGTG",
            )

            exp.dt = obtener_valor(
                row,
                "DT",
            )

            # ------------------------------------------------
            # GESTORÍA
            # ------------------------------------------------

            exp.id_gestoria_tramite = obtener_valor(
                row,
                "IDGESTORIATRAMITE",
            )

            exp.nombre_gestoria = obtener_valor(
                row,
                "NOMBREGESTORIA",
            )

            exp.gestoria = obtener_valor(
                row,
                "GESTORIA",
                "NOMBREGESTORIA",
            )

            # ------------------------------------------------
            # FINCA
            # ------------------------------------------------

            exp.finca = obtener_valor(
                row,
                "FINCA",
            )

            # ------------------------------------------------
            # DEFECTOS
            # ------------------------------------------------

            exp.tiene_defectos_abiertos = obtener_valor(
                row,
                "TIENEDEFECTOSABIERTOS",
            )

            exp.tipo_error = obtener_valor(
                row,
                "TIPOERROR",
            )

            exp.descripcion_error = obtener_valor(
                row,
                "DESCRIPCIONERROR",
            )

            exp.falta_defecto = obtener_valor(
                row,
                "FALTADEFECTO",
            )

            # ------------------------------------------------
            # CGN
            # ------------------------------------------------

            exp.id_expediente_cgn = obtener_valor(
                row,
                "IDEXPEDIENTECGN",
            )

            # ------------------------------------------------
            # ACTA
            # ------------------------------------------------

            exp.tipo_acta = obtener_valor(
                row,
                "TIPOACTA",
            )

            # ------------------------------------------------
            # OTROS
            # ------------------------------------------------

            exp.lucy = obtener_valor(
                row,
                "LUCY",
            )

            exp.indicador_tt = obtener_valor(
                row,
                "INDICADORTT",
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
                exp.observaciones = str(valor_observaciones).strip()[:2000]

            # ------------------------------------------------
            # FACTURACIÓN
            # ------------------------------------------------

            exp.facturacion_estado = obtener_valor(
                row,
                "FACTURACIONESTADO",
            )

            exp.facturacion_fecha = convertir_fecha(
                obtener_valor(
                    row,
                    "FACTURACIONFECHA",
                )
            )

            # ------------------------------------------------
            # REGISTRAL
            # ------------------------------------------------

            exp.registral_estado = obtener_valor(
                row,
                "REGISTRALESTADO",
            )

            exp.registral_fecha = convertir_fecha(
                obtener_valor(
                    row,
                    "REGISTRALFECHA",
                )
            )

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

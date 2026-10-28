"""Importador ABSIS Post Firma idempotente para consolidar gastos ERP.
La clave preferida es (IDGASTO, TIPOCONCEPTO); permite transición de históricos
sin TIPOCONCEPTO solo cuando la coincidencia por IDGASTO es inequívoca.
"""
import json
import unicodedata
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from io import BytesIO

import pandas as pd
from openpyxl import load_workbook
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.expedientes.models import Expediente
from backend.app.expedientes.gastos.models import ExpedienteGasto


# Encabezados oficiales del Excel ABSIS Post Firma (37 columnas).
# TIPOCONCEPTO e IDPAGO no forman parte del origen y no se inventan ni enlazan.
CABECERAS_REQUERIDAS = {
    "IDEXPEDIENTE", "FECHAALTA", "ORIGENBANKIA", "ACTIVIDADACTUAL",
    "ESTADOACTIVIDAD", "IDPROVISION", "IMPORTEPROVISION", "TIPOPROVISION",
    "DETALLEOPERACION", "TIPOOPERACION", "SUBTIPOOPERACION", "OFICINA", "DAN",
    "IDGESTORIATRAMITE", "NOMBREGESTORIA", "NOMBREDOCUMENTO", "IDGASTO",
    "CONCEPTOGASTO", "ESTADO", "ESTADOJUSTIFICANTE", "FECHAADJUNTARFACTURA",
    "IMPGASTO", "IMPBASEIMPUESTO", "IMPBASERETENCION", "IMPIMPUESTO",
    "FESTADO", "FPETICION", "FPAGO", "CTAORIGEN", "CTADESTINO", "FFACTURA",
    "FORMAPAGO", "NUMFACTURA", "IDBENEFICIARIO", "BENEFICIARIO",
    "NOMBREPAGADOR", "NIFPAGADOR",
}


def _norm_col(value):
    texto = str(value or "").strip().upper()
    return "".join(c for c in unicodedata.normalize("NFKD", texto)
                   if not unicodedata.combining(c)).replace(" ", "").replace("_", "").replace("-", "")


def _limpiar(value):
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    if isinstance(value, (datetime, date)):
        return value
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _texto(value):
    value = _limpiar(value)
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip() or None


def _fecha(value):
    value = _limpiar(value)
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    # Excel puede entregar seriales numéricos si la celda no tiene formato fecha.
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            numero = float(value)
            if 20000 <= numero <= 80000:
                return (datetime(1899, 12, 30) + timedelta(days=numero)).date()
        except (TypeError, ValueError, OverflowError):
            return None
    try:
        parsed = pd.to_datetime(value, dayfirst=True, errors="coerce")
        return None if pd.isna(parsed) else parsed.date()
    except Exception:
        return None


def _fecha_alta(value):
    """Interpreta FPAGO como fecha real o como número serial de Excel.

    En celdas con formato General, Excel puede entregar el serial numérico
    (días desde 1899-12-30) en lugar de un datetime.
    """
    value = _limpiar(value)
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            numero = float(value)
            # Intervalo razonable de seriales Excel (aprox. 1954–2119).
            if 20000 <= numero <= 80000:
                return (datetime(1899, 12, 30) + timedelta(days=numero)).date()
        except (TypeError, ValueError, OverflowError):
            return None
    return _fecha(value)


def _decimal(value):
    value = _limpiar(value)
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip().replace(" ", "")
        if not value:
            return None
        if "," in value:
            value = value.replace(".", "").replace(",", ".")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _json_value(value):
    value = _limpiar(value)
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    return value if isinstance(value, (str, int, float, bool)) else str(value)


def _valor_original_excel(celda):
    """Conserva el contenido original y máscaras simples visibles de Excel."""
    valor = celda.value
    if valor is None:
        return None
    formato = str(celda.number_format or "").strip()
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        # Ejemplo: el valor 0 con formato 0000000 se muestra como 0000000.
        # No reinterpretar formatos complejos ni alterar importes o fechas.
        if formato and all(caracter == "0" for caracter in formato):
            try:
                numero = int(valor)
                if float(valor) == numero:
                    return str(numero).zfill(len(formato))
            except (TypeError, ValueError, OverflowError):
                pass
    return _json_value(valor)


def importar_postfirma(db: Session, contenido_excel: bytes, nombre_archivo: str = ""):
    """Importa por lotes pequeños para evitar miles de consultas y transacciones gigantes.

    Cada lote se confirma por separado. Si el proceso se interrumpe, una nueva ejecución
    vuelve a detectar los IDGASTO ya guardados y continúa sin duplicarlos.
    """
    try:
        df = pd.read_excel(BytesIO(contenido_excel), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:
        raise ValueError(f"No se pudo leer el Excel Post Firma: {exc}")

    columnas = {_norm_col(c): c for c in df.columns}
    libro_original = load_workbook(BytesIO(contenido_excel), data_only=True, read_only=True)
    hoja_original = libro_original.worksheets[0]
    faltan = sorted(c for c in CABECERAS_REQUERIDAS if c not in columnas)
    if faltan:
        libro_original.close()
        raise ValueError("El Excel no parece ser el histórico Post Firma. Faltan columnas: " + ", ".join(faltan))

    TAMANO_LOTE = 500
    creados = actualizados = sin_id_gasto = sin_expediente = filas_vacias = 0
    duplicados_excel = 0
    claves_vistas = set()
    errores = []
    errores_total = 0

    def val(row, nombre):
        col = columnas.get(_norm_col(nombre))
        return _limpiar(row[col]) if col is not None else None

    try:
        # Iterador secuencial: en modo read_only, llamar cell() repetidamente
        # puede volver a recorrer el XML desde el principio y disparar el tiempo de lectura.
        filas_originales = hoja_original.iter_rows(min_row=2, max_col=len(df.columns), values_only=False)
        for inicio in range(0, len(df), TAMANO_LOTE):
            lote = df.iloc[inicio:inicio + TAMANO_LOTE]
            registros = []
            ids_lote = set()
            expedientes_lote = set()

            # Preparar solo el lote actual; no se retienen miles de objetos ORM ni
            # el listado completo de expedientes sin vínculo.
            for indice, row in lote.iterrows():
                fila_excel = int(indice) + 2
                celdas_originales = next(filas_originales, ())
                original = {
                    str(columna): _valor_original_excel(celdas_originales[posicion])
                    for posicion, columna in enumerate(df.columns)
                    if posicion < len(celdas_originales)
                }
                if not any(v is not None for v in original.values()):
                    filas_vacias += 1
                    continue

                id_gasto = _texto(val(row, "IDGASTO"))
                tipo_concepto = _texto(val(row, "TIPOCONCEPTO"))
                if not id_gasto:
                    sin_id_gasto += 1
                    errores_total += 1
                    if len(errores) < 200:
                        errores.append({"fila": fila_excel, "motivo": "IDGASTO vacío; fila omitida para evitar duplicados"})
                    continue
                clave_gasto = (id_gasto.casefold(), (tipo_concepto or "").casefold())
                if clave_gasto in claves_vistas:
                    duplicados_excel += 1
                    errores_total += 1
                    if len(errores) < 200:
                        errores.append({"fila": fila_excel, "motivo": "IDGASTO + TIPOCONCEPTO duplicados dentro del Excel; fila posterior omitida"})
                    continue
                claves_vistas.add(clave_gasto)
                ids_lote.add(id_gasto)

                numero_exp = _texto(val(row, "IDEXPEDIENTE"))
                if numero_exp:
                    expedientes_lote.add(numero_exp.casefold())
                registros.append({
                    "row": row,
                    "fila_excel": fila_excel,
                    "original": original,
                    "id_gasto": id_gasto,
                    "tipo_concepto": tipo_concepto,
                    "numero_exp": numero_exp,
                })

            if not registros:
                continue

            # Dos consultas por lote, en vez de dos consultas por cada fila.
            gastos_existentes_lista = (
                db.query(ExpedienteGasto)
                .filter(ExpedienteGasto.id_gasto_absis.in_(ids_lote)).all()
            )
            gastos_por_clave = {}
            gastos_por_id = {}
            for existente in gastos_existentes_lista:
                id_existente = str(existente.id_gasto_absis).strip().casefold()
                tipo_existente = str(existente.tipo_concepto_absis or "").strip().casefold()
                gastos_por_clave[(id_existente, tipo_existente)] = existente
                gastos_por_id.setdefault(id_existente, []).append(existente)
            expedientes_existentes = {}
            if expedientes_lote:
                expedientes_existentes = {
                    str(exp.id_expediente).casefold(): exp
                    for exp in db.query(Expediente)
                    .filter(func.lower(Expediente.id_expediente).in_(expedientes_lote)).all()
                    if exp.id_expediente is not None
                }

            for registro in registros:
                row = registro["row"]
                id_gasto = registro["id_gasto"]
                tipo_concepto = registro["tipo_concepto"]
                numero_exp = registro["numero_exp"]
                exp = expedientes_existentes.get(numero_exp.casefold()) if numero_exp else None

                clave = (id_gasto.casefold(), (tipo_concepto or "").casefold())
                gasto = gastos_por_clave.get(clave)
                # Históricos sin TIPOCONCEPTO: reutilizar solo si la coincidencia es única.
                if gasto is None and len(gastos_por_id.get(id_gasto.casefold(), [])) == 1:
                    candidato = gastos_por_id[id_gasto.casefold()][0]
                    if not candidato.tipo_concepto_absis:
                        gasto = candidato
                # Contar como no vinculado solo si no hay expediente ABSIS localizado
                # ni un gasto ERP previo que conserve ya el vínculo interno.
                if exp is None and (gasto is None or gasto.expediente_id is None):
                    sin_expediente += 1
                es_nuevo = gasto is None
                origen_previo = (str(getattr(gasto, "origen_registro", "") or "").strip().upper()) if gasto else None
                # Compatibilidad con gastos ERP anteriores a los campos de trazabilidad:
                # si ya están vinculados internamente y aún no tienen datos ABSIS, no pisar sus valores.
                es_gasto_erp = bool(gasto) and (
                    origen_previo == "ERP" or (
                        gasto.expediente_id is not None
                        and not getattr(gasto, "id_expediente_absis", None)
                        and not getattr(gasto, "datos_absis_json", None)
                    )
                )
                if es_nuevo:
                    gasto = ExpedienteGasto()
                    db.add(gasto)
                    gastos_por_clave[clave] = gasto
                    gastos_por_id.setdefault(id_gasto.casefold(), []).append(gasto)

                concepto = _texto(val(row, "CONCEPTOGASTO"))
                importe = _decimal(val(row, "IMPGASTO"))
                fecha_factura = _fecha(val(row, "FFACTURA"))
                fecha_adjuntar = _fecha(val(row, "FECHAADJUNTARFACTURA"))
                fecha_factura_absis = fecha_factura
                numero_factura_absis = _texto(val(row, "NUMFACTURA"))

                # Si el expediente todavía no se encuentra en ERP, conservar el vínculo
                # existente si lo había; nunca desasociar un gasto ERP por un Excel parcial.
                if exp is not None:
                    gasto.expediente_id = exp.id
                elif es_nuevo:
                    gasto.expediente_id = None
                gasto.id_gasto_absis = id_gasto
                gasto.id_expediente_absis = numero_exp
                gasto.tipo_concepto_absis = tipo_concepto
                gasto.origen_registro = "ERP" if es_gasto_erp else "ABSIS_POSTFIRMA"
                gasto.estado_consolidacion = "Consolidado" if es_gasto_erp else "Importado Post Firma"
                gasto.fecha_ultima_sincronizacion = date.today()
                gasto.tipo_operacion_absis = _texto(val(row, "TIPOOPERACION"))
                gasto.concepto_gasto_absis = concepto
                # El bloque ABSIS se conserva en sus campos propios; solo un gasto ABSIS
                # nuevo usa los campos base como compatibilidad con pantallas antiguas.
                if es_nuevo or not es_gasto_erp:
                    gasto.tipo = concepto or "Gasto ABSIS Post Firma"
                    gasto.descripcion = _texto(val(row, "DETALLEOPERACION")) or concepto
                    gasto.importe = importe
                    gasto.fecha = fecha_factura or fecha_adjuntar
                    gasto.fecha_factura = fecha_factura
                    gasto.numero_factura = numero_factura_absis
                gasto.imp_gasto = importe
                gasto.fecha_factura_absis = fecha_factura_absis
                gasto.fecha_adjuntar_factura = fecha_adjuntar
                gasto.numero_factura_absis = numero_factura_absis
                gasto.estado_absis = _texto(val(row, "ESTADO"))
                gasto.estado_justificante = _texto(val(row, "ESTADOJUSTIFICANTE"))
                gasto.imp_base_impuesto = _decimal(val(row, "IMPBASEIMPUESTO"))
                gasto.imp_base_retencion = _decimal(val(row, "IMPBASERETENCION"))
                gasto.imp_impuesto = _decimal(val(row, "IMPIMPUESTO"))
                gasto.fecha_estado = _fecha(val(row, "FESTADO"))
                gasto.fecha_peticion = _fecha(val(row, "FPETICION"))
                gasto.fecha_pago = _fecha(val(row, "FPAGO"))
                # Los campos generales del gasto pertenecen al ERP: solo se inicializan
                # en registros ABSIS nuevos/no ERP. Nunca se borra información existente.
                if es_nuevo or not es_gasto_erp:
                    gasto.pagador = _texto(val(row, "NOMBREPAGADOR"))
                    gasto.medio_pago = _texto(val(row, "FORMAPAGO"))
                    gasto.cuenta_bancaria = _texto(val(row, "CTAORIGEN"))
                # El JSON conserva íntegros los 37 campos de origen, incluido NIFPAGADOR,
                # BENEFICIARIO, CTADESTINO y metadatos que aún no tienen columna propia.
                gasto.datos_absis_json = json.dumps(registro["original"], ensure_ascii=False, default=str)

                if es_nuevo:
                    creados += 1
                else:
                    actualizados += 1

            # Commit incremental: los lotes confirmados sobreviven a un reinicio.
            # Al reintentar, IDGASTO permite actualizar en vez de duplicar.
            db.commit()
            db.expunge_all()

    except Exception:
        db.rollback()
        raise
    finally:
        libro_original.close()

    return {
        "ok": True,
        "archivo": nombre_archivo,
        "filas_excel": int(len(df)),
        "creados": creados,
        "actualizados": actualizados,
        "sin_id_gasto": sin_id_gasto,
        "duplicados_en_excel": duplicados_excel,
        "sin_expediente_vinculado": sin_expediente,
        "filas_vacias": filas_vacias,
        "errores": errores,
        "errores_total": errores_total,
        "total_procesados": creados + actualizados,
        "nota": "Importación por lotes idempotente por IDGASTO + TIPOCONCEPTO cuando existe; no se ha creado ningún expediente.",
    }


def validar_postfirma(
    db: Session,
    contenido_excel: bytes,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
):
    """Valida el Excel sin escribir datos y devuelve solo métricas agregadas."""
    try:
        df = pd.read_excel(BytesIO(contenido_excel), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:
        raise ValueError(f"No se pudo leer el Excel Post Firma: {exc}")

    columnas = {_norm_col(c): c for c in df.columns}
    faltan = sorted(c for c in CABECERAS_REQUERIDAS if c not in columnas)
    if "FPAGO" not in columnas:
        faltan.append("FPAGO")
    if faltan:
        raise ValueError("Faltan columnas requeridas: " + ", ".join(sorted(set(faltan))))
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise ValueError("La fecha desde no puede ser posterior a la fecha hasta.")

    def celda(row, nombre):
        col = columnas.get(_norm_col(nombre))
        return _limpiar(row[col]) if col is not None else None

    # El filtro se aplica por FPAGO (fecha efectiva del pago), conservando
    # cada movimiento individual y sin agrupar por expediente.
    filas_excel_total = int(len(df))
    fechas_pago = df[columnas["FPAGO"]].map(_fecha_alta)
    fpago_sin_fecha = int(fechas_pago.isna().sum())
    if fecha_desde or fecha_hasta:
        def dentro_periodo(valor):
            if valor is None:
                return False
            if fecha_desde and valor < fecha_desde:
                return False
            if fecha_hasta and valor > fecha_hasta:
                return False
            return True

        mascara = fechas_pago.map(dentro_periodo)
        filas_dentro_periodo = int(mascara.sum())
        df = df.loc[mascara].copy()
        filas_fuera_periodo = filas_excel_total - filas_dentro_periodo
    else:
        # Sin fechas seleccionadas se analiza todo el Excel, incluidos movimientos
        # con FPAGO vacío/inválido, que se mantienen identificados como incidencias.
        filas_dentro_periodo = filas_excel_total
        filas_fuera_periodo = 0

    total_importe = Decimal("0")
    filas_con_importe = 0
    importes_invalidos = 0
    claves_gasto = []
    ids_gasto = []
    ids_vacios = 0
    expedientes_excel = set()
    filas_no_vacias = 0
    estados = {}
    clasificaciones = {}
    fechas_factura_validas = 0
    fechas_factura_vacias = 0
    fechas_adjuntar_validas = 0
    fechas_adjuntar_vacias = 0

    for _, row in df.iterrows():
        if not any(_limpiar(row[c]) is not None for c in df.columns):
            continue
        filas_no_vacias += 1
        id_gasto = _texto(celda(row, "IDGASTO"))
        tipo_concepto = _texto(celda(row, "TIPOCONCEPTO"))
        if not id_gasto:
            ids_vacios += 1
        else:
            ids_gasto.append(id_gasto.casefold())
            claves_gasto.append((id_gasto.casefold(), (tipo_concepto or "").casefold()))

        numero_exp = _texto(celda(row, "IDEXPEDIENTE"))
        if numero_exp:
            expedientes_excel.add(numero_exp.casefold())

        estado = _texto(celda(row, "ESTADO")) or "(vacío)"
        estados[estado] = estados.get(estado, {"filas": 0, "importe": Decimal("0")})
        estados[estado]["filas"] += 1
        importe = _decimal(celda(row, "IMPGASTO"))
        if importe is None:
            if _limpiar(celda(row, "IMPGASTO")) is not None:
                importes_invalidos += 1
        else:
            filas_con_importe += 1
            total_importe += importe
            estados[estado]["importe"] += importe

        tipo = _normalizar_tipo = _norm_col(celda(row, "TIPOOPERACION") or "")
        if "CANCELACIONSINPROVISION" in tipo:
            clase = "sin_provision"
        elif "CANCELACIONCONPROVISION" in tipo:
            clase = "con_provision"
        else:
            clase = "otros"
        clasificaciones[clase] = clasificaciones.get(clase, {"filas": 0, "importe": Decimal("0")})
        clasificaciones[clase]["filas"] += 1
        if importe is not None:
            clasificaciones[clase]["importe"] += importe

        f_factura = _limpiar(celda(row, "FFACTURA"))
        f_adjuntar = _limpiar(celda(row, "FECHAADJUNTARFACTURA"))
        if _fecha(f_factura):
            fechas_factura_validas += 1
        else:
            fechas_factura_vacias += 1
        if _fecha(f_adjuntar):
            fechas_adjuntar_validas += 1
        else:
            fechas_adjuntar_vacias += 1

    from collections import Counter
    conteo_claves = Counter(claves_gasto)
    duplicados_archivo = sum(1 for n in conteo_claves.values() if n > 1)
    duplicados_filas = sum(n - 1 for n in conteo_claves.values() if n > 1)
    existentes = {
        (str(fila[0]).strip().casefold(), str(fila[1] or "").strip().casefold())
        for fila in db.query(
            ExpedienteGasto.id_gasto_absis,
            ExpedienteGasto.tipo_concepto_absis,
        ).filter(ExpedienteGasto.id_gasto_absis.isnot(None)).all()
        if fila[0] is not None
    }
    coincidencias = sum(1 for valor in set(claves_gasto) if valor in existentes)
    ids_expedientes_erp = {
        str(v[0]).casefold()
        for v in db.query(Expediente.id_expediente).all()
        if v[0] is not None
    }
    sin_vinculo = sum(1 for numero in expedientes_excel if numero not in ids_expedientes_erp)

    def resumen_grupos(grupos):
        return {
            k: {"filas": v["filas"], "importe_imp_gasto": str(v["importe"].quantize(Decimal("0.01")))}
            for k, v in sorted(grupos.items())
        }

    return {
        "validacion_sin_escritura": True,
        "columnas_detectadas": [str(c) for c in columnas.values()],
        "columna_filtro_fecha": "FPAGO",
        "fecha_desde": fecha_desde.isoformat() if fecha_desde else None,
        "fecha_hasta": fecha_hasta.isoformat() if fecha_hasta else None,
        "filas_excel": filas_excel_total,
        "filas_dentro_periodo": filas_dentro_periodo,
        "filas_fuera_periodo": filas_fuera_periodo,
        "fpago_sin_fecha_o_invalida": fpago_sin_fecha,
        "filas_analizadas": int(len(df)),
        "filas_con_datos": filas_no_vacias,
        "ids_gasto_unicos": len(set(ids_gasto)),
        "claves_correlacion_unicas": len(set(claves_gasto)),
        "idgasto_vacios": ids_vacios,
        "ids_duplicados_en_excel": duplicados_archivo,
        "filas_duplicadas_adicionales": duplicados_filas,
        "idgasto_ya_existentes_en_erp": coincidencias,
        "expedientes_absis_distintos_sin_vinculo": sin_vinculo,
        "filas_con_importe_valido": filas_con_importe,
        "importes_no_interpretables": importes_invalidos,
        "suma_imp_gasto": str(total_importe.quantize(Decimal("0.01"))),
        "ffactura_con_fecha": fechas_factura_validas,
        "ffactura_sin_fecha": fechas_factura_vacias,
        "fecha_adjuntar_con_fecha": fechas_adjuntar_validas,
        "fecha_adjuntar_sin_fecha": fechas_adjuntar_vacias,
        "por_estado_absis": resumen_grupos(estados),
        "por_tipo_cancelacion": resumen_grupos(clasificaciones),
        "nota_privacidad": "No se devuelven identificadores, nombres, NIF, cuentas bancarias ni filas individuales. No se guardan cambios.",
    }

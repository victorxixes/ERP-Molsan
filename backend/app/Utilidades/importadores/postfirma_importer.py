"""Importador histórico ABSIS de gastos Post Firma.

Separado del importador de expedientes: no filtra por FECHAALTA ni modifica la ficha
del expediente. IDGASTO se usa como clave de actualización cuando está disponible.
"""
import json
import unicodedata
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

import pandas as pd
from openpyxl import load_workbook
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.expedientes.models import Expediente
from backend.app.expedientes.gastos.models import ExpedienteGasto


CABECERAS_REQUERIDAS = {
    "IDEXPEDIENTE", "IDGASTO", "CONCEPTOGASTO", "ESTADO", "IMPGASTO",
    "FFACTURA", "FECHAADJUNTARFACTURA", "TIPOOPERACION",
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
    try:
        parsed = pd.to_datetime(value, dayfirst=True, errors="coerce")
        return None if pd.isna(parsed) else parsed.date()
    except Exception:
        return None


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
    try:
        df = pd.read_excel(BytesIO(contenido_excel), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:
        raise ValueError(f"No se pudo leer el Excel Post Firma: {exc}")

    columnas = {_norm_col(c): c for c in df.columns}
    libro_original = load_workbook(BytesIO(contenido_excel), data_only=True, read_only=True)
    hoja_original = libro_original.worksheets[0]
    faltan = sorted(c for c in CABECERAS_REQUERIDAS if c not in columnas)
    if faltan:
        raise ValueError("El Excel no parece ser el histórico Post Firma. Faltan columnas: " + ", ".join(faltan))

    creados = actualizados = sin_id_gasto = sin_expediente = filas_vacias = 0
    ids_vistos = set()
    errores = []
    resumen_vinculos = []

    for indice, row in df.iterrows():
        fila_excel = indice + 2  # primera fila de datos, tras la cabecera
        original = {
            str(columna): _valor_original_excel(hoja_original.cell(row=fila_excel, column=posicion + 1))
            for posicion, columna in enumerate(df.columns)
        }
        if not any(v is not None for v in original.values()):
            filas_vacias += 1
            continue

        def val(nombre):
            col = columnas.get(_norm_col(nombre))
            return _limpiar(row[col]) if col is not None else None

        id_gasto = _texto(val("IDGASTO"))
        if not id_gasto:
            sin_id_gasto += 1
            errores.append({"fila": int(indice) + 2, "motivo": "IDGASTO vacío; fila omitida para evitar duplicados"})
            continue
        if id_gasto in ids_vistos:
            errores.append({"fila": int(indice) + 2, "id_gasto": id_gasto, "motivo": "IDGASTO duplicado dentro del Excel; fila posterior omitida"})
            continue
        ids_vistos.add(id_gasto)

        numero_exp = _texto(val("IDEXPEDIENTE"))
        exp = None
        if numero_exp:
            exp = db.query(Expediente).filter(
                func.lower(Expediente.id_expediente) == numero_exp.casefold()
            ).first()
        if exp is None:
            sin_expediente += 1
            resumen_vinculos.append({"fila": int(indice) + 2, "id_gasto": id_gasto, "id_expediente_absis": numero_exp})

        gasto = db.query(ExpedienteGasto).filter(ExpedienteGasto.id_gasto_absis == id_gasto).first()
        es_nuevo = gasto is None
        if es_nuevo:
            gasto = ExpedienteGasto()
            db.add(gasto)

        concepto = _texto(val("CONCEPTOGASTO"))
        importe = _decimal(val("IMPGASTO"))
        fecha_factura = _fecha(val("FFACTURA"))
        fecha_adjuntar = _fecha(val("FECHAADJUNTARFACTURA"))
        fecha_pago = _fecha(val("FPAGO"))
        fecha_estado = _fecha(val("FESTADO"))
        fecha_peticion = _fecha(val("FPETICION"))

        gasto.expediente_id = exp.id if exp else None
        gasto.id_gasto_absis = id_gasto
        gasto.id_expediente_absis = numero_exp
        gasto.tipo_operacion_absis = _texto(val("TIPOOPERACION"))
        gasto.concepto_gasto_absis = concepto
        gasto.tipo = concepto or "Gasto ABSIS Post Firma"
        gasto.descripcion = _texto(val("DETALLEOPERACION")) or concepto
        gasto.importe = importe
        gasto.imp_gasto = importe
        gasto.fecha = fecha_factura or fecha_adjuntar
        gasto.fecha_factura = fecha_factura
        gasto.fecha_adjuntar_factura = fecha_adjuntar
        gasto.numero_factura = _texto(val("NUMFACTURA"))
        gasto.estado_absis = _texto(val("ESTADO"))
        gasto.estado_justificante = _texto(val("ESTADOJUSTIFICANTE"))
        gasto.imp_base_impuesto = _decimal(val("IMPBASEIMPUESTO"))
        gasto.imp_base_retencion = _decimal(val("IMPBASERETENCION"))
        gasto.imp_impuesto = _decimal(val("IMPIMPUESTO"))
        gasto.fecha_estado = fecha_estado
        gasto.fecha_peticion = fecha_peticion
        gasto.fecha_pago = fecha_pago
        gasto.pagador = _texto(val("NOMBREPAGADOR"))
        gasto.nif_notario = None
        gasto.medio_pago = _texto(val("FORMAPAGO"))
        gasto.cuenta_bancaria = _texto(val("CTAORIGEN"))
        gasto.datos_absis_json = json.dumps(original, ensure_ascii=False, default=str)

        if es_nuevo:
            creados += 1
        else:
            actualizados += 1

        if (creados + actualizados) % 500 == 0:
            db.flush()

    db.commit()
    return {
        "ok": True,
        "archivo": nombre_archivo,
        "filas_excel": int(len(df)),
        "creados": creados,
        "actualizados": actualizados,
        "sin_id_gasto": sin_id_gasto,
        "sin_expediente_vinculado": sin_expediente,
        "filas_vacias": filas_vacias,
        "errores": errores[:200],
        "errores_total": len(errores),
        "expedientes_no_vinculados": resumen_vinculos[:200],
        "expedientes_no_vinculados_total": len(resumen_vinculos),
        "total_procesados": creados + actualizados,
        "nota": "Importación confirmada por IDGASTO; no se ha modificado ni creado ningún expediente.",
    }



def validar_postfirma(db: Session, contenido_excel: bytes):
    """Valida el Excel sin escribir datos y devuelve solo métricas agregadas."""
    try:
        df = pd.read_excel(BytesIO(contenido_excel), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:
        raise ValueError(f"No se pudo leer el Excel Post Firma: {exc}")

    columnas = {_norm_col(c): c for c in df.columns}
    faltan = sorted(c for c in CABECERAS_REQUERIDAS if c not in columnas)
    if faltan:
        raise ValueError("Faltan columnas requeridas: " + ", ".join(faltan))

    def celda(row, nombre):
        col = columnas.get(_norm_col(nombre))
        return _limpiar(row[col]) if col is not None else None

    total_importe = Decimal("0")
    filas_con_importe = 0
    importes_invalidos = 0
    ids = []
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
        if not id_gasto:
            ids_vacios += 1
        else:
            ids.append(id_gasto)

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
    conteo_ids = Counter(ids)
    duplicados_archivo = sum(1 for n in conteo_ids.values() if n > 1)
    duplicados_filas = sum(n - 1 for n in conteo_ids.values() if n > 1)
    existentes = {
        str(v[0]).strip()
        for v in db.query(ExpedienteGasto.id_gasto_absis)
        .filter(ExpedienteGasto.id_gasto_absis.isnot(None)).all()
        if v[0] is not None
    }
    coincidencias = sum(1 for valor in set(ids) if valor in existentes)
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
        "filas_excel": int(len(df)),
        "filas_con_datos": filas_no_vacias,
        "ids_gasto_unicos": len(set(ids)),
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

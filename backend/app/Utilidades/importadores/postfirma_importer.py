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


def importar_postfirma(db: Session, contenido_excel: bytes, nombre_archivo: str = ""):
    try:
        df = pd.read_excel(BytesIO(contenido_excel), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:
        raise ValueError(f"No se pudo leer el Excel Post Firma: {exc}")

    columnas = {_norm_col(c): c for c in df.columns}
    faltan = sorted(c for c in CABECERAS_REQUERIDAS if c not in columnas)
    if faltan:
        raise ValueError("El Excel no parece ser el histórico Post Firma. Faltan columnas: " + ", ".join(faltan))

    creados = actualizados = sin_id_gasto = sin_expediente = filas_vacias = 0
    ids_vistos = set()
    errores = []
    resumen_vinculos = []

    for indice, row in df.iterrows():
        original = {str(c): _json_value(row[c]) for c in df.columns}
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
        gasto.pagad or None
        gasto.pagad or None
        gasto.pagad or None
        gasto.pagad or None
        gasto.pagador = _texto(val("NOMBREPAGADOR"))
        gasto.nif_notario = None
        gasto.medio_pago = _texto(val("FORMAPAGO"))
        gasto.cuenta_bancaria = _texto(val("CTAORIGEN"))
        gasto.datos_absis_json = json.dumps(original, ensure_ascii=False, default=str)
        gasto.estado_pago = "Pagado" if fecha_pago else (gasto.estado_pago or "Pendiente")

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

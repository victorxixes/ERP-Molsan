from __future__ import annotations

from datetime import date
from decimal import Decimal
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.gastos.models import ExpedienteGasto

router = APIRouter(prefix="/informes", tags=["Informes"], dependencies=[Depends(get_current_user)])

def _concepto_honorarios(gasto):
    valores = [getattr(gasto, "tipo", None), getattr(gasto, "descripcion", None)]
    return any(str(v or "").strip().casefold() == "honorarios gestoría" for v in valores)

def _tipo_cancelacion(exp):
    valor = str(getattr(exp, "tipo_operacion", None) or "").strip().casefold()
    compacto = valor.replace("ó", "o").replace("í", "i")
    if "sin provision" in compacto:
        return "sin_provision"
    if "con provision" in compacto:
        return "con_provision"
    # Fallback ABSIS: P = provisión, E = encargo. No se infiere a partir del importe.
    provision = str(getattr(exp, "tipo_provision", None) or "").strip().upper()
    if provision == "P":
        return "con_provision"
    if provision == "E" and "cancelacion" in compacto:
        return "sin_provision"
    return "sin_clasificar"

def _fecha_iso(valor):
    return valor.isoformat() if valor else None

def _decimal(valor):
    if valor is None:
        return None
    try:
        return float(Decimal(str(valor)))
    except Exception:
        return None

def _consultar(db, fecha_desde=None, fecha_hasta=None, tipo_operacion=None, estado=None, q=None, modalidad="todas"):
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise HTTPException(status_code=400, detail="La fecha desde no puede ser posterior a la fecha hasta.")
    query = db.query(ExpedienteGasto, Expediente).join(
        Expediente, Expediente.id == ExpedienteGasto.expediente_id
    )
    query = query.filter(
        (ExpedienteGasto.tipo.ilike("honorarios gestoría")) |
        (ExpedienteGasto.descripcion.ilike("honorarios gestoría"))
    )
    if fecha_desde:
        query = query.filter(ExpedienteGasto.fecha_factura >= fecha_desde)
    if fecha_hasta:
        query = query.filter(ExpedienteGasto.fecha_factura <= fecha_hasta)
    if tipo_operacion:
        query = query.filter(Expediente.tipo_operacion.ilike(f"%{tipo_operacion.strip()}%"))
    if estado:
        query = query.filter(ExpedienteGasto.estado_absis.ilike(f"%{estado.strip()}%"))
    if q and q.strip():
        patron = f"%{q.strip()}%"
        query = query.filter(or_(
            Expediente.id_expediente.ilike(patron),
            Expediente.tipo_operacion.ilike(patron),
            ExpedienteGasto.tipo.ilike(patron),
            ExpedienteGasto.descripcion.ilike(patron),
            ExpedienteGasto.numero_factura.ilike(patron),
        ))
    filas = []
    for gasto, exp in query.order_by(ExpedienteGasto.fecha_factura.desc().nullslast(), Expediente.id_expediente.asc()).all():
        tipo = _tipo_cancelacion(exp)
        if modalidad == "con_provision" and tipo != "con_provision":
            continue
        if modalidad == "sin_provision" and tipo != "sin_provision":
            continue
        filas.append({
            "id_expediente": exp.id_expediente,
            "tipo_cancelacion": tipo,
            "tipo_operacion": exp.tipo_operacion,
            "concepto_gasto": "HONORARIOS GESTORÍA",
            "estado": getattr(gasto, "estado_absis", None),
            "estado_justificante": getattr(gasto, "estado_justificante", None),
            "fecha_adjuntar_factura": _fecha_iso(getattr(gasto, "fecha_adjuntar_factura", None)),
            "imp_gasto": _decimal(getattr(gasto, "imp_gasto", None)) if getattr(gasto, "imp_gasto", None) is not None else _decimal(gasto.importe_total_bruto if gasto.importe_total_bruto is not None else gasto.importe),
            "imp_base_impuesto": _decimal(getattr(gasto, "imp_base_impuesto", None)) if getattr(gasto, "imp_base_impuesto", None) is not None else _decimal(gasto.base_sujeta_impuestos),
            "imp_base_retencion": _decimal(getattr(gasto, "imp_base_retencion", None)) if getattr(gasto, "imp_base_retencion", None) is not None else _decimal(gasto.base_sujeta_retencion),
            "imp_impuesto": _decimal(getattr(gasto, "imp_impuesto", None)) if getattr(gasto, "imp_impuesto", None) is not None else _decimal(gasto.importe_impuesto),
            "fecha_estado": _fecha_iso(getattr(gasto, "fecha_estado", None)),
            "fecha_peticion": _fecha_iso(getattr(gasto, "fecha_peticion", None)),
            "fecha_pago": _fecha_iso(getattr(gasto, "fecha_pago", None)),
            "estado_pago": gasto.estado_pago,
            "numero_factura": gasto.numero_factura,
        })
    return filas

def _resumen(items):
    def suma(campo):
        return round(sum((x.get(campo) or 0) for x in items), 2)
    return {
        "registros": len(items),
        "total_gasto": suma("imp_gasto"),
        "base_impuesto": suma("imp_base_impuesto"),
        "base_retencion": suma("imp_base_retencion"),
        "total_impuesto": suma("imp_impuesto"),
        "con_provision": sum(1 for x in items if x["tipo_cancelacion"] == "con_provision"),
        "sin_provision": sum(1 for x in items if x["tipo_cancelacion"] == "sin_provision"),
        "sin_clasificar": sum(1 for x in items if x["tipo_cancelacion"] == "sin_clasificar"),
    }

@router.get("/facturacion")
def informe_facturacion(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    tipo_operacion: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    modalidad: str = Query("todas"),
    db: Session = Depends(get_db),
):
    if modalidad not in {"todas", "con_provision", "sin_provision"}:
        raise HTTPException(status_code=400, detail="Modalidad de cancelación no válida.")
    items = _consultar(db, fecha_desde, fecha_hasta, tipo_operacion, estado, q, modalidad)
    return {"resumen": _resumen(items), "items": items}

@router.get("/facturacion/exportar-excel")
def exportar_informe_facturacion(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    tipo_operacion: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    modalidad: str = Query("todas"),
    db: Session = Depends(get_db),
):
    items = _consultar(db, fecha_desde, fecha_hasta, tipo_operacion, estado, q, modalidad)
    wb = Workbook()
    ws = wb.active
    ws.title = "Honorarios gestoría"
    ws.freeze_panes = "A2"
    columnas = [
        ("Nº expediente", "id_expediente"), ("Clasificación", "tipo_cancelacion"),
        ("TIPOOPERACION", "tipo_operacion"), ("CONCEPTOGASTO", "concepto_gasto"),
        ("ESTADO", "estado"), ("ESTADOJUSTIFICANTE", "estado_justificante"),
        ("FECHAADJUNTARFACTURA", "fecha_adjuntar_factura"), ("IMPGASTO (€)", "imp_gasto"),
        ("IMPBASEIMPUESTO (€)", "imp_base_impuesto"), ("IMPBASERETENCION (€)", "imp_base_retencion"),
        ("IMPIMPUESTO (€)", "imp_impuesto"), ("FESTADO", "fecha_estado"),
        ("FPETICION", "fecha_peticion"), ("FPAGO", "fecha_pago"), ("Estado pago ERP", "estado_pago"),
        ("Nº factura", "numero_factura"),
    ]
    for idx, (label, _) in enumerate(columnas, 1):
        celda = ws.cell(row=1, column=idx, value=label)
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="1D4ED8")
        celda.alignment = Alignment(vertical="center")
    for rownum, item in enumerate(items, 2):
        for idx, (_, field) in enumerate(columnas, 1):
            ws.cell(row=rownum, column=idx, value=item.get(field))
    ws.auto_filter.ref = f"A1:{get_column_letter(len(columnas))}{max(1, len(items)+1)}"
    for idx, (label, field) in enumerate(columnas, 1):
        ws.column_dimensions[get_column_letter(idx)].width = min(max(len(label)+3, 14), 34)
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="informe_facturacion_honorarios_gestoria.xlsx"'})

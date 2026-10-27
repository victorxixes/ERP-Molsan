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
from sqlalchemy import text
from backend.app.database import engine

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.gastos.models import ExpedienteGasto

router = APIRouter(prefix="/informes", tags=["Informes"], dependencies=[Depends(get_current_user)])


@router.on_event("startup")
def migrar_campos_absis_facturacion():
    """Añade los campos opcionales del informe sin modificar datos existentes."""
    columnas = {
        "estado_absis": "VARCHAR(100)",
        "estado_justificante": "VARCHAR(100)",
        "fecha_adjuntar_factura": "DATE",
        "imp_gasto": "NUMERIC(12, 2)",
        "imp_base_impuesto": "NUMERIC(12, 2)",
        "imp_base_retencion": "NUMERIC(12, 2)",
        "imp_impuesto": "NUMERIC(12, 2)",
        "fecha_estado": "DATE",
        "fecha_peticion": "DATE",
        "fecha_pago": "DATE",
    }
    with engine.begin() as conexion:
        for nombre, tipo_sql in columnas.items():
            conexion.execute(text(
                f"ALTER TABLE public.expediente_gastos ADD COLUMN IF NOT EXISTS {nombre} {tipo_sql}"
            ))

def _normalizar_texto(valor):
    import unicodedata
    texto = str(valor or "").strip().casefold()
    return "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))

def _concepto_honorarios(gasto):
    # Compatibilidad con datos anteriores: el concepto puede estar en tipo o descripcion.
    valores = [getattr(gasto, "tipo", None), getattr(gasto, "descripcion", None)]
    return any("honorarios gestoria" in _normalizar_texto(v) for v in valores if v)

def _tipo_cancelacion(exp):
    valor = _normalizar_texto(getattr(exp, "tipo_operacion", None))
    # La clasificación principal sale de TIPOOPERACION; no se deduce del importe.
    if "cancelacion" in valor and "sin provision" in valor:
        return "sin_provision"
    if "cancelacion" in valor and "con provision" in valor:
        return "con_provision"
    return "otros"

def _situacion_facturacion(gasto):
    estado = _normalizar_texto(getattr(gasto, "estado_absis", None))
    justificante = _normalizar_texto(getattr(gasto, "estado_justificante", None))
    conjunto = f"{estado} {justificante}"
    if any(p in conjunto for p in ("incidencia", "error", "rechaz", "devuelt", "problema")):
        return "incidencia"
    if getattr(gasto, "fecha_pago", None):
        return "cobrado"
    if getattr(gasto, "fecha_adjuntar_factura", None):
        return "pendiente_cobro"
    return "pendiente_factura"

def _fecha_iso(valor):
    return valor.isoformat() if valor else None

def _decimal(valor):
    if valor is None:
        return None
    try:
        return float(Decimal(str(valor)))
    except Exception:
        return None

def _consultar(db, fecha_desde=None, fecha_hasta=None, tipo_operacion=None, estado=None, estado_justificante=None, situacion=None, q=None, modalidad="todas"):
    if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
        raise HTTPException(status_code=400, detail="La fecha desde no puede ser posterior a la fecha hasta.")
    query = db.query(ExpedienteGasto, Expediente).join(
        Expediente, Expediente.id == ExpedienteGasto.expediente_id
    )
    # Los datos históricos pueden guardar el concepto en tipo o descripcion y con/sin tilde.
    query = query.filter(or_(
        ExpedienteGasto.tipo.ilike("%honorarios gestoría%"),
        ExpedienteGasto.tipo.ilike("%honorarios gestoria%"),
        ExpedienteGasto.descripcion.ilike("%honorarios gestoría%"),
        ExpedienteGasto.descripcion.ilike("%honorarios gestoria%"),
    ))
    if fecha_desde:
        query = query.filter(ExpedienteGasto.fecha_adjuntar_factura >= fecha_desde)
    if fecha_hasta:
        query = query.filter(ExpedienteGasto.fecha_adjuntar_factura <= fecha_hasta)
    if tipo_operacion:
        query = query.filter(Expediente.tipo_operacion.ilike(f"%{tipo_operacion.strip()}%"))
    if estado:
        query = query.filter(ExpedienteGasto.estado_absis.ilike(f"%{estado.strip()}%"))
    if estado_justificante:
        query = query.filter(ExpedienteGasto.estado_justificante.ilike(f"%{estado_justificante.strip()}%"))
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
    for gasto, exp in query.order_by(ExpedienteGasto.fecha_adjuntar_factura.desc().nullslast(), Expediente.id_expediente.asc()).all():
        tipo = _tipo_cancelacion(exp)
        if modalidad in {"con_provision", "sin_provision", "otros"} and tipo != modalidad:
            continue
        situacion_fila = _situacion_facturacion(gasto)
        if situacion and situacion_fila != situacion:
            continue
        filas.append({
            "id_expediente": exp.id_expediente,
            "tipo_cancelacion": tipo,
            "tipo_operacion": exp.tipo_operacion,
            "concepto_gasto": "HONORARIOS GESTORÍA",
            "situacion_facturacion": situacion_fila,
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
        "otros": sum(1 for x in items if x["tipo_cancelacion"] == "otros"),
        "cobrado": sum(1 for x in items if x.get("situacion_facturacion") == "cobrado"),
        "pendiente_cobro": sum(1 for x in items if x.get("situacion_facturacion") == "pendiente_cobro"),
        "pendiente_factura": sum(1 for x in items if x.get("situacion_facturacion") == "pendiente_factura"),
        "incidencias": sum(1 for x in items if x.get("situacion_facturacion") == "incidencia"),
    }

@router.get("/facturacion")
def informe_facturacion(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    tipo_operacion: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    estado_justificante: Optional[str] = Query(None),
    situacion: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    modalidad: str = Query("todas"),
    db: Session = Depends(get_db),
):
    if modalidad not in {"todas", "con_provision", "sin_provision", "otros"}:
        raise HTTPException(status_code=400, detail="Modalidad de cancelación no válida.")
    if situacion not in {None, "cobrado", "pendiente_cobro", "pendiente_factura", "incidencia"}:
        raise HTTPException(status_code=400, detail="Situación de facturación no válida.")
    items = _consultar(db, fecha_desde, fecha_hasta, tipo_operacion, estado, estado_justificante, situacion, q, modalidad)
    return {"resumen": _resumen(items), "items": items}

@router.get("/facturacion/exportar-excel")
def exportar_informe_facturacion(
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    tipo_operacion: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    estado_justificante: Optional[str] = Query(None),
    situacion: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    modalidad: str = Query("todas"),
    db: Session = Depends(get_db),
):
    if modalidad not in {"todas", "con_provision", "sin_provision", "otros"}:
        raise HTTPException(status_code=400, detail="Modalidad de cancelación no válida.")
    if situacion not in {None, "cobrado", "pendiente_cobro", "pendiente_factura", "incidencia"}:
        raise HTTPException(status_code=400, detail="Situación de facturación no válida.")
    items = _consultar(db, fecha_desde, fecha_hasta, tipo_operacion, estado, estado_justificante, situacion, q, modalidad)
    wb = Workbook()
    ws = wb.active
    ws.title = "Honorarios gestoría"
    ws.freeze_panes = "A2"
    columnas = [
        ("Nº expediente", "id_expediente"), ("Clasificación", "tipo_cancelacion"),
        ("TIPOOPERACION", "tipo_operacion"), ("CONCEPTOGASTO", "concepto_gasto"),
        ("Situación facturación", "situacion_facturacion"),
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

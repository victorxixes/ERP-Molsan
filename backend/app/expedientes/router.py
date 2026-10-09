from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, time
import json
import io
import unicodedata
import openpyxl
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from backend.app.agenda.models import Cita
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente

router = APIRouter(prefix="/expedientes", tags=["Expedientes"])


# ENVÍO A NOTARIO
class EnvioANotarioRequest(BaseModel):
    escritura_firmada: bool
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
    poblacion: Optional[str] = None
    provincia: Optional[str] = None
    fecha_prevista_firma: Optional[date] = None
    hora_prevista_firma: Optional[time] = time(9, 0)


ACTIVIDADES_EXPEDIENTES = [
    {"key": "documentacion-previa", "label": "Documentación previa", "aliases": ["Documentación previa", "Documentacion previa"]},
    {"key": "sede-notarial", "label": "Sede notarial", "aliases": ["Sede notarial", "Sede Notarial", "Sede NOTARIAL"]},
    {"key": "sede-notarial-protocolo", "label": "Sede notarial con protocolo", "aliases": ["Sede notarial con protocolo", "Sede Notarial con protocolo", "Sede NOTARIAL con protocolo"]},
    {"key": "liquidacion-impuestos", "label": "Liquidación de impuestos", "aliases": ["Liquidación de impuestos", "Liquidacion de impuestos", "Liquidación impuestos", "Liquidacion impuestos"]},
    {"key": "tramitacion-inscripcion", "label": "Tramitación inscripción", "aliases": ["Tramitación inscripción", "Tramitacion inscripcion", "Tramitación de inscripción", "Tramitacion de inscripcion"]},
    {"key": "defectos-registrales", "label": "Defectos registrales", "aliases": ["Defectos registrales", "Defectos Registrales"]},
    {"key": "facturacion-cierre", "label": "Facturación y cierre", "aliases": ["Facturación y cierre", "Facturacion y cierre"]},
]


def normalizar_actividad_texto(valor: Optional[str]) -> str:
    if valor is None:
        return ""
    texto = unicodedata.normalize("NFD", str(valor).strip().lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return " ".join(texto.split())


def resolver_actividad(valor: Optional[str]) -> Optional[str]:
    normalizada = normalizar_actividad_texto(valor)
    if not normalizada:
        return None
    for actividad in ACTIVIDADES_EXPEDIENTES:
        if normalizada in [normalizar_actividad_texto(actividad[k]) for k in ("key", "label")]:
            return actividad["key"]
        if any(normalizada == normalizar_actividad_texto(a) for a in actividad["aliases"]):
            return actividad["key"]
    return None


def condicion_actividad(clave_actividad: str):
    actividad = func.trim(Expediente.actividad_actual)
    if clave_actividad == "documentacion-previa":
        return or_(actividad.ilike("Documentación previa"), actividad.ilike("Documentacion previa"))
    if clave_actividad == "sede-notarial":
        return and_(or_(actividad.ilike("Sede notarial"), actividad.ilike("Sede Notarial")), Expediente.fecha_firma.is_(None))
    if clave_actividad == "sede-notarial-protocolo":
        return and_(or_(actividad.ilike("Sede notarial"), actividad.ilike("Sede Notarial"), actividad.ilike("Sede notarial con protocolo"), actividad.ilike("Sede Notarial con protocolo")), Expediente.fecha_firma.isnot(None))
    if clave_actividad == "liquidacion-impuestos":
        return or_(actividad.ilike("Liquidación de impuestos"), actividad.ilike("Liquidacion de impuestos"), actividad.ilike("Liquidación impuestos"), actividad.ilike("Liquidacion impuestos"))
    if clave_actividad == "tramitacion-inscripcion":
        return or_(actividad.ilike("Tramitación inscripción"), actividad.ilike("Tramitacion inscripcion"), actividad.ilike("Tramitación de inscripción"), actividad.ilike("Tramitacion de inscripcion"))
    if clave_actividad == "defectos-registrales":
        return or_(actividad.ilike("Defectos registrales"), actividad.ilike("Defectos Registrales"))
    if clave_actividad == "facturacion-cierre":
        return or_(actividad.ilike("Facturación y cierre"), actividad.ilike("Facturacion y cierre"))
    return None


CAMPOS_EXPEDIENTE = [
    "id", "cliente_id", "id_expediente", "estado_expediente", "estado_expediente_ancert",
    "fecha_alta", "fecha_firma", "fecha_inscripcion", "fecha_entregado_cliente", "fecha_prevista_firma",
    "fecha_vencimiento", "fecha_sol_cgn", "fecha_firma_prev_val", "fecha_firma_prev_cli", "fecha_inicio_actividad", "fecha_fin_actividad",
    "fecha_envio_notario", "fecha_solicitud_pnc", "numero_solicitud_pnc", "escritura_firmada", "hora_prevista_firma",
    "nombre_titular", "nif_titular", "nombre_solicitante", "nif_solicitante", "apoderado",
    "nombre_notario", "nif_notario", "notario", "tipo_firma", "tipo_documento", "poblacion", "provincia",
    "oficina", "dan", "oficina_alta", "capital", "importe", "saldo_real", "saldo_disponible", "id_provision", "tipo_provision",
    "contrato", "num_solicitud_sia", "tipo_operacion", "subtipo_operacion", "vinccanc", "protocolo", "origen_bankia", "producto_gtg", "dt",
    "actividad_actual", "estado_actividad", "id_gestoria_tramite", "nombre_gestoria", "gestoria", "finca",
    "tiene_defectos_abiertos", "tipo_error", "descripcion_error", "falta_defecto", "fcierre_defecto", "id_expediente_cgn", "tipo_acta",
    "lucy", "indicador_tt", "observaciones", "facturacion_estado", "facturacion_fecha", "registral_estado", "registral_fecha",
]

COLUMNAS_ORDENABLES = {campo: getattr(Expediente, campo) for campo in CAMPOS_EXPEDIENTE if hasattr(Expediente, campo)}

COLUMNAS_EXCEL = [
    ("ID", "id"), ("CLIENTEID", "cliente_id"), ("IDEXPEDIENTE", "id_expediente"),
    ("ESTADOEXPEDIENTE", "estado_expediente"), ("ESTADOEXPEDIENTEANCERT", "estado_expediente_ancert"),
    ("FECHAALTA", "fecha_alta"), ("FECHAFIRMA", "fecha_firma"), ("FECHAINSCRIPCION", "fecha_inscripcion"),
    ("FECHAENTREGADOCLIENTE", "fecha_entregado_cliente"), ("FECHAPREVISTAFIRMA", "fecha_prevista_firma"),
    ("FECHAVENCIMIENTO", "fecha_vencimiento"), ("FECHASOLCGN", "fecha_sol_cgn"),
    ("FECHAFIRMAPREVVAL", "fecha_firma_prev_val"), ("FECHAFIRMAPREVCLI", "fecha_firma_prev_cli"),
    ("FECHAINICIOACTIVIDAD", "fecha_inicio_actividad"), ("FECHAFINACTIVIDAD", "fecha_fin_actividad"),
    ("NOMBRETITULAR", "nombre_titular"), ("NIFTITULAR", "nif_titular"), ("NOMBRESOLICITANTE", "nombre_solicitante"),
    ("NIFSOLICITANTE", "nif_solicitante"), ("APODERADO", "apoderado"), ("NOMBRENOTARIO", "nombre_notario"),
    ("NIFNOTARIO", "nif_notario"), ("NOTARIO", "notario"), ("OFICINA", "oficina"), ("DAN", "dan"),
    ("OFICINAALTA", "oficina_alta"), ("CAPITAL", "capital"), ("IMPORTE", "importe"), ("SALDOREAL", "saldo_real"),
    ("SALDODISPONIBLE", "saldo_disponible"), ("IDPROVISION", "id_provision"), ("TIPOPROVISION", "tipo_provision"),
    ("CONTRATO", "contrato"), ("NUMSOLICITUDSIA", "num_solicitud_sia"), ("TIPOOPERACION", "tipo_operacion"),
    ("SUBTIPOOPERACION", "subtipo_operacion"), ("VINCCANC", "vinccanc"), ("PROTOCOLO", "protocolo"),
    ("ORIGENBANKIA", "origen_bankia"), ("PRODUCTOGTG", "producto_gtg"), ("DT", "dt"),
    ("ACTIVIDADACTUAL", "actividad_actual"), ("ESTADOACTIVIDAD", "estado_actividad"),
    ("IDGESTORIATRAMITE", "id_gestoria_tramite"), ("NOMBREGESTORIA", "nombre_gestoria"), ("GESTORIA", "gestoria"),
    ("FINCA", "finca"), ("TIENEDEFECTOSABIERTOS", "tiene_defectos_abiertos"), ("TIPOERROR", "tipo_error"),
    ("DESCRIPCIONERROR", "descripcion_error"), ("FALTADEFECTO", "falta_defecto"), ("FCIERREDEFECTO", "fcierre_defecto"),
    ("IDEXPEDIENTECGN", "id_expediente_cgn"), ("TIPOACTA", "tipo_acta"), ("LUCY", "lucy"),
    ("INDICADORTT", "indicador_tt"), ("OBSERVACIONES", "observaciones"), ("FACTURACIONESTADO", "facturacion_estado"),
    ("FACTURACIONFECHA", "facturacion_fecha"), ("REGISTRALESTADO", "registral_estado"), ("REGISTRALFECHA", "registral_fecha"),
]


def expediente_a_dict(expediente: Expediente) -> dict:
    resultado = {}
    for campo in CAMPOS_EXPEDIENTE:
        valor = getattr(expediente, campo, None)
        if isinstance(valor, (date, datetime, time)):
            valor = valor.isoformat()
        resultado[campo] = valor
    return resultado


def parsear_fecha(valor: Optional[str], nombre_campo: str) -> Optional[date]:
    if not valor:
        return None
    try:
        return datetime.strptime(valor, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{nombre_campo} debe tener formato YYYY-MM-DD.")


def aplicar_filtros(q, nif=None, actividad=None, fechaInicio=None, fechaFin=None, notario=None, oficina=None, importeMin=None, importeMax=None):
    fecha_inicio = parsear_fecha(fechaInicio, "fechaInicio")
    fecha_fin = parsear_fecha(fechaFin, "fechaFin")
    if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
        raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser posterior a la fecha de fin.")
    if importeMin is not None and importeMax is not None and importeMin > importeMax:
        raise HTTPException(status_code=400, detail="El importe mínimo no puede ser superior al importe máximo.")
    if nif and nif.strip():
        q = q.filter(Expediente.nif_titular.ilike(f"%{nif.strip()}%"))
    if actividad and actividad.strip():
        clave = resolver_actividad(actividad)
        if clave is None:
            raise HTTPException(status_code=400, detail=f"Actividad no válida: {actividad}")
        condicion = condicion_actividad(clave)
        if condicion is not None:
            q = q.filter(condicion)
    if fecha_inicio:
        q = q.filter(Expediente.fecha_alta >= fecha_inicio)
    if fecha_fin:
        q = q.filter(Expediente.fecha_alta <= fecha_fin)
    if notario and notario.strip():
        patron = f"%{notario.strip()}%"
        q = q.filter(or_(Expediente.nombre_notario.ilike(patron), Expediente.nif_notario.ilike(patron), Expediente.notario.ilike(patron)))
    if oficina and oficina.strip():
        q = q.filter(Expediente.oficina.ilike(f"%{oficina.strip()}%"))
    if importeMin is not None:
        q = q.filter(Expediente.importe >= importeMin)
    if importeMax is not None:
        q = q.filter(Expediente.importe <= importeMax)
    return q


@router.get("/listado")
def listado_expedientes(pagina: int = Query(1, ge=1), porPagina: int = Query(20, ge=1, le=200), nif: Optional[str] = None,
                        actividad: Optional[str] = None, fechaInicio: Optional[str] = None, fechaFin: Optional[str] = None,
                        notario: Optional[str] = None, oficina: Optional[str] = None, importeMin: Optional[float] = None,
                        importeMax: Optional[float] = None, ordenMultiple: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = aplicar_filtros(db.query(Expediente), nif, actividad, fechaInicio, fechaFin, notario, oficina, importeMin, importeMax)
    orden_aplicado = False
    if ordenMultiple:
        try:
            ordenes = json.loads(ordenMultiple)
        except (json.JSONDecodeError, TypeError, ValueError):
            raise HTTPException(status_code=400, detail="ordenMultiple no contiene un JSON válido.")
        if not isinstance(ordenes, list):
            raise HTTPException(status_code=400, detail="ordenMultiple debe ser una lista.")
        for orden in ordenes:
            if not isinstance(orden, dict):
                continue
            campo = COLUMNAS_ORDENABLES.get(orden.get("columna"))
            if campo is None:
                continue
            q = q.order_by(campo.desc() if str(orden.get("direccion", "asc")).lower() == "desc" else campo.asc())
            orden_aplicado = True
    if not orden_aplicado:
        q = q.order_by(Expediente.fecha_alta.desc(), Expediente.id_expediente.desc(), Expediente.id.desc())
    total = q.count()
    total_paginas = max(1, (total + porPagina - 1) // porPagina)
    pagina_real = min(pagina, total_paginas)
    items_db = q.offset((pagina_real - 1) * porPagina).limit(porPagina).all()
    return {"items": [expediente_a_dict(e) for e in items_db], "total": total, "pagina": pagina_real, "porPagina": porPagina, "total_paginas": total_paginas}


@router.get("/resumen")
def resumen_expedientes(db: Session = Depends(get_db)):
    total_expedientes = db.query(func.count(Expediente.id)).scalar() or 0
    actividades = []
    for actividad in ACTIVIDADES_EXPEDIENTES:
        condicion = condicion_actividad(actividad["key"])
        total = db.query(func.count(Expediente.id)).filter(condicion).scalar() or 0 if condicion is not None else 0
        actividades.append({"key": actividad["key"], "actividad": actividad["label"], "total": int(total)})
    return {"total": int(total_expedientes), "actividades": actividades}


@router.get("/exportar-excel")
def exportar_excel_expedientes(nif: Optional[str] = None, actividad: Optional[str] = None, fechaInicio: Optional[str] = None,
                               fechaFin: Optional[str] = None, notario: Optional[str] = None, oficina: Optional[str] = None,
                               importeMin: Optional[float] = None, importeMax: Optional[float] = None, db: Session = Depends(get_db)):
    q = aplicar_filtros(db.query(Expediente), nif, actividad, fechaInicio, fechaFin, notario, oficina, importeMin, importeMax)
    expedientes = q.order_by(Expediente.fecha_alta.desc(), Expediente.id_expediente.desc(), Expediente.id.desc()).all()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Expedientes"
    for col, (cabecera, _) in enumerate(COLUMNAS_EXCEL, start=1):
        ws.cell(row=1, column=col, value=cabecera).font = Font(bold=True)
    for fila, expediente in enumerate(expedientes, start=2):
        for col, (_, atributo) in enumerate(COLUMNAS_EXCEL, start=1):
            valor = getattr(expediente, atributo, None)
            cell = ws.cell(row=fila, column=col, value=valor)
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
        ws.column_dimensions[get_column_letter(col)].width = min(max(max_length + 2, 12), 45)
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": 'attachment; filename="expedientes.xlsx"'})


def crear_o_actualizar_cita_agenda(db: Session, expediente: Expediente, datos: EnvioANotarioRequest):
    if not datos.fecha_prevista_firma:
        return None
    hora_inicio = datos.hora_prevista_firma or time(9, 0)
    minutos_inicio = hora_inicio.hour * 60 + hora_inicio.minute
    minutos_fin = min(minutos_inicio + 60, 23 * 60 + 59)
    hora_fin = time(minutos_fin // 60, minutos_fin % 60)
    cita = db.query(Cita).filter(Cita.expediente_id == expediente.id).order_by(Cita.id.desc()).first()
    observaciones = f"Firma prevista — Expediente {expediente.id_expediente}"
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
    cita = Cita(fecha=datos.fecha_prevista_firma, hora_inicio=hora_inicio, hora_fin=hora_fin,
                tipo_cita="Firma notarial", notario_id=datos.notario_id, tipo_firma=datos.tipo_firma,
                apoderado=datos.apoderado, expediente_id=expediente.id, observaciones=observaciones)
    db.add(cita)
    return cita


@router.put("/{id_expediente}/enviar-a-notario")
def enviar_a_notario(id_expediente: str, datos: EnvioANotarioRequest, db: Session = Depends(get_db)):
    expediente = db.query(Expediente).filter(Expediente.id_expediente == id_expediente).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    if not datos.nombre_notario or not datos.nombre_notario.strip():
        raise HTTPException(status_code=400, detail="Debes seleccionar un notario.")
    if not datos.tipo_firma or not datos.tipo_firma.strip():
        raise HTTPException(status_code=400, detail="El Tipo de firma es obligatorio.")
    if not datos.tipo_documento or not datos.tipo_documento.strip():
        raise HTTPException(status_code=400, detail="El Tipo documento es obligatorio.")
    if not datos.fecha_envio:
        raise HTTPException(status_code=400, detail="La Fecha de envío es obligatoria.")
    if not datos.fecha_solicitud_pnc:
        raise HTTPException(status_code=400, detail="La fecha de solicitud PNC es obligatoria.")
    if datos.fecha_solicitud_pnc > datos.fecha_envio:
        raise HTTPException(status_code=400, detail="La fecha de solicitud PNC no puede ser posterior a la fecha de envío.")
    if not datos.numero_solicitud_pnc or not datos.numero_solicitud_pnc.strip():
        raise HTTPException(status_code=400, detail="El número de solicitud PNC es obligatorio.")
    if datos.fecha_prevista_firma and datos.fecha_prevista_firma < datos.fecha_envio:
        raise HTTPException(status_code=400, detail="La Fecha prevista de firma no puede ser anterior a la Fecha de envío.")
    if not datos.escritura_firmada:
        expediente.fecha_firma = None
        expediente.protocolo = None
        expediente.actividad_actual = "Sede notarial"
    else:
        if not datos.fecha_firma:
            raise HTTPException(status_code=400, detail="Si la escritura está firmada debes indicar la Fecha de firma.")
        if datos.fecha_envio > datos.fecha_firma:
            raise HTTPException(status_code=400, detail="La Fecha de envío no puede ser posterior a la Fecha de firma.")
        if not datos.protocolo or not datos.protocolo.strip():
            raise HTTPException(status_code=400, detail="Si la escritura está firmada debes indicar el Protocolo.")
        expediente.fecha_firma = datos.fecha_firma
        expediente.protocolo = datos.protocolo.strip()
        expediente.actividad_actual = "Sede notarial con protocolo"

    # Persistir los datos originales del envío, sin sustituir la fecha de actividad.
    expediente.fecha_envio_notario = datos.fecha_envio
    expediente.fecha_solicitud_pnc = datos.fecha_solicitud_pnc
    expediente.numero_solicitud_pnc = datos.numero_solicitud_pnc.strip()
    expediente.escritura_firmada = datos.escritura_firmada
    expediente.hora_prevista_firma = datos.hora_prevista_firma or time(9, 0)
    expediente.fecha_inicio_actividad = datos.fecha_envio
    expediente.nombre_notario = datos.nombre_notario.strip()
    expediente.nif_notario = datos.nif_notario.strip() if datos.nif_notario and datos.nif_notario.strip() else None
    expediente.notario = datos.notario.strip() if datos.notario and datos.notario.strip() else datos.nombre_notario.strip()
    expediente.apoderado = datos.apoderado.strip() if datos.apoderado and datos.apoderado.strip() else None
    expediente.tipo_firma = datos.tipo_firma.strip()
    expediente.tipo_documento = datos.tipo_documento.strip()
    expediente.poblacion = datos.poblacion.strip() if datos.poblacion and datos.poblacion.strip() else None
    expediente.provincia = datos.provincia.strip() if datos.provincia and datos.provincia.strip() else None
    if datos.fecha_prevista_firma:
        expediente.fecha_prevista_firma = datos.fecha_prevista_firma
    try:
        cita = crear_o_actualizar_cita_agenda(db, expediente, datos)
        db.add(expediente)
        db.commit()
        db.refresh(expediente)
        if cita is not None:
            db.refresh(cita)
    except Exception as exc:
        db.rollback()
        print("ERROR ENVIANDO EXPEDIENTE A NOTARIO:", repr(exc))
        raise HTTPException(status_code=500, detail="No se pudo guardar el envío a notario ni crear la cita de Agenda.")
    respuesta = expediente_a_dict(expediente)
    respuesta["agenda_cita_creada"] = cita is not None
    respuesta["agenda_cita_id"] = cita.id if cita is not None else None
    return respuesta


@router.get("/{id_expediente}")
def obtener_expediente(id_expediente: str, db: Session = Depends(get_db)):
    expediente = db.query(Expediente).filter(Expediente.id_expediente == id_expediente).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    return expediente_a_dict(expediente)

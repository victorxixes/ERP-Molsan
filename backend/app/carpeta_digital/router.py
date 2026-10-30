import logging
import mimetypes
import os
import uuid
from pathlib import Path
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.storage import CARPETA_DIGITAL_DIR

logger = logging.getLogger(__name__)

# Toda la API de la carpeta digital exige una sesión JWT válida.
# El frontend de esta funcionalidad usa el cliente axios común, que añade el token.
router = APIRouter(
    prefix="/expedientes",
    tags=["Carpeta digital"],
    dependencies=[Depends(get_current_user), Depends(validar_visibilidad_expediente_request)],
)

CATEGORIAS = {
    # Documentación previa
    "Documentos Absis",
    "Hoja de Encargo firmada",
    "Justificante de cancelación",
    "Nota simple registral",
    "Escrituras/borradores",
    "Borradores escrituras",
    "Borradores escrituras y otros",
    "Otra documentación",
    "Mails de la Oficina",
    "Otros",
    # Sede notarial
    "Presentación Registro",
    "Hoja de presentación",
    "Copia simple",
    # Liquidación impuestos
    "AJD/ITP",
    "Otros impuestos",
    # Gestión económica
    "Factura notarial",
    "Factura Registral",
    "Factura impuestos",
    "Honorarios gestoría",
    # Defectos registrales
    "Defecto registral",
    "Subsanación del defecto",
    # Tramitación inscripción
    "Hoja de Inscripción",
    "Factura registro",
    # Facturación y cierre
    "Escritura digital final",
    # Documentación general
    "Mails de la Oficina",
    "Otra documentación",
    "Otros",
    # Compatibilidad con categorías anteriores
    "Mails de la oficina",
    "Borradores de escrituras",
    "Factura impuestos",
    "Documento de inscripción",
    "Expediente digital completo",
}

MAX_BYTES = int(os.getenv("CARPETA_DIGITAL_MAX_BYTES", str(100 * 1024 * 1024)))
EXTENSIONES_DOCUMENTALES_PERMITIDAS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".odt", ".ods", ".odp", ".rtf", ".txt", ".csv", ".eml",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip",
}
EXTENSIONES_VISTA_PREVIA = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"}


def _tipo_mime_documento_seguro(nombre: str) -> tuple[str, str]:
    extension = Path(nombre).suffix.lower()
    if extension not in EXTENSIONES_DOCUMENTALES_PERMITIDAS:
        raise HTTPException(
            status_code=415,
            detail="Formato documental no permitido. Usa PDF, Office, TXT, CSV, EML, ZIP o imágenes.",
        )
    tipo_mime = mimetypes.guess_type(f"documento{extension}")[0] or "application/octet-stream"
    return extension, tipo_mime


def _politica_descarga_documento(nombre: str) -> tuple[str, str]:
    extension = Path(nombre or "").suffix.lower()
    tipo_mime = (
        mimetypes.guess_type(f"documento{extension}")[0]
        if extension in EXTENSIONES_DOCUMENTALES_PERMITIDAS
        else None
    ) or "application/octet-stream"
    disposicion = "inline" if extension in EXTENSIONES_VISTA_PREVIA else "attachment"
    return tipo_mime, disposicion
# Carpeta compartida de almacenamiento. En Render debe quedar bajo el disco
# persistente configurado en MOLSAN_STORAGE_ROOT.
ROOT = CARPETA_DIGITAL_DIR.resolve()
ROOT.mkdir(parents=True, exist_ok=True)


class DocumentoRespuesta(BaseModel):
    id: int
    expediente_id: str
    categoria: str
    nombre_original: str
    tipo_mime: str | None = None
    tamano_bytes: int
    fecha_subida: datetime

    class Config:
        orm_mode = True


def _expediente_existe(db: Session, expediente_id: str):
    # El ERP identifica expedientes mediante id_expediente (referencia ABSIS).
    encontrado = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(expediente_id))
        .first()
    )
    if not encontrado:
        raise HTTPException(status_code=404, detail=f"No existe el expediente {expediente_id}")
    return encontrado


def _normalizar_texto(valor: str | None) -> str:
    import unicodedata
    texto = unicodedata.normalize("NFD", str(valor or "").strip().lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def _ruta_segura(nombre_guardado: str) -> Path:
    # El nombre almacenado lo genera el backend, nunca se acepta una ruta enviada
    # por el cliente. Esta validación también protege frente a registros antiguos.
    ruta = (ROOT / nombre_guardado).resolve()
    if ruta.parent != ROOT:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")
    return ruta


@router.get("/{expediente_id}/carpeta-digital", response_model=List[DocumentoRespuesta])
def listar_documentos(expediente_id: str, db: Session = Depends(get_db)):
    _expediente_existe(db, expediente_id)
    return (
        db.query(DocumentoCarpetaDigital)
        .filter(DocumentoCarpetaDigital.expediente_id == str(expediente_id))
        .order_by(DocumentoCarpetaDigital.fecha_subida.desc())
        .all()
    )


@router.post(
    "/{expediente_id}/carpeta-digital",
    response_model=DocumentoRespuesta,
    status_code=201,
)
async def subir_documento(
    expediente_id: str,
    categoria: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    expediente = _expediente_existe(db, expediente_id)
    if categoria not in CATEGORIAS:
        raise HTTPException(status_code=400, detail="Categoría documental no válida")

    nombre_original = (archivo.filename or "documento").replace("\\", "/").rsplit("/", 1)[-1]
    if not nombre_original or nombre_original in {".", ".."}:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")

    try:
        extension, tipo_mime_seguro = _tipo_mime_documento_seguro(nombre_original)
        contenido = await archivo.read(MAX_BYTES + 1)
        if len(contenido) > MAX_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"El archivo supera el límite de {MAX_BYTES // (1024 * 1024)} MB",
            )
        if not contenido:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        # Nombre aleatorio y extensión saneada; no se usa el nombre aportado como ruta.
        nombre_guardado = f"{uuid.uuid4().hex}{extension}"
        ruta = _ruta_segura(nombre_guardado)
        temporal = _ruta_segura(f".{nombre_guardado}.part")

        try:
            temporal.write_bytes(contenido)
            temporal.replace(ruta)
            registro = DocumentoCarpetaDigital(
                expediente_id=str(expediente_id),
                categoria=categoria,
                nombre_original=nombre_original,
                nombre_guardado=nombre_guardado,
                tipo_mime=tipo_mime_seguro,
                tamano_bytes=len(contenido),
                fecha_subida=datetime.utcnow(),
            )
            db.add(registro)

            # Una cancelación sin provisión termina al aportar la copia simple.
            # Reutiliza el campo existente Fin actividad.
            operacion = _normalizar_texto(expediente.tipo_operacion)
            if categoria == "Copia simple" and operacion == "cancelacion sin provision":
                from datetime import date
                expediente.estado_expediente = "Liquidado"
                expediente.estado_actividad = "Cerrada automáticamente"
                expediente.actividad_actual = "Cierre del expediente"
                expediente.fecha_fin_actividad = date.today()
                db.add(expediente)

            db.commit()
            db.refresh(registro)
            return registro
        except Exception:
            db.rollback()
            ruta.unlink(missing_ok=True)
            temporal.unlink(missing_ok=True)
            raise
    finally:
        await archivo.close()


@router.get("/{expediente_id}/carpeta-digital/{documento_id}/descargar")
def descargar_documento(
    expediente_id: str,
    documento_id: int,
    db: Session = Depends(get_db),
):
    _expediente_existe(db, expediente_id)
    doc = (
        db.query(DocumentoCarpetaDigital)
        .filter(
            DocumentoCarpetaDigital.id == documento_id,
            DocumentoCarpetaDigital.expediente_id == str(expediente_id),
        )
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    ruta = _ruta_segura(doc.nombre_guardado)
    if not ruta.is_file():
        raise HTTPException(
            status_code=404,
            detail=(
                "El archivo no está en el almacenamiento. Comprueba que "
                "CARPETA_DIGITAL_DIR apunte al disco persistente de Render."
            ),
        )
    media_type_seguro, disposicion = _politica_descarga_documento(doc.nombre_original)
    return FileResponse(
        path=ruta,
        media_type=media_type_seguro,
        filename=doc.nombre_original,
        content_disposition_type=disposicion,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.delete("/{expediente_id}/carpeta-digital/{documento_id}")
def eliminar_documento(
    expediente_id: str,
    documento_id: int,
    db: Session = Depends(get_db),
):
    _expediente_existe(db, expediente_id)
    doc = (
        db.query(DocumentoCarpetaDigital)
        .filter(
            DocumentoCarpetaDigital.id == documento_id,
            DocumentoCarpetaDigital.expediente_id == str(expediente_id),
        )
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    ruta = _ruta_segura(doc.nombre_guardado)
    db.delete(doc)
    db.commit()
    ruta.unlink(missing_ok=True)
    return {"ok": True, "id": documento_id}


@router.post("/{expediente_id}/carpeta-digital/previsualizar-cierre-documental")
def previsualizar_cierre_documental(expediente_id: str, db: Session = Depends(get_db)):
    """Genera la hoja de liquidación y reúne los PDF de cierre en orden oficial."""
    import io
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from pypdf import PdfReader, PdfWriter

    expediente = _expediente_existe(db, expediente_id)
    documentos = (
        db.query(DocumentoCarpetaDigital)
        .filter(DocumentoCarpetaDigital.expediente_id == str(expediente_id))
        .order_by(DocumentoCarpetaDigital.fecha_subida.asc(), DocumentoCarpetaDigital.id.asc())
        .all()
    )

    def normalizar(valor):
        return _normalizar_texto(valor).replace("/", " ").replace("-", " ")

    # Hoja de liquidación oficial MOLSAN PREMIUM 2027.
    # Solo lee datos existentes: no registra pagos ni modifica saldos o estados económicos.
    from sqlalchemy import text
    from backend.app.expedientes.gastos.models import ExpedienteGasto
    from xml.sax.saxutils import escape

    estilos = getSampleStyleSheet()
    azul = colors.HexColor("#123e70")
    azul_medio = colors.HexColor("#1e5794")
    azul_claro = colors.HexColor("#eaf3fb")
    gris = colors.HexColor("#64748b")
    estilos.add(ParagraphStyle(name="MolsanTitle", parent=estilos["Title"], textColor=azul, fontName="Helvetica-Bold", fontSize=17, leading=21, alignment=0, spaceAfter=3*mm))
    estilos.add(ParagraphStyle(name="MolsanSub", parent=estilos["Normal"], textColor=azul_medio, fontName="Helvetica-Bold", fontSize=9, leading=12, spaceAfter=2*mm))
    estilos.add(ParagraphStyle(name="MolsanSmall", parent=estilos["BodyText"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#334155")))
    estilos.add(ParagraphStyle(name="MolsanTiny", parent=estilos["BodyText"], fontName="Helvetica", fontSize=7, leading=9, textColor=gris))
    estilos.add(ParagraphStyle(name="MolsanTableHead", parent=estilos["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=9, textColor=azul))
    hoja = io.BytesIO()
    doc_pdf = SimpleDocTemplate(hoja, pagesize=A4, rightMargin=17*mm, leftMargin=17*mm, topMargin=14*mm, bottomMargin=17*mm, title=f"Hoja de liquidación - expediente {expediente_id}", author="MOLSAN ERP")

    def txt(valor, fallback="—"):
        if valor is None or str(valor).strip() == "":
            return fallback
        return escape(str(valor).strip())

    def eur(valor):
        try:
            n = float(valor or 0)
        except (TypeError, ValueError):
            return "—"
        return f"{n:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")

    # La configuración corporativa procede de Datos Molsan, sin crear tablas ni migraciones.
    datos_empresa = {}
    try:
        fila_config = db.execute(text("SELECT datos FROM datos_molsan_config WHERE id = 1")).mappings().first()
        datos_empresa = (fila_config or {}).get("datos") or {}
        if not isinstance(datos_empresa, dict):
            datos_empresa = {}
    except Exception:
        db.rollback()
        datos_empresa = {}

    cliente = getattr(expediente, "cliente", None)
    nombre_cliente = (
        getattr(cliente, "nombre_facturacion", None)
        or getattr(expediente, "nombre_titular", None)
        or getattr(expediente, "nombre_solicitante", None)
        or getattr(cliente, "nombre_completo", None)
    )
    nif_cliente = (
        getattr(cliente, "dni_facturacion", None)
        or getattr(expediente, "nif_titular", None)
        or getattr(expediente, "nif_solicitante", None)
        or getattr(cliente, "dni", None)
    )
    direccion_cliente = getattr(cliente, "direccion_facturacion", None) or getattr(cliente, "direccion", None)
    cp_cliente = getattr(cliente, "codigo_postal_facturacion", None) or getattr(cliente, "codigo_postal", None)
    poblacion_cliente = getattr(cliente, "poblacion_facturacion", None) or getattr(cliente, "poblacion", None)
    provincia_cliente = getattr(cliente, "provincia_facturacion", None) or getattr(cliente, "provincia", None)

    gastos = (
        db.query(ExpedienteGasto)
        .filter(ExpedienteGasto.expediente_id == expediente.id)
        .order_by(ExpedienteGasto.fecha.asc(), ExpedienteGasto.id.asc())
        .all()
    )
    total_gastos = sum(float(g.importe_resultante if g.importe_resultante is not None else (g.importe_total_bruto if g.importe_total_bruto is not None else (g.importe or 0))) for g in gastos)
    estados_pagados = {"pagado", "pagada", "abonado", "abonada", "efectuado", "efectuada", "paid"}
    gastos_pagados = [g for g in gastos if str(g.estado_pago or "").strip().lower() in estados_pagados]
    total_pagado = sum(float(g.importe_resultante if g.importe_resultante is not None else (g.importe_total_bruto if g.importe_total_bruto is not None else (g.importe or 0))) for g in gastos_pagados)
    importe_provision = getattr(expediente, "importe", None)
    fecha_liquidacion = getattr(expediente, "fecha_fin_actividad", None)

    empresa_nombre = datos_empresa.get("razon_social") or "MOLSAN GESTIÓN Y TRAMITACIÓN, S.L."
    empresa_nif = datos_empresa.get("nif") or ""
    empresa_direccion = datos_empresa.get("domicilio_fiscal") or ""
    empresa_ubicacion = escape(" ".join(str(x) for x in [datos_empresa.get("codigo_postal"), datos_empresa.get("poblacion"), datos_empresa.get("provincia")] if x))
    empresa_contacto = escape(" · ".join(str(x) for x in [datos_empresa.get("telefono"), datos_empresa.get("email"), datos_empresa.get("web")] if x))
    empresa_direccion = escape(str(empresa_direccion))
    empresa_nif = escape(str(empresa_nif))

    cabecera = Table([
        [Paragraph(f"<b>{txt(empresa_nombre)}</b>", estilos["MolsanSub"]),
         Paragraph("<b>HOJA DE LIQUIDACIÓN</b><br/><font size='8'>EXPEDIENTE DE CANCELACIÓN</font>", estilos["MolsanTitle"])],
        [Paragraph(" · ".join(x for x in [f"NIF: {empresa_nif}" if empresa_nif else "", empresa_direccion, empresa_ubicacion, empresa_contacto] if x) or "Datos corporativos configurables en Utilidades → Datos Molsan", estilos["MolsanTiny"]),
         Paragraph(f"Expediente: <b>{txt(getattr(expediente, 'id_expediente', expediente_id))}</b><br/>Fecha: <b>{fecha_liquidacion.strftime('%d/%m/%Y') if hasattr(fecha_liquidacion, 'strftime') else txt(fecha_liquidacion)}</b>", estilos["MolsanSmall"])]
    ], colWidths=[91*mm, 79*mm], hAlign="LEFT")
    cabecera.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ALIGN", (1,0), (1,-1), "RIGHT"),
        ("LINEBELOW", (0,-1), (-1,-1), 1.6, azul_medio),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
    ]))
    story = [cabecera, Spacer(1, 5*mm)]

    def bloque(titulo, filas, anchos=(47*mm, 123*mm)):
        story.append(Paragraph(txt(titulo), estilos["MolsanSub"]))
        tabla = Table([
            [Paragraph(f"<b>{txt(k)}</b>", estilos["MolsanSmall"]), Paragraph(txt(v), estilos["MolsanSmall"])]
            for k, v in filas
        ], colWidths=list(anchos), hAlign="LEFT")
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (0,-1), azul_claro),
            ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#d4dfeb")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
            ("TOPPADDING", (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ]))
        story.extend([tabla, Spacer(1, 4*mm)])

    bloque("DATOS DEL CLIENTE", [
        ("Titular / razón social", nombre_cliente),
        ("DNI / NIF", nif_cliente),
        ("Domicilio", direccion_cliente),
        ("Código postal", cp_cliente),
        ("Población / provincia", ", ".join(str(x) for x in [poblacion_cliente, provincia_cliente] if x) or None),
    ])
    bloque("DATOS DE LA PROVISIÓN", [
        ("N.º de expediente", getattr(expediente, "id_expediente", expediente_id)),
        ("Contrato", getattr(expediente, "contrato", None)),
        ("Oficina CaixaBank", getattr(expediente, "oficina", None) or getattr(expediente, "oficina_alta", None)),
        ("Notario", getattr(expediente, "nombre_notario", None) or getattr(expediente, "notario", None)),
        ("Protocolo", getattr(expediente, "protocolo", None)),
        ("Fecha de liquidación", fecha_liquidacion.strftime("%d/%m/%Y") if hasattr(fecha_liquidacion, "strftime") else fecha_liquidacion),
    ])

    story.append(Paragraph("GASTOS REGISTRADOS EN GESTIÓN ECONÓMICA", estilos["MolsanSub"]))
    filas_gastos = [[Paragraph("Fecha", estilos["MolsanTableHead"]), Paragraph("Concepto / documento", estilos["MolsanTableHead"]), Paragraph("Importe", estilos["MolsanTableHead"]), Paragraph("Estado", estilos["MolsanTableHead"])]]
    for gasto in gastos:
        importe_gasto = gasto.importe_resultante if gasto.importe_resultante is not None else (gasto.importe_total_bruto if gasto.importe_total_bruto is not None else gasto.importe)
        fecha_gasto = gasto.fecha_pago or gasto.fecha_factura or gasto.fecha
        filas_gastos.append([
            Paragraph(txt(fecha_gasto.strftime("%d/%m/%Y") if hasattr(fecha_gasto, "strftime") else fecha_gasto), estilos["MolsanTiny"]),
            Paragraph(txt(gasto.tipo or gasto.descripcion or gasto.concepto_gasto_absis or "Gasto"), estilos["MolsanTiny"]),
            Paragraph(eur(importe_gasto), estilos["MolsanTiny"]),
            Paragraph(txt(gasto.estado_pago or "Pendiente"), estilos["MolsanTiny"]),
        ])
    if not gastos:
        filas_gastos.append([Paragraph("—", estilos["MolsanTiny"]), Paragraph("No constan gastos registrados", estilos["MolsanTiny"]), Paragraph("—", estilos["MolsanTiny"]), Paragraph("—", estilos["MolsanTiny"])])
    filas_gastos.append([Paragraph("", estilos["MolsanTiny"]), Paragraph("<b>Total gastos registrados</b>", estilos["MolsanTiny"]), Paragraph(f"<b>{eur(total_gastos)}</b>", estilos["MolsanTiny"]), Paragraph("", estilos["MolsanTiny"])])
    tabla_gastos = Table(filas_gastos, colWidths=[25*mm, 81*mm, 31*mm, 33*mm], repeatRows=1, hAlign="LEFT")
    tabla_gastos.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), azul_claro),
        ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#d4dfeb")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ALIGN", (2,1), (2,-1), "RIGHT"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.extend([tabla_gastos, Spacer(1, 4*mm)])

    total_recibido = float(importe_provision or 0)
    saldo = round(total_recibido - total_pagado, 2)
    resumen = Table([
        [Paragraph("PROVISIÓN INICIAL", estilos["MolsanSmall"]), Paragraph("GASTOS PAGADOS", estilos["MolsanSmall"]), Paragraph("SALDO TRAS PAGOS REGISTRADOS", estilos["MolsanSmall"])],
        [Paragraph(f"<b>{eur(total_recibido)}</b>", estilos["MolsanTitle"]), Paragraph(f"<b>{eur(total_pagado)}</b>", estilos["MolsanTitle"]), Paragraph(f"<b>{eur(saldo)}</b>", estilos["MolsanTitle"])],
    ], colWidths=[56.7*mm, 56.7*mm, 56.7*mm], hAlign="LEFT")
    resumen.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), azul_claro),
        ("BOX", (0,0), (-1,-1), 0.6, colors.HexColor("#bfd1e3")),
        ("INNERGRID", (0,0), (-1,-1), 0.35, colors.HexColor("#bfd1e3")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    story.extend([resumen, Spacer(1, 5*mm)])
    story.append(Paragraph("<b>Documentación entregada</b> · La relación documental se incorpora a continuación siguiendo el orden de cierre establecido en el ERP.", estilos["MolsanSmall"]))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph("Recibido y conforme por parte del titular:", estilos["MolsanSmall"]))
    story.append(Spacer(1, 12*mm))
    story.append(Paragraph(f"{txt(nombre_cliente)} · DNI/NIF: {txt(nif_cliente)}", estilos["MolsanSmall"]))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph("Documento generado desde los registros actuales del ERP. Adjuntar una factura no equivale a registrar su pago; el resumen económico refleja exclusivamente pagos registrados.", estilos["MolsanTiny"]))
    doc_pdf.build(story)
    hoja.seek(0)

    orden = [
        ("Hoja de liquidación", None),
        ("Factura notarial", {"factura notarial", "factura notaria"}),
        ("Factura registro", {"factura registral", "factura registro"}),
        ("Factura Honorarios gestoría", {"honorarios gestoria", "factura honorarios gestoria"}),
        ("Copia simple", {"copia simple"}),
        ("Justificación de cancelación", {"justificante de cancelacion", "justificacion de cancelacion"}),
        ("AJD / ITP", {"ajd itp", "ajd itp "}),
        ("Hoja de inscripción", {"hoja de inscripcion", "documento de inscripcion"}),
    ]

    # Siempre se utiliza la hoja recién generada con el diseño aprobado.
    # No reutilizar una hoja antigua guardada en Carpeta digital: podría tener el diseño anterior.
    fuentes = [(0, "Hoja de liquidación", hoja.getvalue())]
    incluidos = ["Hoja de liquidación generada desde los datos actuales del expediente"]
    faltantes = []
    for etiqueta, alias in orden[1:]:
        alias_normalizados = {normalizar(a) for a in alias}
        coincidencias = [
            item for item in documentos
            if normalizar(item.categoria) in alias_normalizados
            and (str(item.nombre_original or "").lower().endswith(".pdf")
                 or str(item.tipo_mime or "").lower() == "application/pdf")
            and item.categoria != "Expediente digital completo"
        ]
        archivos_validos = []
        for item in coincidencias:
            ruta = _ruta_segura(item.nombre_guardado)
            if not ruta.is_file():
                continue
            try:
                contenido = ruta.read_bytes()
                if contenido.startswith(b"%PDF-"):
                    # Validar que el PDF sea legible antes de incorporarlo.
                    PdfReader(io.BytesIO(contenido), strict=False)
                    archivos_validos.append((item, contenido))
            except Exception:
                logger.warning("PDF de cierre omitido por estar dañado: expediente=%s documento=%s", expediente_id, item.id)
        if not archivos_validos:
            faltantes.append(etiqueta)
            continue
        for item, contenido in archivos_validos:
            fuentes.append((item.id, etiqueta, contenido))
            incluidos.append(item.nombre_original or etiqueta)

    writer = PdfWriter()
    for _, etiqueta, contenido in fuentes:
        try:
            reader = PdfReader(io.BytesIO(contenido), strict=False)
            for page in reader.pages:
                writer.add_page(page)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"No se ha podido unir el PDF «{etiqueta}»: {exc}")
    salida = io.BytesIO()
    writer.write(salida)
    contenido_final = salida.getvalue()
    if not contenido_final.startswith(b"%PDF-"):
        raise HTTPException(status_code=500, detail="No se ha podido generar el PDF de cierre.")

    import json
    from urllib.parse import quote
    metadata = {
        "documentos_incluidos": incluidos,
        "documentos_faltantes": faltantes,
        "paginas": len(writer.pages),
        "mensaje": (
            "Vista previa generada. Todavía no se ha guardado en Carpeta digital."
            if not faltantes else
            "Vista previa generada; faltan estas categorías: " + ", ".join(faltantes)
        ),
    }
    salida.seek(0)
    respuesta = StreamingResponse(salida, media_type="application/pdf")
    respuesta.headers["Content-Disposition"] = f'inline; filename="previsualizacion-cierre-{quote(str(expediente_id))}.pdf"'
    respuesta.headers["X-Cierre-Metadata"] = __import__("base64").b64encode(json.dumps(metadata, ensure_ascii=False).encode("utf-8")).decode("ascii")
    return respuesta


@router.post("/{expediente_id}/carpeta-digital/guardar-cierre-documental", response_model=DocumentoRespuesta, status_code=201)
async def guardar_cierre_documental(
    expediente_id: str,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Guarda únicamente el PDF que el usuario ha aceptado en la vista previa."""
    _expediente_existe(db, expediente_id)
    nombre_original = f"Expediente digital completo - {expediente_id}.pdf"
    contenido = await archivo.read(MAX_BYTES + 1)
    if len(contenido) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="El PDF de cierre supera el límite permitido.")
    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="El archivo aceptado no es un PDF válido.")
    from pypdf import PdfReader
    import io
    try:
        PdfReader(io.BytesIO(contenido), strict=False)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"El PDF no se puede leer: {exc}")

    nombre_guardado = f"{uuid.uuid4().hex}.pdf"
    ruta_final = _ruta_segura(nombre_guardado)
    temporal = _ruta_segura(f".{nombre_guardado}.part")
    anteriores = (
        db.query(DocumentoCarpetaDigital)
        .filter(DocumentoCarpetaDigital.expediente_id == str(expediente_id))
        .all()
    )
    anteriores = [d for d in anteriores if _normalizar_texto(d.categoria) == _normalizar_texto("Expediente digital completo")]
    try:
        temporal.write_bytes(contenido)
        temporal.replace(ruta_final)
        registro = DocumentoCarpetaDigital(
            expediente_id=str(expediente_id),
            categoria="Expediente digital completo",
            nombre_original=nombre_original,
            nombre_guardado=nombre_guardado,
            tipo_mime="application/pdf",
            tamano_bytes=len(contenido),
            fecha_subida=datetime.utcnow(),
        )
        db.add(registro)
        for anterior in anteriores:
            db.delete(anterior)
        db.commit()
        db.refresh(registro)
        for anterior in anteriores:
            try:
                _ruta_segura(anterior.nombre_guardado).unlink(missing_ok=True)
            except Exception:
                pass
        return registro
    except Exception:
        db.rollback()
        temporal.unlink(missing_ok=True)
        ruta_final.unlink(missing_ok=True)
        raise
    finally:
        await archivo.close()

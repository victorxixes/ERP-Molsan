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
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.storage import CARPETA_DIGITAL_DIR

# Toda la API de la carpeta digital exige una sesión JWT válida.
# El frontend de esta funcionalidad usa el cliente axios común, que añade el token.
router = APIRouter(
    prefix="/expedientes",
    tags=["Carpeta digital"],
    dependencies=[Depends(get_current_user)],
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

    nombre_original = Path(archivo.filename or "documento").name
    if not nombre_original or nombre_original in {".", ".."}:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido")

    try:
        contenido = await archivo.read(MAX_BYTES + 1)
        if len(contenido) > MAX_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"El archivo supera el límite de {MAX_BYTES // (1024 * 1024)} MB",
            )
        if not contenido:
            raise HTTPException(status_code=400, detail="El archivo está vacío")

        # Nombre aleatorio y extensión saneada; no se usa el nombre aportado como ruta.
        extension = Path(nombre_original).suffix[:20].lower()
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
                tipo_mime=archivo.content_type,
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
    return FileResponse(
        path=ruta,
        media_type=doc.tipo_mime or "application/octet-stream",
        filename=doc.nombre_original,
        content_disposition_type="inline",
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

    # Hoja de liquidación: se crea en cada generación con los datos guardados del expediente.
    hoja = io.BytesIO()
    estilos = getSampleStyleSheet()
    estilos.add(ParagraphStyle(name="MolsanTitle", parent=estilos["Title"], textColor=colors.HexColor("#172554"), fontSize=17, leading=21, spaceAfter=8))
    estilos.add(ParagraphStyle(name="MolsanSmall", parent=estilos["BodyText"], fontSize=9, leading=13))
    doc_pdf = SimpleDocTemplate(hoja, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    story = [
        Paragraph("MOLSAN · HOJA DE LIQUIDACIÓN", estilos["MolsanTitle"]),
        Paragraph(f"Expediente: {str(getattr(expediente, 'id_expediente', expediente_id) or expediente_id)}", estilos["Heading2"]),
        Spacer(1, 5*mm),
    ]
    campos = [
        ("Titular", getattr(expediente, "nombre_titular", None) or getattr(expediente, "nombre_solicitante", None) or "—"),
        ("NIF / CIF", getattr(expediente, "nif_titular", None) or getattr(expediente, "nif_solicitante", None) or "—"),
        ("Notario", getattr(expediente, "nombre_notario", None) or "—"),
        ("Fecha de liquidación", str(getattr(expediente, "fecha_fin_actividad", None) or datetime.utcnow().date())),
        ("Provisión inicial", f"{getattr(expediente, 'importe', None) if getattr(expediente, 'importe', None) is not None else '—'} €"),
        ("Saldo real", f"{getattr(expediente, 'saldo_real', None) if getattr(expediente, 'saldo_real', None) is not None else '—'} €"),
        ("Saldo disponible", f"{getattr(expediente, 'saldo_disponible', None) if getattr(expediente, 'saldo_disponible', None) is not None else '—'} €"),
        ("Estado", str(getattr(expediente, "estado_expediente", None) or "—")),
    ]
    tabla = Table([[Paragraph(f"<b>{k}</b>", estilos["MolsanSmall"]), Paragraph(str(v), estilos["MolsanSmall"])] for k, v in campos], colWidths=[48*mm, 112*mm])
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#eff6ff")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    story.extend([tabla, Spacer(1, 8*mm), Paragraph("Documento generado automáticamente desde los datos guardados en MOLSAN ERP.", estilos["MolsanSmall"])])
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

    hojas_existentes = [
        item for item in documentos
        if normalizar(item.categoria) == normalizar("Hoja de liquidación")
        and (str(item.nombre_original or "").lower().endswith(".pdf")
             or str(item.tipo_mime or "").lower() == "application/pdf")
    ]
    fuentes = []
    incluidos = []
    for item in hojas_existentes:
        ruta = _ruta_segura(item.nombre_guardado)
        if ruta.is_file():
            contenido = ruta.read_bytes()
            if contenido.startswith(b"%PDF-"):
                try:
                    PdfReader(io.BytesIO(contenido), strict=False)
                    fuentes.append((item.id, "Hoja de liquidación", contenido))
                    incluidos.append(item.nombre_original or "Hoja de liquidación")
                except Exception:
                    logger.warning("Hoja de liquidación dañada; se generará una nueva: expediente=%s documento=%s", expediente_id, item.id)
    if not fuentes:
        fuentes = [(0, "Hoja de liquidación", hoja.getvalue())]
        incluidos = ["Hoja de liquidación generada automáticamente"]
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

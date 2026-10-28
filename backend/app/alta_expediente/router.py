from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.models import Cliente, Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.ctn.models import Notaria
from backend.app.tipos_expediente.models import TipoExpediente
from backend.app.tipos_expediente.router import asegurar_catalogo_inicial
from backend.app.provisiones.router import _cabecera_visual_pdf, _plantilla_pdf_provision

router = APIRouter(prefix="/alta-expediente", tags=["Alta manual de expediente"])


class FacturacionInput(BaseModel):
    nombre: str = ""
    nif: str = ""
    direccion: str = ""
    codigo_postal: str = ""
    poblacion: str = ""
    provincia: str = ""
    telefono: str = ""
    email: str = ""


class FincaInput(BaseModel):
    finca: str = ""
    cru_idufir: str = ""
    registro: str = ""
    provincia: str = ""
    poblacion: str = ""
    seccion: str = ""
    inscripcion: str = ""
    cuantia: str = ""
    contrato: str = ""
    entidad_original: str = ""


class HipotecaInput(BaseModel):
    acreedor: str = ""
    numero: str = ""
    capital: Optional[float] = None
    contrato: str = ""
    observaciones: str = ""


class AltaExpedienteInput(BaseModel):
    tipo_expediente_id: int
    fecha_alta: Optional[date] = None
    titular: str = ""
    nif_titular: str = ""
    solicitante: str = ""
    nif_solicitante: str = ""
    contrato: str = ""
    numero_contrato: str = ""
    observaciones: str = ""
    notario_id: Optional[int] = None
    facturacion: FacturacionInput = Field(default_factory=FacturacionInput)
    fincas: list[FincaInput] = Field(default_factory=list)
    hipotecas: list[HipotecaInput] = Field(default_factory=list)


def preparar_esquema(db: Session) -> None:
    # Compatible con bases existentes: las nuevas columnas se añaden sin borrar datos.
    db.execute(text("ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS tipo_expediente_id INTEGER"))
    db.execute(text("ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS numero_tipo_expediente INTEGER"))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS expediente_hipotecas (
            id SERIAL PRIMARY KEY,
            expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
            acreedor VARCHAR(300),
            numero VARCHAR(200),
            capital DOUBLE PRECISION,
            contrato VARCHAR(200),
            observaciones VARCHAR(1000)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS alta_expediente_contadores (
            anio INTEGER PRIMARY KEY,
            ultimo_numero INTEGER NOT NULL DEFAULT 0
        )
    """))


@router.get("/catalogos")
def catalogos_alta(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    asegurar_catalogo_inicial(db)
    tipos = db.query(TipoExpediente).filter(TipoExpediente.activo.is_(True)).order_by(TipoExpediente.id).all()
    notarios = db.query(Notaria).order_by(Notaria.apellidos.asc().nullslast(), Notaria.nombre.asc().nullslast()).all()
    return {
        "tipos": [{"id": t.id, "nombre": t.nombre, "grupo": t.grupo} for t in tipos],
        "notarios": [{
            "id": n.id,
            "nombre": " ".join(v for v in [n.nombre, n.apellidos] if v),
            "nif": n.nif or "",
            "poblacion": n.municipio or "",
            "provincia": n.provincia or "",
        } for n in notarios],
    }


@router.get("/siguiente-numero/{tipo_id}")
def siguiente_numero(tipo_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    preparar_esquema(db)
    tipo = db.query(TipoExpediente).filter(TipoExpediente.id == tipo_id, TipoExpediente.activo.is_(True)).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de expediente no encontrado o inactivo.")
    if "caixabank" in (tipo.nombre or "").casefold():
        ultimo = db.query(func.max(Expediente.numero_tipo_expediente)).filter(
            Expediente.tipo_expediente_id == tipo_id
        ).scalar() or 0
        siguiente = int(ultimo) + 1
        identificador = f"ALTA-{tipo_id}-{siguiente:05d}"
    else:
        anio = date.today().year
        ultimo = db.execute(text(
            "SELECT ultimo_numero FROM alta_expediente_contadores WHERE anio = :anio"
        ), {"anio": anio}).scalar() or 0
        siguiente = int(ultimo) + 1
        identificador = f"{siguiente:05d}{anio}"
    db.commit()
    return {"tipo_expediente_id": tipo_id, "siguiente_numero": siguiente, "identificador_previo": identificador}


@router.post("", status_code=201)
def crear_alta_expediente(datos: AltaExpedienteInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    try:
        preparar_esquema(db)
        tipo = db.query(TipoExpediente).filter(
            TipoExpediente.id == datos.tipo_expediente_id,
            TipoExpediente.activo.is_(True),
        ).first()
        if not tipo:
            raise HTTPException(status_code=400, detail="Selecciona un tipo de expediente activo.")

        if "caixabank" in (tipo.nombre or "").casefold():
            # CaixaBank conserva el contador histórico independiente por tipo.
            if db.get_bind().dialect.name == "postgresql":
                db.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": 731208640 + datos.tipo_expediente_id})
            ultimo = db.query(func.max(Expediente.numero_tipo_expediente)).filter(
                Expediente.tipo_expediente_id == datos.tipo_expediente_id
            ).scalar() or 0
            numero = int(ultimo) + 1
            identificador = f"ALTA-{datos.tipo_expediente_id}-{numero:05d}"
        else:
            # Contador global anual para las altas manuales no CaixaBank.
            anio = date.today().year
            if db.get_bind().dialect.name == "postgresql":
                db.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": 731208639})
            db.execute(text("""
                INSERT INTO alta_expediente_contadores (anio, ultimo_numero)
                VALUES (:anio, 0)
                ON CONFLICT (anio) DO NOTHING
            """), {"anio": anio})
            if db.get_bind().dialect.name == "postgresql":
                ultimo = db.execute(text(
                    "SELECT ultimo_numero FROM alta_expediente_contadores WHERE anio = :anio FOR UPDATE"
                ), {"anio": anio}).scalar() or 0
            else:
                ultimo = db.execute(text(
                    "SELECT ultimo_numero FROM alta_expediente_contadores WHERE anio = :anio"
                ), {"anio": anio}).scalar() or 0
            numero = int(ultimo) + 1
            db.execute(text(
                "UPDATE alta_expediente_contadores SET ultimo_numero = :numero WHERE anio = :anio"
            ), {"numero": numero, "anio": anio})
            identificador = f"{numero:05d}{anio}"

        if db.query(Expediente.id).filter(Expediente.id_expediente == identificador).first():
            raise HTTPException(status_code=409, detail="El número generado ya existe. Actualiza el formulario e inténtalo de nuevo.")

        f = datos.facturacion
        cliente = Cliente(
            nombre_completo=datos.titular.strip() or f.nombre.strip() or None,
            dni=datos.nif_titular.strip() or None,
            nombre_facturacion=f.nombre.strip() or None,
            dni_facturacion=f.nif.strip() or None,
            direccion_facturacion=f.direccion.strip() or None,
            codigo_postal_facturacion=f.codigo_postal.strip() or None,
            poblacion_facturacion=f.poblacion.strip() or None,
            provincia_facturacion=f.provincia.strip() or None,
            telefono_facturacion=f.telefono.strip() or None,
            email_facturacion=f.email.strip() or None,
        )
        db.add(cliente)
        db.flush()

        notario = db.query(Notaria).filter(Notaria.id == datos.notario_id).first() if datos.notario_id else None
        expediente = Expediente(
            cliente_id=cliente.id,
            id_expediente=identificador,
            tipo_expediente_id=datos.tipo_expediente_id,
            numero_tipo_expediente=numero,
            fecha_alta=datos.fecha_alta or date.today(),
            estado_expediente="PVA",
            estado_actividad="Pendiente",
            actividad_actual="Documentación previa",
            nombre_titular=datos.titular.strip() or None,
            nif_titular=datos.nif_titular.strip() or None,
            nombre_solicitante=datos.solicitante.strip() or None,
            nif_solicitante=datos.nif_solicitante.strip() or None,
            contrato=datos.contrato.strip() or datos.numero_contrato.strip() or None,
            observaciones=datos.observaciones.strip() or None,
            facturacion_nombre=f.nombre.strip() or None,
            facturacion_dni_nif=f.nif.strip() or None,
            facturacion_direccion=f.direccion.strip() or None,
            facturacion_codigo_postal=f.codigo_postal.strip() or None,
            facturacion_poblacion=f.poblacion.strip() or None,
            facturacion_provincia=f.provincia.strip() or None,
            facturacion_telefono=f.telefono.strip() or None,
            facturacion_email=f.email.strip() or None,
            notario_id=notario.id if notario else None,
            nombre_notario=(" ".join(v for v in [notario.nombre, notario.apellidos] if v) if notario else None),
            nif_notario=(notario.nif if notario else None),
            poblacion=(notario.municipio if notario else None),
            provincia=(notario.provincia if notario else None),
        )
        db.add(expediente)
        db.flush()

        for finca in datos.fincas:
            if not any([finca.finca.strip(), finca.cru_idufir.strip(), finca.registro.strip()]):
                continue
            db.add(ExpedienteFinca(
                expediente_id=expediente.id,
                finca=finca.finca.strip() or None,
                cru_idufir=finca.cru_idufir.strip() or None,
                registro=finca.registro.strip() or None,
                provincia=finca.provincia.strip() or None,
                poblacion=finca.poblacion.strip() or None,
                seccion=finca.seccion.strip() or None,
                inscripcion=finca.inscripcion.strip() or None,
                cuantia=finca.cuantia.strip() or None,
                contrato=finca.contrato.strip() or None,
                entidad_original=finca.entidad_original.strip() or None,
            ))

        for hipoteca in datos.hipotecas:
            if not any([hipoteca.acreedor.strip(), hipoteca.numero.strip(), hipoteca.contrato.strip()]):
                continue
            db.execute(text("""
                INSERT INTO expediente_hipotecas (expediente_id, acreedor, numero, capital, contrato, observaciones)
                VALUES (:expediente_id, :acreedor, :numero, :capital, :contrato, :observaciones)
            """), {
                "expediente_id": expediente.id,
                "acreedor": hipoteca.acreedor.strip() or None,
                "numero": hipoteca.numero.strip() or None,
                "capital": hipoteca.capital,
                "contrato": hipoteca.contrato.strip() or None,
                "observaciones": hipoteca.observaciones.strip() or None,
            })

        db.commit()
        return {
            "ok": True,
            "id": expediente.id,
            "id_expediente": expediente.id_expediente,
            "numero_tipo_expediente": numero,
            "tipo_expediente": tipo.nombre,
            "mensaje": f"Expediente {identificador} creado correctamente.",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo crear el expediente: {str(exc)[:350]}") from exc


@router.get("/{expediente_id}/documento", summary="Generar ficha PDF de alta de expediente")
def documento_alta_expediente(
    expediente_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Genera una ficha imprimible con el mismo encabezado corporativo que Provisiones."""
    expediente = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    cliente = db.query(Cliente).filter(Cliente.id == expediente.cliente_id).first()
    tipo = db.query(TipoExpediente).filter(TipoExpediente.id == expediente.tipo_expediente_id).first() if expediente.tipo_expediente_id else None
    fincas = db.query(ExpedienteFinca).filter(ExpedienteFinca.expediente_id == expediente.id).all()
    hipotecas = db.execute(text("""
        SELECT acreedor, numero, capital, contrato, observaciones
        FROM expediente_hipotecas WHERE expediente_id = :id ORDER BY id
    """), {"id": expediente.id}).mappings().all()

    plantilla = _plantilla_pdf_provision(db)
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, rightMargin=17*mm, leftMargin=17*mm,
        topMargin=15*mm, bottomMargin=18*mm,
        title=f"Ficha de expediente {expediente.id_expediente or expediente.id}",
        author="MOLSAN GESTIÓN Y TRAMITACIÓN, S.L.",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="AltaTitulo", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor("#15325b"), alignment=TA_RIGHT, spaceAfter=2*mm))
    styles.add(ParagraphStyle(name="AltaTexto", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=colors.HexColor("#26364b")))
    styles.add(ParagraphStyle(name="AltaEtiqueta", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.HexColor("#58677c")))
    styles.add(ParagraphStyle(name="AltaCelda", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#26364b")))
    styles.add(ParagraphStyle(name="AltaCeldaBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#15325b")))
    styles.add(ParagraphStyle(name="AltaSeccion", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=colors.HexColor("#15325b"), spaceBefore=3*mm, spaceAfter=2*mm))

    def par(valor, estilo="AltaCelda"):
        texto = "—" if valor is None or str(valor).strip() == "" else str(valor)
        return Paragraph(escape(texto).replace("\n", "<br/>"), styles[estilo])

    def tabla_campos(pares, anchos=None):
        filas = []
        for i in range(0, len(pares), 2):
            a = pares[i]
            b = pares[i+1] if i+1 < len(pares) else ("", "")
            filas.append([par(a[0], "AltaEtiqueta"), par(a[1]), par(b[0], "AltaEtiqueta"), par(b[1])])
        tabla = Table(filas, colWidths=anchos or [27*mm, 61*mm, 27*mm, 61*mm], hAlign="LEFT")
        tabla.setStyle(TableStyle([
            ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#d5deea")),
            ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f3f6fa")),
            ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#f3f6fa")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
            ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ]))
        return tabla

    story = [
        _cabecera_visual_pdf(plantilla),
        Spacer(1, 3*mm),
        Paragraph("FICHA DE EXPEDIENTE", styles["AltaTitulo"]),
        Paragraph(
            f"Referencia: <b>{escape(str(expediente.id_expediente or expediente.id))}</b>"
            f" &nbsp;&nbsp; Tipo: <b>{escape(str(tipo.nombre if tipo else '—'))}</b>"
            f" &nbsp;&nbsp; Fecha de alta: <b>{expediente.fecha_alta.strftime('%d/%m/%Y') if expediente.fecha_alta else '—'}</b>",
            styles["AltaTexto"],
        ),
        Paragraph("1. IDENTIFICACIÓN Y CONTRATO", styles["AltaSeccion"]),
        tabla_campos([
            ("Titular", expediente.nombre_titular), ("NIF titular", expediente.nif_titular),
            ("Solicitante", expediente.nombre_solicitante), ("NIF solicitante", expediente.nif_solicitante),
            ("Contrato", expediente.contrato), ("Número de contrato", getattr(expediente, "numero_contrato", None)),
            ("Estado", getattr(expediente, "estado_expediente", None)), ("Actividad actual", getattr(expediente, "actividad_actual", None)),
        ]),
        Paragraph("2. DATOS DE FACTURACIÓN", styles["AltaSeccion"]),
        tabla_campos([
            ("Nombre / razón social", getattr(expediente, "facturacion_nombre", None) or (getattr(cliente, "nombre_facturacion", None) if cliente else None)),
            ("NIF / CIF", getattr(expediente, "facturacion_dni_nif", None) or (getattr(cliente, "dni_facturacion", None) if cliente else None)),
            ("Dirección", getattr(expediente, "facturacion_direccion", None) or (getattr(cliente, "direccion_facturacion", None) if cliente else None)),
            ("Código postal", getattr(expediente, "facturacion_codigo_postal", None) or (getattr(cliente, "codigo_postal_facturacion", None) if cliente else None)),
            ("Población", getattr(expediente, "facturacion_poblacion", None) or (getattr(cliente, "poblacion_facturacion", None) if cliente else None)),
            ("Provincia", getattr(expediente, "facturacion_provincia", None) or (getattr(cliente, "provincia_facturacion", None) if cliente else None)),
            ("Teléfono", getattr(expediente, "facturacion_telefono", None) or (getattr(cliente, "telefono_facturacion", None) if cliente else None)),
            ("Correo electrónico", getattr(expediente, "facturacion_email", None) or (getattr(cliente, "email_facturacion", None) if cliente else None)),
        ]),
    ]

    story.append(Paragraph("3. FINCAS Y REGISTROS", styles["AltaSeccion"]))
    if fincas:
        filas = [[par("FINCA", "AltaEtiqueta"), par("CRU / IDUFIR", "AltaEtiqueta"), par("REGISTRO", "AltaEtiqueta"), par("POBLACIÓN / PROVINCIA", "AltaEtiqueta"), par("CUANTÍA", "AltaEtiqueta")]]
        for finca in fincas:
            filas.append([
                par(getattr(finca, "finca", None)), par(getattr(finca, "cru_idufir", None)),
                par(getattr(finca, "registro", None)),
                par(" · ".join(x for x in [getattr(finca, "poblacion", None), getattr(finca, "provincia", None)] if x)),
                par(getattr(finca, "cuantia", None)),
            ])
        t = Table(filas, colWidths=[25*mm, 34*mm, 38*mm, 48*mm, 31*mm], repeatRows=1, hAlign="LEFT")
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eaf0f8")),
            ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#cdd6e2")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
            ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ]))
        story.append(t)
    else:
        story.append(par("No se han registrado fincas."))

    story.append(Paragraph("4. HIPOTECAS", styles["AltaSeccion"]))
    if hipotecas:
        filas = [[par("ENTIDAD ACREEDORA", "AltaEtiqueta"), par("NÚMERO", "AltaEtiqueta"), par("CAPITAL", "AltaEtiqueta"), par("CONTRATO", "AltaEtiqueta"), par("OBSERVACIONES", "AltaEtiqueta")]]
        for hipoteca in hipotecas:
            filas.append([par(hipoteca.get("acreedor")), par(hipoteca.get("numero")), par(hipoteca.get("capital")), par(hipoteca.get("contrato")), par(hipoteca.get("observaciones"))])
        t = Table(filas, colWidths=[39*mm, 28*mm, 25*mm, 34*mm, 50*mm], repeatRows=1, hAlign="LEFT")
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eaf0f8")),
            ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#cdd6e2")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
            ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ]))
        story.append(t)
    else:
        story.append(par("No se han registrado hipotecas."))

    story.append(Paragraph("5. NOTARÍA CTN", styles["AltaSeccion"]))
    story.append(tabla_campos([
        ("Notario / notaría", getattr(expediente, "nombre_notario", None)),
        ("NIF notario", getattr(expediente, "nif_notario", None)),
        ("Población", getattr(expediente, "poblacion", None)),
        ("Provincia", getattr(expediente, "provincia", None)),
    ]))
    story.append(Paragraph("6. OBSERVACIONES", styles["AltaSeccion"]))
    story.append(par(getattr(expediente, "observaciones", None) or "Sin observaciones."))

    def pie(canvas, documento):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#d7dfeb"))
        canvas.line(17*mm, 13*mm, A4[0]-17*mm, 13*mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#58677c"))
        canvas.drawString(17*mm, 8.5*mm, f"ERP-Molsan · Ficha {str(expediente.id_expediente or expediente.id)}"[:110])
        canvas.drawRightString(A4[0]-17*mm, 8.5*mm, f"Página {documento.page}")
        canvas.restoreState()

    try:
        doc.build(story, onFirstPage=pie, onLaterPages=pie)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo generar la ficha PDF: {str(exc)[:250]}") from exc
    buffer.seek(0)
    filename = "".join(c for c in str(expediente.id_expediente or expediente.id) if c.isalnum() or c in "-_") or f"expediente-{expediente.id}"
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="ficha-{filename}.pdf"', "Cache-Control": "no-store"})

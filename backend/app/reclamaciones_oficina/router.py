import os
import smtplib
from email.message import EmailMessage
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey, text
from sqlalchemy.orm import Session

from backend.app.database import Base, get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request

router = APIRouter(
    prefix="/expedientes",
    tags=["Reclamaciones a oficina"],
    dependencies=[Depends(get_current_user), Depends(validar_visibilidad_expediente_request)],
)


class EmailReclamacion(Base):
    __tablename__ = "expediente_reclamaciones_email"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(Integer, ForeignKey("expedientes.id"), nullable=False, index=True)
    id_expediente = Column(String(100), nullable=True, index=True)
    remitente = Column(String(320), nullable=True)
    destinatario = Column(String(320), nullable=False)
    asunto = Column(String(1000), nullable=False)
    cuerpo = Column(Text, nullable=False)
    cc = Column(String(1000), nullable=True)
    categoria = Column(String(120), nullable=True)
    plantilla_id = Column(Integer, nullable=True)
    plantilla_nombre = Column(String(180), nullable=True)
    estado = Column(String(40), nullable=False, default="pendiente")
    detalle = Column(Text, nullable=True)
    enviado_por_id = Column(Integer, nullable=True)
    enviado_por = Column(String(300), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


class ReclamacionEnviar(BaseModel):
    destinatario: str
    cc: str = ""
    asunto: str
    cuerpo: str
    categoria: str = ""
    plantilla_id: int | None = None
    plantilla_nombre: str = ""


def _asegurar_columnas_historico(db: Session):
    for sentencia in (
        "ALTER TABLE expediente_reclamaciones_email ADD COLUMN IF NOT EXISTS cc VARCHAR(1000)",
        "ALTER TABLE expediente_reclamaciones_email ADD COLUMN IF NOT EXISTS categoria VARCHAR(120)",
        "ALTER TABLE expediente_reclamaciones_email ADD COLUMN IF NOT EXISTS plantilla_id INTEGER",
        "ALTER TABLE expediente_reclamaciones_email ADD COLUMN IF NOT EXISTS plantilla_nombre VARCHAR(180)",
    ):
        db.execute(text(sentencia))
    db.commit()


def _texto(valor):
    return "" if valor is None else str(valor).strip()


@router.get("/{id_expediente}/reclamaciones-oficina/historico")
def historico_reclamaciones(
    id_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_columnas_historico(db)
    expediente = db.query(Expediente).filter(Expediente.id_expediente == id_expediente).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    filas = (
        db.query(EmailReclamacion)
        .filter(EmailReclamacion.expediente_id == expediente.id)
        .order_by(EmailReclamacion.creado_en.desc())
        .all()
    )
    return [{
        "id": fila.id,
        "id_expediente": fila.id_expediente,
        "remitente": fila.remitente,
        "destinatario": fila.destinatario,
        "asunto": fila.asunto,
        "cuerpo": fila.cuerpo,
        "cc": fila.cc,
        "categoria": fila.categoria,
        "plantilla_id": fila.plantilla_id,
        "plantilla_nombre": fila.plantilla_nombre,
        "estado": fila.estado,
        "detalle": fila.detalle,
        "enviado_por": fila.enviado_por,
        "creado_en": fila.creado_en.isoformat() if fila.creado_en else None,
    } for fila in filas]


@router.post("/{id_expediente}/reclamaciones-oficina/enviar")
def enviar_reclamacion(
    id_expediente: str,
    datos: ReclamacionEnviar,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_columnas_historico(db)
    expediente = db.query(Expediente).filter(Expediente.id_expediente == id_expediente).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    destinatario = _texto(datos.destinatario)
    asunto = _texto(datos.asunto)
    cuerpo = _texto(datos.cuerpo)
    cc = _texto(datos.cc)
    if not destinatario or "@" not in destinatario:
        raise HTTPException(status_code=400, detail="Introduce un email válido de la oficina")
    if not asunto or not cuerpo:
        raise HTTPException(status_code=400, detail="El asunto y el cuerpo son obligatorios")

    nombre = " ".join(filter(None, [_texto(getattr(usuario, "nombre", "")), _texto(getattr(usuario, "apellidos", ""))]))
    # El remitente visible y real debe ser el email de empresa de la FichaEmpleado.
    # No sustituirlo silenciosamente por el correo personal ni por el remitente genérico SMTP.
    remitente = _texto(getattr(usuario, "email_empresa", ""))
    if not remitente or "@" not in remitente:
        raise HTTPException(
            status_code=400,
            detail="El empleado no tiene un Email de empresa válido en FichaEmpleado > Datos básicos. Complétalo antes de enviar.",
        )

    # Firma automática: datos personales del empleado + pie corporativo configurado en Catálogos.
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS correspondencia_configuracion (
                id INTEGER PRIMARY KEY,
                firma_pie TEXT NOT NULL DEFAULT '',
                factura_nombre VARCHAR(255),
                factura_tipo VARCHAR(160),
                factura_contenido BYTEA,
                actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT correspondencia_configuracion_unica CHECK (id = 1)
            )
        """))
        db.execute(text("""
            INSERT INTO correspondencia_configuracion (id, firma_pie)
            VALUES (1, '') ON CONFLICT (id) DO NOTHING
        """))
        config_firma = db.execute(text("""
            SELECT firma_pie
            FROM correspondencia_configuracion WHERE id = 1
        """)).mappings().first()
        departamento = db.execute(text("SELECT nombre FROM departamentos WHERE id = :id"), {"id": getattr(usuario, "departamento_id", None)}).scalar() if getattr(usuario, "departamento_id", None) else ""
        cargo = db.execute(text("SELECT nombre FROM cargos WHERE id = :id"), {"id": getattr(usuario, "cargo_id", None)}).scalar() if getattr(usuario, "cargo_id", None) else ""
        lineas_personales = [nombre, " · ".join(x for x in [departamento or "", cargo or ""] if x)]
        firma_personal = "\n".join(x for x in lineas_personales if x)
        firma_pie = (config_firma["firma_pie"] or "").strip() if config_firma else ""
        cuerpo = "\n\n".join(x for x in [cuerpo, firma_personal, firma_pie] if x)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo preparar la firma corporativa del email.")

    registro = EmailReclamacion(
        expediente_id=expediente.id,
        id_expediente=expediente.id_expediente,
        remitente=remitente,
        destinatario=destinatario,
        asunto=asunto,
        cuerpo=cuerpo,
        cc=cc or None,
        categoria=_texto(datos.categoria) or None,
        plantilla_id=datos.plantilla_id,
        plantilla_nombre=_texto(datos.plantilla_nombre) or None,
        estado="error",
        enviado_por_id=getattr(usuario, "id", None),
        enviado_por=nombre or _texto(getattr(usuario, "usuario", "")),
    )
    db.add(registro)
    db.flush()

    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    # El encabezado From del email enviado coincide con el email de empresa del empleado.
    # SMTP_FROM deja de sobreescribir el remitente empresarial mostrado en el ERP.
    from_email = remitente

    if not host:
        registro.detalle = "Envío no realizado: falta SMTP_HOST en las variables de entorno del backend."
        db.commit()
        raise HTTPException(status_code=503, detail=registro.detalle)

    mensaje = EmailMessage()
    mensaje["Subject"] = asunto
    mensaje["From"] = from_email
    if remitente and remitente.lower() != from_email.lower():
        mensaje["Reply-To"] = remitente
    mensaje["To"] = destinatario
    if cc:
        mensaje["Cc"] = cc
    mensaje.set_content(cuerpo)
    # La plantilla de factura de honorarios nunca se adjunta a correos.
    # Se gestiona exclusivamente desde el flujo «Factura de honorario» de FichaExpediente.

    try:
        with smtplib.SMTP(host, port, timeout=25) as servidor:
            servidor.ehlo()
            if os.getenv("SMTP_STARTTLS", "true").strip().lower() in {"1", "true", "yes", "si"}:
                servidor.starttls()
                servidor.ehlo()
            if smtp_user:
                servidor.login(smtp_user, smtp_password)
            servidor.send_message(mensaje)
        registro.estado = "enviado"
        registro.detalle = "Email aceptado por el servidor SMTP."
        db.commit()
        db.refresh(registro)
        return {"ok": True, "mensaje": "Email enviado correctamente", "id": registro.id, "estado": registro.estado}
    except Exception as error:
        registro.estado = "error"
        registro.detalle = f"Error SMTP: {str(error)[:1500]}"
        db.commit()
        raise HTTPException(status_code=502, detail="No se pudo enviar el email. Consulta el histórico para ver el detalle.")

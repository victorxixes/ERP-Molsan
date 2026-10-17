import os
import smtplib
from email.message import EmailMessage
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Session

from backend.app.database import Base, get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.models import Expediente

router = APIRouter(prefix="/expedientes", tags=["Reclamaciones a oficina"])


class EmailReclamacion(Base):
    __tablename__ = "expediente_reclamaciones_email"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(Integer, ForeignKey("expedientes.id"), nullable=False, index=True)
    id_expediente = Column(String(100), nullable=True, index=True)
    remitente = Column(String(320), nullable=True)
    destinatario = Column(String(320), nullable=False)
    asunto = Column(String(1000), nullable=False)
    cuerpo = Column(Text, nullable=False)
    estado = Column(String(40), nullable=False, default="pendiente")
    detalle = Column(Text, nullable=True)
    enviado_por_id = Column(Integer, nullable=True)
    enviado_por = Column(String(300), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


class ReclamacionEnviar(BaseModel):
    destinatario: str
    asunto: str
    cuerpo: str


def _texto(valor):
    return "" if valor is None else str(valor).strip()


@router.get("/{id_expediente}/reclamaciones-oficina/historico")
def historico_reclamaciones(
    id_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
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
    expediente = db.query(Expediente).filter(Expediente.id_expediente == id_expediente).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    destinatario = _texto(datos.destinatario)
    asunto = _texto(datos.asunto)
    cuerpo = _texto(datos.cuerpo)
    if not destinatario or "@" not in destinatario:
        raise HTTPException(status_code=400, detail="Introduce un email válido de la oficina")
    if not asunto or not cuerpo:
        raise HTTPException(status_code=400, detail="El asunto y el cuerpo son obligatorios")

    nombre = " ".join(filter(None, [_texto(getattr(usuario, "nombre", "")), _texto(getattr(usuario, "apellidos", ""))]))
    remitente = _texto(getattr(usuario, "email_empresa", "")) or _texto(getattr(usuario, "email_personal", ""))

    registro = EmailReclamacion(
        expediente_id=expediente.id,
        id_expediente=expediente.id_expediente,
        remitente=remitente or os.getenv("SMTP_FROM", ""),
        destinatario=destinatario,
        asunto=asunto,
        cuerpo=cuerpo,
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
    from_email = os.getenv("SMTP_FROM", "").strip() or remitente

    if not host or not from_email:
        registro.detalle = "Envío no realizado: faltan SMTP_HOST o SMTP_FROM en las variables de entorno del backend."
        db.commit()
        raise HTTPException(status_code=503, detail=registro.detalle)

    mensaje = EmailMessage()
    mensaje["Subject"] = asunto
    mensaje["From"] = from_email
    mensaje["To"] = destinatario
    mensaje.set_content(cuerpo)

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

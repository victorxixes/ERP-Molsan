from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from backend.app.database import Base


class IntranetAuditoria(Base):
    """Histórico de acciones realizadas sobre noticias y documentos internos."""

    __tablename__ = "intranet_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("empleados.id"), nullable=True, index=True)
    usuario_nombre = Column(String(300), nullable=False, default="Usuario")
    accion = Column(String(40), nullable=False, index=True)
    recurso = Column(String(40), nullable=False, index=True)
    recurso_id = Column(Integer, nullable=True, index=True)
    detalle = Column(Text, nullable=True)
    fecha = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)


def registrar_auditoria(db, usuario, accion: str, recurso: str, recurso_id=None, detalle=None):
    """Registra actor y acción sin exponer datos sensibles al cliente."""
    try:
        nombre = " ".join(
            str(getattr(usuario, campo, "") or "").strip()
            for campo in ("nombre", "apellidos")
        ).strip()
        if not nombre:
            nombre = (
                getattr(usuario, "username", None)
                or getattr(usuario, "email", None)
                or f"Empleado #{getattr(usuario, 'id', 'desconocido')}"
            )
        evento = IntranetAuditoria(
            usuario_id=getattr(usuario, "id", None),
            usuario_nombre=nombre,
            accion=accion,
            recurso=recurso,
            recurso_id=recurso_id,
            detalle=(str(detalle)[:2000] if detalle else None),
            fecha=datetime.utcnow(),
        )
        db.add(evento)
        db.commit()
    except Exception as exc:
        db.rollback()
        # No ocultar el fallo de auditoría en los logs del servidor.
        print(f"[INTRANET AUDITORIA] No se pudo guardar el evento: {exc!r}", flush=True)

from sqlalchemy import Column, Integer, String, DateTime, Date, LargeBinary, ForeignKey, func
from sqlalchemy.orm import relationship
from backend.app.database import Base


class FichajeMarcaje(Base):
    __tablename__ = "fichajes_marcajes"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(40), nullable=False, index=True)
    fecha_hora = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    observaciones = Column(String(500), nullable=True)
    creado_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    empleado = relationship("Empleado", foreign_keys=[empleado_id])


class FichajeDocumento(Base):
    __tablename__ = "fichajes_documentos"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo_justificante = Column(String(100), nullable=False)
    fecha_documento = Column(Date, nullable=False, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    content_type = Column(String(150), nullable=True)
    contenido = Column(LargeBinary, nullable=False)
    tamano_bytes = Column(Integer, nullable=False, default=0)
    subido_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    subido_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    empleado = relationship("Empleado", foreign_keys=[empleado_id])

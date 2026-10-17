from datetime import datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text,
    BigInteger, Index,
)
from backend.app.database import Base


class EncargoExterno(Base):
    __tablename__ = "encargagest_encargos"

    id = Column(Integer, primary_key=True, index=True)
    referencia = Column(String(40), unique=True, nullable=True, index=True)
    notaria_id = Column(Integer, ForeignKey("ctn_notarios.id"), nullable=False, index=True)
    notaria_nombre = Column(String(300), nullable=False)
    notaria_nif = Column(String(50), nullable=True, index=True)
    contacto_nombre = Column(String(200), nullable=True)
    contacto_email = Column(String(320), nullable=True)
    contacto_telefono = Column(String(60), nullable=True)
    tipo_encargo = Column(String(120), nullable=False, default="Cancelación hipotecaria")
    titular = Column(String(300), nullable=False)
    nif_titular = Column(String(50), nullable=True, index=True)
    entidad_bancaria = Column(String(200), nullable=True)
    numero_prestamo = Column(String(150), nullable=True)
    importe = Column(Numeric(14, 2), nullable=True)
    fecha_objetivo = Column(Date, nullable=True)
    prioridad = Column(String(20), nullable=False, default="Normal")
    estado = Column(String(40), nullable=False, default="RECIBIDO", index=True)
    observaciones = Column(Text, nullable=True)
    observaciones_internas = Column(Text, nullable=True)
    creado_por_id = Column(Integer, nullable=True)
    creado_por_nombre = Column(String(300), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EncargoExternoDocumento(Base):
    __tablename__ = "encargagest_documentos"

    id = Column(Integer, primary_key=True, index=True)
    encargo_id = Column(Integer, ForeignKey("encargagest_encargos.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_original = Column(String(500), nullable=False)
    nombre_guardado = Column(String(200), nullable=False, unique=True)
    tipo_mime = Column(String(255), nullable=True)
    tamano_bytes = Column(BigInteger, nullable=False, default=0)
    subido_por_id = Column(Integer, nullable=True)
    subido_por_nombre = Column(String(300), nullable=True)
    fecha_subida = Column(DateTime, nullable=False, default=datetime.utcnow)


class EncargoExternoActividad(Base):
    __tablename__ = "encargagest_actividad"

    id = Column(Integer, primary_key=True, index=True)
    encargo_id = Column(Integer, ForeignKey("encargagest_encargos.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(40), nullable=False, default="COMENTARIO")
    mensaje = Column(Text, nullable=False)
    visible_notaria = Column(Boolean, nullable=False, default=True)
    autor_id = Column(Integer, nullable=True)
    autor_nombre = Column(String(300), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


Index("ix_encargagest_estado_fecha", EncargoExterno.estado, EncargoExterno.creado_en)
Index("ix_encargagest_notaria_fecha", EncargoExterno.notaria_id, EncargoExterno.creado_en)

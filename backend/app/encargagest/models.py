from datetime import datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text,
    BigInteger, Index, JSON,
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
    capital_inscrito = Column(Numeric(14, 2), nullable=True)
    fecha_constitucion = Column(Date, nullable=True)
    numero_finca = Column(String(150), nullable=True)
    municipio_registro = Column(String(200), nullable=True)
    registro_propiedad = Column(String(200), nullable=True)
    importe = Column(Numeric(14, 2), nullable=True)
    fecha_objetivo = Column(Date, nullable=True)
    prioridad = Column(String(20), nullable=False, default="Normal")
    estado = Column(String(40), nullable=False, default="RECIBIDO", index=True)
    observaciones = Column(Text, nullable=True)
    contratos_json = Column(JSON, nullable=True)
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
    categoria = Column(String(120), nullable=False, default="Otros")
    contrato_index = Column(Integer, nullable=False, default=0, index=True)
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


class EncargoExternoUsuario(Base):
    __tablename__ = "encargagest_usuarios"

    id = Column(Integer, primary_key=True, index=True)
    notaria_id = Column(Integer, ForeignKey("ctn_notarios.id"), nullable=False, unique=True, index=True)
    usuario = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    password_enc = Column(Text, nullable=True)
    habilitado = Column(Boolean, nullable=False, default=True)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

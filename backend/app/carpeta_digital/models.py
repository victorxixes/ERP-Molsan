from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, BigInteger, Index
from backend.app.database import Base

class DocumentoCarpetaDigital(Base):
    __tablename__ = "expediente_documentos_digitales"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(String(100), nullable=False, index=True)
    categoria = Column(String(120), nullable=False, index=True)
    nombre_original = Column(String(500), nullable=False)
    nombre_guardado = Column(String(200), nullable=False, unique=True)
    tipo_mime = Column(String(255), nullable=True)
    tamano_bytes = Column(BigInteger, nullable=False, default=0)
    fecha_subida = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index("ix_exp_doc_exp_cat", "expediente_id", "categoria"),)

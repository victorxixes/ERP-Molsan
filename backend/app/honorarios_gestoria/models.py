from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text, func
from backend.app.database import Base


class HonorarioGestoria(Base):
    __tablename__ = "honorarios_gestoria_catalogo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True, index=True)
    descripcion = Column(Text, nullable=True)
    importe = Column(Numeric(12, 2), nullable=False)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

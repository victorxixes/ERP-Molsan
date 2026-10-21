from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text, func
from backend.app.database import Base


class HonorarioGestoria(Base):
    __tablename__ = "honorarios_gestoria_catalogo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True, index=True)
    descripcion = Column(Text, nullable=True)
    # Base imponible e impuesto configurables desde el catálogo.
    base_imponible = Column(Numeric(12, 2), nullable=True)
    tipo_impuesto = Column(String(20), nullable=False, default="IVA", server_default="IVA")
    porcentaje_impuesto = Column(Numeric(5, 2), nullable=False, default=21, server_default="21")
    importe = Column(Numeric(12, 2), nullable=False)  # Total con impuesto incluido (compatibilidad)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

from sqlalchemy import Column, DateTime, Integer, String, Text, func

from backend.app.database import Base


class HistorialDefecto(Base):
    __tablename__ = "expediente_defectos_historial"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id_externo = Column(String(100), nullable=False, index=True)
    expediente_pk = Column(Integer, nullable=True, index=True)
    defecto_id = Column(Integer, nullable=True, index=True)
    accion = Column(String(40), nullable=False, index=True)
    resumen = Column(String(500), nullable=False)
    cambios_json = Column(Text, nullable=True)
    usuario = Column(String(200), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

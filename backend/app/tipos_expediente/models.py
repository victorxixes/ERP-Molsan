from sqlalchemy import Boolean, Column, Integer, String, UniqueConstraint
from backend.app.database import Base


class TipoExpediente(Base):
    __tablename__ = "tipos_expediente"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(250), nullable=False)
    grupo = Column(String(120), nullable=False, default="Tipos de expediente", server_default="Tipos de expediente")
    activo = Column(Boolean, nullable=False, default=True, server_default="true")

    __table_args__ = (
        UniqueConstraint("nombre", "grupo", name="uq_tipo_expediente_nombre_grupo"),
    )

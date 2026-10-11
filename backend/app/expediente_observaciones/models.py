
from sqlalchemy import (
    Column,
    Integer,
    ForeignKey,
    Text,
    String,
    DateTime,
    Boolean,
    Index,
)
from sqlalchemy.sql import func

from backend.app.database import Base


class ExpedienteObservacion(Base):
    __tablename__ = "expediente_observaciones"

    id = Column(Integer, primary_key=True, index=True)

    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    comentario = Column(Text, nullable=False)
    autor = Column(String(200), nullable=False)

    fecha = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    visibilidad = Column(
        String(250),
        nullable=False,
        default="Departamento interno",
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    __table_args__ = (
        Index(
            "ix_expediente_observaciones_expediente_fecha",
            "expediente_id",
            "fecha",
        ),
    )

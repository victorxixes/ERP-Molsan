
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
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

    # Texto de la observación
    comentario = Column(Text, nullable=False)

    # Gestor, Visible notario o Visible apoderado
    visibilidad = Column(
        String(30),
        nullable=False,
        default="Gestor",
        server_default="Gestor",
    )

    # Empleado al que se dirige la observación.
    # Se utiliza cuando la visibilidad es Gestor.
    empleado_destinatario_id = Column(
        Integer,
        ForeignKey("empleados.id"),
        nullable=True,
        index=True,
    )

    # Empleado que registra la observación
    autor_empleado_id = Column(
        Integer,
        ForeignKey("empleados.id"),
        nullable=True,
        index=True,
    )

    fecha = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
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

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from backend.app.database import Base


class ExpedienteAccion(Base):
    """
    Relación entre un expediente y una acción del catálogo maestro
    acciones_expediente.

    IMPORTANTE:
    - NO duplica las acciones del catálogo.
    - accion_id apunta a acciones_expediente.id.
    - expediente_id apunta a expedientes.id.
    """

    __tablename__ = "expediente_acciones"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    expediente_id = Column(
        Integer,
        ForeignKey(
            "expedientes.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    accion_id = Column(
        Integer,
        ForeignKey(
            "acciones_expediente.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    estado = Column(
        String(50),
        nullable=False,
        default="Pendiente",
        index=True,
    )

    fecha = Column(
        Date,
        nullable=True,
        index=True,
    )

    observaciones = Column(
        Text,
        nullable=True,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "expediente_id",
            "accion_id",
            name="uq_expediente_accion",
        ),
    )

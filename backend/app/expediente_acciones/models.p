from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    Text,
)

from backend.app.database import Base


class ExpedienteAccion(Base):

    __tablename__ = "expediente_acciones"

    # ============================================================
    # ID
    # ============================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ============================================================
    # EXPEDIENTE
    # ============================================================

    expediente_id = Column(
        Integer,
        ForeignKey(
            "expedientes.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # ============================================================
    # ACCIÓN DEL CATÁLOGO
    # ============================================================

    accion_id = Column(
        Integer,
        ForeignKey(
            "acciones_expediente.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    # ============================================================
    # ESTADO
    # ============================================================

    estado = Column(
        Text,
        nullable=False,
        default="Pendiente",
        index=True,
    )

    # ============================================================
    # FECHA
    # ============================================================

    fecha = Column(
        Date,
        nullable=True,
        index=True,
    )

    # ============================================================
    # OBSERVACIONES
    # ============================================================

    observaciones = Column(
        Text,
        nullable=True,
    )

    # ============================================================
    # ACTIVA
    # ============================================================

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    def __repr__(self):

        return (
            f"<ExpedienteAccion "
            f"id={self.id!r} "
            f"expediente_id={self.expediente_id!r} "
            f"accion_id={self.accion_id!r} "
            f"estado={self.estado!r}>"
        )

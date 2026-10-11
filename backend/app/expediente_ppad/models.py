
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Numeric,
    DateTime,
    CheckConstraint,
    Index,
)
from sqlalchemy.sql import func

from backend.app.database import Base


class ExpedientePPAD(Base):
    __tablename__ = "expediente_ppad"

    id = Column(Integer, primary_key=True, index=True)

    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Concepto del importe
    concepto = Column(String(500), nullable=False)

    # Importe en euros, con dos decimales
    importe = Column(Numeric(14, 2), nullable=False, default=0)

    # Destino de la imputación
    imputable_a = Column(
        String(30),
        nullable=False,
        default="Molsan",
        server_default="Molsan",
    )

    fecha_creacion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    fecha_modificacion = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "imputable_a IN ('Molsan', 'Externo')",
            name="ck_expediente_ppad_imputable_a",
        ),
        Index(
            "ix_expediente_ppad_expediente",
            "expediente_id",
        ),
    )

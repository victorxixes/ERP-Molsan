from sqlalchemy import Boolean, Column, Integer, String, UniqueConstraint

from backend.app.database import Base


class TipoConceptoGastos(Base):
    __tablename__ = "tipos_concepto_gastos"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nombre = Column(
        String(250),
        nullable=False,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    __table_args__ = (
        UniqueConstraint(
            "nombre",
            name="uq_tipo_concepto_gastos_nombre",
        ),
    )

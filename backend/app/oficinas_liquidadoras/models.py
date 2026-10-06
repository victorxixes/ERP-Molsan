from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from backend.app.database import Base


# ============================================================
# OFICINAS LIQUIDADORAS
# ============================================================

class OficinaLiquidadora(Base):
    __tablename__ = "oficinas_liquidadoras"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    oficina_liquidadora = Column(
        String(250),
        nullable=False,
    )

    direccion = Column(
        String(500),
        nullable=True,
    )

    codigo_postal = Column(
        String(20),
        nullable=True,
    )

    poblacion = Column(
        String(200),
        nullable=True,
    )

    provincia = Column(
        String(150),
        nullable=True,
    )

    telefono = Column(
        String(100),
        nullable=True,
    )

    email = Column(
        String(250),
        nullable=True,
    )

    horario = Column(
        String(250),
        nullable=True,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    __table_args__ = (
        UniqueConstraint(
            "oficina_liquidadora",
            name="uq_oficina_liquidadora_nombre",
        ),
    )

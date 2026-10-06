from sqlalchemy import Boolean, Column, Integer, String, Text, UniqueConstraint

from backend.app.database import Base


class OficinaLiquidadora(Base):
    __tablename__ = "oficinas_liquidadoras"

    id = Column(Integer, primary_key=True, index=True)

    oficina_liquidadora = Column(
        String(250),
        nullable=False,
        index=True,
    )

    direccion = Column(
        String(400),
        nullable=True,
    )

    codigo_postal = Column(
        String(10),
        nullable=True,
        index=True,
    )

    poblacion = Column(
        String(150),
        nullable=True,
        index=True,
    )

    provincia = Column(
        String(150),
        nullable=True,
        index=True,
    )

    telefono = Column(
        String(50),
        nullable=True,
    )

    email = Column(
        String(250),
        nullable=True,
    )

    horario = Column(
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
            "oficina_liquidadora",
            name="uq_oficinas_liquidadoras_nombre",
        ),
    )

    def __repr__(self):
        return (
            f"<OficinaLiquidadora "
            f"id={self.id!r} "
            f"oficina_liquidadora={self.oficina_liquidadora!r} "
            f"poblacion={self.poblacion!r} "
            f"provincia={self.provincia!r}>"
        )

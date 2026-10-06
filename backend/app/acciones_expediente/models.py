from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Text,
    Index,
)

from backend.app.database import Base


class AccionExpediente(Base):

    __tablename__ = "acciones_expediente"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    departamento = Column(
        String(150),
        nullable=True,
        index=True,
    )

    seccion = Column(
        String(150),
        nullable=True,
        index=True,
    )

    actividad = Column(
        String(200),
        nullable=True,
        index=True,
    )

    descripcion = Column(
        Text,
        nullable=False,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    __table_args__ = (
        Index(
            "ix_acciones_expediente_departamento_seccion",
            "departamento",
            "seccion",
        ),
    )

    def __repr__(self):

        return (
            f"<AccionExpediente "
            f"id={self.id!r} "
            f"departamento={self.departamento!r} "
            f"seccion={self.seccion!r} "
            f"actividad={self.actividad!r} "
            f"descripcion={self.descripcion!r}>"
        )

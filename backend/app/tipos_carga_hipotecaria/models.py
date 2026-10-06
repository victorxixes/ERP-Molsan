from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    UniqueConstraint,
)

from backend.app.database import Base


# ============================================================
# TIPOS DE CARGA HIPOTECARIA
# ============================================================

class TipoCargaHipotecaria(Base):

    __tablename__ = "tipos_carga_hipotecaria"

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
            name="uq_tipo_carga_hipotecaria_nombre",
        ),
    )

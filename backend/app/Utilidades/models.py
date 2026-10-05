# ============================================================
# MODELOS — UTILIDADES
# MOLSAN ERP
# ============================================================

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    UniqueConstraint,
    Index,
)

from backend.app.database import Base


# ============================================================
# MUNICIPIOS
# ============================================================

class Municipio(Base):
    __tablename__ = "municipios"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    ccaa = Column(
        String(150),
        nullable=False,
    )

    provincia = Column(
        String(150),
        nullable=False,
    )

    municipio = Column(
        String(200),
        nullable=False,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    __table_args__ = (

        # Evita municipios duplicados
        UniqueConstraint(
            "ccaa",
            "provincia",
            "municipio",
            name="uq_municipio_ccaa_provincia_municipio",
        ),

        # Índices para búsquedas rápidas
        Index(
            "ix_municipios_ccaa",
            "ccaa",
        ),

        Index(
            "ix_municipios_provincia",
            "provincia",
        ),

        Index(
            "ix_municipios_municipio",
            "municipio",
        ),
    )

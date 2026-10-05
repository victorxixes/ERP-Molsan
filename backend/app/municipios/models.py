from sqlalchemy import (
    Boolean,
    Column,
    Index,
    Integer,
    String,
    UniqueConstraint,
)

from backend.app.database import Base


# ============================================================
# MUNICIPIOS
# MOLSAN ERP
# ============================================================

class Municipio(Base):

    __tablename__ = "municipios"

    # ========================================================
    # ID
    # ========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # COMUNIDAD AUTÓNOMA
    # ========================================================

    ccaa = Column(
        String(150),
        nullable=False,
        index=True,
    )

    # ========================================================
    # PROVINCIA
    # ========================================================

    provincia = Column(
        String(150),
        nullable=False,
        index=True,
    )

    # ========================================================
    # MUNICIPIO
    # ========================================================

    municipio = Column(
        String(200),
        nullable=False,
        index=True,
    )

    # ========================================================
    # ACTIVO
    # ========================================================

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    # ========================================================
    # ÍNDICES / RESTRICCIONES
    # ========================================================

    __table_args__ = (

        UniqueConstraint(
            "ccaa",
            "provincia",
            "municipio",
            name="uq_municipios_ccaa_provincia_municipio",
        ),

        Index(
            "ix_municipios_ccaa_provincia",
            "ccaa",
            "provincia",
        ),

    )

    # ========================================================
    # REPRESENTACIÓN
    # ========================================================

    def __repr__(self):

        return (
            f"<Municipio "
            f"id={self.id!r} "
            f"ccaa={self.ccaa!r} "
            f"provincia={self.provincia!r} "
            f"municipio={self.municipio!r}>"
        )

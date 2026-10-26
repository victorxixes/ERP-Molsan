from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship

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

    codigos_postales = relationship(
        "MunicipioCodigoPostal",
        back_populates="municipio",
        cascade="all, delete-orphan",
        order_by="MunicipioCodigoPostal.codigo_postal",
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


class MunicipioCodigoPostal(Base):
    """Códigos postales asociados a un municipio, con uno principal."""

    __tablename__ = "municipios_codigos_postales"

    id = Column(Integer, primary_key=True, index=True)
    municipio_id = Column(
        Integer,
        ForeignKey("municipios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # String, nunca entero: conserva ceros iniciales (p. ej. 01001).
    codigo_postal = Column(String(5), nullable=False, index=True)
    principal = Column(Boolean, nullable=False, default=False)

    municipio = relationship("Municipio", back_populates="codigos_postales")

    __table_args__ = (
        UniqueConstraint(
            "municipio_id",
            "codigo_postal",
            name="uq_municipios_codigos_postales_municipio_cp",
        ),
        Index(
            "ix_municipios_codigos_postales_principal",
            "municipio_id",
            "principal",
        ),
    )

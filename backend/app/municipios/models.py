from sqlalchemy import Column, Integer, String, Index

from backend.app.database import Base


class Municipio(Base):
    __tablename__ = "municipios"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    ccaa = Column(
        String(150),
        nullable=False
    )

    provincia = Column(
        String(150),
        nullable=False
    )

    municipio = Column(
        String(200),
        nullable=False
    )

    __table_args__ = (
        Index(
            "ix_municipios_ccaa",
            "ccaa"
        ),
        Index(
            "ix_municipios_provincia",
            "provincia"
        ),
        Index(
            "ix_municipios_municipio",
            "municipio"
        ),
        Index(
            "ix_municipios_provincia_municipio",
            "provincia",
            "municipio"
        ),
    )

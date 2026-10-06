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
# ENTIDADES BANCARIAS
# MOLSAN ERP
# ============================================================

class EntidadBancaria(Base):

    __tablename__ = "entidades_bancarias"

    # ========================================================
    # ID
    # ========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # CÓDIGO EUROPEO
    # ========================================================

    codigo_europeo = Column(
        String(50),
        nullable=False,
        index=True,
    )

    # ========================================================
    # LEI
    # ========================================================

    lei = Column(
        String(50),
        nullable=True,
        index=True,
    )

    # ========================================================
    # NOMBRE
    # ========================================================

    nombre = Column(
        String(250),
        nullable=False,
        index=True,
    )

    # ========================================================
    # CATEGORÍA
    # ========================================================

    categoria = Column(
        String(150),
        nullable=False,
        index=True,
    )

    # ========================================================
    # DIRECCIÓN
    # ========================================================

    direccion = Column(
        String(400),
        nullable=True,
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
    # RESTRICCIONES / ÍNDICES
    # ========================================================

    __table_args__ = (

        UniqueConstraint(
            "codigo_europeo",
            name="uq_entidades_bancarias_codigo_europeo",
        ),

        Index(
            "ix_entidades_bancarias_nombre",
            "nombre",
        ),

    )

    # ========================================================
    # REPRESENTACIÓN
    # ========================================================

    def __repr__(self):

        return (
            f"<EntidadBancaria "
            f"id={self.id!r} "
            f"codigo_europeo={self.codigo_europeo!r} "
            f"lei={self.lei!r} "
            f"nombre={self.nombre!r}>"
        )

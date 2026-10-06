from sqlalchemy import (
    Boolean,
    Column,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from backend.app.database import Base


# ============================================================
# REGISTROS DE LA PROPIEDAD
# MOLSAN ERP
# ============================================================

class RegistroPropiedad(Base):

    __tablename__ = "registros_propiedad"

    # ========================================================
    # ID
    # ========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # REGISTRO DE LA PROPIEDAD
    # ========================================================

    registro_propiedad = Column(
        String(250),
        nullable=False,
        index=True,
    )

    # ========================================================
    # NOMBRE REGISTRADOR
    # ========================================================

    nombre_registrador = Column(
        String(250),
        nullable=True,
    )

    # ========================================================
    # DIRECCIÓN
    # ========================================================

    direccion = Column(
        String(400),
        nullable=True,
    )

    # ========================================================
    # CÓDIGO POSTAL
    # ========================================================

    codigo_postal = Column(
        String(10),
        nullable=True,
        index=True,
    )

    # ========================================================
    # POBLACIÓN
    # ========================================================

    poblacion = Column(
        String(150),
        nullable=True,
        index=True,
    )

    # ========================================================
    # PROVINCIA
    # ========================================================

    provincia = Column(
        String(150),
        nullable=True,
        index=True,
    )

    # ========================================================
    # TELÉFONO
    # ========================================================

    telefono = Column(
        String(50),
        nullable=True,
    )

    # ========================================================
    # TELÉFONO 2
    # ========================================================

    telefono_2 = Column(
        String(50),
        nullable=True,
    )

    # ========================================================
    # FAX
    # ========================================================

    fax = Column(
        String(50),
        nullable=True,
    )

    # ========================================================
    # WHATSAPP
    # ========================================================

    whatsapp = Column(
        String(50),
        nullable=True,
    )

    # ========================================================
    # EMAIL 1
    # ========================================================

    email_1 = Column(
        String(250),
        nullable=True,
    )

    # ========================================================
    # EMAIL 2
    # ========================================================

    email_2 = Column(
        String(250),
        nullable=True,
    )

    # ========================================================
    # IBAN
    # ========================================================

    iban = Column(
        String(100),
        nullable=True,
    )

    # ========================================================
    # COMENTARIOS
    # ========================================================

    comentarios = Column(
        Text,
        nullable=True,
    )

    # ========================================================
    # TIENE OFICINA LIQUIDADORA
    # ========================================================

    tiene_of_liq = Column(
        Boolean,
        nullable=False,
        default=False,
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
    # RESTRICCIONES
    # ========================================================

    __table_args__ = (

        UniqueConstraint(
            "registro_propiedad",
            name="uq_registros_propiedad_nombre",
        ),

        Index(
            "ix_registros_propiedad_poblacion_provincia",
            "poblacion",
            "provincia",
        ),

    )

    # ========================================================
    # REPRESENTACIÓN
    # ========================================================

    def __repr__(self):

        return (
            f"<RegistroPropiedad "
            f"id={self.id!r} "
            f"registro_propiedad="
            f"{self.registro_propiedad!r} "
            f"poblacion="
            f"{self.poblacion!r}>"
        )

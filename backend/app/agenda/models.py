from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Time,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from backend.app.database import Base


class Cita(Base):

    __tablename__ = "agenda_citas"

    # ============================================================
    # IDENTIFICACIÓN
    # ============================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ============================================================
    # FECHA / HORARIO
    # ============================================================

    fecha = Column(
        Date,
        nullable=False,
    )

    hora_inicio = Column(
        Time,
        nullable=False,
    )

    hora_fin = Column(
        Time,
        nullable=False,
    )

    # ============================================================
    # TIPO
    # ============================================================

    tipo_cita = Column(
        String,
        nullable=False,
    )

    # ============================================================
    # NOTARIO
    # ============================================================

    notario_id = Column(
        Integer,
        ForeignKey(
            "ctn_notarios.id"
        ),
        nullable=True,
    )

    tipo_firma = Column(
        String,
        nullable=True,
    )

    # ============================================================
    # APODERADO
    # ============================================================

    apoderado = Column(
        String(150),
        nullable=True,
    )

    apoderado_id = Column(
        Integer,
        ForeignKey(
            "empleados.id"
        ),
        nullable=True,
    )

    # ============================================================
    # EXPEDIENTE
    #
    # Nullable porque una cita normal de Agenda NO tiene por qué
    # pertenecer a un expediente.
    # ============================================================

    expediente_id = Column(
        Integer,
        ForeignKey(
            "expedientes.id"
        ),
        nullable=True,
        index=True,
    )

    # ============================================================
    # OBSERVACIONES
    # ============================================================

    observaciones = Column(
        String,
        nullable=True,
    )

    # ============================================================
    # RELACIONES
    # ============================================================

    apoderado_rel = relationship(
        "Empleado",
        back_populates="citas",
        lazy="joined",
    )

    notario = relationship(
        "Notaria",
        back_populates="citas",
        lazy="joined",
    )

    expediente = relationship(
        "Expediente",
        lazy="joined",
    )

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    func,
)

from backend.app.database import Base


class DefectoSubtipo(Base):
    """Catálogo mantenible de subtipos de defectos registrales."""

    __tablename__ = "defecto_subtipos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True, index=True)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ExpedienteDefecto(Base):
    """Defectos registrales asociados a un expediente."""

    __tablename__ = "expediente_defectos"

    id = Column(Integer, primary_key=True, index=True)

    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id"),
        nullable=False,
        index=True,
    )

    # Campos históricos: se conservan por compatibilidad.
    tiene_defectos_abiertos = Column(String(10), nullable=True, default="SI")
    tipo_error = Column(String(300), nullable=True)
    descripcion_error = Column(String(1000), nullable=True)
    falta_defecto = Column(String(500), nullable=True)
    fecha_cierre_defecto = Column(Date, nullable=True)

    # Datos del defecto.
    documento = Column(String(300), nullable=True)
    motivo_defecto = Column(String(500), nullable=True)

    subtipo_defecto_id = Column(
        Integer,
        ForeignKey("defecto_subtipos.id"),
        nullable=True,
        index=True,
    )

    # Se conserva texto para registros antiguos.
    subtipo_defecto = Column(String(500), nullable=True)

    fecha_notificacion_registro = Column(Date, nullable=True)
    fecha_vencimiento_presentacion = Column(Date, nullable=True)
    fecha_entrada_subsanacion = Column(Date, nullable=True)

    observaciones_registro = Column(String(200), nullable=True)

    # Campo de texto antiguo; no se elimina.
    calificacion_registro = Column(Text, nullable=True)

    # Archivo de calificación persistido en PostgreSQL.
    calificacion_archivo = Column(LargeBinary, nullable=True)
    calificacion_nombre = Column(String(255), nullable=True)
    calificacion_content_type = Column(String(100), nullable=True)
    calificacion_tamano = Column(Integer, nullable=True)
    calificacion_subida_en = Column(
        DateTime(timezone=True),
        nullable=True,
    )

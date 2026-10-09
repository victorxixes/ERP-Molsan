
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

# Importamos el modelo para asegurar que la tabla del catálogo
# de tipos de carga hipotecaria se registra en los metadatos.
from backend.app.tipos_carga_hipotecaria.models import (
    TipoCargaHipotecaria,
)


# ============================================================
# CATÁLOGO DE SUBTIPOS DE DEFECTO
# ============================================================

class DefectoSubtipo(Base):
    __tablename__ = "defecto_subtipos"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nombre = Column(
        String(200),
        nullable=False,
        unique=True,
        index=True,
    )

    descripcion = Column(
        Text,
        nullable=True,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    creado_en = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


# ============================================================
# DEFECTOS REGISTRALES DE LOS EXPEDIENTES
# ============================================================

class ExpedienteDefecto(Base):
    __tablename__ = "expediente_defectos"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # RELACIÓN CON EL EXPEDIENTE
    # --------------------------------------------------------

    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id"),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # ESTADO DEL DEFECTO
    # --------------------------------------------------------

    tiene_defectos_abiertos = Column(
        String(10),
        nullable=True,
        default="SI",
    )

    tipo_error = Column(
        String(300),
        nullable=True,
    )

    descripcion_error = Column(
        String(1000),
        nullable=True,
    )

    falta_defecto = Column(
        String(500),
        nullable=True,
    )

    fecha_cierre_defecto = Column(
        Date,
        nullable=True,
    )

    # --------------------------------------------------------
    # DOCUMENTACIÓN Y MOTIVO
    # --------------------------------------------------------

    documento = Column(
        String(300),
        nullable=True,
    )

    motivo_defecto = Column(
        String(500),
        nullable=True,
    )

    # --------------------------------------------------------
    # SUBTIPO DEL DEFECTO
    # --------------------------------------------------------

    subtipo_defecto_id = Column(
        Integer,
        ForeignKey("defecto_subtipos.id"),
        nullable=True,
        index=True,
    )

    subtipo_defecto = Column(
        String(500),
        nullable=True,
    )

    # --------------------------------------------------------
    # TIPO DE CARGA HIPOTECARIA
    # Enlace con:
    # backend/app/tipos_carga_hipotecaria/models.py
    # --------------------------------------------------------

    tipo_carga_hipotecaria_id = Column(
        Integer,
        ForeignKey(
            "tipos_carga_hipotecaria.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # FECHAS DE GESTIÓN REGISTRAL
    # --------------------------------------------------------

    fecha_notificacion_registro = Column(
        Date,
        nullable=True,
    )

    fecha_vencimiento_presentacion = Column(
        Date,
        nullable=True,
    )

    fecha_entrada_subsanacion = Column(
        Date,
        nullable=True,
    )

    # --------------------------------------------------------
    # OBSERVACIONES Y CALIFICACIÓN
    # --------------------------------------------------------

    observaciones_registro = Column(
        String(200),
        nullable=True,
    )

    calificacion_registro = Column(
        Text,
        nullable=True,
    )

    # --------------------------------------------------------
    # ARCHIVO PDF DE LA CALIFICACIÓN REGISTRAL
    # --------------------------------------------------------

    calificacion_archivo = Column(
        LargeBinary,
        nullable=True,
    )

    calificacion_nombre = Column(
        String(255),
        nullable=True,
    )

    calificacion_content_type = Column(
        String(100),
        nullable=True,
    )

    calificacion_tamano = Column(
        Integer,
        nullable=True,
    )

    calificacion_subida_en = Column(
        DateTime(timezone=True),
        nullable=True,
    )

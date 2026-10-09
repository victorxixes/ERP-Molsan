
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from backend.app.database import Base


class ExpedienteDefecto(Base):
    __tablename__ = "expediente_defectos"

    id = Column(Integer, primary_key=True, index=True)

    # Relación con el identificador interno de expedientes.id
    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id"),
        nullable=False,
        index=True,
    )

    # Compatibilidad con los campos anteriores
    tiene_defectos_abiertos = Column(String(10), nullable=True)
    tipo_error = Column(String(300), nullable=True)
    descripcion_error = Column(String(1000), nullable=True)
    falta_defecto = Column(String(500), nullable=True)
    fecha_cierre_defecto = Column(Date, nullable=True)

    # Alta del defecto registral
    documento = Column(String(300), nullable=True)
    motivo_defecto = Column(String(500), nullable=True)
    subtipo_defecto = Column(String(500), nullable=True)

    # Fechas y datos de la calificación
    fecha_notificacion_registro = Column(Date, nullable=True)
    fecha_vencimiento_presentacion = Column(Date, nullable=True)
    calificacion_registro = Column(String(2000), nullable=True)
    observaciones_registro = Column(String(200), nullable=True)

    # Se registra por separado; no equivale a la fecha de cierre
    fecha_entrada_subsanacion = Column(Date, nullable=True)

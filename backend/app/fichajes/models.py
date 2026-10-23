from sqlalchemy import Column, Integer, String, DateTime, Date, LargeBinary, ForeignKey, func, Numeric, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class FichajeMarcaje(Base):
    __tablename__ = "fichajes_marcajes"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(40), nullable=False, index=True)
    fecha_hora = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    observaciones = Column(String(500), nullable=True)
    creado_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    empleado = relationship("Empleado", foreign_keys=[empleado_id])


class FichajeDocumento(Base):
    __tablename__ = "fichajes_documentos"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo_justificante = Column(String(100), nullable=False)
    fecha_documento = Column(Date, nullable=False, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    content_type = Column(String(150), nullable=True)
    contenido = Column(LargeBinary, nullable=False)
    tamano_bytes = Column(Integer, nullable=False, default=0)
    subido_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    subido_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    empleado = relationship("Empleado", foreign_keys=[empleado_id])


class FichajeTipoAusencia(Base):
    __tablename__ = "fichajes_tipos_ausencia"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False, unique=True, index=True)
    requiere_justificante = Column(Integer, nullable=False, default=0)
    activo = Column(Integer, nullable=False, default=1)


class FichajeVacaciones(Base):
    __tablename__ = "fichajes_vacaciones"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha_inicio = Column(Date, nullable=False, index=True)
    fecha_fin = Column(Date, nullable=False, index=True)
    dias = Column(Integer, nullable=False, default=1)
    estado = Column(String(20), nullable=False, default="SOLICITADO", index=True)
    observaciones = Column(String(500), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FichajeBolsaVacaciones(Base):
    __tablename__ = "fichajes_bolsa_vacaciones"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    anio = Column(Integer, nullable=False, index=True)
    dias_asignados = Column(Integer, nullable=False, default=0)
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class FichajeFestivoTrabajado(Base):
    """Festivo trabajado, pendiente de validación por administración."""
    __tablename__ = "fichajes_festivos_trabajados"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    horas_trabajadas = Column(Numeric(7, 2), nullable=False, default=0)
    estado = Column(String(20), nullable=False, default="PENDIENTE", index=True)
    observaciones = Column(String(500), nullable=True)
    cantidad_compensable = Column(Numeric(7, 2), nullable=True)
    unidad_compensable = Column(String(10), nullable=True)
    creado_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    validado_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validado_en = Column(DateTime(timezone=True), nullable=True)


class FichajeCompensacionMovimiento(Base):
    """Libro mayor: abonos y consumos, separado de vacaciones ordinarias."""
    __tablename__ = "fichajes_compensacion_movimientos"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False, index=True)  # ABONO, CONSUMO, AJUSTE
    cantidad = Column(Numeric(7, 2), nullable=False)
    unidad = Column(String(10), nullable=False)  # DIAS u HORAS
    fecha = Column(Date, nullable=False, index=True)
    referencia_tipo = Column(String(30), nullable=True)
    referencia_id = Column(Integer, nullable=True)
    observaciones = Column(String(500), nullable=True)
    creado_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FichajeSolicitudCompensacion(Base):
    __tablename__ = "fichajes_solicitudes_compensacion"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha_disfrute = Column(Date, nullable=False, index=True)
    cantidad = Column(Numeric(7, 2), nullable=False)
    unidad = Column(String(10), nullable=False)
    estado = Column(String(20), nullable=False, default="SOLICITADO", index=True)
    observaciones = Column(String(500), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resuelto_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    resuelto_en = Column(DateTime(timezone=True), nullable=True)


class FichajeCompensacionAuditoria(Base):
    __tablename__ = "fichajes_compensacion_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    entidad = Column(String(40), nullable=False)
    entidad_id = Column(Integer, nullable=False)
    accion = Column(String(40), nullable=False)
    estado_anterior = Column(String(30), nullable=True)
    estado_nuevo = Column(String(30), nullable=True)
    detalle = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())



class FichajeFestivoCalendario(Base):
    """Calendario de festivos aprobado para identificar fechas compensables."""
    __tablename__ = "fichajes_calendario_festivos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, unique=True, index=True)
    nombre = Column(String(160), nullable=False)
    ambito = Column(String(40), nullable=False, default="EMPRESA")
    activo = Column(Integer, nullable=False, default=1)
    creado_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FichajeMarcajeAuditoria(Base):
    """Historial inmutable de altas y correcciones administrativas de marcajes."""
    __tablename__ = "fichajes_marcajes_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    marcaje_id = Column(Integer, ForeignKey("fichajes_marcajes.id", ondelete="SET NULL"), nullable=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True, index=True)
    accion = Column(String(30), nullable=False)
    datos_anteriores = Column(Text, nullable=True)
    datos_nuevos = Column(Text, nullable=False)
    motivo = Column(String(500), nullable=False)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)


class FichajePeriodoCerrado(Base):
    """Bloqueo administrativo de un mes procesado para impedir cambios accidentales."""
    __tablename__ = "fichajes_periodos_cerrados"

    id = Column(Integer, primary_key=True, index=True)
    anio = Column(Integer, nullable=False, index=True)
    mes = Column(Integer, nullable=False, index=True)
    cerrado = Column(Integer, nullable=False, default=1)
    motivo = Column(String(500), nullable=False)
    actor_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class FichajeDocumentoRevision(Base):
    """Decisiones administrativas sobre justificantes; cada revisión queda como evento histórico."""
    __tablename__ = "fichajes_documentos_revision"

    id = Column(Integer, primary_key=True, index=True)
    documento_id = Column(Integer, ForeignKey("fichajes_documentos.id", ondelete="CASCADE"), nullable=False, index=True)
    estado = Column(String(20), nullable=False, index=True)
    motivo = Column(String(500), nullable=False)
    actor_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)


class FichajeSolicitudAusencia(Base):
    """Solicitud de ausencia/permiso enviada por el empleado y resuelta por administración."""
    __tablename__ = "fichajes_solicitudes_ausencia"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    fecha_inicio = Column(Date, nullable=False, index=True)
    fecha_fin = Column(Date, nullable=False, index=True)
    tipo_ausencia = Column(String(120), nullable=False)
    observaciones = Column(String(500), nullable=True)
    estado = Column(String(20), nullable=False, default="SOLICITADO", index=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    resuelto_por_id = Column(Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True)
    resuelto_en = Column(DateTime(timezone=True), nullable=True)
    motivo_resolucion = Column(String(500), nullable=True)

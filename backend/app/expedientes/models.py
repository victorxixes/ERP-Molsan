from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    Time,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from backend.app.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String, nullable=True)
    dni = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    email = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    codigo_postal = Column(String, nullable=True)
    poblacion = Column(String, nullable=True)
    provincia = Column(String, nullable=True)
    idioma = Column(String, nullable=True)
    nombre_facturacion = Column(String, nullable=True)
    dni_facturacion = Column(String, nullable=True)
    telefono_facturacion = Column(String, nullable=True)
    email_facturacion = Column(String, nullable=True)
    direccion_facturacion = Column(String, nullable=True)
    codigo_postal_facturacion = Column(String, nullable=True)
    poblacion_facturacion = Column(String, nullable=True)
    provincia_facturacion = Column(String, nullable=True)

    expedientes = relationship("Expediente", back_populates="cliente")


class Expediente(Base):
    __tablename__ = "expedientes"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True, index=True)
    cliente = relationship("Cliente", back_populates="expedientes")
    id_expediente = Column(String(100), unique=True, index=True, nullable=False)

    estado_expediente = Column(String(200), nullable=True)
    estado_expediente_ancert = Column(String(200), nullable=True)
    notargest_estado = Column(String(80), nullable=True)
    notargest_fecha_cierre = Column(Date, nullable=True)
    notargest_fecha_envio_gestoria = Column(Date, nullable=True)

    # Control de liquidaciones sin tramitar, cambio de gestoría y bloqueos.
    liquidado_sin_tramitar = Column(Boolean, nullable=False, default=False)
    fecha_liquidacion_sin_tramitar = Column(Date, nullable=True)
    cambio_gestoria = Column(Boolean, nullable=False, default=False)
    fecha_cambio_gestoria = Column(Date, nullable=True)
    bloqueo_manual = Column(Boolean, nullable=False, default=False)
    motivo_bloqueo = Column(String(1000), nullable=True)
    fecha_bloqueo = Column(Date, nullable=True)

    fecha_alta = Column(Date, nullable=True)
    fecha_firma = Column(Date, nullable=True)
    fecha_inscripcion = Column(Date, nullable=True)
    fecha_entregado_cliente = Column(Date, nullable=True)
    fecha_prevista_firma = Column(Date, nullable=True)
    fecha_vencimiento = Column(Date, nullable=True)
    fecha_sol_cgn = Column(Date, nullable=True)
    fecha_firma_prev_val = Column(Date, nullable=True)
    fecha_firma_prev_cli = Column(Date, nullable=True)
    fecha_inicio_actividad = Column(Date, nullable=True)
    fecha_fin_actividad = Column(Date, nullable=True)

    # Campos visibles en el circuito de actividades y en el listado.
    # La migración idempotente del router crea estas columnas en PostgreSQL.
    ultima_accion = Column(String(500), nullable=True)
    fecha_ultima_accion = Column(Date, nullable=True)
    sol = Column(String(100), nullable=True)
    cs = Column(String(100), nullable=True)
    ns = Column(String(100), nullable=True)

    fecha_envio_notario = Column(Date, nullable=True)
    # Campos complementarios de las actividades del workflow
    fecha_envio = Column(Date, nullable=True)
    asiento_presentacion_libro_diario = Column(String(300), nullable=True)
    fecha_presentacion = Column(Date, nullable=True)
    numero_entrada = Column(String(200), nullable=True)
    fecha_recogida_notario_presentacion_telematica = Column(Date, nullable=True)
    copia_simple_escritura = Column(String(500), nullable=True)
    fecha_presentacion_tributaria = Column(Date, nullable=True)
    fecha_liquidacion_tributaria = Column(Date, nullable=True)
    oficina_liquidadora = Column(String(200), nullable=True)
    base_imponible = Column(Float, nullable=True)
    tributacion = Column(String(100), nullable=True)
    impuesto_ajd_itp = Column(String(20), nullable=True)
    fecha_vencimiento_asiento = Column(Date, nullable=True)
    escritura_simple_cancelacion = Column(String(500), nullable=True)
    fecha_solicitud_pnc = Column(Date, nullable=True)
    numero_solicitud_pnc = Column(String(200), nullable=True)
    escritura_firmada = Column(Boolean, nullable=True)
    hora_prevista_firma = Column(Time, nullable=True)

    nombre_titular = Column(String(300), nullable=True)
    nif_titular = Column(String(50), nullable=True)
    nombre_solicitante = Column(String(300), nullable=True)
    nif_solicitante = Column(String(50), nullable=True)
    apoderado = Column(String(300), nullable=True)

    tipo_firma = Column(String(100), nullable=True)
    tipo_documento = Column(String(300), nullable=True)
    idioma_documento = Column(String(100), nullable=True)
    formato_escritura = Column(String(200), nullable=True)
    tipo_tramite = Column(String(200), nullable=True)
    poblacion = Column(String(200), nullable=True)
    provincia = Column(String(200), nullable=True)

    nombre_notario = Column(String(300), nullable=True)
    nif_notario = Column(String(50), nullable=True)
    notario = Column(String(300), nullable=True)

    oficina = Column(String(200), nullable=True)
    dan = Column(String(200), nullable=True)
    oficina_alta = Column(String(200), nullable=True)

    capital = Column(Float, nullable=True)
    importe = Column(Float, nullable=True)
    saldo_real = Column(Float, nullable=True)
    saldo_disponible = Column(Float, nullable=True)
    id_provision = Column(String(100), nullable=True)
    tipo_provision = Column(String(100), nullable=True)

    contrato = Column(String(200), nullable=True)
    num_solicitud_sia = Column(String(200), nullable=True)
    tipo_operacion = Column(String(300), nullable=True)
    subtipo_operacion = Column(String(300), nullable=True)
    vinccanc = Column(String(200), nullable=True)
    protocolo = Column(String(200), nullable=True)
    origen_bankia = Column(String(200), nullable=True)
    producto_gtg = Column(String(300), nullable=True)
    dt = Column(String(200), nullable=True)

    actividad_actual = Column(String(300), nullable=True)
    estado_actividad = Column(String(200), nullable=True)
    id_gestoria_tramite = Column(String(100), nullable=True)
    nombre_gestoria = Column(String(300), nullable=True)
    gestoria = Column(String(300), nullable=True)
    finca = Column(String(200), nullable=True)

    tiene_defectos_abiertos = Column(String(50), nullable=True)
    tipo_error = Column(String(300), nullable=True)
    descripcion_error = Column(String(1000), nullable=True)
    falta_defecto = Column(String(1000), nullable=True)
    fcierre_defecto = Column(Date, nullable=True)

    id_expediente_cgn = Column(String(200), nullable=True)
    tipo_acta = Column(String(200), nullable=True)
    lucy = Column(String(200), nullable=True)
    indicador_tt = Column(String(200), nullable=True)
    observaciones = Column(String(2000), nullable=True)

    facturacion_nombre = Column(String(300), nullable=True)
    facturacion_apellidos = Column(String(300), nullable=True)
    facturacion_dni_nif = Column(String(50), nullable=True)
    facturacion_direccion = Column(String(500), nullable=True)
    facturacion_codigo_postal = Column(String(30), nullable=True)
    facturacion_poblacion = Column(String(200), nullable=True)
    facturacion_provincia = Column(String(200), nullable=True)
    facturacion_telefono = Column(String(50), nullable=True)
    facturacion_email = Column(String(320), nullable=True)
    facturacion_estado = Column(String(200), nullable=True)
    facturacion_fecha = Column(Date, nullable=True)

    registral_estado = Column(String(200), nullable=True)
    registral_fecha = Column(Date, nullable=True)

    documentos_escritura = relationship(
        "ExpedienteDocumentoEscritura",
        back_populates="expediente",
        cascade="all, delete-orphan",
        order_by="ExpedienteDocumentoEscritura.id",
    )


class ExpedienteDocumentoEscritura(Base):
    __tablename__ = "expediente_documentos_escritura"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo_documento = Column(String(300), nullable=False)
    cuantia = Column(Float, nullable=True)

    expediente = relationship(
        "Expediente",
        back_populates="documentos_escritura",
    )

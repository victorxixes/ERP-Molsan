from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.sql import func

from backend.app.database import Base


class TarifaProvision(Base):
    __tablename__ = "tarifas_provisiones"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(20), nullable=False, index=True)  # provision | cancelacion
    entidad = Column(String(300), nullable=False, default="*", index=True)
    territorio = Column(String(20), nullable=False, default="Península", server_default="Península", index=True)
    capital_minimo = Column(Numeric(14, 2), nullable=False, default=0)
    capital_maximo = Column(Numeric(14, 2), nullable=True)
    honorarios = Column(Numeric(14, 2), nullable=False, default=0)
    suplidos = Column(Numeric(14, 2), nullable=False, default=0)
    gastos_registro = Column(Numeric(14, 2), nullable=False, default=0)
    otros_gastos = Column(Numeric(14, 2), nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("tipo IN ('provision', 'cancelacion')", name="ck_tarifas_provisiones_tipo"),
        CheckConstraint("capital_minimo >= 0", name="ck_tarifas_provisiones_capital_min"),
        CheckConstraint("capital_maximo IS NULL OR capital_maximo >= capital_minimo", name="ck_tarifas_provisiones_capital_max"),
        Index("ix_tarifas_provisiones_busqueda", "tipo", "activo", "entidad", "capital_minimo"),
    )



class ConceptoImporteProvision(Base):
    """Configuración editable de importes estimativos usados por Provisiones."""
    __tablename__ = "provisiones_conceptos_importes"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(40), nullable=False, unique=True, index=True)
    nombre = Column(String(120), nullable=False)
    modo = Column(String(20), nullable=False, default="previsto", server_default="previsto")
    importe_previsto = Column(Numeric(14, 2), nullable=True)
    descripcion = Column(Text, nullable=True)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("codigo IN ('notaria', 'registro', 'gestion', 'impuestos')", name="ck_provisiones_concepto_codigo"),
        CheckConstraint("modo IN ('previsto', 'calculado', 'catalogo')", name="ck_provisiones_concepto_modo"),
        CheckConstraint("importe_previsto IS NULL OR importe_previsto >= 0", name="ck_provisiones_concepto_importe"),
    )


class ProvisionFondo(Base):
    __tablename__ = "provisiones_fondo"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(Integer, ForeignKey("expedientes.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False, index=True)  # provision | cancelacion
    estado = Column(String(20), nullable=False, default="borrador", server_default="borrador", index=True)
    fecha = Column(Date, nullable=False, default=func.current_date())
    observaciones = Column(Text, nullable=True)
    importe_total = Column(Numeric(14, 2), nullable=False, default=0, server_default="0")
    creado_por_id = Column(Integer, nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("tipo IN ('provision', 'cancelacion')", name="ck_provisiones_fondo_tipo"),
        CheckConstraint("estado IN ('borrador', 'generada', 'anulada')", name="ck_provisiones_fondo_estado"),
        Index("ix_provisiones_fondo_expediente_fecha", "expediente_id", "fecha"),
    )


class ProvisionOperacion(Base):
    __tablename__ = "provisiones_operaciones"

    id = Column(Integer, primary_key=True, index=True)
    provision_id = Column(Integer, ForeignKey("provisiones_fondo.id", ondelete="CASCADE"), nullable=False, index=True)
    entidad = Column(String(300), nullable=False)
    numero_prestamo = Column(String(200), nullable=True)
    capital = Column(Numeric(14, 2), nullable=False, default=0)
    tarifa_id = Column(Integer, ForeignKey("tarifas_provisiones.id", ondelete="SET NULL"), nullable=True, index=True)
    aplicar_tarifa = Column(Boolean, nullable=False, default=True, server_default="true")
    honorarios_base = Column(Numeric(14, 2), nullable=False, default=0)
    honorarios = Column(Numeric(14, 2), nullable=False, default=0)
    suplidos = Column(Numeric(14, 2), nullable=False, default=0)
    gastos_registro = Column(Numeric(14, 2), nullable=False, default=0)
    otros_gastos = Column(Numeric(14, 2), nullable=False, default=0)
    condonar_honorarios = Column(Boolean, nullable=False, default=False, server_default="false")
    importe_manual = Column(Numeric(14, 2), nullable=True)
    total = Column(Numeric(14, 2), nullable=False, default=0)
    observaciones = Column(Text, nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("capital >= 0", name="ck_provisiones_operaciones_capital"),
        CheckConstraint("honorarios >= 0 AND honorarios_base >= 0 AND suplidos >= 0 AND gastos_registro >= 0 AND otros_gastos >= 0", name="ck_provisiones_operaciones_importes"),
        CheckConstraint("importe_manual IS NULL OR importe_manual >= 0", name="ck_provisiones_operaciones_importe_manual"),
    )


class ProvisionOperacionFinca(Base):
    __tablename__ = "provisiones_operaciones_fincas"

    id = Column(Integer, primary_key=True, index=True)
    operacion_id = Column(Integer, ForeignKey("provisiones_operaciones.id", ondelete="CASCADE"), nullable=False, index=True)
    finca = Column(String(200), nullable=True)
    cru_idufir = Column(String(200), nullable=True)
    registro_propiedad_id = Column(Integer, nullable=True, index=True)
    registro_propiedad = Column(String(300), nullable=True)
    provincia = Column(String(150), nullable=True)
    poblacion = Column(String(150), nullable=True)
    seccion = Column(String(100), nullable=True)



class ProvisionIndependiente(Base):
    """Provisión estimativa creada desde llamada de cliente, sin expediente asociado."""
    __tablename__ = "provisiones_independientes"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(40), nullable=False, unique=True, index=True)
    fecha = Column(Date, nullable=False, default=func.current_date(), index=True)
    cliente_nombre = Column(String(300), nullable=False, default="")
    cliente_nif = Column(String(40), nullable=True)
    cliente_direccion = Column(String(400), nullable=True)
    cliente_cp = Column(String(20), nullable=True)
    cliente_poblacion = Column(String(150), nullable=True)
    cliente_provincia = Column(String(150), nullable=True)
    cliente_telefono = Column(String(60), nullable=True)
    cliente_email = Column(String(250), nullable=True)
    oficina_numero = Column(String(100), nullable=True)
    oficina_contacto = Column(String(200), nullable=True)
    oficina_email = Column(String(250), nullable=True)
    datos = Column(JSON, nullable=False, default=dict)
    importe_total = Column(Numeric(14, 2), nullable=False, default=0, server_default="0")
    estado = Column(String(20), nullable=False, default="borrador", server_default="borrador", index=True)
    creado_por_id = Column(Integer, nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

from sqlalchemy import (
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from backend.app.database import Base


class ExpedienteGasto(Base):
    """
    Gasto asociado a un expediente.

    Se conservan los campos originales para mantener la compatibilidad con
    los registros y las operaciones existentes. Los nuevos campos son
    opcionales; la migración de base de datos se entregará por separado.
    """

    __tablename__ = "expediente_gastos"

    id = Column(Integer, primary_key=True, index=True)

    # Relación con Expediente.id (identificador interno numérico).
    expediente_id = Column(
        Integer,
        ForeignKey("expedientes.id"),
        nullable=True,
        index=True,
    )

    # Campos originales: se mantienen por compatibilidad.
    tipo = Column(String(200), nullable=True)
    descripcion = Column(String(500), nullable=True)
    importe = Column(Numeric(12, 2), nullable=True)
    fecha = Column(Date, nullable=True)
    documento_url = Column(String(500), nullable=True)

    # Identificación y facturación.
    nif_notario = Column(String(50), nullable=True)
    nombre_notario = Column(String(300), nullable=True)
    pagador = Column(String(300), nullable=True)
    cuenta_bancaria = Column(String(34), nullable=True)
    medio_pago = Column(String(100), nullable=True)
    numero_factura = Column(String(150), nullable=True)
    fecha_factura = Column(Date, nullable=True)

    # Bases imponibles.
    importe_total_bruto = Column(Numeric(12, 2), nullable=True)
    base_exenta_impuestos = Column(Numeric(12, 2), nullable=True)
    base_sujeta_impuestos = Column(Numeric(12, 2), nullable=True)

    # Impuestos.
    tramo_impuesto = Column(String(50), nullable=True)
    tipo_impuesto = Column(String(30), nullable=True)
    porcentaje_impuesto = Column(Numeric(5, 2), nullable=True)
    importe_impuesto = Column(Numeric(12, 2), nullable=True)

    # Retenciones.
    base_exenta_retencion = Column(Numeric(12, 2), nullable=True)
    base_sujeta_retencion = Column(Numeric(12, 2), nullable=True)
    tipo_retencion = Column(String(100), nullable=True)
    porcentaje_retencion = Column(Numeric(5, 2), nullable=True)
    importe_retencion = Column(Numeric(12, 2), nullable=True)

    # Resultado del cálculo fiscal.
    importe_resultante = Column(Numeric(12, 2), nullable=True)

    # Referencia al documento de Carpeta Digital, si existe.
    documento_carpeta_id = Column(Integer, nullable=True)
    estado_pago = Column(String(50), nullable=True, default="Pendiente")

    # Campos ABSIS para el informe de facturación. Opcionales y sin alterar datos históricos.
    estado_absis = Column(String(100), nullable=True)
    estado_justificante = Column(String(100), nullable=True)
    fecha_adjuntar_factura = Column(Date, nullable=True)
    imp_gasto = Column(Numeric(12, 2), nullable=True)
    imp_base_impuesto = Column(Numeric(12, 2), nullable=True)
    imp_base_retencion = Column(Numeric(12, 2), nullable=True)
    imp_impuesto = Column(Numeric(12, 2), nullable=True)
    fecha_estado = Column(Date, nullable=True)
    fecha_peticion = Column(Date, nullable=True)
    fecha_pago = Column(Date, nullable=True)

    # Identidad y trazabilidad del histórico ABSIS Post Firma.
    # No se impone UNIQUE hasta auditar posibles duplicados históricos en producción.
    id_gasto_absis = Column(String(100), nullable=True, index=True)
    id_expediente_absis = Column(String(100), nullable=True, index=True)
    tipo_operacion_absis = Column(String(300), nullable=True)
    concepto_gasto_absis = Column(String(300), nullable=True)
    datos_absis_json = Column(Text, nullable=True)

    @property
    def numero_documento(self):
        """Número estable del documento económico derivado de la PK no reutilizable."""
        if self.id is None:
            return None
        return f"PAG-{int(self.id):06d}"

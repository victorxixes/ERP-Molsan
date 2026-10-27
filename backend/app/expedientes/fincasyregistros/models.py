from sqlalchemy import Column, Integer, String, Date, ForeignKey
from backend.app.database import Base

class ExpedienteFinca(Base):
    __tablename__ = "expediente_fincas"

    id = Column(Integer, primary_key=True)

    # Relación con expediente
    expediente_id = Column(Integer, ForeignKey("expedientes.id"))

    # ============================
    # DATOS DE FINCA
    # ============================
    finca = Column(String(200))                # Número de finca
    cru_idufir = Column(String(200))           # CRU / IDUFIR

    # ============================
    # UBICACIÓN REGISTRAL
    # ============================
    provincia = Column(String(200))            # Provincia
    poblacion = Column(String(200))            # Población

    # Registro (número + nombre)
    registro = Column(String(300))             # Texto visible y compatibilidad con datos antiguos
    registro_propiedad_id = Column(Integer, ForeignKey("registros_propiedad.id"), nullable=True, index=True)

    # ============================
    # DATOS REGISTRALES
    # ============================
    seccion = Column(String(100))              # Sección
    cuantia = Column(String(200))              # Cuantía
    inscripcion = Column(String(200))          # Inscripción
    contrato = Column(String(200))             # Contrato
    fecha_constitucion = Column(Date)          # Fecha Constitución

    # ============================
    # SUBROGACIÓN
    # ============================
    subrogado = Column(String(20))             # SI / NO

    # ============================
    # ENTIDAD ORIGINAL
    # ============================
    entidad_original = Column(String(300))     # Nombre de la entidad original

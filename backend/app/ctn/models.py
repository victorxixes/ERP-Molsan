from sqlalchemy import Column, Integer, String, Text, ForeignKey, Index, Boolean
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Notaria(Base):
    __tablename__ = "ctn_notarios"
    __allow_unmapped__ = True

    id = Column(Integer, primary_key=True, index=True)

    # Datos básicos
    codigo = Column(String(50), nullable=True, index=True)
    nombre = Column(String(150), nullable=True, index=True)
    apellidos = Column(String(150), nullable=True, index=True)
    nif = Column(String(50), nullable=True, index=True)
    telefono = Column(String(50), nullable=True)

    # Departamentos internos
    departamento_cancelaciones = Column(String(150), nullable=True)
    departamento_copias = Column(String(150), nullable=True)
    otros_departamentos = Column(String(150), nullable=True)

    # Dirección
    cp = Column(String(10), nullable=True)
    provincia = Column(String(100), nullable=True, index=True)
    municipio = Column(String(100), nullable=True, index=True)
    direccion = Column(String(255), nullable=True)

    # Coordenadas (necesarias para informes)
    lat = Column(String(50), nullable=True)
    lng = Column(String(50), nullable=True)

    # VC
    vc = Column(String(50), nullable=True, index=True)

    # Apoderados
    apoderado = Column(String(150), nullable=True, index=True)
    apoderado_s = Column(String(150), nullable=True)

    # Acceso al portal externo NotarGest
    notargest_habilitado = Column(Boolean, nullable=False, default=False, server_default="false")

    # Observaciones
    observacion = Column(Text, nullable=True)

    apoderado_id = Column(Integer, ForeignKey("empleados.id"), nullable=True)

    citas = relationship(
        "Cita",
        back_populates="notario",
        lazy="selectin"
    )

# Índices adicionales
Index("idx_notaria_nombre", Notaria.nombre)
Index("idx_notaria_apellidos", Notaria.apellidos)
Index("idx_notaria_apoderado", Notaria.apoderado)
Index("idx_notaria_provincia", Notaria.provincia)
Index("idx_notaria_municipio", Notaria.municipio)
Index("idx_notaria_vc", Notaria.vc)
Index("idx_notaria_codigo", Notaria.codigo)
Index("idx_notaria_nif", Notaria.nif)

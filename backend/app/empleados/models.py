from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB

from backend.app.database import Base


class Empleado(Base):
    __tablename__ = "empleados"

    id = Column(Integer, primary_key=True, index=True)

    # =========================================================
    # DATOS BÁSICOS
    # =========================================================

    nombre = Column(String)
    apellidos = Column(String)
    dni = Column(String)

    telefono = Column(String)
    email_personal = Column(String)
    email_empresa = Column(String)
    extension = Column(String)

    usuario = Column(String, unique=True, index=True)
    password = Column(String)

    # =========================================================
    # DATOS PERSONALES
    # =========================================================

    direccion = Column(String)
    codigo_postal = Column(String)
    poblacion = Column(String)
    provincia = Column(String)

    fecha_nacimiento = Column(String)

    alergias = Column(String)

    persona_contacto = Column(String)
    telefono_contacto = Column(String)

    observaciones = Column(String)

    foto = Column(String)

    # =========================================================
    # DATOS LABORALES
    # =========================================================

    departamento_id = Column(Integer)
    seccion_id = Column(Integer)
    cargo_id = Column(Integer)

    fecha_alta = Column(String)
    fecha_baja = Column(String)

    # =========================================================
    # ROL
    # =========================================================

    rol_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=True
    )

    rol = relationship(
        "Rol",
        back_populates="empleados"
    )

    # =========================================================
    # ESTADO
    # =========================================================

    activo = Column(
        Boolean,
        default=True,
        nullable=False
    )

    # Habilita el circuito mensual de liquidaciones de ApoderaGest.
    es_colaborador = Column(Boolean, nullable=False, default=False, server_default="false")
    # Honorario neto por protocolo único firmado por el colaborador.
    honorarios_valor = Column(Float, nullable=False, default=0, server_default="0")

    # Controla la aparición en el listado visual de tarjetas, sin desactivar la cuenta.
    visible_en_listado = Column(
        Boolean,
        default=True,
        nullable=False,
        server_default="true"
    )

    # =========================================================
    # SEGURIDAD
    # =========================================================

    modulos_visibles_list = Column(
        JSONB,
        default=list
    )

    permisos_modulo_dict = Column(
        JSONB,
        default=dict
    )

    

    # Notarías CTN que este empleado puede gestionar desde EncargaGest.
    notarias_encargagest_ids = Column(JSONB, nullable=False, default=list, server_default="[]")
    # Reglas de reparto por departamento, actividad y ámbito territorial.
    reparto_actividades_json = Column(JSONB, nullable=False, default=list, server_default="[]")

    # =========================================================
    # AGENDA
    # =========================================================

    citas = relationship(
        "Cita",
        back_populates="apoderado_rel",
        lazy="selectin"
    )

from typing import Optional

from pydantic import BaseModel


# =========================================================
# LOGIN
# =========================================================

class LoginEmpleado(BaseModel):
    usuario: str
    password: str


# =========================================================
# ROL
# =========================================================

class RolEmpleadoOut(BaseModel):

    id: Optional[int] = None

    nombre: Optional[str] = None

    class Config:
        orm_mode = True


# =========================================================
# EMPLEADO
# =========================================================

class Empleado(BaseModel):

    id: int

    # =====================================================
    # BÁSICOS
    # =====================================================

    nombre: Optional[str] = None

    apellidos: Optional[str] = None

    dni: Optional[str] = None

    telefono: Optional[str] = None

    email_personal: Optional[str] = None

    email_empresa: Optional[str] = None

    extension: Optional[str] = None

    usuario: Optional[str] = None

    # =====================================================
    # PERSONALES
    # =====================================================

    direccion: Optional[str] = None

    codigo_postal: Optional[str] = None

    poblacion: Optional[str] = None

    provincia: Optional[str] = None

    fecha_nacimiento: Optional[str] = None

    alergias: Optional[str] = None

    persona_contacto: Optional[str] = None

    telefono_contacto: Optional[str] = None

    observaciones: Optional[str] = None

    foto: Optional[str] = None

    # =====================================================
    # LABORALES
    # =====================================================

    departamento_id: Optional[int] = None

    seccion_id: Optional[int] = None

    cargo_id: Optional[int] = None

    fecha_alta: Optional[str] = None

    fecha_baja: Optional[str] = None

    # =====================================================
    # ESTADO
    # =====================================================

    activo: Optional[bool] = True

    es_colaborador: Optional[bool] = False

    visible_en_listado: Optional[bool] = True

    # =====================================================
    # SEGURIDAD
    # =====================================================

    modulos_visibles_list: Optional[list] = None

    permisos_modulo_dict: Optional[dict] = None

    # =====================================================
    # ROL
    # =====================================================

    rol_id: Optional[int] = None

    rol: Optional[RolEmpleadoOut] = None

    # =====================================================
    # NOMBRES MAESTROS
    # =====================================================

    departamento_nombre: Optional[str] = None

    seccion_nombre: Optional[str] = None

    cargo_nombre: Optional[str] = None

    # =====================================================
    # CONFIG PYDANTIC
    # =====================================================

    class Config:
        orm_mode = True


# =========================================================
# COMPATIBILIDAD
# =========================================================

EmpleadoBase = Empleado


# =========================================================
# CREATE
# =========================================================

class EmpleadoCreate(BaseModel):

    nombre: str

    apellidos: Optional[str] = None

    dni: str

    usuario: str

    password: str

    telefono: Optional[str] = None

    email_personal: Optional[str] = None

    email_empresa: Optional[str] = None

    extension: Optional[str] = None


# =========================================================
# UPDATE
# =========================================================

class EmpleadoUpdate(BaseModel):

    # =====================================================
    # BÁSICOS
    # =====================================================

    nombre: Optional[str] = None

    apellidos: Optional[str] = None

    dni: Optional[str] = None

    telefono: Optional[str] = None

    email_personal: Optional[str] = None

    email_empresa: Optional[str] = None

    extension: Optional[str] = None

    usuario: Optional[str] = None

    password: Optional[str] = None

    # =====================================================
    # PERSONALES
    # =====================================================

    direccion: Optional[str] = None

    codigo_postal: Optional[str] = None

    poblacion: Optional[str] = None

    provincia: Optional[str] = None

    fecha_nacimiento: Optional[str] = None

    alergias: Optional[str] = None

    persona_contacto: Optional[str] = None

    telefono_contacto: Optional[str] = None

    observaciones: Optional[str] = None

    # =====================================================
    # LABORALES
    # =====================================================

    departamento_id: Optional[int] = None

    seccion_id: Optional[int] = None

    cargo_id: Optional[int] = None

    fecha_alta: Optional[str] = None

    fecha_baja: Optional[str] = None

    # =====================================================
    # ESTADO
    # =====================================================

    activo: Optional[bool] = None

    es_colaborador: Optional[bool] = None

    visible_en_listado: Optional[bool] = None

    # =====================================================
    # SEGURIDAD
    # =====================================================

    modulos_visibles_list: Optional[list] = None

    permisos_modulo_dict: Optional[dict] = None

    # =====================================================
    # ROL
    # =====================================================

    rol_id: Optional[int] = None

from datetime import datetime, timedelta
import jwt
import json

from backend.app.config import settings
from backend.app.empleados.models import Empleado


# ---------------------------------------------------------
# CREAR TOKEN JWT
# ---------------------------------------------------------
def crear_token(empleado: Empleado):
    exp = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "id": empleado.id,
        "usuario": empleado.usuario,
        "rol_id": empleado.rol_id,
        "rol_nombre": empleado.rol.nombre if empleado.rol else None,
        "exp": exp
    }

    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.ALGORITHM)


# ---------------------------------------------------------
# SERIALIZAR EMPLEADO (SEGURO Y COMPATIBLE)
# ---------------------------------------------------------
def serializar_empleado(empleado: Empleado):

    # Saneo JSONB modulos
    mv = empleado.modulos_visibles_list
    if isinstance(mv, str):
        try:
            mv = json.loads(mv)
        except:
            mv = []
    elif mv is None:
        mv = []

    # Compatibilidad ERP antiguo
    if hasattr(empleado, "modulos_visibles") and empleado.modulos_visibles:
        try:
            mv = json.loads(empleado.modulos_visibles) if isinstance(empleado.modulos_visibles, str) else empleado.modulos_visibles
        except:
            mv = []

    # Saneo JSONB permisos
    pm = empleado.permisos_modulo_dict
    if isinstance(pm, str):
        try:
            pm = json.loads(pm)
        except:
            pm = {}
    elif pm is None:
        pm = {}

    if hasattr(empleado, "permisos_modulo") and empleado.permisos_modulo:
        try:
            pm = json.loads(empleado.permisos_modulo) if isinstance(empleado.permisos_modulo, str) else empleado.permisos_modulo
        except:
            pm = {}

    return {
        "empleado_id": empleado.id,
        "nombre": empleado.nombre,
        "apellidos": empleado.apellidos,
        "usuario": empleado.usuario,
        "email_empresa": empleado.email_empresa,
        "email_personal": empleado.email_personal,
        "foto": empleado.foto,
        "activo": empleado.activo,

        "rol_id": empleado.rol_id,
        "rol_nombre": empleado.rol.nombre if empleado.rol else None,

        "departamento_id": empleado.departamento_id,
        "seccion_id": empleado.seccion_id,
        "cargo_id": empleado.cargo_id,

        "modulos_visibles_list": mv,
        "permisos_modulo_dict": pm
    }

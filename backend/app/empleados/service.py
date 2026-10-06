from sqlalchemy.orm import Session
from sqlalchemy import or_
import hashlib

from backend.app.empleados.models import Empleado
from backend.app.empleados.schemas import (
    EmpleadoCreate,
    EmpleadoUpdate
)

from backend.app.auth.service import (
    crear_token,
    serializar_empleado
)

from backend.app.maestros.models import (
    Departamento,
    Seccion,
    Cargo
)


# =========================================================
# PASSWORD
# =========================================================

def hash_password(password: str) -> str:
    return hashlib.sha256(
        password.encode("utf-8")
    ).hexdigest()


# =========================================================
# LOGIN
# =========================================================

def login_empleado(
    db: Session,
    usuario: str,
    password: str
):

    empleado = (
        db.query(Empleado)
        .filter(
            Empleado.usuario == usuario
        )
        .first()
    )

    if empleado is None:
        return None

    # -----------------------------------------------------
    # COMPROBAR ACTIVO
    # -----------------------------------------------------

    if hasattr(empleado, "activo"):

        if empleado.activo is False:
            return None

    # -----------------------------------------------------
    # COMPROBAR PASSWORD
    # -----------------------------------------------------

    if empleado.password != hash_password(password):
        return None

    # -----------------------------------------------------
    # TOKEN
    # -----------------------------------------------------

    token = crear_token(
        empleado
    )

    # -----------------------------------------------------
    # SERIALIZAR EMPLEADO
    # -----------------------------------------------------

    empleado_serializado = serializar_empleado(
        empleado
    )

    return {
        "empleado": empleado_serializado,
        "token": token
    }


# =========================================================
# OBTENER EMPLEADO
# =========================================================

def obtener_empleado(
    db: Session,
    empleado_id: int
):

    return (
        db.query(Empleado)
        .filter(
            Empleado.id == empleado_id
        )
        .first()
    )


# =========================================================
# OBTENER EMPLEADO PARA FICHA
#
# Devuelve los datos del empleado junto con:
# - departamento_nombre
# - seccion_nombre
# - cargo_nombre
#
# No modificamos obtener_empleado() porque muchas otras
# funciones del sistema necesitan el objeto SQLAlchemy
# Empleado original.
# =========================================================

def obtener_empleado_ficha(
    db: Session,
    empleado_id: int
):

    resultado = (
        db.query(
            Empleado,

            Departamento.nombre.label(
                "departamento_nombre"
            ),

            Seccion.nombre.label(
                "seccion_nombre"
            ),

            Cargo.nombre.label(
                "cargo_nombre"
            )
        )
        .outerjoin(
            Departamento,
            Empleado.departamento_id
            == Departamento.id
        )
        .outerjoin(
            Seccion,
            Empleado.seccion_id
            == Seccion.id
        )
        .outerjoin(
            Cargo,
            Empleado.cargo_id
            == Cargo.id
        )
        .filter(
            Empleado.id == empleado_id
        )
        .first()
    )

    if not resultado:
        return None

    empleado = resultado[0]

    # -----------------------------------------------------
    # CONVERTIR DATOS DEL EMPLEADO A DICCIONARIO
    # -----------------------------------------------------

    datos = {
        columna.name: getattr(
            empleado,
            columna.name
        )
        for columna in Empleado.__table__.columns
    }

    # -----------------------------------------------------
    # AÑADIR NOMBRES DE LOS MAESTROS
    # -----------------------------------------------------

    datos["departamento_nombre"] = (
        resultado.departamento_nombre
    )

    datos["seccion_nombre"] = (
        resultado.seccion_nombre
    )

    datos["cargo_nombre"] = (
        resultado.cargo_nombre
    )

    return datos


# =========================================================
# OBTENER EMPLEADO POR USUARIO
# =========================================================

def obtener_empleado_por_usuario(
    db: Session,
    usuario: str
):

    return (
        db.query(Empleado)
        .filter(
            Empleado.usuario == usuario
        )
        .first()
    )


# =========================================================
# CREAR / REPARAR ADMIN
# =========================================================

def crear_admin_por_defecto(
    db: Session
):
    """
    Crea el usuario admin si no existe.

    Si ya existe:
    - lo activa
    - le asigna rol admin
    - le asigna todos los módulos
    - le asigna todos los permisos

    Esto permite reparar instalaciones antiguas
    donde el admin ya existía pero tenía módulos vacíos.
    """

    # =====================================================
    # MÓDULOS COMPLETOS DEL ADMIN
    # =====================================================

    modulos_admin = [
        "dashboard",
        "agenda",
        "empleados",
        "informes",
        "intranet",
        "auditoria",
        "seguridad",
        "utilidades",
        "logs",
        "ctn",
        "maestros",
        "mensajes",
        "realtime",
        "notarios",
        "documentos",
        "expedientes"
    ]

    # =====================================================
    # PERMISOS COMPLETOS DEL ADMIN
    # =====================================================

    permisos_admin = {
        "*": [
            "ver",
            "crear",
            "editar",
            "eliminar"
        ]
    }

    # =====================================================
    # BUSCAR ADMIN
    # =====================================================

    admin = obtener_empleado_por_usuario(
        db,
        "admin"
    )

    # =====================================================
    # CREAR ADMIN SI NO EXISTE
    # =====================================================

    if not admin:

        admin = Empleado(

            nombre="Administrador",

            apellidos="",

            dni="",

            usuario="admin",

            password=hash_password(
                "admin"
            ),

            activo=True,

            foto="default-avatar.png",

            rol_id=0,

            modulos_visibles_list=modulos_admin,

            permisos_modulo_dict=permisos_admin
        )

        db.add(admin)

        db.commit()

        db.refresh(admin)

        print(
            "ADMIN: usuario admin creado correctamente",
            flush=True
        )

        return admin

    # =====================================================
    # REPARAR ADMIN EXISTENTE
    # =====================================================

    admin.activo = True

    # -----------------------------------------------------
    # ROL
    # -----------------------------------------------------

    admin.rol_id = 0

    # -----------------------------------------------------
    # MÓDULOS
    # -----------------------------------------------------

    admin.modulos_visibles_list = list(
        modulos_admin
    )

    # -----------------------------------------------------
    # PERMISOS
    # -----------------------------------------------------

    admin.permisos_modulo_dict = dict(
        permisos_admin
    )

    db.commit()

    db.refresh(admin)

    print(
        "ADMIN: usuario admin reparado correctamente",
        flush=True
    )

    print(
        f"ADMIN MÓDULOS: {admin.modulos_visibles_list}",
        flush=True
    )

    print(
        f"ADMIN PERMISOS: {admin.permisos_modulo_dict}",
        flush=True
    )

    return admin


# =========================================================
# CREAR EMPLEADO
# =========================================================

def crear_empleado(
    db: Session,
    data: EmpleadoCreate
):

    # -----------------------------------------------------
    # COMPROBAR USUARIO
    # -----------------------------------------------------

    if obtener_empleado_por_usuario(
        db,
        data.usuario
    ):

        raise ValueError(
            "El usuario ya existe"
        )

    # -----------------------------------------------------
    # CREAR
    # -----------------------------------------------------

    empleado = Empleado(

        nombre=data.nombre,

        apellidos=data.apellidos,

        dni=data.dni,

        usuario=data.usuario,

        password=hash_password(
            data.password
        ),

        telefono=data.telefono,

        email_personal=data.email_personal,

        email_empresa=data.email_empresa,

        extension=data.extension,

        activo=True,

        modulos_visibles_list=[],

        permisos_modulo_dict={}
    )

    db.add(
        empleado
    )

    db.commit()

    db.refresh(
        empleado
    )

    return empleado


# =========================================================
# LISTADO EMPLEADOS
# =========================================================

def listar_empleados(
    db: Session,
    q: str | None = None,
    activo: bool | None = None
):

    query = db.query(

        Empleado.id,

        Empleado.nombre,

        Empleado.apellidos,

        Empleado.dni,

        Empleado.telefono,

        Empleado.email_empresa,

        Empleado.extension,

        Empleado.usuario,

        Empleado.activo,

        Empleado.foto,

        Empleado.departamento_id,

        Empleado.seccion_id,

        Empleado.cargo_id,

        Empleado.fecha_alta,

        Empleado.fecha_baja,

        Empleado.rol_id,

        Departamento.nombre.label(
            "departamento_nombre"
        ),

        Seccion.nombre.label(
            "seccion_nombre"
        ),

        Cargo.nombre.label(
            "cargo_nombre"
        )
    )

    # =====================================================
    # JOINS
    # =====================================================

    query = (
        query
        .outerjoin(
            Departamento,
            Empleado.departamento_id
            == Departamento.id
        )
        .outerjoin(
            Seccion,
            Empleado.seccion_id
            == Seccion.id
        )
        .outerjoin(
            Cargo,
            Empleado.cargo_id
            == Cargo.id
        )
    )

    # =====================================================
    # BUSQUEDA
    # =====================================================

    if q:

        q_like = f"%{q}%"

        query = query.filter(

            or_(

                Empleado.nombre.ilike(
                    q_like
                ),

                Empleado.apellidos.ilike(
                    q_like
                ),

                Empleado.usuario.ilike(
                    q_like
                ),

                Empleado.dni.ilike(
                    q_like
                )
            )
        )

    # =====================================================
    # ACTIVO
    # =====================================================

    if activo is not None:

        query = query.filter(
            Empleado.activo == activo
        )

    # =====================================================
    # RESULTADO
    # =====================================================

    return (
        query
        .order_by(
            Empleado.id.asc()
        )
        .all()
    )


# =========================================================
# EDITAR EMPLEADO
# =========================================================

def editar_empleado(
    db: Session,
    empleado_id: int,
    data: EmpleadoUpdate
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:
        return None

    datos = data.dict(
        exclude_unset=True
    )

    # =====================================================
    # APLICAR CAMBIOS
    # =====================================================

    for campo, valor in datos.items():

        # -------------------------------------------------
        # PASSWORD
        # -------------------------------------------------

        if campo == "password":

            if valor:

                empleado.password = (
                    hash_password(
                        valor
                    )
                )

            continue

        # -------------------------------------------------
        # ROL
        # -------------------------------------------------

        if campo == "rol_id":

            empleado.rol_id = valor

            continue

        # -------------------------------------------------
        # RESTO
        # -------------------------------------------------

        setattr(
            empleado,
            campo,
            valor
        )

    db.commit()

    db.refresh(
        empleado
    )

    return empleado


# =========================================================
# ELIMINAR EMPLEADO
# =========================================================

def eliminar_empleado(
    db: Session,
    empleado_id: int
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:
        return False

    db.delete(
        empleado
    )

    db.commit()

    return True


# =========================================================
# ACTUALIZAR MÓDULOS VISIBLES
# =========================================================

def actualizar_modulos_visibles(
    db: Session,
    empleado_id: int,
    modulos: list
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:
        return None

    empleado.modulos_visibles_list = (
        modulos or []
    )

    db.commit()

    db.refresh(
        empleado
    )

    return empleado


# =========================================================
# ACTUALIZAR PERMISOS
# =========================================================

def actualizar_permisos_modulo(
    db: Session,
    empleado_id: int,
    permisos: dict
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:
        return None

    empleado.permisos_modulo_dict = (
        permisos or {}
    )

    db.commit()

    db.refresh(
        empleado
    )

    return empleado


# =========================================================
# RESET PASSWORD
# =========================================================

def reset_password(
    db: Session,
    empleado_id: int
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:
        return None

    # -----------------------------------------------------
    # PASSWORD TEMPORAL
    # -----------------------------------------------------

    password_temporal = (
        f"SJ{empleado_id}2026"
    )

    empleado.password = hash_password(
        password_temporal
    )

    db.commit()

    return {
        "status": "ok",
        "password_temporal": password_temporal
    }

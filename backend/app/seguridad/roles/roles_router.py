from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo

from backend.app.seguridad.roles.models import Rol
from backend.app.seguridad.roles.schemas import (
    RolCreate,
    RolOut,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/seguridad/roles",
    tags=["Seguridad - Roles"],
)


def _requiere_permiso_seguridad(accion: str):
    def comprobar(usuario=Depends(get_current_user)):
        require_perm_modulo(usuario, "seguridad", accion)
        return usuario
    return comprobar


# ============================================================
# HELPERS
# ============================================================

def reparar_secuencia_roles(
    db: Session,
):
    """
    Repara la secuencia PostgreSQL asociada a roles.id.

    Esto es necesario si la tabla roles contiene IDs válidos
    pero la secuencia interna de PostgreSQL se ha quedado
    desincronizada.

    Ejemplo:

        tabla:
            1
            2
            3
            4
            5

        secuencia:
            intenta generar 1

    PostgreSQL produciría un conflicto con roles_pkey.

    Después de esta función, la secuencia queda preparada
    para continuar desde el ID máximo existente.
    """

    print(
        "[ROLES] Comprobando secuencia PostgreSQL...",
        flush=True,
    )

    try:

        resultado = db.execute(
            text(
                """
                SELECT pg_get_serial_sequence(
                    'roles',
                    'id'
                )
                """
            )
        ).scalar()

        if not resultado:

            print(
                "[ROLES] No se encontró secuencia asociada a roles.id.",
                flush=True,
            )

            return

        print(
            f"[ROLES] Secuencia detectada: {resultado}",
            flush=True,
        )

        max_id = db.execute(
            text(
                """
                SELECT COALESCE(
                    MAX(id),
                    0
                )
                FROM roles
                """
            )
        ).scalar()

        max_id = int(max_id or 0)

        print(
            f"[ROLES] ID máximo actual: {max_id}",
            flush=True,
        )

        if max_id <= 0:

            # Tabla vacía.
            #
            # Dejamos la secuencia preparada para generar 1.
            db.execute(
                text(
                    "SELECT setval(:secuencia, 1, false)"
                ),
                {
                    "secuencia": resultado,
                },
            )

        else:

            # La siguiente llamada nextval()
            # generará max_id + 1.
            db.execute(
                text(
                    "SELECT setval(:secuencia, :valor, true)"
                ),
                {
                    "secuencia": resultado,
                    "valor": max_id,
                },
            )

        db.commit()

        print(
            "[ROLES] Secuencia reparada correctamente.",
            flush=True,
        )

    except Exception as exc:

        db.rollback()

        print(
            "====================================================",
            flush=True,
        )

        print(
            "[ROLES] ERROR REPARANDO SECUENCIA",
            flush=True,
        )

        print(
            f"[ROLES] ERROR: {exc}",
            flush=True,
        )

        print(
            "====================================================",
            flush=True,
        )

        raise


def es_conflicto_primary_key(
    exc: IntegrityError,
) -> bool:
    """
    Determina si el IntegrityError procede de la clave primaria
    de la tabla roles.

    PostgreSQL normalmente devuelve algo parecido a:

        duplicate key value violates unique constraint
        "roles_pkey"
    """

    error_texto = str(
        getattr(
            exc,
            "orig",
            exc,
        )
    ).lower()

    return (
        "roles_pkey" in error_texto
        or (
            "duplicate key value" in error_texto
            and "roles" in error_texto
            and "id" in error_texto
        )
    )


def es_conflicto_nombre(
    exc: IntegrityError,
) -> bool:
    """
    Determina si el IntegrityError procede de la restricción
    UNIQUE del nombre del rol.
    """

    error_texto = str(
        getattr(
            exc,
            "orig",
            exc,
        )
    ).lower()

    return (
        "roles_nombre_key" in error_texto
        or (
            "unique constraint" in error_texto
            and "nombre" in error_texto
        )
    )


# ============================================================
# CREAR ROLES BASE
# ============================================================

@router.post(
    "/crear-base",
    response_model=list[RolOut],
)
def crear_roles_base(
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_permiso_seguridad("editar")),
):
    """
    Crea los roles base del sistema si todavía no existen.

    Los roles que ya existen no se duplican.
    """

    roles_base = [
        {
            "nombre": "Administrador",
            "descripcion": "Administrador del sistema.",
        },
        {
            "nombre": "Responsable",
            "descripcion": "Responsable de gestión.",
        },
        {
            "nombre": "Usuario",
            "descripcion": "Usuario estándar del sistema.",
        },
    ]

    resultado = []

    for datos in roles_base:

        rol = (
            db.query(Rol)
            .filter(
                Rol.nombre == datos["nombre"]
            )
            .first()
        )

        if not rol:

            rol = Rol(
                nombre=datos["nombre"],
                descripcion=datos["descripcion"],
            )

            db.add(rol)

        resultado.append(rol)

    try:

        db.commit()

    except IntegrityError as exc:

        db.rollback()

        print(
            "====================================================",
            flush=True,
        )

        print(
            "[ROLES] ERROR CREANDO ROLES BASE",
            flush=True,
        )

        print(
            f"[ROLES] ERROR: {exc}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR ORIG: {exc.orig}",
            flush=True,
        )

        print(
            "====================================================",
            flush=True,
        )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se pudieron crear los roles base. "
                "Revisa los logs del servidor."
            ),
        )

    for rol in resultado:
        db.refresh(rol)

    return resultado


# ============================================================
# LISTAR ROLES
# ============================================================

@router.get(
    "",
    response_model=list[RolOut],
)
def listar_roles(
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_permiso_seguridad("ver")),
):
    """
    Devuelve todos los roles disponibles.
    """

    roles = (
        db.query(Rol)
        .order_by(
            Rol.id.asc()
        )
        .all()
    )

    print(
        f"[ROLES] Listando roles: {len(roles)}",
        flush=True,
    )

    return roles


# ============================================================
# CREAR ROL
# ============================================================

@router.post(
    "",
    response_model=RolOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_rol(
    datos: RolCreate,
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_permiso_seguridad("crear")),
):
    """
    Crea un nuevo rol.

    Controla:

    - nombre vacío
    - nombre duplicado
    - secuencia PostgreSQL desincronizada
    - errores reales de integridad
    """

    nombre = datos.nombre.strip()

    print(
        "====================================================",
        flush=True,
    )

    print(
        f"[ROLES] Intentando crear rol: {nombre!r}",
        flush=True,
    )

    # --------------------------------------------------------
    # VALIDAR NOMBRE
    # --------------------------------------------------------

    if not nombre:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre del rol es obligatorio.",
        )

    # --------------------------------------------------------
    # COMPROBAR NOMBRE EXISTENTE
    # --------------------------------------------------------

    rol_existente = (
        db.query(Rol)
        .filter(
            Rol.nombre == nombre
        )
        .first()
    )

    if rol_existente:

        print(
            f"[ROLES] DUPLICADO REAL: "
            f"nombre={nombre!r} "
            f"id={rol_existente.id}",
            flush=True,
        )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un rol con ese nombre.",
        )

    # --------------------------------------------------------
    # FUNCIÓN INTERNA DE CREACIÓN
    # --------------------------------------------------------

    def insertar_rol():

        rol_nuevo = Rol(
            nombre=nombre,
            descripcion=datos.descripcion,
        )

        db.add(rol_nuevo)

        db.flush()

        return rol_nuevo

    # --------------------------------------------------------
    # PRIMER INTENTO
    # --------------------------------------------------------

    try:

        rol = insertar_rol()

        db.commit()

        db.refresh(rol)

        print(
            f"[ROLES] Rol creado correctamente: "
            f"id={rol.id}, "
            f"nombre={rol.nombre!r}",
            flush=True,
        )

        print(
            "====================================================",
            flush=True,
        )

        return rol

    except IntegrityError as exc:

        db.rollback()

        # ----------------------------------------------------
        # MOSTRAR ERROR REAL
        # ----------------------------------------------------

        print(
            "====================================================",
            flush=True,
        )

        print(
            "[ROLES] ERROR DE INTEGRIDAD AL CREAR ROL",
            flush=True,
        )

        print(
            f"[ROLES] NOMBRE: {nombre!r}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR: {exc}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR ORIG: {exc.orig}",
            flush=True,
        )

        print(
            f"[ROLES] STATEMENT: {exc.statement}",
            flush=True,
        )

        print(
            f"[ROLES] PARAMS: {exc.params}",
            flush=True,
        )

        print(
            "====================================================",
            flush=True,
        )

        # ----------------------------------------------------
        # CASO 1
        #
        # EL NOMBRE REALMENTE EXISTE
        # ----------------------------------------------------

        if es_conflicto_nombre(exc):

            print(
                "[ROLES] El conflicto corresponde al nombre.",
                flush=True,
            )

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un rol con ese nombre.",
            )

        # ----------------------------------------------------
        # CASO 2
        #
        # SECUENCIA DE ID DESINCRONIZADA
        # ----------------------------------------------------

        if es_conflicto_primary_key(exc):

            print(
                "[ROLES] Detectado conflicto de PRIMARY KEY.",
                flush=True,
            )

            print(
                "[ROLES] Posible secuencia desincronizada.",
                flush=True,
            )

            try:

                reparar_secuencia_roles(db)

            except Exception:

                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        "La secuencia de IDs de roles está "
                        "desincronizada y no se ha podido reparar."
                    ),
                )

            # ------------------------------------------------
            # SEGUNDO INTENTO
            # ------------------------------------------------

            try:

                print(
                    "[ROLES] Reintentando creación del rol...",
                    flush=True,
                )

                rol = insertar_rol()

                db.commit()

                db.refresh(rol)

                print(
                    f"[ROLES] Rol creado correctamente tras "
                    f"reparar secuencia: "
                    f"id={rol.id}, "
                    f"nombre={rol.nombre!r}",
                    flush=True,
                )

                print(
                    "====================================================",
                    flush=True,
                )

                return rol

            except IntegrityError as segundo_error:

                db.rollback()

                print(
                    "====================================================",
                    flush=True,
                )

                print(
                    "[ROLES] EL SEGUNDO INTENTO TAMBIÉN FALLÓ",
                    flush=True,
                )

                print(
                    f"[ROLES] ERROR: {segundo_error}",
                    flush=True,
                )

                print(
                    f"[ROLES] ERROR ORIG: "
                    f"{segundo_error.orig}",
                    flush=True,
                )

                print(
                    "====================================================",
                    flush=True,
                )

                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        "No se pudo crear el rol después de "
                        "reparar la secuencia de IDs. "
                        "Revisa los logs del servidor."
                    ),
                )

        # ----------------------------------------------------
        # OTRO ERROR DE INTEGRIDAD
        # ----------------------------------------------------

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Error de integridad al crear el rol. "
                "Revisa los logs del servidor."
            ),
        )


# ============================================================
# EDITAR ROL
# ============================================================

@router.put(
    "/{rol_id}",
    response_model=RolOut,
)
def editar_rol(
    rol_id: int,
    datos: RolCreate,
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_permiso_seguridad("editar")),
):
    """
    Actualiza un rol existente.

    El frontend puede enviar:

        {
            "nombre": "Nuevo nombre"
        }

    o:

        {
            "nombre": "Nuevo nombre",
            "descripcion": "Descripción"
        }

    Si no se envía descripción, se conserva la actual.
    """

    print(
        f"[ROLES] Editando rol id={rol_id}",
        flush=True,
    )

    # --------------------------------------------------------
    # BUSCAR ROL
    # --------------------------------------------------------

    rol = (
        db.query(Rol)
        .filter(
            Rol.id == rol_id
        )
        .first()
    )

    if not rol:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol no existe.",
        )

    # --------------------------------------------------------
    # VALIDAR NOMBRE
    # --------------------------------------------------------

    nombre = datos.nombre.strip()

    if not nombre:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre del rol es obligatorio.",
        )

    # --------------------------------------------------------
    # COMPROBAR DUPLICADO
    # --------------------------------------------------------

    otro_rol = (
        db.query(Rol)
        .filter(
            Rol.nombre == nombre,
            Rol.id != rol_id,
        )
        .first()
    )

    if otro_rol:

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe otro rol con ese nombre.",
        )

    # --------------------------------------------------------
    # ACTUALIZAR
    # --------------------------------------------------------

    rol.nombre = nombre

    if datos.descripcion is not None:

        rol.descripcion = datos.descripcion

    # --------------------------------------------------------
    # GUARDAR
    # --------------------------------------------------------

    try:

        db.commit()

    except IntegrityError as exc:

        db.rollback()

        print(
            "====================================================",
            flush=True,
        )

        print(
            "[ROLES] ERROR INTEGRIDAD EDITANDO ROL",
            flush=True,
        )

        print(
            f"[ROLES] ID: {rol_id}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR: {exc}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR ORIG: {exc.orig}",
            flush=True,
        )

        print(
            "====================================================",
            flush=True,
        )

        if es_conflicto_nombre(exc):

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe otro rol con ese nombre.",
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No se pudo actualizar el rol. "
                "Revisa los logs del servidor."
            ),
        )

    db.refresh(rol)

    print(
        f"[ROLES] Rol actualizado correctamente: "
        f"id={rol.id}, "
        f"nombre={rol.nombre!r}",
        flush=True,
    )

    return rol


# ============================================================
# ELIMINAR ROL
# ============================================================

@router.delete(
    "/{rol_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def eliminar_rol(
    rol_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_requiere_permiso_seguridad("eliminar")),
):
    """
    Elimina un rol.

    No se permite eliminar un rol que todavía esté
    asignado a empleados.
    """

    print(
        f"[ROLES] Eliminando rol id={rol_id}",
        flush=True,
    )

    # --------------------------------------------------------
    # BUSCAR ROL
    # --------------------------------------------------------

    rol = (
        db.query(Rol)
        .filter(
            Rol.id == rol_id
        )
        .first()
    )

    if not rol:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol no existe.",
        )

    # --------------------------------------------------------
    # COMPROBAR EMPLEADOS ASIGNADOS
    # --------------------------------------------------------

    if rol.empleados:

        print(
            f"[ROLES] No se puede eliminar id={rol_id}: "
            f"tiene {len(rol.empleados)} empleado(s).",
            flush=True,
        )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede eliminar el rol porque "
                "está asignado a uno o varios empleados."
            ),
        )

    # --------------------------------------------------------
    # ELIMINAR
    # --------------------------------------------------------

    db.delete(rol)

    try:

        db.commit()

    except IntegrityError as exc:

        db.rollback()

        print(
            "====================================================",
            flush=True,
        )

        print(
            "[ROLES] ERROR INTEGRIDAD ELIMINANDO ROL",
            flush=True,
        )

        print(
            f"[ROLES] ID: {rol_id}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR: {exc}",
            flush=True,
        )

        print(
            f"[ROLES] ERROR ORIG: {exc.orig}",
            flush=True,
        )

        print(
            "====================================================",
            flush=True,
        )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede eliminar el rol porque "
                "está siendo utilizado."
            ),
        )

    print(
        f"[ROLES] Rol eliminado correctamente: id={rol_id}",
        flush=True,
    )

    return None

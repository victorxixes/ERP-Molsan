from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.empleados.models import Empleado
from backend.app.maestros.models import Departamento, Seccion, Cargo
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo


router = APIRouter(
    prefix="/seguridad",
    tags=["Seguridad"]
)


# ============================================================
# PLANTILLA GLOBAL DE PERMISOS SJ-2026
# ============================================================
#
# Esta plantilla contiene todos los módulos y permisos
# disponibles actualmente en Molsan ERP.
#
# IMPORTANTE:
# La plantilla NO se guarda automáticamente en la base de datos.
# Solamente se utiliza como valor inicial cuando el empleado
# todavía no tiene permisos personalizados.
# ============================================================

PLANTILLA_PERMISOS = {
    "ctn": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "logs": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "agenda": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "intranet": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "maestros": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "catalogos": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "mensajes": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "mensajeria": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "mensajeria-gestion": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "control-fichajes": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "noticias": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "realtime": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "auditoria": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "dashboard": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "empleados": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "seguridad": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "documentos": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "utilidades": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "herramientas": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "panel-tecnico": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "expedientes": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "fusiones": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "informes": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "notificaciones": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "fichajes": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "notargest": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "encargagest": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "notargestweb": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
    "encargagestweb": [
        "ver",
        "crear",
        "editar",
        "eliminar",
    ],
}


# ============================================================
# HELPERS DE NORMALIZACIÓN
# ============================================================

def _lista_strings(valor):
    """
    Devuelve una lista formada exclusivamente por strings.

    Evita que valores inesperados almacenados en JSONB lleguen
    al frontend y provoquen errores de React.
    """

    if not isinstance(valor, list):
        return []

    return [
        item
        for item in valor
        if isinstance(item, str)
    ]


def _permisos_dict(valor):
    """
    Normaliza permisos_modulo_dict.

    Entrada esperada:

        {
            "expedientes": [
                "ver",
                "crear"
            ],
            "empleados": [
                "ver"
            ]
        }

    Salida siempre segura:

        dict[str, list[str]]
    """

    if not isinstance(valor, dict):
        return {}

    resultado = {}

    for modulo, permisos in valor.items():

        if not isinstance(modulo, str):
            continue

        resultado[modulo] = _lista_strings(
            permisos
        )

    return resultado


def _nombre_relacion(objeto):
    """
    Obtiene de forma segura el nombre de una relación.

    Los modelos de maestros utilizan normalmente el campo
    'nombre', pero mantenemos el helper blindado por si en
    algún momento cambia el modelo.
    """

    if objeto is None:
        return ""

    nombre = getattr(
        objeto,
        "nombre",
        ""
    )

    if nombre is None:
        return ""

    return str(nombre)


def _copiar_plantilla_permisos():
    """
    Devuelve una copia independiente de la plantilla.

    No devolvemos directamente PLANTILLA_PERMISOS para evitar
    que una modificación accidental altere el objeto global.
    """

    return {
        modulo: list(permisos)
        for modulo, permisos
        in PLANTILLA_PERMISOS.items()
    }


# ============================================================
# FICHA COMPLETA DEL EMPLEADO
# ============================================================

@router.get(
    "/empleado/{empleado_id}/ficha-completa"
)
def ficha_completa(
    empleado_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """
    Devuelve la información necesaria para la ficha de
    seguridad de un empleado.

    El JSON está normalizado para que React reciba siempre
    la misma estructura.
    """

    # ========================================================
    # 1. BUSCAR EMPLEADO
    # ========================================================

    empleado = (
        db.query(Empleado)
        .filter(
            Empleado.id == empleado_id
        )
        .first()
    )

    if not empleado:
        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    # Los empleados pueden consultar exclusivamente su propia ficha
    # sin necesitar el módulo Seguridad ni Empleados. La ficha ajena
    # sigue requiriendo permiso explícito de lectura en Empleados.
    id_usuario = getattr(usuario, "id", None) or getattr(usuario, "empleado_id", None)
    es_ficha_propia = id_usuario is not None and int(id_usuario) == int(empleado_id)
    if not es_ficha_propia:
        require_perm_modulo(usuario, "empleados", "ver")

    # ========================================================
    # 2. RELACIONES DE MAESTROS
    # ========================================================

    departamento = None
    seccion = None
    cargo = None

    if empleado.departamento_id:

        departamento = (
            db.query(Departamento)
            .filter(
                Departamento.id
                == empleado.departamento_id
            )
            .first()
        )

    if empleado.seccion_id:

        seccion = (
            db.query(Seccion)
            .filter(
                Seccion.id
                == empleado.seccion_id
            )
            .first()
        )

    if empleado.cargo_id:

        cargo = (
            db.query(Cargo)
            .filter(
                Cargo.id
                == empleado.cargo_id
            )
            .first()
        )

    # ========================================================
    # 3. MÓDULOS VISIBLES
    # ========================================================

    modulos_visibles = _lista_strings(
        empleado.modulos_visibles_list
    )

    # ========================================================
    # 4. PERMISOS PERSONALIZADOS
    # ========================================================

    permisos_personalizados = _permisos_dict(
        empleado.permisos_modulo_dict
    )

    # ========================================================
    # 5. PERMISOS FINALES
    # ========================================================
    #
    # Si no existen permisos personalizados utilizamos la
    # plantilla global.
    #
    # IMPORTANTE:
    # NO modificamos el JSONB almacenado en PostgreSQL.
    # ========================================================

    if permisos_personalizados:

        permisos_finales = (
            permisos_personalizados
        )

    else:

        permisos_finales = (
            _copiar_plantilla_permisos()
        )

    # ========================================================
    # 6. ROL
    # ========================================================

    rol_id = empleado.rol_id

    rol_nombre = ""

    if empleado.rol:

        rol_nombre = (
            getattr(
                empleado.rol,
                "nombre",
                ""
            )
            or ""
        )

        rol_nombre = str(
            rol_nombre
        )

    # ========================================================
    # 7. DATOS DEL EMPLEADO
    # ========================================================
    #
    # NO devolvemos directamente el objeto SQLAlchemy.
    #
    # Esto es importante:
    #
    #     "empleado": empleado
    #
    # puede generar respuestas difíciles de controlar.
    #
    # En su lugar construimos explícitamente el JSON.
    # ========================================================

    empleado_data = {

        "id": int(
            empleado.id
        ),

        "nombre": (
            empleado.nombre
            or ""
        ),

        "apellidos": (
            empleado.apellidos
            or ""
        ),

        "dni": (
            empleado.dni
            or ""
        ),

        "telefono": (
            empleado.telefono
            or ""
        ),

        "email_personal": (empleado.email_personal or ""),
        "direccion": (empleado.direccion or ""),
        "codigo_postal": (empleado.codigo_postal or ""),
        "poblacion": (empleado.poblacion or ""),
        "provincia": (empleado.provincia or ""),
        "fecha_nacimiento": (empleado.fecha_nacimiento or ""),
        "alergias": (empleado.alergias or ""),
        "persona_contacto": (empleado.persona_contacto or ""),
        "telefono_contacto": (empleado.telefono_contacto or ""),
        "observaciones": (empleado.observaciones or ""),
        "fecha_alta": (empleado.fecha_alta.isoformat() if getattr(empleado.fecha_alta, "isoformat", None) else empleado.fecha_alta),
        "fecha_baja": (empleado.fecha_baja.isoformat() if getattr(empleado.fecha_baja, "isoformat", None) else empleado.fecha_baja),


        "email_empresa": (
            empleado.email_empresa
            or ""
        ),

        "extension": (
            empleado.extension
            or ""
        ),

        "usuario": (
            empleado.usuario
            or ""
        ),

        "activo": bool(
            empleado.activo
        ),

        "foto": (
            empleado.foto
            if isinstance(
                empleado.foto,
                str
            )
            else None
        ),

        "rol_id": rol_id,

        "rol_nombre": rol_nombre,

        "departamento_id": (
            empleado.departamento_id
        ),

        "departamento_nombre": (
            _nombre_relacion(
                departamento
            )
        ),

        "seccion_id": (
            empleado.seccion_id
        ),

        "seccion_nombre": (
            _nombre_relacion(
                seccion
            )
        ),

        "cargo_id": (
            empleado.cargo_id
        ),

        "cargo_nombre": (
            _nombre_relacion(
                cargo
            )
        ),

        "modulos_visibles_list": (
            modulos_visibles
        ),
    }

    # ========================================================
    # 8. AUDITORÍA
    # ========================================================
    #
    # Todavía no conectamos aquí la tabla real de auditoría.
    # No inventamos información.
    # ========================================================

    auditoria = []

    # ========================================================
    # 9. RESPUESTA NORMALIZADA
    # ========================================================

    if es_ficha_propia:
        # Nunca exponer al propio empleado su configuración de permisos,
        # módulos, rol administrativo ni datos de auditoría.
        empleado_data.pop("rol_id", None)
        empleado_data.pop("rol_nombre", None)
        empleado_data.pop("activo", None)
        empleado_data.pop("usuario", None)
        empleado_data.pop("email_empresa", None)
        empleado_data.pop("extension", None)
        empleado_data.pop("modulos_visibles_list", None)
        modulos_visibles = []
        permisos_finales = {}
        auditoria = []

    return {

        # ----------------------------------------------------
        # EMPLEADO
        # ----------------------------------------------------

        "empleado": empleado_data,

        # ----------------------------------------------------
        # MÓDULOS
        # ----------------------------------------------------
        #
        # Alias compatible con otros posibles consumidores.
        #

        "modulos_visibles": (
            modulos_visibles
        ),

        # ----------------------------------------------------
        # PERMISOS
        # ----------------------------------------------------
        #
        # ESTE ES EL NOMBRE OFICIAL QUE UTILIZA REACT.
        #

        "permisos_modulo_dict": (
            permisos_finales
        ),

        # ----------------------------------------------------
        # DEPARTAMENTO
        # ----------------------------------------------------

        "departamento": (
            {
                "id": departamento.id,
                "nombre": _nombre_relacion(
                    departamento
                ),
            }
            if departamento
            else None
        ),

        # ----------------------------------------------------
        # SECCIÓN
        # ----------------------------------------------------

        "seccion": (
            {
                "id": seccion.id,
                "nombre": _nombre_relacion(
                    seccion
                ),
            }
            if seccion
            else None
        ),

        # ----------------------------------------------------
        # CARGO
        # ----------------------------------------------------

        "cargo": (
            {
                "id": cargo.id,
                "nombre": _nombre_relacion(
                    cargo
                ),
            }
            if cargo
            else None
        ),

        # ----------------------------------------------------
        # AUDITORÍA
        # ----------------------------------------------------

        "auditoria": auditoria,
    }

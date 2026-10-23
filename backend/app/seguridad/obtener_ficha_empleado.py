from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.empleados.models import Empleado
from backend.app.maestros.models import Departamento, Seccion, Cargo
from backend.app.seguridad.permisos.permisos_router import MODULOS_BASE
from backend.app.seguridad.auditoria.service import (
    obtener_auditoria_empleado
)


router = APIRouter(
    prefix="/seguridad",
    tags=["Seguridad - Ficha Completa Empleado"]
)


# ============================================================
# HELPERS
# ============================================================

def _lista_strings(valor):
    """
    Normaliza una lista JSONB.

    Solo permite strings.
    """

    if not isinstance(valor, list):
        return []

    return [
        str(item)
        for item in valor
        if isinstance(item, str)
    ]


def _permisos_dict(valor):
    """
    Normaliza permisos_modulo_dict.

    Formato esperado:

    {
        "expedientes": [
            "ver",
            "crear"
        ]
    }
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


def _nombre(objeto):
    """
    Obtiene el nombre de una relación de maestros.
    """

    if objeto is None:
        return ""

    valor = getattr(
        objeto,
        "nombre",
        ""
    )

    if valor is None:
        return ""

    return str(valor)


# ============================================================
# FICHA COMPLETA
# ============================================================

@router.get(
    "/empleado/{empleado_id}/ficha-completa"
)
def obtener_ficha_completa(
    empleado_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """
    Devuelve toda la información de seguridad
    de un empleado.

    Contrato estable para SeguridadFicha.jsx.
    """

    # La ficha de seguridad contiene datos personales y permisos.
    # Solo usuarios con permiso explícito de lectura en Seguridad pueden consultarla.
    require_perm_modulo(usuario, "seguridad", "ver")

    # ========================================================
    # EMPLEADO
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

    # ========================================================
    # RELACIONES MAESTROS
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
    # MÓDULOS VISIBLES
    # ========================================================

    modulos_visibles = _lista_strings(
        empleado.modulos_visibles_list
    )

    # ========================================================
    # PERMISOS PERSONALIZADOS
    # ========================================================

    permisos_personalizados = _permisos_dict(
        empleado.permisos_modulo_dict
    )

    # ========================================================
    # PERMISOS EFECTIVAMENTE GUARDADOS
    # ========================================================
    # No completar permisos con una plantilla ni conceder permisos
    # por defecto. La ficha debe reflejar exactamente lo configurado
    # por el administrador en SeguridadUsuarios.
    # Cada módulo del catálogo se devuelve siempre con sus cuatro
    # acciones disponibles en la interfaz, pero sin activar ninguna por
    # defecto. La lista refleja exclusivamente lo guardado para el empleado.
    permisos_finales = {
        modulo: list(permisos_personalizados.get(modulo, []))
        for modulo in MODULOS_BASE
    }

    # Conserva claves antiguas o módulos heredados para no ocultar
    # configuraciones existentes, sin conceder permisos adicionales.
    for modulo, acciones in permisos_personalizados.items():
        if modulo not in permisos_finales:
            permisos_finales[modulo] = list(acciones)

    # ========================================================
    # ROL
    # ========================================================

    rol_dict = None

    if empleado.rol:

        rol_dict = {
            "id": empleado.rol.id,
            "nombre": empleado.rol.nombre,
            "descripcion": empleado.rol.descripcion,
        }

    # ========================================================
    # AUDITORÍA
    # ========================================================

    try:

        # La función espera el ID numérico del empleado,
        # no el nombre de usuario.
        auditoria = obtener_auditoria_empleado(
            db,
            empleado.id
        )

    except Exception:

        auditoria = []

    if not isinstance(
        auditoria,
        list
    ):
        auditoria = []

    # ========================================================
    # EMPLEADO NORMALIZADO
    # ========================================================

    empleado_data = {

        "id": empleado.id,

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

        "email_personal": (
            empleado.email_personal
            or ""
        ),

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

        "direccion": (
            empleado.direccion
            or ""
        ),

        "codigo_postal": (
            empleado.codigo_postal
            or ""
        ),

        "poblacion": (
            empleado.poblacion
            or ""
        ),

        "provincia": (
            empleado.provincia
            or ""
        ),

        "fecha_nacimiento": (
            empleado.fecha_nacimiento
            or ""
        ),

        "alergias": (
            empleado.alergias
            or ""
        ),

        "persona_contacto": (
            empleado.persona_contacto
            or ""
        ),

        "telefono_contacto": (
            empleado.telefono_contacto
            or ""
        ),

        "observaciones": (
            empleado.observaciones
            or ""
        ),

        "foto": (
            empleado.foto
            if isinstance(
                empleado.foto,
                str
            )
            else None
        ),

        "departamento_id": (
            empleado.departamento_id
        ),

        "departamento_nombre": (
            _nombre(departamento)
        ),

        "seccion_id": (
            empleado.seccion_id
        ),

        "seccion_nombre": (
            _nombre(seccion)
        ),

        "cargo_id": (
            empleado.cargo_id
        ),

        "cargo_nombre": (
            _nombre(cargo)
        ),

        "rol_id": (
            empleado.rol_id
        ),

        "rol_nombre": (
            rol_dict["nombre"]
            if rol_dict
            else ""
        ),

        "fecha_alta": (
            empleado.fecha_alta
            or ""
        ),

        "fecha_baja": (
            empleado.fecha_baja
            or ""
        ),

        "activo": bool(
            empleado.activo
        ),

        "modulos_visibles_list": (
            modulos_visibles
        ),
    }

    # ========================================================
    # RESPUESTA
    # ========================================================

    return {

        "empleado": empleado_data,

        "modulos_visibles": (
            modulos_visibles
        ),

        # Nombre que utiliza React
        "permisos_modulo_dict": (
            permisos_finales
        ),

        # Alias de compatibilidad
        "permisos_modulo": (
            permisos_finales
        ),

        "rol": rol_dict,

        "departamento": (
            {
                "id": departamento.id,
                "nombre": _nombre(
                    departamento
                ),
            }
            if departamento
            else None
        ),

        "seccion": (
            {
                "id": seccion.id,
                "nombre": _nombre(
                    seccion
                ),
            }
            if seccion
            else None
        ),

        "cargo": (
            {
                "id": cargo.id,
                "nombre": _nombre(
                    cargo
                ),
            }
            if cargo
            else None
        ),

        "auditoria": auditoria,
    }

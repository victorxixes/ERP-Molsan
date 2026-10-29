from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.seguridad.permisos.models import Permiso


router = APIRouter(
    prefix="/seguridad/permisos",
    tags=["Seguridad - Permisos"]
)


# ============================================================
# PERMISOS BASE SJ-2026
# ============================================================
#
# Catálogo único de módulos/permisos disponibles en Molsan ERP.
#
# IMPORTANTE:
# Esta lista debe mantenerse sincronizada con
# PLANTILLA_PERMISOS de:
#
# backend/app/seguridad/router.py
#
# ============================================================

MODULOS_BASE = [
    "expedientes",
    "provisiones-fondos",
    "dashboard",
    "agenda",
    "empleados",
    "herramientas",
    "fichajes",
    "ctn",
    "intranet",
    "mensajes",
    "mensajeria",
    "mensajeria-gestion",
    "control-fichajes",
    "noticias",
    "informes",
    "fusiones",
    "notificaciones",
    "auditoria",
    "catalogos",
    "utilidades",
    "seguridad",
    "logs",
    "maestros",
    "panel-tecnico",
    "realtime",
    "notarios",
    "documentos",
    "apoderagest",
    "cancelagest",
    "notargest",
    "encargagest",
    "notargestweb",
    "encargagestweb",
]

PERMISOS_BASE = [
    "ver",
    "crear",
    "editar",
    "eliminar",
]


# ============================================================
# GENERAR CATÁLOGO BASE
# ============================================================

def _catalogo_base():
    """
    Genera todas las combinaciones módulo/permisos.

    Ejemplo:

        {
            "modulo": "expedientes",
            "permiso": "ver"
        }

    """

    return [
        {
            "modulo": modulo,
            "permiso": permiso,
        }
        for modulo in MODULOS_BASE
        for permiso in PERMISOS_BASE
    ]


# ============================================================
# LISTAR PERMISOS
# ============================================================

@router.get("/")
def obtener_permisos(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "seguridad", "ver")
    """
    Devuelve todos los permisos almacenados en BD.

    Si la tabla todavía está vacía, devolvemos el catálogo base
    para que la interfaz de Seguridad pueda funcionar incluso
    antes de ejecutar crear-base.
    """

    permisos = (
        db.query(Permiso)
        .order_by(
            Permiso.modulo.asc(),
            Permiso.permiso.asc()
        )
        .all()
    )

    # --------------------------------------------------------
    # Combina los permisos almacenados con el catálogo base. Así los nuevos
    # módulos aparecen en Seguridad aunque todavía no se hayan sembrado sus
    # filas en la tabla permisos. Los elementos no persistidos llevan id=None;
    # la asignación al empleado guarda claves módulo/acción, no este id.
    resultado = [
        {
            "id": permiso.id,
            "modulo": permiso.modulo,
            "permiso": permiso.permiso,
        }
        for permiso in permisos
        if (
            permiso
            and isinstance(permiso.modulo, str)
            and isinstance(permiso.permiso, str)
            and permiso.modulo.strip()
            and permiso.permiso.strip()
        )
    ]

    existentes = {
        (item["modulo"].strip(), item["permiso"].strip())
        for item in resultado
    }
    for item in _catalogo_base():
        clave = (item["modulo"], item["permiso"])
        if clave not in existentes:
            resultado.append({
                "id": None,
                "modulo": item["modulo"],
                "permiso": item["permiso"],
            })
            existentes.add(clave)

    resultado.sort(key=lambda item: (item["modulo"], item["permiso"]))
    return resultado


# ============================================================
# CREAR PERMISOS BASE
# ============================================================

@router.post("/crear-base")
def crear_permisos_base(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "seguridad", "editar")
    """
    Crea todos los permisos base que todavía no existan.

    Es seguro ejecutarlo varias veces.

    No duplica registros.
    """

    creados = []
    existentes = []

    for item in _catalogo_base():

        modulo = item["modulo"]
        permiso = item["permiso"]

        existente = (
            db.query(Permiso)
            .filter(
                Permiso.modulo == modulo,
                Permiso.permiso == permiso,
            )
            .first()
        )

        if existente:

            existentes.append(
                f"{modulo}:{permiso}"
            )

            continue

        nuevo = Permiso(
            modulo=modulo,
            permiso=permiso,
        )

        db.add(nuevo)

        creados.append(
            f"{modulo}:{permiso}"
        )

    db.commit()

    return {
        "estado": "OK",
        "permisos_creados": creados,
        "total_creados": len(creados),
        "total_existentes": len(existentes),
    }

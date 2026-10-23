from fastapi import HTTPException


def require_perm_modulo(usuario, modulo: str, accion: str):
    """
    Exige el permiso explícito guardado para el empleado.

    Los roles identifican el perfil del empleado, pero no conceden
    permisos. Tampoco se aplican comodines ni permisos heredados:
    la configuración individual por módulo es la autoridad.
    """
    permisos_empleado = getattr(usuario, "permisos_modulo_dict", None) or {}
    if not isinstance(permisos_empleado, dict):
        permisos_empleado = {}

    acciones = permisos_empleado.get(modulo, [])
    if not isinstance(acciones, (list, tuple, set)):
        acciones = []

    if accion not in acciones:
        raise HTTPException(
            status_code=403,
            detail=f"No tienes permiso para '{accion}' en el módulo '{modulo}'",
        )

    return True


def require_permission(usuario, permiso: str):
    if "." not in permiso:
        raise HTTPException(status_code=400, detail="Permiso inválido")

    modulo, accion = permiso.split(".", 1)
    return require_perm_modulo(usuario, modulo, accion)

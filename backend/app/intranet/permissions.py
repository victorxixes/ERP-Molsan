from backend.app.auth.permissions import require_perm_modulo


def require_intranet_perm(usuario, accion: str):
    rol = getattr(usuario, "rol", None)
    nombre_rol = (
        getattr(rol, "nombre", None)
        or getattr(usuario, "rol_nombre", None)
        or (rol if isinstance(rol, str) else None)
        or ""
    )
    if str(nombre_rol).strip().lower() in {"admin", "administrador"}:
        return True
    return require_perm_modulo(usuario, "intranet", accion)


def obtener_nombre_usuario(usuario):
    """Obtiene el nombre del usuario desde el dict o el objeto autenticado."""
    if usuario is None:
        return ""

    if isinstance(usuario, dict):
        nombre = (
            usuario.get("nombre_completo")
            or usuario.get("nombre")
            or usuario.get("usuario")
            or ""
        )
        apellidos = usuario.get("apellidos") or ""
    else:
        nombre = (
            getattr(usuario, "nombre_completo", None)
            or getattr(usuario, "nombre", None)
            or getattr(usuario, "usuario", None)
            or ""
        )
        apellidos = getattr(usuario, "apellidos", None) or ""

    nombre = str(nombre).strip()
    apellidos = str(apellidos).strip()

    if apellidos and apellidos.casefold() not in nombre.casefold():
        return f"{nombre} {apellidos}".strip()

    return nombre


def obtener_id_empleado(usuario):
    """Obtiene el ID del empleado cuando la autenticación lo proporciona."""
    if usuario is None:
        return None

    claves = ("empleado_id", "id_empleado", "id")

    if isinstance(usuario, dict):
        for clave in claves:
            valor = usuario.get(clave)
            if valor is not None:
                try:
                    return int(valor)
                except (TypeError, ValueError):
                    continue

        empleado = usuario.get("empleado")

        if isinstance(empleado, dict):
            for clave in ("id", "empleado_id"):
                valor = empleado.get(clave)
                if valor is not None:
                    try:
                        return int(valor)
                    except (TypeError, ValueError):
                        continue

        return None

    for clave in claves:
        valor = getattr(usuario, clave, None)
        if valor is not None:
            try:
                return int(valor)
            except (TypeError, ValueError):
                continue

    return None

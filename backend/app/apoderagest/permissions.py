
"""Utilidades de identificación del usuario autenticado."""


def obtener_valor(usuario, *nombres):
    """Obtiene el primer valor disponible de un diccionario u objeto."""
    for nombre in nombres:
        if isinstance(usuario, dict):
            valor = usuario.get(nombre)
        else:
            valor = getattr(usuario, nombre, None)

        if valor is not None and str(valor).strip():
            return valor

    return None


def obtener_nombre_apoderado(usuario):
    """Obtiene el nombre identificativo del usuario autenticado."""
    nombre_completo = obtener_valor(
        usuario, "nombre_completo", "nombreCompleto"
    )
    if nombre_completo:
        return str(nombre_completo).strip()

    nombre = obtener_valor(usuario, "nombre")
    apellidos = obtener_valor(usuario, "apellidos")

    if nombre and apellidos:
        return f"{nombre} {apellidos}".strip()

    return str(
        obtener_valor(usuario, "usuario", "username", "email") or ""
    ).strip()


def obtener_id_empleado(usuario):
    """
    Devuelve el identificador de empleado solo si la estructura
    autenticada proporciona explícitamente ese campo.
    No se presupone que el ID de usuario sea el ID de empleado.
    """
    empleado_id = obtener_valor(
        usuario, "empleado_id", "id_empleado"
    )
    if empleado_id is not None:
        try:
            return int(empleado_id)
        except (TypeError, ValueError):
            return None

    empleado = obtener_valor(usuario, "empleado")
    if empleado is not None:
        valor = obtener_valor(empleado, "id", "id_empleado")
        try:
            return int(valor) if valor is not None else None
        except (TypeError, ValueError):
            return None

    return None

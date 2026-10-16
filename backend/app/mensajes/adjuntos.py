"""Utilidades comunes para adjuntos privados del módulo Mensajes.

Las rutas persistidas en PostgreSQL mantienen el formato histórico
/static/mensajes/<uuid>.<ext>. El contenido físico se guarda en MENSAJES_DIR,
que debe apuntar al disco persistente de Render.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from backend.app.storage import MENSAJES_DIR

URL_PREFIJO_ADJUNTOS = "/static/mensajes/"
EXTENSIONES_ADJUNTOS = {"pdf", "doc", "docx", "jpg", "jpeg", "png"}
CARPETA_MENSAJES = MENSAJES_DIR.resolve()


def ruta_adjunto_mensaje(valor: object, exigir_existencia: bool = True) -> Optional[Path]:
    """Devuelve una ruta segura dentro del directorio privado de mensajes."""
    if not isinstance(valor, str):
        return None

    url = valor.strip()
    if not url.startswith(URL_PREFIJO_ADJUNTOS):
        return None

    nombre = url[len(URL_PREFIJO_ADJUNTOS):]
    if (
        not nombre
        or "/" in nombre
        or "\\" in nombre
        or ".." in nombre
        or "?" in nombre
        or "#" in nombre
    ):
        return None

    if "." not in nombre:
        return None
    base, extension = nombre.rsplit(".", 1)
    if extension.lower() not in EXTENSIONES_ADJUNTOS:
        return None
    if not re.fullmatch(r"[0-9a-fA-F-]{32,36}", base):
        return None

    try:
        carpeta = CARPETA_MENSAJES.resolve()
        ruta = (carpeta / nombre).resolve()
        ruta.relative_to(carpeta)
    except (OSError, ValueError):
        return None

    if exigir_existencia and not ruta.is_file():
        return None
    return ruta

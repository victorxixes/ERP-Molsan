"""Validación de referencias a adjuntos privados de Mensajes."""
from __future__ import annotations

import re
from pathlib import Path

from backend.app.storage import MENSAJES_DIR
from backend.app.supabase_storage import SupabasePrivateStorage, SupabaseStorageError, storage_backend_is_supabase

URL_PREFIXES = (
    "/api/mensajes/archivo/",
    "/static/mensajes/",  # compatibilidad de mensajes ya guardados
)
EXTENSIONES_ADJUNTOS = {"pdf", "doc", "docx", "jpg", "jpeg", "png"}
CARPETA_MENSAJES = MENSAJES_DIR.resolve()


def _extraer_nombre_adjunto(valor: object) -> str | None:
    if not isinstance(valor, str):
        return None
    url = valor.strip()
    prefijo = next((p for p in URL_PREFIXES if url.startswith(p)), None)
    if prefijo is None:
        return None
    nombre = url[len(prefijo):]
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
    return nombre


def adjunto_mensaje_valido(valor: object, exigir_existencia: bool = True) -> bool:
    """Valida formato y existencia sin exponer ni descargar el objeto al cliente."""
    nombre = _extraer_nombre_adjunto(valor)
    if nombre is None:
        return False
    if not exigir_existencia:
        return True

    if storage_backend_is_supabase():
        try:
            return SupabasePrivateStorage().exists(f"mensajes/{nombre}")
        except (RuntimeError, SupabaseStorageError):
            # Fallo cerrado: no reenviar un adjunto si no se puede verificar.
            return False

    try:
        carpeta = CARPETA_MENSAJES.resolve()
        ruta = (carpeta / nombre).resolve()
        ruta.relative_to(carpeta)
    except (OSError, ValueError):
        return False
    return ruta.is_file()

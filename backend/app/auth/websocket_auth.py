"""Autenticación común para WebSockets.

Valida firma/expiración JWT, recarga el empleado desde PostgreSQL para
comprobar que continúa activo y, si procede, exige permiso de módulo.
"""
from __future__ import annotations

from fastapi import HTTPException

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import SessionLocal


def autenticar_websocket(token: str, modulo: str | None = None, accion: str = "ver") -> int:
    token = (token or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token requerido")

    db = SessionLocal()
    try:
        usuario = get_current_user(token=token, db=db)
        if not getattr(usuario, "activo", True):
            raise HTTPException(status_code=401, detail="Usuario inactivo")
        if modulo:
            require_perm_modulo(usuario, modulo, accion)
        try:
            usuario_id = int(usuario.id)
        except (AttributeError, TypeError, ValueError):
            raise HTTPException(status_code=401, detail="Identidad de usuario no válida")
        if usuario_id <= 0:
            raise HTTPException(status_code=401, detail="Identidad de usuario no válida")
        return usuario_id
    finally:
        db.close()

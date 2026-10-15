"""Router de borrado de roles deshabilitado por seguridad.

La ruta anterior ejecutaba DROP TABLE roles sin autenticación ni confirmación.
No se exporta ninguna operación destructiva.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/debug", tags=["Operaciones destructivas deshabilitadas"])

"""Router de borrado de tablas deshabilitado por seguridad.

La eliminación de tablas debe realizarse mediante una migración revisada,
con copia de seguridad y acceso administrativo controlado; nunca por una
ruta HTTP pública.
"""
from fastapi import APIRouter

router = APIRouter(
    prefix="/herramientasswager",
    tags=["Operaciones destructivas deshabilitadas"],
)

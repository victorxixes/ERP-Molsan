"""Ruta de reparación de esquema deshabilitada por seguridad.

La creación/modificación de tablas no debe exponerse como endpoint HTTP. Las
migraciones de permisos se gestionan mediante cambios de esquema revisados y
desplegados con el backend. Se conserva el router vacío para compatibilidad con
main.py, que todavía lo importa.
"""
from fastapi import APIRouter

router = APIRouter(
    prefix="/seguridad/permisos",
    tags=["Seguridad - Permisos"],
)

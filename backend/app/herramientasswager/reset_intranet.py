"""Restablecimiento destructivo de Intranet deshabilitado por seguridad.

La antigua ruta eliminaba dos tablas con CASCADE y después recreaba metadatos.
Se conserva el objeto router porque main.py lo importa, pero no se registra
ningún endpoint hasta diseñar una herramienta administrativa autenticada.
"""
from fastapi import APIRouter

router = APIRouter(
    prefix="/utilidades",
    tags=["Restablecimiento deshabilitado"],
)

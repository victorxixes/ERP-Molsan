"""Endpoints de diagnóstico deshabilitados intencionadamente.

Los endpoints anteriores exponían metadatos y contenido de tablas sin autenticación.
No registrar operaciones de diagnóstico aquí hasta que exista autorización de
administrador y una habilitación explícita por entorno.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/debug", tags=["Debug deshabilitado"])

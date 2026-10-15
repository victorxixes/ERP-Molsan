"""Aplicación FastAPI de reset de base de datos deshabilitada.

La versión anterior publicaba POST /drop-roles y ejecutaba DROP TABLE.
Se conserva el objeto app para no romper herramientas que importen este módulo,
pero la aplicación no expone operaciones de borrado.
"""
from fastapi import FastAPI

app = FastAPI(
    title="Operaciones de base de datos deshabilitadas",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

"""Compatibilidad para imports antiguos de backend.config.

La configuración canónica vive en backend.app.config. Se mantienen los mismos
nombres, pero no se aceptan secretos conocidos ni una DATABASE_URL vacía.
"""
import os
from dotenv import load_dotenv

load_dotenv()


def _bool_env(nombre: str, por_defecto: bool = False) -> bool:
    valor = os.getenv(nombre)
    if valor is None:
        return por_defecto
    return valor.strip().lower() in {"1", "true", "yes", "si", "sí", "on"}


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Agenda Intranet")

    raw_url = os.getenv("DATABASE_URL", "").strip()
    if raw_url.startswith("postgres://"):
        raw_url = raw_url.replace("postgres://", "postgresql://", 1)
    DATABASE_URL: str = raw_url
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL no está definida en el entorno")

    JWT_SECRET: str = os.getenv("JWT_SECRET", "").strip()
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET no está definida en el entorno")
    if JWT_SECRET.lower() in {"supersecret", "secret", "changeme", "change-me"}:
        raise RuntimeError("JWT_SECRET utiliza un valor conocido; configura uno aleatorio")
    if len(JWT_SECRET) < 32:
        raise RuntimeError("JWT_SECRET debe tener al menos 32 caracteres")

    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    DEBUG: bool = _bool_env("DEBUG", False)


settings = Settings()

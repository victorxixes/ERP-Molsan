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

    # DATABASE (Render PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip()
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL no está definida en el entorno")

    # JWT: nunca usar un secreto conocido por defecto en producción.
    JWT_SECRET: str = os.getenv("JWT_SECRET", "").strip()
    if not JWT_SECRET:
        raise RuntimeError(
            "JWT_SECRET no está definida. Configura un secreto aleatorio de al menos 32 caracteres "
            "en las variables de entorno antes de iniciar el backend."
        )
    if JWT_SECRET.lower() in {"supersecret", "secret", "changeme", "change-me"}:
        raise RuntimeError("JWT_SECRET utiliza un valor conocido; configura un secreto aleatorio nuevo.")
    if len(JWT_SECRET) < 32:
        raise RuntimeError("JWT_SECRET debe tener al menos 32 caracteres.")

    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    DEBUG: bool = _bool_env("DEBUG", False)


settings = Settings()

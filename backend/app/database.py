from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os


# Validar la configuración aquí, antes de construir el engine. main.py importa
# este módulo antes de que todos los módulos de configuración estén cargados;
# sin esta comprobación, una variable ausente produce un error poco claro de
# SQLAlchemy durante el arranque.
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL no está definida. Configura la conexión a la base de datos "
        "en el entorno antes de iniciar el backend."
    )

# Compatibilidad con URLs PostgreSQL antiguas usadas por algunos proveedores.
# SQLAlchemy 1.4 acepta postgresql:// y evita depender del alias postgres://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]

# PostgreSQL usa un pool ampliado para absorber consultas concurrentes.
# SQLite (usado en pruebas/CI) no admite estos argumentos de pool en su
# configuración; se configura por separado.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "15")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

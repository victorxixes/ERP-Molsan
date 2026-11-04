from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
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

# Supabase Free dispone de un presupuesto de conexiones más ajustado.
# Render es un backend persistente en IPv4: se conectará mediante Supavisor
# en modo sesión (puerto 5432), no mediante el pooler transaccional.
# Los valores siguen siendo configurables y el pool histórico de Render
# PostgreSQL se conserva sin cambios.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    parsed_url = make_url(DATABASE_URL)
    database_host = (parsed_url.host or "").lower()
    is_supabase = (
        database_host.endswith(".supabase.co")
        or database_host.endswith(".pooler.supabase.com")
    )
    default_pool_size = "3" if is_supabase else "10"
    default_max_overflow = "2" if is_supabase else "20"
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=int(os.getenv("DB_POOL_SIZE", default_pool_size)),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", default_max_overflow)),
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

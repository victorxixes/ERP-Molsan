"""Diagnóstico técnico de solo lectura, restringido a usuarios administradores.
Las rutas se mantienen fuera de /api por compatibilidad histórica; cada endpoint
aplica autenticación JWT y permiso administrativo. No se devuelven filas de negocio
ni se ejecuta DDL desde este router.
"""
from datetime import datetime, timezone
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import get_db

router = APIRouter(prefix="/debug", tags=["Mantenimiento técnico"])


def _autorizar_mantenimiento(usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "seguridad", "editar")
    return usuario


def _validar_nombre_tabla(nombre: str) -> str:
    valor = str(nombre or "").strip()
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]{0,62}", valor):
        raise HTTPException(status_code=400, detail="Nombre de tabla no válido.")
    return valor


@router.get("/health")
def estado_tecnico(db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    """Comprueba la conectividad de la aplicación con la base de datos."""
    try:
        db.execute(text("SELECT 1")).scalar()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="El backend responde, pero no puede consultar la base de datos.") from exc
    return {"estado": "ok", "backend": "disponible", "base_datos": "conectada", "comprobado_en": datetime.now(timezone.utc).isoformat()}


@router.get("/resumen")
def resumen_tecnico(db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    """Resumen de infraestructura de solo lectura para el panel de mantenimiento."""
    try:
        datos = db.execute(text("""
            SELECT
                current_database() AS base_datos,
                current_schema() AS esquema,
                version() AS version_postgresql,
                (SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = current_schema()) AS total_tablas,
                pg_size_pretty(pg_database_size(current_database())) AS tamano_base_datos,
                (SELECT COUNT(*) FROM pg_stat_activity
                 WHERE datname = current_database()) AS conexiones_activas,
                (SELECT COUNT(*) FROM pg_stat_activity
                 WHERE datname = current_database()
                   AND wait_event_type = 'Lock'
                   AND pid <> pg_backend_pid()) AS sesiones_esperando_bloqueo
        """)).mappings().one()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="No se ha podido obtener el resumen técnico de la base de datos."
        ) from exc

    return {
        "estado": "ok",
        "comprobado_en": datetime.now(timezone.utc).isoformat(),
        "infraestructura": dict(datos),
    }


@router.get("/tablas")
def listar_tablas(db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    """Lista nombres de tablas del esquema actual, sin leer su contenido."""
    filas = db.execute(text("""
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = current_schema()
        ORDER BY table_name
    """)).mappings().all()
    esquema = db.execute(text("SELECT current_schema()")).scalar()
    return {"esquema": esquema, "total": len(filas), "tablas": [dict(f) for f in filas]}


@router.get("/bloqueos")
def consultar_bloqueos(db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    """Muestra sesiones que esperan un lock, omitiendo el texto de sus consultas."""
    filas = db.execute(text("""
        SELECT a.pid, a.usename AS usuario_bd, a.application_name AS aplicacion,
               a.state AS estado, a.wait_event_type AS tipo_espera, a.wait_event AS evento_espera,
               CASE WHEN a.query_start IS NULL THEN NULL
                    ELSE ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - a.query_start))::numeric, 1)
               END AS segundos_desde_inicio
        FROM pg_stat_activity a
        WHERE a.datname = current_database()
          AND a.wait_event_type = 'Lock'
          AND a.pid <> pg_backend_pid()
        ORDER BY a.query_start NULLS LAST
    """)).mappings().all()
    return {"total": len(filas), "bloqueos": [dict(f) for f in filas]}


def _existe_tabla(db: Session, tabla: str) -> bool:
    return bool(db.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = current_schema() AND table_name = :tabla
        )
    """), {"tabla": tabla}).scalar())


@router.get("/describe/{tabla}")
def describir_tabla(tabla: str, db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    nombre = _validar_nombre_tabla(tabla)
    if not _existe_tabla(db, nombre):
        raise HTTPException(status_code=404, detail="No existe una tabla con ese nombre en el esquema actual.")
    filas = db.execute(text("""
        SELECT column_name, data_type, is_nullable, column_default, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = :tabla
        ORDER BY ordinal_position
    """), {"tabla": nombre}).mappings().all()
    return {"tabla": nombre, "total": len(filas), "columnas": [dict(f) for f in filas]}


@router.get("/indices/{tabla}")
def indices_tabla(tabla: str, db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    nombre = _validar_nombre_tabla(tabla)
    if not _existe_tabla(db, nombre):
        raise HTTPException(status_code=404, detail="No existe una tabla con ese nombre en el esquema actual.")
    filas = db.execute(text("""
        SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = current_schema() AND tablename = :tabla
        ORDER BY indexname
    """), {"tabla": nombre}).mappings().all()
    return {"tabla": nombre, "total": len(filas), "indices": [dict(f) for f in filas]}


@router.get("/claves-foraneas/{tabla}")
def claves_foraneas_tabla(tabla: str, db: Session = Depends(get_db), _usuario=Depends(_autorizar_mantenimiento)):
    nombre = _validar_nombre_tabla(tabla)
    if not _existe_tabla(db, nombre):
        raise HTTPException(status_code=404, detail="No existe una tabla con ese nombre en el esquema actual.")
    filas = db.execute(text("""
        SELECT con.conname AS nombre, src.relname AS tabla_origen, dst.relname AS tabla_referenciada,
               pg_get_constraintdef(con.oid) AS definicion
        FROM pg_constraint con
        JOIN pg_class src ON src.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = src.relnamespace
        JOIN pg_class dst ON dst.oid = con.confrelid
        WHERE con.contype = 'f' AND ns.nspname = current_schema() AND src.relname = :tabla
        ORDER BY con.conname
    """), {"tabla": nombre}).mappings().all()
    return {"tabla": nombre, "total": len(filas), "claves_foraneas": [dict(f) for f in filas]}

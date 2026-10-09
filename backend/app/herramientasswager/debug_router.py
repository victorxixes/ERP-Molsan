from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import re

from backend.app.database import get_db


router = APIRouter(
    prefix="/debug",
    tags=["Debug"],
)


# ============================================================
# VALIDACIÓN DE NOMBRES DE TABLAS
# ============================================================

def validar_tabla(tabla: str, db: Session) -> str:
    """
    Comprueba que el nombre corresponde a una tabla existente
    en el esquema public.
    """

    if not re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", tabla):
        raise HTTPException(
            status_code=400,
            detail="Nombre de tabla no válido.",
        )

    resultado = db.execute(
        text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = :tabla
        """),
        {"tabla": tabla},
    ).scalar()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail=f"No existe la tabla '{tabla}' en public.",
        )

    return tabla


# ============================================================
# LISTAR TODAS LAS TABLAS
# GET /debug/tablas
# ============================================================

@router.get("/tablas")
def listar_tablas(db: Session = Depends(get_db)):

    resultado = db.execute(
        text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
    )

    tablas = [fila[0] for fila in resultado]

    return {"tablas": tablas}


# ============================================================
# DESCRIBIR COLUMNAS
# GET /debug/describe/{tabla}
# ============================================================

@router.get("/describe/{tabla}")
def describir_columnas(
    tabla: str,
    db: Session = Depends(get_db),
):
    tabla = validar_tabla(tabla, db)

    resultado = db.execute(
        text("""
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :tabla
            ORDER BY ordinal_position
        """),
        {"tabla": tabla},
    )

    columnas = [
        {
            "columna": fila[0],
            "tipo": fila[1],
            "admite_nulos": fila[2] == "YES",
            "valor_por_defecto": fila[3],
        }
        for fila in resultado
    ]

    return {
        "tabla": tabla,
        "columnas": columnas,
    }


# ============================================================
# ÍNDICES DE UNA TABLA
# GET /debug/indices/{tabla}
# ============================================================

@router.get("/indices/{tabla}")
def listar_indices(
    tabla: str,
    db: Session = Depends(get_db),
):
    tabla = validar_tabla(tabla, db)

    resultado = db.execute(
        text("""
            SELECT
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = :tabla
            ORDER BY indexname
        """),
        {"tabla": tabla},
    )

    indices = [
        {
            "nombre": fila[0],
            "definicion": fila[1],
        }
        for fila in resultado
    ]

    return {
        "tabla": tabla,
        "total": len(indices),
        "indices": indices,
    }


# ============================================================
# CLAVES FORÁNEAS DE UNA TABLA
# GET /debug/claves-foraneas/{tabla}
# ============================================================

@router.get("/claves-foraneas/{tabla}")
def listar_claves_foraneas(
    tabla: str,
    db: Session = Depends(get_db),
):
    tabla = validar_tabla(tabla, db)

    resultado = db.execute(
        text("""
            SELECT
                con.conname AS nombre,
                origen.relname AS tabla_origen,
                origen_col.attname AS columna_origen,
                destino.relname AS tabla_destino,
                destino_col.attname AS columna_destino,
                con.convalidated AS validada
            FROM pg_constraint con
            JOIN pg_class origen
              ON origen.oid = con.conrelid
            JOIN pg_namespace ns
              ON ns.oid = origen.relnamespace
            JOIN pg_class destino
              ON destino.oid = con.confrelid
            JOIN LATERAL unnest(con.conkey)
              WITH ORDINALITY AS oc(attnum, posicion)
              ON TRUE
            JOIN LATERAL unnest(con.confkey)
              WITH ORDINALITY AS dc(attnum, posicion)
              ON dc.posicion = oc.posicion
            JOIN pg_attribute origen_col
              ON origen_col.attrelid = origen.oid
             AND origen_col.attnum = oc.attnum
            JOIN pg_attribute destino_col
              ON destino_col.attrelid = destino.oid
             AND destino_col.attnum = dc.attnum
            WHERE con.contype = 'f'
              AND ns.nspname = 'public'
              AND origen.relname = :tabla
            ORDER BY con.conname, oc.posicion
        """),
        {"tabla": tabla},
    )

    claves = [
        {
            "nombre": fila[0],
            "tabla_origen": fila[1],
            "columna_origen": fila[2],
            "tabla_destino": fila[3],
            "columna_destino": fila[4],
            "validada": fila[5],
        }
        for fila in resultado
    ]

    return {
        "tabla": tabla,
        "total": len(claves),
        "claves_foraneas": claves,
    }


# ============================================================
# SESIONES BLOQUEADAS Y PROCESOS BLOQUEADORES
# GET /debug/bloqueos
# ============================================================

@router.get("/bloqueos")
def diagnosticar_bloqueos(
    db: Session = Depends(get_db),
):
    try:
        resultado = db.execute(
            text("""
                SELECT
                    bloqueada.pid AS pid_bloqueado,
                    bloqueada.usename AS usuario_bloqueado,
                    bloqueada.application_name AS aplicacion_bloqueada,
                    bloqueada.state AS estado_bloqueado,
                    bloqueada.wait_event_type AS tipo_espera,
                    bloqueada.wait_event AS evento_espera,
                    bloqueada.xact_start AS inicio_transaccion_bloqueada,
                    bloqueada.query_start AS inicio_consulta_bloqueada,
                    pg_blocking_pids(bloqueada.pid) AS pids_bloqueadores,
                    LEFT(bloqueada.query, 500) AS consulta_bloqueada
                FROM pg_stat_activity bloqueada
                WHERE bloqueada.datname = current_database()
                  AND cardinality(
                      pg_blocking_pids(bloqueada.pid)
                  ) > 0
                ORDER BY bloqueada.xact_start NULLS LAST
            """)
        )

        bloqueos = [
            {
                "pid_bloqueado": fila[0],
                "usuario_bloqueado": fila[1],
                "aplicacion_bloqueada": fila[2],
                "estado_bloqueado": fila[3],
                "tipo_espera": fila[4],
                "evento_espera": fila[5],
                "inicio_transaccion_bloqueada": (
                    fila[6].isoformat() if fila[6] else None
                ),
                "inicio_consulta_bloqueada": (
                    fila[7].isoformat() if fila[7] else None
                ),
                "pids_bloqueadores": fila[8],
                "consulta_bloqueada": fila[9],
            }
            for fila in resultado
        ]

        return {
            "total": len(bloqueos),
            "bloqueos": bloqueos,
            "mensaje": (
                "No se detectan sesiones bloqueadas en esta consulta."
                if not bloqueos
                else "Se han encontrado sesiones bloqueadas."
            ),
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudieron consultar los bloqueos. "
                "Comprueba los permisos del usuario de PostgreSQL."
            ),
        )


# ============================================================
# CONTENIDO DE TABLA — DIAGNÓSTICO LIMITADO
# GET /debug/contenido/{tabla}
# ============================================================

@router.get("/contenido/{tabla}")
def obtener_contenido(
    tabla: str,
    db: Session = Depends(get_db),
):
    tabla = validar_tabla(tabla, db)

    try:
        # El nombre solo se utiliza después de validar que la tabla
        # existe y que cumple el formato permitido.
        resultado = db.execute(
            text(f'SELECT * FROM public."{tabla}" LIMIT 20')
        )

        filas = [
            dict(fila._mapping)
            for fila in resultado
        ]

        return {
            "tabla": tabla,
            "limite": 20,
            "filas": filas,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No se pudo consultar el contenido de la tabla.",
        )


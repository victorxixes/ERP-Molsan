from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import get_db

router = APIRouter(
prefix="/mantenimiento-defectos",
tags=["Mantenimiento temporal de defectos"],
)

@router.post("/crear-tablas")
def crear_tablas_defectos(db: Session = Depends(get_db)):
"""
Migración temporal para ejecutar desde Swagger.
Crea el catálogo de subtipos y añade las columnas que falten.
"""

```
try:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS defecto_subtipos (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(200) NOT NULL UNIQUE,
            descripcion TEXT NULL,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_defecto_subtipos_id
        ON defecto_subtipos (id)
    """))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_defecto_subtipos_nombre
        ON defecto_subtipos (nombre)
    """))

    columnas = {
        "documento": "VARCHAR(300)",
        "motivo_defecto": "VARCHAR(500)",
        "subtipo_defecto_id": "INTEGER",
        "subtipo_defecto": "VARCHAR(500)",
        "fecha_notificacion_registro": "DATE",
        "fecha_vencimiento_presentacion": "DATE",
        "fecha_entrada_subsanacion": "DATE",
        "observaciones_registro": "VARCHAR(200)",
        "calificacion_registro": "TEXT",
        "calificacion_archivo": "BYTEA",
        "calificacion_nombre": "VARCHAR(255)",
        "calificacion_content_type": "VARCHAR(100)",
        "calificacion_tamano": "INTEGER",
        "calificacion_subida_en": "TIMESTAMPTZ",
    }

    tabla = db.execute(text("""
        SELECT to_regclass('public.expediente_defectos')
    """)).scalar()

    if tabla is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "No existe la tabla expediente_defectos "
                "en el esquema public. No se ha completado la migración."
            ),
        )

    for nombre, tipo in columnas.items():
        db.execute(text(
            f"ALTER TABLE public.expediente_defectos "
            f"ADD COLUMN IF NOT EXISTS {nombre} {tipo}"
        ))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_expediente_defectos_expediente_id
        ON public.expediente_defectos (expediente_id)
    """))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_expediente_defectos_subtipo_defecto_id
        ON public.expediente_defectos (subtipo_defecto_id)
    """))

    db.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_expediente_defectos_subtipo'
                  AND conrelid = 'public.expediente_defectos'::regclass
            ) THEN
                ALTER TABLE public.expediente_defectos
                ADD CONSTRAINT fk_expediente_defectos_subtipo
                FOREIGN KEY (subtipo_defecto_id)
                REFERENCES public.defecto_subtipos(id)
                ON DELETE SET NULL;
            END IF;
        END $$
    """))

    db.commit()

    return {
        "ok": True,
        "mensaje": "Migración de defectos completada",
        "tabla_subtipos": "defecto_subtipos",
        "columnas_revisadas": list(columnas.keys()),
    }

except HTTPException:
    db.rollback()
    raise
except Exception as exc:
    db.rollback()
    raise HTTPException(
        status_code=500,
        detail=f"Error en la migración de defectos: {str(exc)}",
    ) from exc
```

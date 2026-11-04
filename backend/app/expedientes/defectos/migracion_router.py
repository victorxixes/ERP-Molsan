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
    """Comprueba que la revisión Alembic de defectos está aplicada; no crea DDL."""
    try:
        tablas = db.execute(
            text(
                "SELECT to_regclass('public.defecto_subtipos'), "
                "to_regclass('public.expediente_defectos')"
            )
        ).one()
        if not all(tablas):
            raise HTTPException(
                status_code=409,
                detail="Falta el esquema de defectos. Ejecuta las migraciones Alembic pendientes.",
            )

        columnas_requeridas = [
            "documento",
            "motivo_defecto",
            "subtipo_defecto_id",
            "subtipo_defecto",
            "tipo_carga_hipotecaria_id",
            "fecha_notificacion_registro",
            "fecha_vencimiento_presentacion",
            "fecha_entrada_subsanacion",
            "observaciones_registro",
            "calificacion_registro",
            "calificacion_archivo",
            "calificacion_nombre",
            "calificacion_content_type",
            "calificacion_tamano",
            "calificacion_subida_en",
        ]
        columnas = db.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'expediente_defectos'
                  AND column_name = ANY(:columnas)
                """
            ),
            {"columnas": columnas_requeridas},
        ).scalars().all()
        faltantes = sorted(set(columnas_requeridas) - set(columnas))
        if faltantes:
            raise HTTPException(
                status_code=409,
                detail={
                    "mensaje": "Faltan columnas del esquema de defectos; aplica la migración Alembic.",
                    "columnas": faltantes,
                },
            )

        indice = db.execute(
            text(
                "SELECT 1 FROM pg_indexes "
                "WHERE schemaname = 'public' "
                "AND indexname = 'ix_expediente_defectos_subtipo_defecto_id'"
            )
        ).scalar()
        fk = db.execute(
            text(
                "SELECT 1 FROM pg_constraint "
                "WHERE conname = 'fk_expediente_defectos_subtipo' "
                "AND conrelid = 'public.expediente_defectos'::regclass"
            )
        ).scalar()
        if not indice or not fk:
            raise HTTPException(
                status_code=409,
                detail="Falta el índice o la clave foránea de subtipos; aplica la migración Alembic pendiente.",
            )

        return {
            "ok": True,
            "mensaje": "El esquema de defectos está provisionado por Alembic.",
            "tabla_subtipos": "public.defecto_subtipos",
            "columnas_verificadas": len(columnas_requeridas),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo verificar el esquema de defectos: {exc}",
        ) from exc

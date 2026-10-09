
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
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.defecto_subtipos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(200) NOT NULL UNIQUE,
                descripcion TEXT NULL,
                activo BOOLEAN NOT NULL DEFAULT TRUE,
                creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))

        db.commit()

        return {
            "ok": True,
            "mensaje": "Tabla creada o ya existente",
        }

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

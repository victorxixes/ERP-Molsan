from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.Utilidades.importadores.ctn_importer import importar_ctn_desde_excel
from backend.app.Utilidades.importadores.expedientes_importer import importar_excel_expedientes


router = APIRouter(
    prefix="/utilidades",
    tags=["Utilidades"]
)


# ============================================================
# IMPORTAR CTN
# ============================================================

@router.post("/ctn/importar")
async def importar_ctn(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    contenido = await fichero.read()

    total = importar_ctn_desde_excel(
        db,
        contenido
    )

    return {
        "importados": total
    }


# ============================================================
# CREAR COLUMNA GESTORIA EN EXPEDIENTES
# ============================================================

@router.post("/add_columna_gestoria_expedientes")
def add_columna_gestoria_expedientes(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "seguridad", "editar")
    """
    Crea la columna gestoria en la tabla expedientes
    si todavía no existe.
    """

    try:

        db.execute(
            text("""
                ALTER TABLE expedientes
                ADD COLUMN IF NOT EXISTS gestoria VARCHAR(200)
            """)
        )

        db.commit()

        return {
            "ok": True,
            "mensaje": "Columna gestoria creada correctamente en expedientes."
        }

    except Exception as e:

        db.rollback()

        return {
            "ok": False,
            "error": "No se pudo crear la columna gestoria.",
            "detalle": str(e)
        }

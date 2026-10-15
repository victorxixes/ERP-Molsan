from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import get_db


router = APIRouter(prefix="/admin", tags=["admin"])


def _autorizar_admin_tecnico(usuario=Depends(get_current_user)):
    require_perm_modulo(usuario, "seguridad", "editar")
    return usuario


@router.post("/install-unaccent")
def install_unaccent(
    db: Session = Depends(get_db),
    _usuario=Depends(_autorizar_admin_tecnico),
):
    try:
        db.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent;"))
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo comprobar/instalar la extensión unaccent") from exc
    return {"status": "ok", "message": "unaccent instalado o ya disponible"}

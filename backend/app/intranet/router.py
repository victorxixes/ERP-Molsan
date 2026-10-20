from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import engine, get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.intranet.auditoria import IntranetAuditoria
from backend.app.intranet.noticias.router import router as noticias_router
from backend.app.intranet.documentos.router import router as documentos_router

router = APIRouter(prefix="/intranet", tags=["Intranet"])


@router.on_event("startup")
def inicializar_tabla_auditoria_intranet():
    IntranetAuditoria.__table__.create(bind=engine, checkfirst=True)


@router.get("/auditoria")
def listar_auditoria_intranet(
    limite: int = 25,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "intranet", "editar")
    limite = max(1, min(limite, 100))
    return (
        db.query(IntranetAuditoria)
        .order_by(IntranetAuditoria.fecha.desc(), IntranetAuditoria.id.desc())
        .limit(limite)
        .all()
    )


router.include_router(noticias_router)
router.include_router(documentos_router)

from fastapi import APIRouter

from backend.app.database import engine
from backend.app.intranet.auditoria import IntranetAuditoria
from backend.app.intranet.noticias.router import router as noticias_router
from backend.app.intranet.documentos.router import router as documentos_router

router = APIRouter(prefix="/intranet", tags=["Intranet"])


@router.on_event("startup")
def inicializar_tabla_auditoria_intranet():
    IntranetAuditoria.__table__.create(bind=engine, checkfirst=True)


router.include_router(noticias_router)
router.include_router(documentos_router)

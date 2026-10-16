
from fastapi import APIRouter

from backend.app.notargest.encargos.router import (
    router as encargos_router,
)
from backend.app.notargest.dashboard.router import (
    router as dashboard_router,
)
from backend.app.notargest.agenda.router import (
    router as agenda_router,
)


router = APIRouter(tags=["ApoderaGest"])

router.include_router(encargos_router)
router.include_router(dashboard_router)
router.include_router(agenda_router)

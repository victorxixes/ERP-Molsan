
"""Router principal de ApoderaGest."""

from fastapi import APIRouter

from backend.app.apoderagest.dashboard.router import (
    router as dashboard_router,
)
from backend.app.apoderagest.encargos.router import (
    router as encargos_router,
)
from backend.app.apoderagest.agenda.router import (
    router as agenda_router,
)

router = APIRouter()

router.include_router(dashboard_router)
router.include_router(encargos_router)
router.include_router(agenda_router)

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


# ============================================================
# EVENTO REALTIME
# ============================================================

class RealtimeEvent(BaseModel):

    modulo: str

    evento: str

    usuario_id: Optional[int] = None

    rol: Optional[str] = None

    grupo: Optional[str] = None

    data: Dict[str, Any] = Field(
        default_factory=dict
    )

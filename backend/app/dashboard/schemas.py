from typing import List

from pydantic import BaseModel, Field


class ExpedientesPorActividad(BaseModel):
    key: str
    nombre: str
    total: int = Field(ge=0)


class MediaFirmaPorTipoOperacion(BaseModel):
    tipo_operacion: str
    expedientes_firmados: int = Field(ge=0)
    media_dias: float | None = None


class DashboardExpedientesResponse(BaseModel):
    total_expedientes: int = Field(ge=0)
    expedientes_por_actividad: List[ExpedientesPorActividad]
    media_firma_por_tipo_operacion: List[MediaFirmaPorTipoOperacion]

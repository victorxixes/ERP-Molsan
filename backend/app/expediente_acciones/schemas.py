from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExpedienteAccionCreate(BaseModel):
    accion_id: int
    estado: str = "Pendiente"
    fecha: Optional[date] = None
    observaciones: Optional[str] = None


class ExpedienteAccionUpdate(BaseModel):
    estado: Optional[str] = None
    fecha: Optional[date] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None


class AccionCatalogoResponse(BaseModel):
    id: int
    departamento: Optional[str] = None
    seccion: Optional[str] = None
    actividad: Optional[str] = None
    descripcion: str
    activo: bool

    model_config = ConfigDict(from_attributes=True)


class ExpedienteAccionResponse(BaseModel):
    id: int
    expediente_id: int
    accion_id: int
    estado: str
    fecha: Optional[date] = None
    observaciones: Optional[str] = None
    activo: bool

    accion: Optional[AccionCatalogoResponse] = None

    model_config = ConfigDict(from_attributes=True)

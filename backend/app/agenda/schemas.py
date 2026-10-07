from datetime import date, time
from typing import Optional

from pydantic import BaseModel, validator


# ============================================================
# CITA BASE
# ============================================================

class CitaBase(BaseModel):

    fecha: date

    hora_inicio: time

    hora_fin: time

    tipo_cita: str

    notario_id: Optional[int] = None

    tipo_firma: Optional[str] = None

    apoderado_id: Optional[int] = None

    apoderado: Optional[str] = None

    observaciones: Optional[str] = None

    # --------------------------------------------------------
    # EXPEDIENTE
    # --------------------------------------------------------

    expediente_id: Optional[int] = None

    @validator("tipo_cita")
    def validar_tipo_cita(
        cls,
        v,
    ):

        if not v or not isinstance(v, str):

            raise ValueError(
                "tipo_cita debe ser un texto válido"
            )

        return v

    @validator("notario_id")
    def validar_notario_si_firma(
        cls,
        v,
        values,
    ):

        if (
            values.get("tipo_cita")
            == "Firma notarial"
            and v is None
        ):

            raise ValueError(
                "notario_id es obligatorio "
                "para tipo_cita = Firma notarial"
            )

        return v


# ============================================================
# CREAR CITA
# ============================================================

class CitaCreate(
    CitaBase
):
    pass


# ============================================================
# ACTUALIZAR CITA
# ============================================================

class CitaUpdate(BaseModel):

    fecha: Optional[date] = None

    hora_inicio: Optional[time] = None

    hora_fin: Optional[time] = None

    tipo_cita: Optional[str] = None

    notario_id: Optional[int] = None

    tipo_firma: Optional[str] = None

    apoderado_id: Optional[int] = None

    apoderado: Optional[str] = None

    observaciones: Optional[str] = None

    expediente_id: Optional[int] = None


# ============================================================
# RESPUESTA
# ============================================================

class CitaResponse(BaseModel):

    id: int

    fecha: date

    hora_inicio: time

    hora_fin: time

    tipo_cita: str

    tipo_firma: Optional[str] = None

    distancia_km: Optional[float] = None

    observaciones: Optional[str] = None

    notario_id: Optional[int] = None

    notario_nombre: Optional[str] = None

    apoderado_id: Optional[int] = None

    apoderado_nombre: Optional[str] = None

    apoderado: Optional[str] = None

    # --------------------------------------------------------
    # EXPEDIENTE
    # --------------------------------------------------------

    expediente_id: Optional[int] = None

    id_expediente: Optional[str] = None

    class Config:

        orm_mode = True

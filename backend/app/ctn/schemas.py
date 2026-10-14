```python
from typing import List, Optional

from pydantic import BaseModel, Field


class NotarioAsociadoResponse(BaseModel):
    id: int
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    nombre_completo: Optional[str] = None
    nif: Optional[str] = None

    class Config:
        orm_mode = True


class NotariaBase(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    nif: Optional[str] = None
    telefono: Optional[str] = None

    departamento_cancelaciones: Optional[str] = None
    departamento_copias: Optional[str] = None
    otros_departamentos: Optional[str] = None

    cp: Optional[str] = None
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    direccion: Optional[str] = None

    vc: Optional[str] = None

    apoderado: Optional[str] = None
    apoderado_s: Optional[str] = None

    observacion: Optional[str] = None
    apoderado_id: Optional[int] = None


class NotariaCreate(NotariaBase):
    pass


class NotariaUpdate(NotariaBase):
    pass


class NotariaResponse(NotariaBase):
    id: int
    nombre_completo: Optional[str] = None
    notarios_asociados: List[NotarioAsociadoResponse] = Field(
        default_factory=list
    )
    notario_asociado: Optional[str] = None

    class Config:
        orm_mode = True
```

from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db

from backend.app.tipos_concepto_gastos.models import (
    TipoConceptoGastos,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/tipos-concepto-gastos",
    tags=["Tipos de Concepto de Gastos"],
)


# ============================================================
# MODELOS PYDANTIC
# ============================================================

class TipoConceptoGastosCreate(BaseModel):
    nombre: str
    activo: bool = True


class TipoConceptoGastosUpdate(BaseModel):
    nombre: str
    activo: bool = True


class TipoConceptoGastosResponse(BaseModel):
    id: int
    nombre: str
    activo: bool

    class Config:
        orm_mode = True


# ============================================================
# CATÁLOGO INICIAL
# ============================================================

TIPOS_CONCEPTO_GASTOS_INICIALES = [
    "registro de la propiedad",
    "factura notario",
    "honorarios gestoría",
    "factura gestoría externa (no gtg)",
    "devolucion exceso prov.fondos",
    "registro de la propiedad iprc's-svh",
    "factura notaria-comisión otras entidades",
    "gastos circuito gestoría otra entidad",
    "impuestos",
    "traductor",
    "registro mercantil",
]


# ============================================================
# NORMALIZAR
# ============================================================

def normalizar_nombre(valor: Optional[str]) -> str:
    if valor is None:
        return ""

    return " ".join(
        str(valor)
        .strip()
        .split()
    ).lower()


# ============================================================
# GARANTIZAR CATÁLOGO INICIAL
# ============================================================

def garantizar_catalogo_inicial(
    db: Session,
) -> None:

    cambios = False

    for nombre_original in (
        TIPOS_CONCEPTO_GASTOS_INICIALES
    ):

        nombre = normalizar_nombre(
            nombre_original
        )

        existe = (
            db.query(
                TipoConceptoGastos
            )
            .filter(
                func.lower(
                    TipoConceptoGastos.nombre
                )
                == nombre.lower()
            )
            .first()
        )

        if not existe:

            db.add(
                TipoConceptoGastos(
                    nombre=nombre,
                    activo=True,
                )
            )

            cambios = True

    if cambios:
        db.commit()


# ============================================================
# LISTADO
# ============================================================

@router.get(
    "",
    response_model=list[
        TipoConceptoGastosResponse
    ],
)
def listar_tipos_concepto_gastos(
    q: Optional[str] = None,
    activo: Optional[bool] = None,
    db: Session = Depends(get_db),
):

    garantizar_catalogo_inicial(db)

    consulta = db.query(
        TipoConceptoGastos
    )

    if q and q.strip():

        texto = (
            f"%{q.strip().lower()}%"
        )

        consulta = consulta.filter(
            func.lower(
                TipoConceptoGastos.nombre
            ).like(texto)
        )

    if activo is not None:

        consulta = consulta.filter(
            TipoConceptoGastos.activo
            == activo
        )

    return (
        consulta
        .order_by(
            func.lower(
                TipoConceptoGastos.nombre
            )
        )
        .all()
    )


# ============================================================
# OPCIONES ACTIVAS
# ============================================================

@router.get(
    "/opciones",
    response_model=list[
        TipoConceptoGastosResponse
    ],
)
def obtener_opciones_tipos_concepto_gastos(
    db: Session = Depends(get_db),
):

    garantizar_catalogo_inicial(db)

    return (
        db.query(
            TipoConceptoGastos
        )
        .filter(
            TipoConceptoGastos.activo
            == True
        )
        .order_by(
            func.lower(
                TipoConceptoGastos.nombre
            )
        )
        .all()
    )


# ============================================================
# CREAR
# ============================================================

@router.post(
    "",
    response_model=TipoConceptoGastosResponse,
)
def crear_tipo_concepto_gastos(
    datos: TipoConceptoGastosCreate,
    db: Session = Depends(get_db),
):

    nombre = normalizar_nombre(
        datos.nombre
    )

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio.",
        )

    existe = (
        db.query(
            TipoConceptoGastos
        )
        .filter(
            func.lower(
                TipoConceptoGastos.nombre
            )
            == nombre.lower()
        )
        .first()
    )

    if existe:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe este tipo de "
                "concepto de gastos."
            ),
        )

    nuevo = TipoConceptoGastos(
        nombre=nombre,
        activo=datos.activo,
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


# ============================================================
# EDITAR
# ============================================================

@router.put(
    "/{tipo_id}",
    response_model=TipoConceptoGastosResponse,
)
def actualizar_tipo_concepto_gastos(
    tipo_id: int,
    datos: TipoConceptoGastosUpdate,
    db: Session = Depends(get_db),
):

    tipo = (
        db.query(
            TipoConceptoGastos
        )
        .filter(
            TipoConceptoGastos.id
            == tipo_id
        )
        .first()
    )

    if not tipo:

        raise HTTPException(
            status_code=404,
            detail=(
                "Tipo de concepto de gastos "
                "no encontrado."
            ),
        )

    nombre = normalizar_nombre(
        datos.nombre
    )

    if not nombre:

        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio.",
        )

    duplicado = (
        db.query(
            TipoConceptoGastos
        )
        .filter(
            func.lower(
                TipoConceptoGastos.nombre
            )
            == nombre.lower(),
            TipoConceptoGastos.id
            != tipo_id,
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro tipo con "
                "ese nombre."
            ),
        )

    tipo.nombre = nombre
    tipo.activo = datos.activo

    db.commit()
    db.refresh(tipo)

    return tipo


# ============================================================
# ELIMINAR
# ============================================================

@router.delete(
    "/{tipo_id}",
)
def eliminar_tipo_concepto_gastos(
    tipo_id: int,
    db: Session = Depends(get_db),
):

    tipo = (
        db.query(
            TipoConceptoGastos
        )
        .filter(
            TipoConceptoGastos.id
            == tipo_id
        )
        .first()
    )

    if not tipo:

        raise HTTPException(
            status_code=404,
            detail=(
                "Tipo de concepto de gastos "
                "no encontrado."
            ),
        )

    db.delete(tipo)
    db.commit()

    return {
        "ok": True,
        "mensaje": (
            "Tipo de concepto de gastos "
            "eliminado correctamente."
        ),
    }

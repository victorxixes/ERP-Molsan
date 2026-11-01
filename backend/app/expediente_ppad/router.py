from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request
from backend.app.expedientes.models import Expediente
from backend.app.expediente_ppad.models import ExpedientePPAD


router = APIRouter(
    prefix="/expedientes/{expediente_id}/ppad",
    tags=["Expedientes - PPAD"],
    dependencies=[Depends(get_current_user), Depends(validar_visibilidad_expediente_request)],
)


class PPADCreate(BaseModel):
    concepto: str = Field(..., min_length=1, max_length=500)
    importe: Decimal = Field(..., ge=0, max_digits=14, decimal_places=2)
    imputable_a: str = "Molsan"

    @validator("concepto")
    def validar_concepto(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("El concepto no puede estar vacío.")
        return value

    @validator("imputable_a")
    def validar_imputable_a(cls, value):
        value = value.strip()
        if value not in ("Molsan", "Externo"):
            raise ValueError("imputable_a debe ser 'Molsan' o 'Externo'.")
        return value


class PPADUpdate(BaseModel):
    concepto: str | None = Field(None, min_length=1, max_length=500)
    importe: Decimal | None = Field(None, ge=0, max_digits=14, decimal_places=2)
    imputable_a: str | None = None

    @validator("concepto")
    def validar_concepto(cls, value):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("El concepto no puede estar vacío.")
        return value

    @validator("imputable_a")
    def validar_imputable_a(cls, value):
        if value is None:
            return value
        value = value.strip()
        if value not in ("Molsan", "Externo"):
            raise ValueError("imputable_a debe ser 'Molsan' o 'Externo'.")
        return value


def _comprobar_expediente(db: Session, expediente_id: str) -> Expediente:
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(expediente_id))
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El expediente no existe.")
    return expediente


def _ppad_dict(item: ExpedientePPAD):
    return {
        "id": item.id,
        "expediente_id": item.expediente_id,
        "concepto": item.concepto,
        "importe": float(item.importe or 0),
        "imputable_a": item.imputable_a,
        "usuario_creador": item.usuario_creador,
        "fecha_creacion": item.fecha_creacion.isoformat() if item.fecha_creacion else None,
        "fecha_modificacion": item.fecha_modificacion.isoformat() if item.fecha_modificacion else None,
        "compensado": bool(item.compensado),
        "fecha_compensacion": item.fecha_compensacion.isoformat() if item.fecha_compensacion else None,
    }


def _obtener_ppad(db: Session, expediente_pk: int, ppad_id: int) -> ExpedientePPAD:
    item = (
        db.query(ExpedientePPAD)
        .filter(ExpedientePPAD.id == ppad_id, ExpedientePPAD.expediente_id == expediente_pk)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El registro PPAD no existe en este expediente.")
    return item


@router.get("", summary="Listar registros PPAD de un expediente")
def listar_ppad(expediente_id: str, db: Session = Depends(get_db)):
    expediente = _comprobar_expediente(db, expediente_id)
    items = (
        db.query(ExpedientePPAD)
        .filter(ExpedientePPAD.expediente_id == expediente.id)
        .order_by(ExpedientePPAD.fecha_creacion.desc(), ExpedientePPAD.id.desc())
        .all()
    )
    return {"expediente_id": expediente_id, "total": len(items), "items": [_ppad_dict(item) for item in items]}


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear registro PPAD")
def crear_ppad(expediente_id: str, datos: PPADCreate, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    expediente = _comprobar_expediente(db, expediente_id)

    # Evita duplicados al repetir la acción de generación automática.
    if datos.concepto.startswith("Honorarios de gestoría - "):
        existente = (
            db.query(ExpedientePPAD)
            .filter(
                ExpedientePPAD.expediente_id == expediente.id,
                ExpedientePPAD.concepto == datos.concepto,
            )
            .first()
        )
        if existente:
            resultado = _ppad_dict(existente)
            resultado["ya_existia"] = True
            return resultado

    item = ExpedientePPAD(
        expediente_id=expediente.id,
        concepto=datos.concepto,
        importe=datos.importe,
        imputable_a=datos.imputable_a,
        usuario_creador=" ".join(parte for parte in (getattr(usuario, "nombre", None), getattr(usuario, "apellidos", None)) if parte) or getattr(usuario, "usuario", None) or str(getattr(usuario, "id", "")),
    )
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo guardar el registro PPAD.")
    resultado = _ppad_dict(item)
    resultado["ya_existia"] = False
    return resultado


@router.put("/{ppad_id}", summary="Modificar registro PPAD")
def modificar_ppad(expediente_id: str, ppad_id: int, datos: PPADUpdate, db: Session = Depends(get_db)):
    expediente = _comprobar_expediente(db, expediente_id)
    item = _obtener_ppad(db, expediente.id, ppad_id)
    if item.compensado:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un PPAD compensado no se puede modificar.")
    cambios = datos.dict(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se han enviado cambios.")
    for campo, valor in cambios.items():
        if valor is not None:
            setattr(item, campo, valor)
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo modificar el registro PPAD.")
    return _ppad_dict(item)


def _es_administrador(usuario) -> bool:
    rol = getattr(getattr(usuario, "rol", None), "nombre", "") or ""
    rol_normalizado = " ".join(str(rol).strip().lower().replace("_", " ").replace("-", " ").split())
    return rol_normalizado in {
        "admin",
        "administrador",
        "administradora",
        "superadmin",
        "super admin",
        "superadministrador",
        "super administradora",
        "administrador general",
    }


@router.delete("/{ppad_id}", summary="Eliminar registro PPAD")
def eliminar_ppad(
    expediente_id: str,
    ppad_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    expediente = _comprobar_expediente(db, expediente_id)
    item = _obtener_ppad(db, expediente.id, ppad_id)
    if item.compensado and not _es_administrador(usuario):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede eliminar un PPAD compensado.",
        )
    db.delete(item)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo eliminar el registro PPAD.")
    return {"ok": True, "mensaje": "Registro PPAD eliminado.", "id": ppad_id}



@router.post("/{ppad_id}/compensar", summary="Marcar un PPAD como compensado")
def compensar_ppad(expediente_id: str, ppad_id: int, db: Session = Depends(get_db)):
    expediente = _comprobar_expediente(db, expediente_id)
    item = _obtener_ppad(db, expediente.id, ppad_id)

    if item.compensado:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este PPAD ya está compensado.",
        )

    if not getattr(expediente, "fecha_firma", None):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede compensar el PPAD hasta que el expediente tenga fecha de firma.",
        )

    from datetime import datetime, timezone

    item.compensado = True
    item.fecha_compensacion = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la compensación del PPAD.",
        )

    return _ppad_dict(item)

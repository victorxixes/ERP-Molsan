from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.empleados.models import Empleado
from backend.app.expediente_observaciones.models import ExpedienteObservacion


router = APIRouter(
    prefix="/expedientes/{expediente_id}/observaciones",
    tags=["Expedientes - Observaciones"],
)

VISIBILIDADES = ("Gestor", "Visible notario", "Visible apoderado")


class ObservacionCreate(BaseModel):
    comentario: str = Field(..., min_length=1)
    visibilidad: str = "Gestor"
    empleado_destinatario_id: int | None = None

    @validator("comentario")
    def validar_comentario(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("El comentario no puede estar vacío.")
        return value

    @validator("visibilidad")
    def validar_visibilidad(cls, value):
        value = value.strip()
        if value not in VISIBILIDADES:
            raise ValueError("La visibilidad debe ser Gestor, Visible notario o Visible apoderado.")
        return value

    @validator("empleado_destinatario_id")
    def validar_destinatario(cls, value, values):
        if values.get("visibilidad") == "Gestor" and value is None:
            raise ValueError("Selecciona el empleado destinatario para una observación de tipo Gestor.")
        if values.get("visibilidad") != "Gestor" and value is not None:
            raise ValueError("El destinatario empleado solo se utiliza para la visibilidad Gestor.")
        return value


class ObservacionUpdate(BaseModel):
    comentario: str | None = Field(None, min_length=1)
    visibilidad: str | None = None
    empleado_destinatario_id: int | None = None

    @validator("comentario")
    def validar_comentario(cls, value):
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("El comentario no puede estar vacío.")
        return value

    @validator("visibilidad")
    def validar_visibilidad(cls, value):
        if value is not None and value not in VISIBILIDADES:
            raise ValueError("La visibilidad debe ser Gestor, Visible notario o Visible apoderado.")
        return value


def _observacion_dict(item, empleado=None, autor=None):
    return {
        "id": item.id,
        "expediente_id": item.expediente_id,
        "comentario": item.comentario,
        "visibilidad": item.visibilidad,
        "empleado_destinatario_id": item.empleado_destinatario_id,
        "empleado_destinatario": (
            " ".join(filter(None, [empleado.nombre, empleado.apellidos]))
            if empleado else None
        ),
        "autor_empleado_id": item.autor_empleado_id,
        "autor": (
            " ".join(filter(None, [autor.nombre, autor.apellidos]))
            if autor else None
        ),
        "fecha": item.fecha.isoformat() if item.fecha else None,
        "activo": item.activo,
    }


def _comprobar_expediente(db: Session, expediente_id: int):
    expediente = db.query(Expediente).filter(Expediente.id == expediente_id).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="El expediente no existe.")
    return expediente


def _obtener_observacion(db: Session, expediente_id: int, observacion_id: int):
    item = (
        db.query(ExpedienteObservacion)
        .filter(
            ExpedienteObservacion.id == observacion_id,
            ExpedienteObservacion.expediente_id == expediente_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="La observación no existe en este expediente.")
    return item


@router.get("", summary="Listar observaciones de un expediente")
def listar_observaciones(
    expediente_id: int,
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
):
    _comprobar_expediente(db, expediente_id)
    consulta = db.query(ExpedienteObservacion).filter(
        ExpedienteObservacion.expediente_id == expediente_id
    )
    if not incluir_inactivas:
        consulta = consulta.filter(ExpedienteObservacion.activo.is_(True))
    items = consulta.order_by(ExpedienteObservacion.fecha.desc(), ExpedienteObservacion.id.desc()).all()

    resultado = []
    for item in items:
        empleado = None
        autor = None
        if item.empleado_destinatario_id:
            empleado = db.query(Empleado).filter(Empleado.id == item.empleado_destinatario_id).first()
        if item.autor_empleado_id:
            autor = db.query(Empleado).filter(Empleado.id == item.autor_empleado_id).first()
        resultado.append(_observacion_dict(item, empleado, autor))

    return {"expediente_id": expediente_id, "total": len(resultado), "items": resultado}


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear observación de expediente")
def crear_observacion(
    expediente_id: int,
    datos: ObservacionCreate,
    db: Session = Depends(get_db),
):
    _comprobar_expediente(db, expediente_id)

    if datos.visibilidad == "Gestor":
        empleado = (
            db.query(Empleado)
            .filter(
                Empleado.id == datos.empleado_destinatario_id,
                Empleado.activo.is_(True),
            )
            .first()
        )
        if not empleado:
            raise HTTPException(status_code=404, detail="El empleado destinatario no existe o está inactivo.")

    item = ExpedienteObservacion(
        expediente_id=expediente_id,
        comentario=datos.comentario,
        visibilidad=datos.visibilidad,
        empleado_destinatario_id=datos.empleado_destinatario_id,
        activo=True,
    )
    db.add(item)
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar la observación.")
    empleado = None
    if item.empleado_destinatario_id:
        empleado = db.query(Empleado).filter(Empleado.id == item.empleado_destinatario_id).first()
    return _observacion_dict(item, empleado)


@router.put("/{observacion_id}", summary="Modificar observación de expediente")
def modificar_observacion(
    expediente_id: int,
    observacion_id: int,
    datos: ObservacionUpdate,
    db: Session = Depends(get_db),
):
    _comprobar_expediente(db, expediente_id)
    item = _obtener_observacion(db, expediente_id, observacion_id)
    cambios = datos.dict(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="No se han enviado cambios.")

    visibilidad_final = cambios.get("visibilidad", item.visibilidad)
    destinatario_final = cambios.get("empleado_destinatario_id", item.empleado_destinatario_id)
    if visibilidad_final == "Gestor":
        if destinatario_final is None:
            raise HTTPException(status_code=400, detail="Selecciona el empleado destinatario para una observación de tipo Gestor.")
        empleado = (
            db.query(Empleado)
            .filter(Empleado.id == destinatario_final, Empleado.activo.is_(True))
            .first()
        )
        if not empleado:
            raise HTTPException(status_code=404, detail="El empleado destinatario no existe o está inactivo.")
    else:
        destinatario_final = None
        cambios["empleado_destinatario_id"] = None

    for campo, valor in cambios.items():
        setattr(item, campo, valor)
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo modificar la observación.")

    empleado = None
    if item.empleado_destinatario_id:
        empleado = db.query(Empleado).filter(Empleado.id == item.empleado_destinatario_id).first()
    autor = None
    if item.autor_empleado_id:
        autor = db.query(Empleado).filter(Empleado.id == item.autor_empleado_id).first()
    return _observacion_dict(item, empleado, autor)


@router.delete("/{observacion_id}", summary="Desactivar observación de expediente")
def desactivar_observacion(
    expediente_id: int,
    observacion_id: int,
    db: Session = Depends(get_db),
):
    _comprobar_expediente(db, expediente_id)
    item = _obtener_observacion(db, expediente_id, observacion_id)
    item.activo = False
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo desactivar la observación.")
    return {"ok": True, "mensaje": "Observación desactivada.", "id": observacion_id}


@router.get("/empleados", summary="Listar empleados activos para destinatarios")
def listar_empleados_gestores(db: Session = Depends(get_db)):
    empleados = (
        db.query(Empleado)
        .filter(Empleado.activo.is_(True))
        .order_by(Empleado.apellidos.asc(), Empleado.nombre.asc())
        .all()
    )
    return [
        {
            "id": empleado.id,
            "nombre": " ".join(filter(None, [empleado.nombre, empleado.apellidos])),
            "usuario": empleado.usuario,
            "email_empresa": empleado.email_empresa,
        }
        for empleado in empleados
    ]

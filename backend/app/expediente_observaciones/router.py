from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, validator
from sqlalchemy import or_
from sqlalchemy.orm import Session
import jwt

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.reparto import validar_acceso_candidatos_expediente
from backend.app.empleados.models import Empleado
from backend.app.expediente_observaciones.models import ExpedienteObservacion
from backend.app.notificaciones.router_ws import send_notif_to_user

router = APIRouter(prefix="/expedientes/{expediente_id}/observaciones", tags=["Expedientes - Observaciones"])
bearer_scheme = HTTPBearer(auto_error=False)
VISIBILIDADES = ("Gestor", "Visible notario", "Visible apoderado")


def obtener_empleado_autenticado(
    credenciales: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Empleado:
    if not credenciales or credenciales.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Falta el token de autenticación.", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(credenciales.credentials, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        empleado_id = int(payload["id"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="La sesión ha caducado. Vuelve a iniciar sesión.", headers={"WWW-Authenticate": "Bearer"})
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token de autenticación no válido.", headers={"WWW-Authenticate": "Bearer"})
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id, Empleado.activo.is_(True)).first()
    if not empleado:
        raise HTTPException(status_code=401, detail="El empleado de la sesión no existe o está inactivo.", headers={"WWW-Authenticate": "Bearer"})
    return empleado


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
            raise ValueError("El destinatario solo se utiliza para la visibilidad Gestor.")
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


class ObservacionComentarioFicha(BaseModel):
    comentario: str = Field(..., min_length=1)
    visiones: list[str] = Field(default_factory=list)
    empleado_destinatario_id: int | None = None

    @validator("comentario")
    def validar_comentario(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("El comentario no puede estar vacío.")
        return value

    @validator("visiones")
    def validar_visiones(cls, value):
        permitidas = {"actividad", "notario", "apoderado"}
        valores = list(dict.fromkeys(str(v).strip().lower() for v in (value or [])))
        if not valores:
            raise ValueError("Selecciona al menos un destino del comentario.")
        if set(valores) - permitidas:
            raise ValueError("Hay destinos del comentario no reconocidos.")
        return valores


def _comprobar_expediente(db: Session, expediente_id: str, usuario: Empleado) -> Expediente:
    expediente = db.query(Expediente).filter(Expediente.id_expediente == str(expediente_id)).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="El expediente no existe.")
    validar_acceso_candidatos_expediente(db, usuario, [expediente])
    return expediente


def _empleado_por_id(db: Session, empleado_id):
    if empleado_id is None:
        return None
    return db.query(Empleado).filter(Empleado.id == empleado_id).first()


def _observacion_dict(item, empleado=None, autor=None, validador=None):
    return {
        "id": item.id,
        "expediente_id": item.expediente_id,
        "comentario": item.comentario,
        "visibilidad": item.visibilidad,
        "empleado_destinatario_id": item.empleado_destinatario_id,
        "empleado_destinatario": " ".join(filter(None, [empleado.nombre, empleado.apellidos])) if empleado else None,
        "autor_empleado_id": item.autor_empleado_id,
        "autor": " ".join(filter(None, [autor.nombre, autor.apellidos])) if autor else None,
        "fecha": item.fecha.isoformat() if item.fecha else None,
        "activo": item.activo,
        "estado_validacion": getattr(item, "estado_validacion", "No requiere"),
        "validado_por_empleado_id": getattr(item, "validado_por_empleado_id", None),
        "validado_por": " ".join(filter(None, [validador.nombre, validador.apellidos])) if validador else None,
        "validado_en": item.validado_en.isoformat() if getattr(item, "validado_en", None) else None,
    }


def _obtener_observacion(db: Session, expediente_pk: int, observacion_id: int):
    item = db.query(ExpedienteObservacion).filter(
        ExpedienteObservacion.id == observacion_id,
        ExpedienteObservacion.expediente_id == expediente_pk,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="La observación no existe en este expediente.")
    return item


def _crear_observacion(db: Session, expediente, usuario, comentario, visibilidad, destinatario_id):
    item = ExpedienteObservacion(
        expediente_id=expediente.id,
        comentario=comentario,
        visibilidad=visibilidad,
        empleado_destinatario_id=destinatario_id,
        autor_empleado_id=usuario.id,
        activo=True,
        estado_validacion="Pendiente" if visibilidad == "Gestor" else "No requiere",
    )
    db.add(item)
    db.flush()
    return item


@router.get("", summary="Listar observaciones de un expediente")
def listar_observaciones(expediente_id: str, incluir_inactivas: bool = False, db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    expediente = _comprobar_expediente(db, expediente_id, usuario)
    consulta = db.query(ExpedienteObservacion).filter(ExpedienteObservacion.expediente_id == expediente.id)
    if not incluir_inactivas:
        consulta = consulta.filter(ExpedienteObservacion.activo.is_(True))
    # Las observaciones internas solo se muestran a su autor o destinatario.
    consulta = consulta.filter(or_(
        ExpedienteObservacion.visibilidad != "Gestor",
        ExpedienteObservacion.autor_empleado_id == usuario.id,
        ExpedienteObservacion.empleado_destinatario_id == usuario.id,
    ))
    items = consulta.order_by(ExpedienteObservacion.fecha.desc(), ExpedienteObservacion.id.desc()).all()
    resultado = [_observacion_dict(item, _empleado_por_id(db, item.empleado_destinatario_id), _empleado_por_id(db, item.autor_empleado_id), _empleado_por_id(db, getattr(item, "validado_por_empleado_id", None))) for item in items]
    return {"expediente_id": expediente_id, "total": len(resultado), "items": resultado}


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear observación de expediente")
async def crear_observacion(expediente_id: str, datos: ObservacionCreate, db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    expediente = _comprobar_expediente(db, expediente_id, usuario)
    if datos.visibilidad == "Gestor":
        destinatario = db.query(Empleado).filter(Empleado.id == datos.empleado_destinatario_id, Empleado.activo.is_(True)).first()
        if not destinatario:
            raise HTTPException(status_code=404, detail="El empleado destinatario no existe o está inactivo.")
    item = _crear_observacion(db, expediente, usuario, datos.comentario, datos.visibilidad, datos.empleado_destinatario_id)
    try:
        db.commit(); db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar la observación.")
    if item.visibilidad == "Gestor" and item.empleado_destinatario_id:
        await send_notif_to_user(item.empleado_destinatario_id, {
            "tipo": "info", "titulo": "Nueva observación interna",
            "mensaje": f"{usuario.nombre} ha dirigido una observación al expediente {expediente.id_expediente}.",
            "expediente_id": expediente.id_expediente, "observacion_id": item.id,
            "evento": "observacion_pendiente_validacion", "read": False,
        })
    return _observacion_dict(item, _empleado_por_id(db, item.empleado_destinatario_id), usuario, _empleado_por_id(db, getattr(item, "validado_por_empleado_id", None)))


@router.post("/comentario-ficha", status_code=status.HTTP_201_CREATED, summary="Guardar comentario del modal clásico y sus destinos")
async def guardar_comentario_ficha(expediente_id: str, datos: ObservacionComentarioFicha, db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    expediente = _comprobar_expediente(db, expediente_id, usuario)
    if "actividad" in datos.visiones:
        if datos.empleado_destinatario_id is None:
            raise HTTPException(status_code=400, detail="Selecciona el empleado destinatario del comentario interno.")
        destinatario = db.query(Empleado).filter(Empleado.id == datos.empleado_destinatario_id, Empleado.activo.is_(True)).first()
        if not destinatario:
            raise HTTPException(status_code=404, detail="El empleado destinatario no existe o está inactivo.")
    elif datos.empleado_destinatario_id is not None:
        raise HTTPException(status_code=400, detail="El destinatario solo es necesario para el destino interno.")

    destinos = []
    if "actividad" in datos.visiones:
        destinos.append(("Gestor", datos.empleado_destinatario_id))
    if "notario" in datos.visiones:
        destinos.append(("Visible notario", None))
    if "apoderado" in datos.visiones:
        destinos.append(("Visible apoderado", None))
    try:
        items = [_crear_observacion(db, expediente, usuario, datos.comentario, visibilidad, destinatario_id) for visibilidad, destinatario_id in destinos]
        # Mantiene sincronizado el campo histórico que muestran el listado y la ficha.
        expediente.observaciones = datos.comentario[:2000]
        db.commit()
        for item in items:
            db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar el comentario y sus destinos.")
    for item in items:
        if item.visibilidad == "Gestor" and item.empleado_destinatario_id:
            await send_notif_to_user(item.empleado_destinatario_id, {
                "tipo": "info", "titulo": "Nueva observación interna",
                "mensaje": f"{usuario.nombre} ha dirigido una observación al expediente {expediente.id_expediente}.",
                "expediente_id": expediente.id_expediente, "observacion_id": item.id,
                "evento": "observacion_pendiente_validacion", "read": False,
            })
    return {
        "ok": True,
        "id_expediente": expediente.id_expediente,
        "total_creadas": len(items),
        "observaciones": [_observacion_dict(item, _empleado_por_id(db, item.empleado_destinatario_id), usuario, _empleado_por_id(db, getattr(item, "validado_por_empleado_id", None))) for item in items],
        "observaciones_expediente": datos.comentario,
        "registrado_en_backend": True,
    }


@router.post("/{observacion_id}/validar", summary="Validar una observación interna recibida")
def validar_observacion(expediente_id: str, observacion_id: int, db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    expediente = _comprobar_expediente(db, expediente_id, usuario)
    item = _obtener_observacion(db, expediente.id, observacion_id)
    if item.visibilidad != "Gestor" or item.empleado_destinatario_id != usuario.id:
        raise HTTPException(status_code=403, detail="Solo el empleado destinatario puede validar esta observación interna.")
    if item.estado_validacion == "Validada":
        return _observacion_dict(item, _empleado_por_id(db, item.empleado_destinatario_id), _empleado_por_id(db, item.autor_empleado_id), _empleado_por_id(db, getattr(item, "validado_por_empleado_id", None)))
    item.estado_validacion = "Validada"
    item.validado_por_empleado_id = usuario.id
    item.validado_en = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    try:
        db.commit()
        db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo registrar la validación de la observación.")
    return _observacion_dict(item, _empleado_por_id(db, item.empleado_destinatario_id), _empleado_por_id(db, item.autor_empleado_id), _empleado_por_id(db, getattr(item, "validado_por_empleado_id", None)))


@router.put("/{observacion_id}", summary="Modificar observación de expediente")
def modificar_observacion(expediente_id: str, observacion_id: int, datos: ObservacionUpdate, db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    expediente = _comprobar_expediente(db, expediente_id, usuario)
    item = _obtener_observacion(db, expediente.id, observacion_id)
    if item.autor_empleado_id != usuario.id:
        raise HTTPException(status_code=403, detail="Solo el autor puede modificar esta observación.")
    cambios = datos.dict(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="No se han enviado cambios.")
    visibilidad_final = cambios.get("visibilidad", item.visibilidad)
    destinatario_final = cambios.get("empleado_destinatario_id", item.empleado_destinatario_id)
    if visibilidad_final == "Gestor":
        if destinatario_final is None:
            raise HTTPException(status_code=400, detail="Selecciona el empleado destinatario para una observación de tipo Gestor.")
        destinatario = db.query(Empleado).filter(Empleado.id == destinatario_final, Empleado.activo.is_(True)).first()
        if not destinatario:
            raise HTTPException(status_code=404, detail="El empleado destinatario no existe o está inactivo.")
    else:
        cambios["empleado_destinatario_id"] = None
    for campo, valor in cambios.items():
        setattr(item, campo, valor)
    try:
        db.commit(); db.refresh(item)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo modificar la observación.")
    return _observacion_dict(item, _empleado_por_id(db, item.empleado_destinatario_id), _empleado_por_id(db, item.autor_empleado_id), _empleado_por_id(db, getattr(item, "validado_por_empleado_id", None)))


@router.delete("/{observacion_id}", summary="Desactivar observación de expediente")
def desactivar_observacion(expediente_id: str, observacion_id: int, db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    expediente = _comprobar_expediente(db, expediente_id, usuario)
    item = _obtener_observacion(db, expediente.id, observacion_id)
    if item.autor_empleado_id != usuario.id:
        raise HTTPException(status_code=403, detail="Solo el autor puede desactivar esta observación.")
    item.activo = False
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo desactivar la observación.")
    return {"ok": True, "mensaje": "Observación desactivada.", "id": observacion_id}


@router.get("/empleados", summary="Listar empleados activos para destinatarios")
def listar_empleados_gestores(db: Session = Depends(get_db), usuario: Empleado = Depends(obtener_empleado_autenticado)):
    empleados = db.query(Empleado).filter(Empleado.activo.is_(True)).order_by(Empleado.apellidos.asc(), Empleado.nombre.asc()).all()
    return [{"id": empleado.id, "nombre": " ".join(filter(None, [empleado.nombre, empleado.apellidos])), "usuario": empleado.usuario, "email_empresa": empleado.email_empresa} for empleado in empleados]

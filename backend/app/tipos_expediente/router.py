from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.tipos_expediente.models import TipoExpediente


router = APIRouter(
    dependencies=[Depends(get_current_user)],prefix="/tipos-expediente", tags=["Tipos de expediente"])


TIPOS_INICIALES = [
    {"id": 5, "nombre": "GESTICAIXA", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 6, "nombre": "CREDIT AGRICOLE SUD MEDITERRANEE", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 7, "nombre": "ASENTIA PROJECT SL", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 8, "nombre": "SAREB", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 9, "nombre": "BUILDINGCENTER CV CONCURSALES", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 10, "nombre": "FONDOS BANCO VALENCIA", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 11, "nombre": "MOLSAN GESTION Y TRAMITACION SL", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 12, "nombre": "SANCHEZ MOLINA ABOGADOS", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 13, "nombre": "GESTINOVA 99 SL", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 14, "nombre": "GDSCUSA MANDAMIENTOS", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 15, "nombre": "HAYA TITULIZACION S.G.F.T., S.A.U.", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 16, "nombre": "BUILDINGCENTER PDTE CREAR UR", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 17, "nombre": "TEIDE ACQUISITIONS", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 18, "nombre": "CRANDON", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 19, "nombre": "CRITERIA CAIXA SAU", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 20, "nombre": "INMOCAIXA - Inmo Criteria Caixa SAU", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 21, "nombre": "OTRO DOC. VINC GTG", "grupo": "Provisiones fuera circuito GTG"},
    {"id": 22, "nombre": "CaixaBank", "grupo": "Tipos de expediente"},
    {"id": 23, "nombre": "Crédit Agricole", "grupo": "Tipos de expediente"},
    {"id": 24, "nombre": "Particulares", "grupo": "Tipos de expediente"},
    {"id": 25, "nombre": "BBVA", "grupo": "Tipos de expediente"},
    {"id": 26, "nombre": "Banco Sabadell", "grupo": "Tipos de expediente"},
]


class TipoExpedienteInput(BaseModel):
    nombre: str
    grupo: str = "Tipos de expediente"
    activo: bool = True


class TipoExpedienteResponse(BaseModel):
    id: int
    nombre: str
    grupo: str
    activo: bool

    class Config:
        orm_mode = True


def asegurar_catalogo_inicial(db: Session) -> None:
    TipoExpediente.__table__.create(bind=db.get_bind(), checkfirst=True)
    if db.query(TipoExpediente.id).first():
        return

    for item in TIPOS_INICIALES:
        datos = dict(item)
        identificador = datos.pop("id", None)
        tipo = TipoExpediente(
            id=identificador,
            nombre=datos["nombre"],
            grupo=datos["grupo"],
            activo=True,
        )
        db.add(tipo)

    db.flush()
    # Los identificadores históricos 5–21 se conservan; el contador queda
    # preparado para asignar el siguiente ID automáticamente en PostgreSQL.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(text(
            "SELECT setval(pg_get_serial_sequence('tipos_expediente', 'id'), "
            "COALESCE((SELECT MAX(id) FROM tipos_expediente), 1), true)"
        ))
    db.commit()


@router.get("", response_model=list[TipoExpedienteResponse])
def listar_tipos_expediente(
    q: Optional[str] = None,
    activo: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    asegurar_catalogo_inicial(db)
    consulta = db.query(TipoExpediente)
    if q and q.strip():
        consulta = consulta.filter(TipoExpediente.nombre.ilike(f"%{q.strip()}%"))
    if activo is not None:
        consulta = consulta.filter(TipoExpediente.activo == activo)
    return consulta.order_by(TipoExpediente.id.asc()).all()


@router.post("", response_model=TipoExpedienteResponse, status_code=201)
def crear_tipo_expediente(
    datos: TipoExpedienteInput,
    db: Session = Depends(get_db),
):
    nombre = " ".join(datos.nombre.split())
    grupo = " ".join(datos.grupo.split()) or "Tipos de expediente"
    if not nombre:
        raise HTTPException(status_code=400, detail="La descripción es obligatoria.")
    asegurar_catalogo_inicial(db)
    duplicado = db.query(TipoExpediente).filter(
        func.lower(TipoExpediente.nombre) == nombre.lower(),
        func.lower(TipoExpediente.grupo) == grupo.lower(),
    ).first()
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe ese tipo dentro del mismo grupo.")
    tipo = TipoExpediente(nombre=nombre, grupo=grupo, activo=datos.activo)
    db.add(tipo)
    db.commit()
    db.refresh(tipo)
    return tipo


@router.put("/{tipo_id}", response_model=TipoExpedienteResponse)
def actualizar_tipo_expediente(
    tipo_id: int,
    datos: TipoExpedienteInput,
    db: Session = Depends(get_db),
):
    tipo = db.query(TipoExpediente).filter(TipoExpediente.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de expediente no encontrado.")
    nombre = " ".join(datos.nombre.split())
    grupo = " ".join(datos.grupo.split()) or "Tipos de expediente"
    if not nombre:
        raise HTTPException(status_code=400, detail="La descripción es obligatoria.")
    duplicado = db.query(TipoExpediente).filter(
        TipoExpediente.id != tipo_id,
        func.lower(TipoExpediente.nombre) == nombre.lower(),
        func.lower(TipoExpediente.grupo) == grupo.lower(),
    ).first()
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe ese tipo dentro del mismo grupo.")
    tipo.nombre = nombre
    tipo.grupo = grupo
    tipo.activo = datos.activo
    db.commit()
    db.refresh(tipo)
    return tipo


@router.delete("/{tipo_id}")
def eliminar_tipo_expediente(tipo_id: int, db: Session = Depends(get_db)):
    tipo = db.query(TipoExpediente).filter(TipoExpediente.id == tipo_id).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de expediente no encontrado.")
    db.delete(tipo)
    db.commit()
    return {"ok": True, "mensaje": "Tipo de expediente eliminado correctamente."}

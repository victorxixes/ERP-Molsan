from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.auth.dependencies import get_current_user
from backend.app.maestros.schemas import MaestroCreate, MaestroUpdate
from backend.app.maestros.models import Departamento, Seccion, Cargo
from backend.app.maestros.service import listar, obtener, crear, editar, eliminar

router = APIRouter(
    prefix="/maestros",
    tags=["Maestros"],
    dependencies=[Depends(get_current_user)],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------
# Helper para evitar repetir código
# ---------------------------

MODELOS = {
    "departamentos": Departamento,
    "secciones": Seccion,
    "cargos": Cargo,
}

# ---------------------------
# RUTAS CRUD GENERICAS
# ---------------------------

@router.get("/{tipo}")
def listar_maestro(tipo: str, db: Session = Depends(get_db)):
    modelo = MODELOS.get(tipo)
    if not modelo:
        raise HTTPException(status_code=400, detail="Tipo de maestro inválido")
    return listar(db, modelo)

@router.get("/{tipo}/{id}")
def obtener_maestro(tipo: str, id: int, db: Session = Depends(get_db)):
    modelo = MODELOS.get(tipo)
    if not modelo:
        raise HTTPException(status_code=400, detail="Tipo de maestro inválido")

    registro = obtener(db, modelo, id)
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    return registro

@router.post("/{tipo}")
def crear_maestro(tipo: str, data: MaestroCreate, db: Session = Depends(get_db)):
    modelo = MODELOS.get(tipo)
    if not modelo:
        raise HTTPException(status_code=400, detail="Tipo de maestro inválido")

    try:
        return crear(db, modelo, data.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{tipo}/{id}")
def editar_maestro(tipo: str, id: int, data: MaestroUpdate, db: Session = Depends(get_db)):
    modelo = MODELOS.get(tipo)
    if not modelo:
        raise HTTPException(status_code=400, detail="Tipo de maestro inválido")

    registro = editar(db, modelo, id, data.nombre)
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    return registro

@router.delete("/{tipo}/{id}")
def eliminar_maestro(tipo: str, id: int, db: Session = Depends(get_db)):
    modelo = MODELOS.get(tipo)
    if not modelo:
        raise HTTPException(status_code=400, detail="Tipo de maestro inválido")

    ok = eliminar(db, modelo, id)
    if not ok:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    return {"status": "ok", "message": "Registro eliminado"}

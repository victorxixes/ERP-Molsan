from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.oficinas_liquidadoras.models import (
    OficinaLiquidadora,
)
from backend.app.Utilidades.importadores.oficinas_liquidadoras_importer import (
    importar_excel_oficinas_liquidadoras,
)


router = APIRouter(
    prefix="/oficinas-liquidadoras",
    tags=["Oficinas Liquidadoras"],
)


# ============================================================
# SCHEMAS
# ============================================================

class OficinaLiquidadoraBase(BaseModel):
    oficina_liquidadora: str
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    poblacion: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    horario: Optional[str] = None
    activo: bool = True

    class Config:
        orm_mode = True


class OficinaLiquidadoraCrear(OficinaLiquidadoraBase):
    pass


class OficinaLiquidadoraActualizar(OficinaLiquidadoraBase):
    pass


# ============================================================
# SERIALIZADOR
# ============================================================

def oficina_a_dict(
    oficina: OficinaLiquidadora,
):
    return {
        "id": oficina.id,
        "oficina_liquidadora": oficina.oficina_liquidadora,
        "direccion": oficina.direccion,
        "codigo_postal": oficina.codigo_postal,
        "poblacion": oficina.poblacion,
        "provincia": oficina.provincia,
        "telefono": oficina.telefono,
        "email": oficina.email,
        "horario": oficina.horario,
        "activo": oficina.activo,
    }


# ============================================================
# LISTADO
# ============================================================

@router.get("")
def listar_oficinas_liquidadoras(
    q: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    poblacion: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    consulta = db.query(
        OficinaLiquidadora
    )

    if q:
        texto = f"%{q.strip()}%"

        consulta = consulta.filter(
            or_(
                OficinaLiquidadora.oficina_liquidadora.ilike(
                    texto
                ),
                OficinaLiquidadora.direccion.ilike(
                    texto
                ),
                OficinaLiquidadora.codigo_postal.ilike(
                    texto
                ),
                OficinaLiquidadora.poblacion.ilike(
                    texto
                ),
                OficinaLiquidadora.provincia.ilike(
                    texto
                ),
                OficinaLiquidadora.telefono.ilike(
                    texto
                ),
                OficinaLiquidadora.email.ilike(
                    texto
                ),
                OficinaLiquidadora.horario.ilike(
                    texto
                ),
            )
        )

    if provincia:
        consulta = consulta.filter(
            OficinaLiquidadora.provincia.ilike(
                f"%{provincia.strip()}%"
            )
        )

    if poblacion:
        consulta = consulta.filter(
            OficinaLiquidadora.poblacion.ilike(
                f"%{poblacion.strip()}%"
            )
        )

    if activo is not None:
        consulta = consulta.filter(
            OficinaLiquidadora.activo == activo
        )

    consulta = consulta.order_by(
        OficinaLiquidadora.oficina_liquidadora.asc()
    )

    oficinas = consulta.all()

    return [
        oficina_a_dict(oficina)
        for oficina in oficinas
    ]


# ============================================================
# CREAR
# ============================================================

@router.post("")
def crear_oficina_liquidadora(
    datos: OficinaLiquidadoraCrear,
    db: Session = Depends(get_db),
):
    nombre = datos.oficina_liquidadora.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="La Oficina Liquidadora es obligatoria.",
        )

    existente = (
        db.query(OficinaLiquidadora)
        .filter(
            OficinaLiquidadora.oficina_liquidadora.ilike(
                nombre
            )
        )
        .first()
    )

    if existente:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe una Oficina Liquidadora "
                "con ese nombre."
            ),
        )

    oficina = OficinaLiquidadora(
        oficina_liquidadora=nombre,
        direccion=datos.direccion,
        codigo_postal=datos.codigo_postal,
        poblacion=datos.poblacion,
        provincia=datos.provincia,
        telefono=datos.telefono,
        email=datos.email,
        horario=datos.horario,
        activo=datos.activo,
    )

    db.add(oficina)
    db.commit()
    db.refresh(oficina)

    return oficina_a_dict(oficina)


# ============================================================
# IMPORTAR EXCEL
# ============================================================

@router.post("/importar-excel")
async def importar_excel(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not fichero.filename:
        raise HTTPException(
            status_code=400,
            detail="No se ha seleccionado ningún fichero.",
        )

    nombre = fichero.filename.lower()

    if not nombre.endswith(
        (".xlsx", ".xls", ".xlsm")
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "El fichero debe ser un Excel "
                "(.xlsx, .xls o .xlsm)."
            ),
        )

    contenido = await fichero.read()

    if not contenido:
        raise HTTPException(
            status_code=400,
            detail="El fichero Excel está vacío.",
        )

    ruta_temporal = None

    try:
        import os
        import tempfile

        extension = os.path.splitext(
            fichero.filename
        )[1] or ".xlsx"

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as temporal:

            temporal.write(contenido)
            ruta_temporal = temporal.name

        resultado = (
            importar_excel_oficinas_liquidadoras(
                ruta_temporal,
                db,
            )
        )

        if not resultado.get("ok"):
            raise HTTPException(
                status_code=400,
                detail=resultado.get(
                    "mensaje",
                    "Error durante la importación.",
                ),
            )

        return resultado

    finally:

        if ruta_temporal:

            try:
                import os

                if os.path.exists(
                    ruta_temporal
                ):
                    os.remove(
                        ruta_temporal
                    )

            except Exception:
                pass


# ============================================================
# ACTUALIZAR
# ============================================================

@router.put("/{oficina_id}")
def actualizar_oficina_liquidadora(
    oficina_id: int,
    datos: OficinaLiquidadoraActualizar,
    db: Session = Depends(get_db),
):
    oficina = (
        db.query(OficinaLiquidadora)
        .filter(
            OficinaLiquidadora.id == oficina_id
        )
        .first()
    )

    if not oficina:
        raise HTTPException(
            status_code=404,
            detail="Oficina Liquidadora no encontrada.",
        )

    nombre = datos.oficina_liquidadora.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="La Oficina Liquidadora es obligatoria.",
        )

    duplicada = (
        db.query(OficinaLiquidadora)
        .filter(
            OficinaLiquidadora.id != oficina_id,
            OficinaLiquidadora.oficina_liquidadora.ilike(
                nombre
            ),
        )
        .first()
    )

    if duplicada:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe otra Oficina Liquidadora "
                "con ese nombre."
            ),
        )

    oficina.oficina_liquidadora = nombre
    oficina.direccion = datos.direccion
    oficina.codigo_postal = datos.codigo_postal
    oficina.poblacion = datos.poblacion
    oficina.provincia = datos.provincia
    oficina.telefono = datos.telefono
    oficina.email = datos.email
    oficina.horario = datos.horario
    oficina.activo = datos.activo

    db.commit()
    db.refresh(oficina)

    return oficina_a_dict(oficina)


# ============================================================
# ELIMINAR
# ============================================================

@router.delete("/{oficina_id}")
def eliminar_oficina_liquidadora(
    oficina_id: int,
    db: Session = Depends(get_db),
):
    oficina = (
        db.query(OficinaLiquidadora)
        .filter(
            OficinaLiquidadora.id == oficina_id
        )
        .first()
    )

    if not oficina:
        raise HTTPException(
            status_code=404,
            detail="Oficina Liquidadora no encontrada.",
        )

    db.delete(oficina)
    db.commit()

    return {
        "ok": True,
        "mensaje": (
            "Oficina Liquidadora eliminada correctamente."
        ),
    }

import logging

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.reparto import resolver_key_actividad
from backend.app.empleados.models import Empleado
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.Utilidades.importadores.ctn_importer import importar_ctn_desde_excel
from backend.app.Utilidades.importadores.expedientes_importer import importar_excel_expedientes


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/utilidades",
    tags=["Utilidades"]
)


# ============================================================
# IMPORTAR CTN
# ============================================================

@router.post("/ctn/importar")
async def importar_ctn(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    contenido = await fichero.read()

    total = importar_ctn_desde_excel(
        db,
        contenido
    )

    return {
        "importados": total
    }


# ============================================================
# CREAR COLUMNA GESTORIA EN EXPEDIENTES
# ============================================================

@router.post("/add_columna_gestoria_expedientes")
def add_columna_gestoria_expedientes(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "seguridad", "editar")
    """
    Crea la columna gestoria en la tabla expedientes
    si todavía no existe.
    """

    try:

        db.execute(
            text("""
                ALTER TABLE expedientes
                ADD COLUMN IF NOT EXISTS gestoria VARCHAR(200)
            """)
        )

        db.commit()

        return {
            "ok": True,
            "mensaje": "Columna gestoria creada correctamente en expedientes."
        }

    except Exception as e:

        db.rollback()

        return {
            "ok": False,
            "error": "No se pudo crear la columna gestoria.",
            "detalle": str(e)
        }


# ============================================================
# REASIGNACIÓN MANUAL DEL GESTOR DE UN EXPEDIENTE
# ============================================================

class ReasignarGestorRequest(BaseModel):
    numero_expediente: str
    gestor_id: int


def _nombre_empleado(empleado):
    return " ".join(
        parte for parte in (
            (getattr(empleado, "nombre", None) or "").strip(),
            (getattr(empleado, "apellidos", None) or "").strip(),
        ) if parte
    ).strip()


@router.get("/gestores-asignacion")
def listar_gestores_para_reasignacion(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    empleados = (
        db.query(Empleado)
        .filter(Empleado.activo.is_(True))
        .order_by(Empleado.apellidos.asc(), Empleado.nombre.asc())
        .all()
    )
    return [
        {"id": empleado.id, "nombre": _nombre_empleado(empleado), "usuario": empleado.usuario}
        for empleado in empleados
        if _nombre_empleado(empleado)
    ]


@router.get("/expediente-gestor")
def consultar_gestor_expediente(
    numero_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    numero = (numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica el número de expediente.")

    expediente = (
        db.query(Expediente)
        .filter(func.lower(Expediente.id_expediente) == numero.lower())
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail=f"No se ha encontrado el expediente {numero}.")

    gestor = db.query(Empleado).filter(Empleado.id == expediente.gestor_asignado_id).first() if expediente.gestor_asignado_id else None
    return {
        "numero_expediente": expediente.id_expediente,
        "actividad_actual": getattr(expediente, "actividad_actual", None),
        "gestor_id": expediente.gestor_asignado_id,
        "gestor_nombre": _nombre_empleado(gestor) if gestor else None,
    }


@router.post("/reasignar-gestor")
def reasignar_gestor_expediente(
    datos: ReasignarGestorRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    numero = (datos.numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica el número de expediente.")

    expediente = (
        db.query(Expediente)
        .filter(func.lower(Expediente.id_expediente) == numero.lower())
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail=f"No se ha encontrado el expediente {numero}.")

    gestor_nuevo = (
        db.query(Empleado)
        .filter(Empleado.id == datos.gestor_id, Empleado.activo.is_(True))
        .first()
    )
    if not gestor_nuevo:
        raise HTTPException(status_code=404, detail="El gestor seleccionado no existe o está inactivo.")

    gestor_anterior_id = expediente.gestor_asignado_id
    gestor_anterior = db.query(Empleado).filter(Empleado.id == gestor_anterior_id).first() if gestor_anterior_id else None
    if gestor_anterior_id == gestor_nuevo.id:
        return {
            "ok": True,
            "sin_cambios": True,
            "mensaje": f"El expediente {expediente.id_expediente} ya está asignado a {_nombre_empleado(gestor_nuevo)}.",
            "numero_expediente": expediente.id_expediente,
            "gestor_id": gestor_nuevo.id,
            "gestor_nombre": _nombre_empleado(gestor_nuevo),
        }

    actividad = getattr(expediente, "actividad_actual", None) or "sin_actividad"
    actividad_key = resolver_key_actividad(actividad, getattr(expediente, "fecha_firma", None)) or str(actividad)[:120]
    try:
        # La tabla se crea aquí también, por si la migración de arranque aún no ha terminado.
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS expediente_gestor_historial (
                id BIGSERIAL PRIMARY KEY,
                expediente_id VARCHAR(100) NOT NULL,
                actividad VARCHAR(120) NOT NULL,
                gestor_id INTEGER NULL REFERENCES empleados(id) ON DELETE SET NULL,
                gestor_anterior_id INTEGER NULL REFERENCES empleados(id) ON DELETE SET NULL,
                motivo VARCHAR(80) NOT NULL DEFAULT 'reparto_automatico',
                fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        expediente.gestor_asignado_id = gestor_nuevo.id
        db.execute(text("""
            INSERT INTO expediente_gestor_historial
                (expediente_id, actividad, gestor_id, gestor_anterior_id, motivo, fecha)
            VALUES (:expediente_id, :actividad, :gestor_id, :gestor_anterior_id, 'reasignacion_manual_utilidades', CURRENT_TIMESTAMP)
        """), {
            "expediente_id": str(expediente.id_expediente),
            "actividad": actividad_key,
            "gestor_id": gestor_nuevo.id,
            "gestor_anterior_id": gestor_anterior_id,
        })
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Error al reasignar manualmente el gestor del expediente %s", numero)
        raise HTTPException(status_code=500, detail="No se pudo guardar la reasignación. No se han confirmado los cambios.")

    return {
        "ok": True,
        "mensaje": f"El expediente {expediente.id_expediente} se ha reasignado correctamente.",
        "numero_expediente": expediente.id_expediente,
        "actividad_actual": actividad,
        "gestor_anterior_id": gestor_anterior_id,
        "gestor_anterior_nombre": _nombre_empleado(gestor_anterior) if gestor_anterior else None,
        "gestor_id": gestor_nuevo.id,
        "gestor_nombre": _nombre_empleado(gestor_nuevo),
    }

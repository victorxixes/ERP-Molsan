
from datetime import date, datetime, timedelta
import json
from io import BytesIO
from typing import Optional
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.defectos.models import (
    DefectoSubtipo,
    ExpedienteDefecto,
)
from backend.app.expedientes.defectos.historial_model import HistorialDefecto
from backend.app.tipos_carga_hipotecaria.models import TipoCargaHipotecaria


# ============================================================
# CONFIGURACIÓN
# ============================================================

router = APIRouter(
    prefix="/expedientes",
    tags=["Defectos de expedientes"],
    dependencies=[Depends(get_current_user), Depends(validar_visibilidad_expediente_request)],
)

MAX_PDF_BYTES = 15 * 1024 * 1024


# ============================================================
# ESQUEMAS — SUBTIPOS DE DEFECTO
# ============================================================

class SubtipoCrear(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    activo: bool = True


class SubtipoActualizar(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    activo: bool = True


class SubtipoRespuesta(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    activo: bool

    class Config:
        orm_mode = True


# ============================================================
# ESQUEMAS — DEFECTOS
# ============================================================

class DefectoCrear(BaseModel):
    documento: Optional[str] = None
    tipo_carga_hipotecaria_id: Optional[int] = None
    motivo_defecto: Optional[str] = None
    subtipo_defecto_id: Optional[int] = None
    subtipo_defecto: Optional[str] = None

    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_calificacion: Optional[date] = None
    fecha_renovacion_asiento: Optional[date] = None
    asiento_renovacion_libro_diario: Optional[str] = Field(None, max_length=200)
    vencimiento_asiento_renovacion: Optional[date] = None
    anotacion_suspensiva: Optional[bool] = None
    vencimiento_anotacion: Optional[date] = None
    calificacion_sustitutoria: Optional[bool] = None
    recurso_gubernativo: Optional[bool] = None
    fecha_entrada_subsanacion: Optional[date] = None
    fecha_cierre_defecto: Optional[date] = None

    # Texto histórico de la calificación; no es el PDF.
    calificacion_registro: Optional[str] = None
    observaciones_registro: Optional[str] = Field(
        None,
        max_length=200,
    )


class DefectoActualizar(BaseModel):
    documento: Optional[str] = None
    tipo_carga_hipotecaria_id: Optional[int] = None
    motivo_defecto: Optional[str] = None
    subtipo_defecto_id: Optional[int] = None
    subtipo_defecto: Optional[str] = None

    fecha_notificacion_registro: Optional[date] = None
    fecha_vencimiento_presentacion: Optional[date] = None
    fecha_calificacion: Optional[date] = None
    fecha_renovacion_asiento: Optional[date] = None
    asiento_renovacion_libro_diario: Optional[str] = Field(None, max_length=200)
    vencimiento_asiento_renovacion: Optional[date] = None
    anotacion_suspensiva: Optional[bool] = None
    vencimiento_anotacion: Optional[date] = None
    calificacion_sustitutoria: Optional[bool] = None
    recurso_gubernativo: Optional[bool] = None
    fecha_entrada_subsanacion: Optional[date] = None
    fecha_cierre_defecto: Optional[date] = None

    calificacion_registro: Optional[str] = None
    observaciones_registro: Optional[str] = Field(
        None,
        max_length=200,
    )


# ============================================================
# FUNCIONES AUXILIARES — EXPEDIENTES
# ============================================================

def obtener_expediente(
    db: Session,
    id_expediente: str,
):
    """
    Busca un expediente mediante su identificador externo de ABSIS.
    """
    expediente = (
        db.query(Expediente)
        .filter(
            Expediente.id_expediente == str(id_expediente)
        )
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail=f"No existe el expediente {id_expediente}",
        )

    return expediente


def consulta_defectos_expediente(
    db: Session,
    expediente,
):
    """
    Consulta los defectos vinculados al expediente.

    expediente_id utiliza la clave primaria interna.
    id_expediente utiliza el identificador externo de ABSIS.
    """
    columnas = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    consulta = db.query(ExpedienteDefecto)

    if "expediente_id" in columnas:
        return consulta.filter(
            ExpedienteDefecto.expediente_id == expediente.id
        )

    if "id_expediente" in columnas:
        return consulta.filter(
            ExpedienteDefecto.id_expediente
            == str(expediente.id_expediente)
        )

    raise HTTPException(
        status_code=500,
        detail=(
            "No se puede determinar la relación entre "
            "los defectos y el expediente"
        ),
    )


# ============================================================
# FUNCIONES AUXILIARES — SUBTIPOS
# ============================================================

def obtener_subtipo_activo(
    db: Session,
    subtipo_id: Optional[int],
):
    if subtipo_id is None:
        return None

    subtipo = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.id == subtipo_id,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )

    if subtipo is None:
        raise HTTPException(
            status_code=400,
            detail="El subtipo de defecto no existe o está inactivo",
        )

    return subtipo


def actualizar_nombre_subtipo(
    defecto,
    subtipo,
):
    """
    Mantiene sincronizados el identificador y el nombre del subtipo.
    """
    if hasattr(defecto, "subtipo_defecto"):
        defecto.subtipo_defecto = (
            subtipo.nombre if subtipo is not None else None
        )


# ============================================================
# FUNCIONES AUXILIARES — DEFECTOS
# ============================================================

def obtener_defecto(
    db: Session,
    defecto_id: int,
):
    """
    Busca un defecto por su clave primaria.
    """
    columnas = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    if "id" in columnas:
        campo_id = ExpedienteDefecto.id
    elif "id_defecto" in columnas:
        campo_id = ExpedienteDefecto.id_defecto
    else:
        raise HTTPException(
            status_code=500,
            detail="No se encuentra la clave primaria del modelo de defectos",
        )

    defecto = (
        db.query(ExpedienteDefecto)
        .filter(campo_id == defecto_id)
        .first()
    )

    if defecto is None:
        raise HTTPException(
            status_code=404,
            detail=f"No existe el defecto {defecto_id}",
        )

    return defecto


def obtener_defecto_de_expediente(
    db: Session,
    id_expediente: str,
    defecto_id: int,
):
    """
    Comprueba que el defecto pertenezca al expediente solicitado.
    """
    expediente = obtener_expediente(db, id_expediente)
    defecto = obtener_defecto(db, defecto_id)

    columnas = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    if "expediente_id" in columnas:
        pertenece = defecto.expediente_id == expediente.id

    elif "id_expediente" in columnas:
        pertenece = (
            str(defecto.id_expediente)
            == str(expediente.id_expediente)
        )

    else:
        raise HTTPException(
            status_code=500,
            detail="No se encuentra la relación entre defecto y expediente",
        )

    if not pertenece:
        raise HTTPException(
            status_code=404,
            detail="El defecto no pertenece al expediente indicado",
        )

    return expediente, defecto


def sincronizar_campos_compatibilidad(
    db: Session,
    expediente,
):
    """
    Sincroniza el estado de los defectos con los campos históricos
    del expediente.

    REGLA MOLSAN:
    - Un defecto nuevo queda abierto.
    - Fecha de subsanación y fecha de cierre son iguales.
    - Un defecto con fecha de cierre queda cerrado.
    - El expediente sigue teniendo defectos abiertos si queda
      al menos un defecto sin cerrar.
    - fcierre_defecto del expediente refleja la fecha de cierre
      más reciente de sus defectos.
    """
    defectos = (
        consulta_defectos_expediente(db, expediente)
        .order_by(ExpedienteDefecto.id.asc())
        .all()
    )

    # Normalizar los registros existentes para que la fecha de cierre
    # coincida siempre con la fecha de presentación de la subsanación.
    for defecto in defectos:
        if hasattr(defecto, "fecha_entrada_subsanacion") and hasattr(
            defecto, "fecha_cierre_defecto"
        ):
            defecto.fecha_cierre_defecto = (
                defecto.fecha_entrada_subsanacion
            )

    abiertos = [
        defecto
        for defecto in defectos
        if not getattr(defecto, "fecha_cierre_defecto", None)
    ]

    ultimo_abierto = abiertos[-1] if abiertos else None

    if hasattr(expediente, "tiene_defectos_abiertos"):
        expediente.tiene_defectos_abiertos = (
            "SI" if abiertos else "NO"
        )

    if hasattr(expediente, "tipo_error"):
        expediente.tipo_error = (
            getattr(ultimo_abierto, "motivo_defecto", None)
            if ultimo_abierto is not None
            else None
        )

    if hasattr(expediente, "falta_defecto"):
        expediente.falta_defecto = (
            getattr(ultimo_abierto, "subtipo_defecto", None)
            if ultimo_abierto is not None
            else None
        )

    if hasattr(expediente, "descripcion_error"):
        expediente.descripcion_error = (
            getattr(ultimo_abierto, "calificacion_registro", None)
            if ultimo_abierto is not None
            else None
        )

    fechas_cierre = [
        defecto.fecha_cierre_defecto
        for defecto in defectos
        if getattr(defecto, "fecha_cierre_defecto", None) is not None
    ]

    if hasattr(expediente, "fcierre_defecto"):
        expediente.fcierre_defecto = (
            max(fechas_cierre) if fechas_cierre else None
        )

    db.add(expediente)


def obtener_tipo_carga_activo(
    db: Session,
    tipo_id: Optional[int],
):
    """
    Valida el tipo de carga hipotecaria seleccionado.
    """
    if tipo_id is None:
        return None

    tipo = (
        db.query(TipoCargaHipotecaria)
        .filter(
            TipoCargaHipotecaria.id == tipo_id,
            TipoCargaHipotecaria.activo.is_(True),
        )
        .first()
    )

    if tipo is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "El tipo de carga hipotecaria no existe "
                "o está inactivo."
            ),
        )

    return tipo


def datos_defecto(
    defecto,
    db: Optional[Session] = None,
    expediente=None,
):
    """
    Convierte el defecto en datos JSON, sin incluir el PDF binario.

    Si se proporciona expediente, añade los campos históricos
    sincronizados para que la ficha pueda actualizar su estado.
    """
    resultado = {}

    campos = [
        "id",
        "id_defecto",
        "documento",
        "tipo_carga_hipotecaria_id",
        "motivo_defecto",
        "subtipo_defecto_id",
        "subtipo_defecto",
        "fecha_notificacion_registro",
        "fecha_vencimiento_presentacion",
        "fecha_calificacion",
        "fecha_renovacion_asiento",
        "asiento_renovacion_libro_diario",
        "vencimiento_asiento_renovacion",
        "anotacion_suspensiva",
        "vencimiento_anotacion",
        "calificacion_sustitutoria",
        "recurso_gubernativo",
        "estado_envio_absis",
        "enviado_absis_en",
        "respuesta_absis",
        "fecha_entrada_subsanacion",
        "fecha_cierre_defecto",
        "observaciones_registro",
        "calificacion_registro",
        "calificacion_nombre",
        "calificacion_content_type",
        "calificacion_tamano",
        "calificacion_subida_en",
    ]

    for campo in campos:
        if hasattr(defecto, campo):
            valor = getattr(defecto, campo)

            if campo == "fecha_vencimiento_presentacion":
                # Mantener coherencia también para registros históricos sin
                # recalcularlos ni escribir en producción durante una lectura.
                valor = _calcular_vencimiento_presentacion(
                    getattr(defecto, "fecha_calificacion", None)
                )

            if isinstance(valor, (date, datetime)):
                valor = valor.isoformat()

            resultado[campo] = valor

    tipo_id = resultado.get("tipo_carga_hipotecaria_id")

    if db is not None and tipo_id is not None:
        tipo = (
            db.query(TipoCargaHipotecaria)
            .filter(TipoCargaHipotecaria.id == tipo_id)
            .first()
        )
        resultado["tipo_carga_hipotecaria_nombre"] = (
            tipo.nombre if tipo else None
        )
    else:
        resultado["tipo_carga_hipotecaria_nombre"] = None

    # Estos campos pertenecen al expediente, no al defecto individual.
    if expediente is not None:
        resultado["tiene_defectos_abiertos"] = getattr(
            expediente, "tiene_defectos_abiertos", None
        )
        resultado["tipo_error"] = getattr(
            expediente, "tipo_error", None
        )
        resultado["falta_defecto"] = getattr(
            expediente, "falta_defecto", None
        )
        resultado["descripcion_error"] = getattr(
            expediente, "descripcion_error", None
        )

        fecha_cierre_expediente = getattr(
            expediente, "fcierre_defecto", None
        )

        resultado["fcierre_defecto"] = (
            fecha_cierre_expediente.isoformat()
            if fecha_cierre_expediente
            else None
        )

    return resultado


# ============================================================
# CRUD — SUBTIPOS DE DEFECTO
# ============================================================

@router.get(
    "/subtipos-defecto",
    response_model=list[SubtipoRespuesta],
)
def listar_subtipos_defecto(
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "expedientes", "ver")
    consulta = db.query(DefectoSubtipo)

    if not incluir_inactivos:
        consulta = consulta.filter(
            DefectoSubtipo.activo.is_(True)
        )

    return consulta.order_by(
        DefectoSubtipo.nombre.asc()
    ).all()


@router.post(
    "/subtipos-defecto",
    response_model=SubtipoRespuesta,
    status_code=201,
)
def crear_subtipo_defecto(
    datos: SubtipoCrear,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "expedientes", "editar")
    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre del subtipo es obligatorio",
        )

    existente = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.nombre == nombre,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )

    if existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un subtipo activo con ese nombre",
        )

    subtipo = DefectoSubtipo(
        nombre=nombre,
        descripcion=datos.descripcion,
        activo=datos.activo,
    )

    try:
        db.add(subtipo)
        db.commit()
        db.refresh(subtipo)
        return subtipo

    except Exception as exc:
        db.rollback()
        print("ERROR CREANDO SUBTIPO:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="No se pudo crear el subtipo de defecto",
        )


@router.put(
    "/subtipos-defecto/{subtipo_id}",
    response_model=SubtipoRespuesta,
)
def actualizar_subtipo_defecto(
    subtipo_id: int,
    datos: SubtipoActualizar,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "expedientes", "editar")
    subtipo = (
        db.query(DefectoSubtipo)
        .filter(DefectoSubtipo.id == subtipo_id)
        .first()
    )

    if subtipo is None:
        raise HTTPException(
            status_code=404,
            detail="No existe el subtipo de defecto",
        )

    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre del subtipo es obligatorio",
        )

    duplicado = (
        db.query(DefectoSubtipo)
        .filter(
            DefectoSubtipo.nombre == nombre,
            DefectoSubtipo.id != subtipo_id,
            DefectoSubtipo.activo.is_(True),
        )
        .first()
    )

    if duplicado:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otro subtipo activo con ese nombre",
        )

    subtipo.nombre = nombre
    subtipo.descripcion = datos.descripcion
    subtipo.activo = datos.activo

    try:
        db.commit()
        db.refresh(subtipo)
        return subtipo

    except Exception as exc:
        db.rollback()
        print("ERROR ACTUALIZANDO SUBTIPO:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el subtipo de defecto",
        )


@router.delete("/subtipos-defecto/{subtipo_id}")
def desactivar_subtipo_defecto(
    subtipo_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "expedientes", "editar")
    subtipo = (
        db.query(DefectoSubtipo)
        .filter(DefectoSubtipo.id == subtipo_id)
        .first()
    )

    if subtipo is None:
        raise HTTPException(
            status_code=404,
            detail="No existe el subtipo de defecto",
        )

    subtipo.activo = False

    try:
        db.commit()

        return {
            "ok": True,
            "mensaje": "Subtipo desactivado correctamente",
        }

    except Exception as exc:
        db.rollback()
        print("ERROR DESACTIVANDO SUBTIPO:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="No se pudo desactivar el subtipo de defecto",
        )


# ============================================================
# DEFECTOS — LISTAR POR EXPEDIENTE
# ============================================================

def registrar_evento_defecto(db, expediente, defecto, accion, resumen, cambios=None):
    """Añade una entrada de auditoría en la misma transacción del cambio."""
    evento = HistorialDefecto(
        expediente_id_externo=str(getattr(expediente, "id_expediente", "")),
        expediente_pk=getattr(expediente, "id", None),
        defecto_id=getattr(defecto, "id", None) if defecto is not None else None,
        accion=accion,
        resumen=resumen[:500],
        cambios_json=json.dumps(cambios or {}, ensure_ascii=False, default=str),
    )
    db.add(evento)
    return evento


@router.get("/{id_expediente}/defectos/historial")
def listar_historial_defectos(id_expediente: str, limite: int = 100, db: Session = Depends(get_db)):
    expediente = obtener_expediente(db, id_expediente)
    limite = max(1, min(int(limite), 500))
    eventos = (
        db.query(HistorialDefecto)
        .filter(HistorialDefecto.expediente_id_externo == str(expediente.id_expediente))
        .order_by(HistorialDefecto.creado_en.desc(), HistorialDefecto.id.desc())
        .limit(limite)
        .all()
    )
    resultado = []
    for evento in eventos:
        try:
            cambios = json.loads(evento.cambios_json or "{}")
        except (TypeError, ValueError):
            cambios = {}
        resultado.append({
            "id": evento.id,
            "id_expediente": evento.expediente_id_externo,
            "defecto_id": evento.defecto_id,
            "accion": evento.accion,
            "resumen": evento.resumen,
            "cambios": cambios,
            "usuario": evento.usuario,
            "creado_en": evento.creado_en.isoformat() if evento.creado_en else None,
        })
    return {"id_expediente": str(expediente.id_expediente), "total": len(resultado), "historial": resultado}


@router.get("/{id_expediente}/defectos")
def listar_defectos_expediente(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)

    defectos = (
        consulta_defectos_expediente(db, expediente)
        .order_by(ExpedienteDefecto.id.asc())
        .all()
    )

    return {
        "id_expediente": str(expediente.id_expediente),
        "total": len(defectos),
        "defectos": [
            datos_defecto(defecto, db, expediente)
            for defecto in defectos
        ],
    }


def _calcular_vencimiento_presentacion(fecha_calificacion):
    """El plazo registral se calcula con 60 días naturales desde la calificación."""
    if fecha_calificacion is None:
        return None
    return fecha_calificacion + timedelta(days=60)


# ============================================================
# DEFECTOS — CREAR
# ============================================================

@router.post(
    "/{id_expediente}/defectos",
    status_code=201,
)
def crear_defecto(
    id_expediente: str,
    datos: DefectoCrear,
    db: Session = Depends(get_db),
):
    expediente = obtener_expediente(db, id_expediente)

    try:
        subtipo = obtener_subtipo_activo(
            db,
            datos.subtipo_defecto_id,
        )

        obtener_tipo_carga_activo(
            db,
            datos.tipo_carga_hipotecaria_id,
        )

        valores = datos.dict()

        # El vencimiento de presentación se deriva siempre de la fecha de
        # calificación: 60 días naturales. No confiar en una fecha manual del cliente.
        valores["fecha_vencimiento_presentacion"] = _calcular_vencimiento_presentacion(
            valores.get("fecha_calificacion")
        )

        if subtipo is not None:
            valores["subtipo_defecto"] = subtipo.nombre
        else:
            valores["subtipo_defecto"] = (
                datos.subtipo_defecto.strip()
                if datos.subtipo_defecto
                and datos.subtipo_defecto.strip()
                else None
            )

        # Regla MOLSAN: la fecha de cierre coincide con la fecha
        # de subsanación. Sin subsanación, el defecto queda abierto.
        valores["fecha_cierre_defecto"] = (
            valores.get("fecha_entrada_subsanacion")
        )

        columnas_modelo = {
            columna.name
            for columna in ExpedienteDefecto.__table__.columns
        }

        if "expediente_id" in columnas_modelo:
            valores["expediente_id"] = expediente.id

        elif "id_expediente" in columnas_modelo:
            valores["id_expediente"] = str(
                expediente.id_expediente
            )

        else:
            raise HTTPException(
                status_code=500,
                detail=(
                    "No se ha encontrado la relación del defecto "
                    "con el expediente"
                ),
            )

        valores_validos = {
            clave: valor
            for clave, valor in valores.items()
            if clave in columnas_modelo
        }

        defecto = ExpedienteDefecto(**valores_validos)

        db.add(defecto)
        db.flush()

        sincronizar_campos_compatibilidad(db, expediente)
        registrar_evento_defecto(
            db, expediente, defecto, "CREADO",
            "Defecto registral creado",
            {k: valores.get(k) for k in ("documento", "motivo_defecto", "subtipo_defecto", "fecha_notificacion_registro", "fecha_vencimiento_presentacion") if valores.get(k) is not None},
        )

        db.commit()
        db.refresh(defecto)
        db.refresh(expediente)

        return {
            "ok": True,
            "mensaje": "Defecto registrado correctamente",
            "defecto": datos_defecto(defecto, db, expediente),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        print("ERROR CREANDO DEFECTO:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo registrar el defecto. "
                "Revisa los logs del backend."
            ),
        )


# ============================================================
# DEFECTOS — ACTUALIZAR
# ============================================================

@router.put("/{id_expediente}/defectos/{defecto_id}")
def actualizar_defecto(
    id_expediente: str,
    defecto_id: int,
    datos: DefectoActualizar,
    db: Session = Depends(get_db),
):
    expediente, defecto = obtener_defecto_de_expediente(
        db,
        id_expediente,
        defecto_id,
    )

    valores = datos.dict(exclude_unset=True)

    # Si cambia o se elimina la fecha de calificación, recalcular o limpiar
    # el vencimiento derivado. Si no cambia, conservar la relación existente.
    fecha_calificacion_final = (
        valores["fecha_calificacion"]
        if "fecha_calificacion" in valores
        else getattr(defecto, "fecha_calificacion", None)
    )
    valores["fecha_vencimiento_presentacion"] = _calcular_vencimiento_presentacion(
        fecha_calificacion_final
    )

    valores_anteriores = {
        campo: getattr(defecto, campo, None)
        for campo in valores
    }

    try:
        if "tipo_carga_hipotecaria_id" in valores:
            obtener_tipo_carga_activo(
                db,
                valores["tipo_carga_hipotecaria_id"],
            )

        if "subtipo_defecto_id" in valores:
            subtipo = obtener_subtipo_activo(
                db,
                valores["subtipo_defecto_id"],
            )

            valores["subtipo_defecto"] = (
                subtipo.nombre if subtipo is not None else None
            )

        elif (
            "subtipo_defecto" in valores
            and valores["subtipo_defecto"] is not None
        ):
            valores["subtipo_defecto"] = (
                valores["subtipo_defecto"].strip() or None
            )

        columnas_modelo = {
            columna.name
            for columna in ExpedienteDefecto.__table__.columns
        }

        for campo, valor in valores.items():
            if campo in columnas_modelo:
                setattr(defecto, campo, valor)

        # No permitir fechas de cierre independientes de la fecha
        # de presentación de la subsanación.
        if hasattr(defecto, "fecha_cierre_defecto"):
            defecto.fecha_cierre_defecto = getattr(
                defecto,
                "fecha_entrada_subsanacion",
                None,
            )

        db.flush()

        sincronizar_campos_compatibilidad(db, expediente)
        cambios = {}
        for campo, anterior in valores_anteriores.items():
            nuevo = getattr(defecto, campo, None)
            if str(anterior) != str(nuevo):
                cambios[campo] = {"antes": anterior, "despues": nuevo}
        if cambios:
            registrar_evento_defecto(
                db, expediente, defecto, "ACTUALIZADO",
                "Datos del defecto registral actualizados", cambios,
            )

        db.commit()
        db.refresh(defecto)
        db.refresh(expediente)

        return {
            "ok": True,
            "mensaje": "Defecto actualizado correctamente",
            "defecto": datos_defecto(defecto, db, expediente),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        print("ERROR ACTUALIZANDO DEFECTO:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="No se pudo actualizar el defecto",
        )


# ============================================================
# DEFECTOS — REGISTRAR SUBSANACIÓN
# ============================================================

@router.patch(
    "/{id_expediente}/defectos/{defecto_id}/subsanacion"
)
def registrar_subsanacion_defecto(
    id_expediente: str,
    defecto_id: int,
    fecha_entrada: date,
    db: Session = Depends(get_db),
):
    expediente, defecto = obtener_defecto_de_expediente(
        db,
        id_expediente,
        defecto_id,
    )

    try:
        # Registrar la presentación y cerrar el defecto en la misma fecha.
        defecto.fecha_entrada_subsanacion = fecha_entrada
        defecto.fecha_cierre_defecto = fecha_entrada

        db.flush()

        sincronizar_campos_compatibilidad(db, expediente)

        # Cuando se subsana el último defecto abierto, reanudar automáticamente
        # Tramitación inscripción. Si quedan otros defectos abiertos, mantener
        # la actividad de defectos sin cambios.
        actividad_actual = str(getattr(expediente, "actividad_actual", "") or "").strip().casefold()
        actividad_actualizada = False
        if (
            actividad_actual in ("defectos registrales", "defectos registrales")
            and str(getattr(expediente, "tiene_defectos_abiertos", "") or "").strip().upper() == "NO"
        ):
            expediente.actividad_actual = "Tramitación inscripción"
            actividad_actualizada = True
            # Reaplicar las reglas de reparto de la actividad de destino.
            # Importación local para evitar dependencias circulares al cargar routers.
            from backend.app.expedientes.reparto import asignar_gestor_automaticamente
            asignar_gestor_automaticamente(
                db,
                expediente,
                "tramitacion-inscripcion",
                motivo="subsanacion_defecto",
            )

        registrar_evento_defecto(
            db, expediente, defecto, "SUBSANADO",
            "Subsanación presentada y defecto cerrado",
            {
                "fecha_entrada_subsanacion": fecha_entrada.isoformat(),
                "fecha_cierre_defecto": fecha_entrada.isoformat(),
                "actividad_reanudada": "Tramitación inscripción" if actividad_actualizada else None,
            },
        )

        db.add(expediente)
        db.commit()
        db.refresh(defecto)
        db.refresh(expediente)

        return {
            "ok": True,
            "mensaje": (
                "Subsanación registrada, defecto cerrado y flujo reanudado"
                if actividad_actualizada
                else "Subsanación registrada y defecto cerrado correctamente"
            ),
            "actividad_actualizada": actividad_actualizada,
            "actividad_actual": expediente.actividad_actual,
            "defecto": datos_defecto(defecto, db, expediente),
        }

    except Exception as exc:
        db.rollback()
        print("ERROR REGISTRANDO SUBSANACIÓN:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="No se pudo registrar la subsanación del defecto",
        )


# ============================================================
# DEFECTOS — SUBIR PDF DE CALIFICACIÓN
# ============================================================

@router.post(
    "/{id_expediente}/defectos/{defecto_id}/calificacion"
)
async def subir_calificacion_defecto(
    id_expediente: str,
    defecto_id: int,
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    expediente, defecto = obtener_defecto_de_expediente(
        db,
        id_expediente,
        defecto_id,
    )

    # Limitar la lectura desde el origen para evitar cargar en memoria
    # ficheros arbitrariamente grandes antes de poder rechazarlos.
    nombre = (fichero.filename or "calificacion.pdf").replace("\\", "/").rsplit("/", 1)[-1][:255]

    try:
        contenido = await fichero.read(MAX_PDF_BYTES + 1)
    finally:
        await fichero.close()

    if not nombre.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="El fichero debe tener extensión PDF",
        )

    if not contenido:
        raise HTTPException(
            status_code=400,
            detail="El fichero está vacío",
        )

    if len(contenido) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="El PDF supera el límite de 15 MB",
        )

    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="El contenido recibido no parece ser un PDF válido",
        )

    columnas_modelo = {
        columna.name
        for columna in ExpedienteDefecto.__table__.columns
    }

    if "calificacion_archivo" not in columnas_modelo:
        raise HTTPException(
            status_code=500,
            detail="El modelo no tiene el campo calificacion_archivo",
        )

    campos_archivo = {
        "calificacion_archivo": contenido,
        "calificacion_nombre": nombre,
        "calificacion_content_type": "application/pdf",
        "calificacion_tamano": len(contenido),
        "calificacion_subida_en": datetime.utcnow(),
    }

    try:
        for campo, valor in campos_archivo.items():
            if campo in columnas_modelo:
                setattr(defecto, campo, valor)

        registrar_evento_defecto(
            db, expediente, defecto, "PDF_CALIFICACION",
            "PDF de calificación registral cargado",
            {"nombre": nombre, "tamano": len(contenido)},
        )
        db.commit()
        db.refresh(defecto)
        db.refresh(expediente)

        return {
            "ok": True,
            "mensaje": "PDF de calificación guardado correctamente",
            "defecto": datos_defecto(defecto, db, expediente),
        }

    except Exception as exc:
        db.rollback()
        print("ERROR SUBIENDO CALIFICACIÓN:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail="No se pudo guardar el PDF de calificación",
        )


# ============================================================
# DEFECTOS — DESCARGAR PDF DE CALIFICACIÓN
# ============================================================

@router.get(
    "/{id_expediente}/defectos/{defecto_id}/calificacion"
)
def descargar_calificacion_defecto(
    id_expediente: str,
    defecto_id: int,
    db: Session = Depends(get_db),
):
    _, defecto = obtener_defecto_de_expediente(
        db,
        id_expediente,
        defecto_id,
    )

    contenido = getattr(
        defecto,
        "calificacion_archivo",
        None,
    )

    if not contenido:
        raise HTTPException(
            status_code=404,
            detail=(
                "Este defecto no tiene ningún PDF "
                "de calificación adjunto"
            ),
        )

    nombre = (
        getattr(defecto, "calificacion_nombre", None)
        or f"calificacion_defecto_{defecto_id}.pdf"
    )

    return StreamingResponse(
        BytesIO(contenido),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{quote(nombre)}"
            )
        },
    )

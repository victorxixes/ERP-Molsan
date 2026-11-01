from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Optional, List, Any, Dict
import io
import logging
import json
import unicodedata

import openpyxl
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from fastapi import APIRouter, Query, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import or_, func, and_, text, cast, String
from sqlalchemy.sql.sqltypes import Date, DateTime, Time, Integer, Float, Numeric, Boolean
from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.empleados.models import Empleado
from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.models import (
    Expediente,
    ExpedienteDocumentoEscritura,
    ExpedientePromocion,
)
from backend.app.tipos_expediente.models import TipoExpediente
from backend.app.tipos_expediente.router import asegurar_catalogo_inicial
from backend.app.ctn.models import Notaria
from backend.app.expediente_ppad.models import ExpedientePPAD
from backend.app.honorarios_gestoria.models import HonorarioGestoria
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.expedientes.defectos.models import ExpedienteDefecto
from backend.app.expedientes.gastos.models import ExpedienteGasto
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.expedientes.reparto import (
    asignar_gestor_automaticamente,
    ids_asignaciones_provisionales,
    ids_expedientes_visibles,
    resolver_key_actividad,
    validar_visibilidad_expediente_request,
)


logger = logging.getLogger(__name__)

def aplicar_ambito_reparto(query, db: Session, usuario):
    """Restringe consultas a expedientes cubiertos por reglas activas del usuario."""
    ids_visibles = ids_expedientes_visibles(db, usuario)
    if ids_visibles is None:
        return query
    return query.filter(Expediente.id.in_(ids_visibles))

def validar_ambito_reparto_ruta(
    request: Request,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Compatibilidad con el nombre histórico; usa la comprobación compartida."""
    return validar_visibilidad_expediente_request(request, db, usuario)

setattr(validar_ambito_reparto_ruta, "_molsan_visibilidad_guard", True)


router = APIRouter(
    prefix="/expedientes",
    tags=["Expedientes"],
    dependencies=[Depends(validar_ambito_reparto_ruta)],
)


# ============================================================
# CONFIGURACIÓN PERSISTENTE DE VISIBILIDAD POR ACTIVIDAD
# ============================================================

ACTIVIDADES_VISIBILIDAD = [
    {"key": "documentacion-previa", "label": "Documentación general y previa"},
    {"key": "sede-notarial", "label": "Sede notarial"},
    {"key": "sede-notarial-protocolo", "label": "Sede notarial con protocolo"},
    {"key": "gestion-economica", "label": "Gestión económica"},
    {"key": "liquidacion-impuestos", "label": "Liquidación de impuestos"},
    {"key": "tramitacion-inscripcion", "label": "Tramitación inscripción"},
    {"key": "defectos-registrales", "label": "Defectos registrales"},
    {"key": "facturacion-cierre", "label": "Cierre del expediente"},
]

REPOSITORIOS_VISIBILIDAD = [
    {"key": "documentos_absis", "label": "Documentos ABSIS", "categoria": "Documentos Absis"},
    {"key": "hoja_encargo_firmada", "label": "Hoja de encargo firmada", "categoria": "Hoja de Encargo firmada"},
    {"key": "justificante_cancelacion", "label": "Justificante de cancelación", "categoria": "Justificante de cancelación"},
    {"key": "nota_simple_registral", "label": "Nota simple registral", "categoria": "Nota simple registral"},
    {"key": "borradores_escritura", "label": "Borradores escrituras", "categoria": "Borradores escrituras"},
    {"key": "hoja_presentacion_documentos", "label": "Hoja de presentación", "categoria": "Hoja de presentación"},
    {"key": "copia_simple_documentos", "label": "Copia simple", "categoria": "Copia simple"},
    {"key": "ajd_itp_documentos", "label": "AJD / ITP", "categoria": "AJD/ITP"},
    {"key": "otros_impuestos_documentos", "label": "Otros impuestos", "categoria": "Otros impuestos"},
    {"key": "hoja_inscripcion_documentos", "label": "Hoja de inscripción", "categoria": "Hoja de Inscripción"},
    {"key": "factura_registro_documentos", "label": "Factura registro", "categoria": "Factura registro"},
    {"key": "defecto_registral", "label": "Defecto registral", "categoria": "Defecto registral"},
    {"key": "subsanacion_defecto", "label": "Subsanación del defecto", "categoria": "Subsanación del defecto"},
    {"key": "expediente_digital_completo_documentos", "label": "Expediente digital completo", "categoria": "Expediente digital completo"},
    {"key": "factura_notarial_documentos", "label": "Factura notarial", "categoria": "Factura notarial"},
    {"key": "factura_registral_documentos", "label": "Factura registral", "categoria": "Factura Registral"},
    {"key": "factura_impuestos_documentos", "label": "Factura impuestos", "categoria": "Factura impuestos"},
    {"key": "honorarios_gestoria_documentos", "label": "Honorarios de gestoría", "categoria": "Honorarios gestoría"},
    {"key": "otra_documentacion", "label": "Otra documentación", "categoria": "Otra documentación"},
    {"key": "emails_oficina", "label": "Emails de oficina", "categoria": "Mails de la Oficina"},
    {"key": "otros_documentos", "label": "Otros", "categoria": "Otros"},
]


def _asegurar_tabla_visibilidad(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS public.expediente_visibilidad_config (
            empleado_id INTEGER NOT NULL DEFAULT 0,
            actividad_key VARCHAR(80) NOT NULL,
            actividad_label VARCHAR(160) NOT NULL,
            nombre_tabla VARCHAR(200) NOT NULL DEFAULT '',
            excel_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
            repositorios JSONB NOT NULL DEFAULT '[]'::jsonb,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ambito VARCHAR(20) NOT NULL DEFAULT 'administracion',
            CONSTRAINT expediente_visibilidad_config_pkey_emp_actividad_ambito PRIMARY KEY (empleado_id, actividad_key, ambito)
        )
    """))
    db.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'expediente_visibilidad_config'
                  AND column_name = 'empleado_id'
            ) THEN
                ALTER TABLE public.expediente_visibilidad_config
                    ADD COLUMN empleado_id INTEGER NOT NULL DEFAULT 0;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'expediente_visibilidad_config'
                  AND column_name = 'ambito'
            ) THEN
                ALTER TABLE public.expediente_visibilidad_config
                    ADD COLUMN ambito VARCHAR(20) NOT NULL DEFAULT 'administracion';
            END IF;
            IF EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.expediente_visibilidad_config'::regclass
                  AND conname IN ('expediente_visibilidad_config_pkey', 'expediente_visibilidad_config_pkey_emp_actividad')
            ) THEN
                ALTER TABLE public.expediente_visibilidad_config
                    DROP CONSTRAINT IF EXISTS expediente_visibilidad_config_pkey;
                ALTER TABLE public.expediente_visibilidad_config
                    DROP CONSTRAINT IF EXISTS expediente_visibilidad_config_pkey_emp_actividad;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.expediente_visibilidad_config'::regclass
                  AND conname = 'expediente_visibilidad_config_pkey_emp_actividad_ambito'
            ) THEN
                ALTER TABLE public.expediente_visibilidad_config
                    ADD CONSTRAINT expediente_visibilidad_config_pkey_emp_actividad_ambito
                    PRIMARY KEY (empleado_id, actividad_key, ambito);
            END IF;
        END $$;
    """))
    db.commit()


def _configuraciones_visibilidad(db: Session, empleado_id: int = 0, ambito: str = "administracion"):
    """Devuelve configuración administrativa, personal o efectiva por actividad."""
    _asegurar_tabla_visibilidad(db)
    filas = db.execute(text("""
        SELECT empleado_id, actividad_key, actividad_label, nombre_tabla,
               excel_columns, repositorios, actualizado_en, ambito
        FROM public.expediente_visibilidad_config
        WHERE empleado_id IN (0, :empleado_id)
          AND ambito IN ('administracion', 'personal')
        ORDER BY empleado_id ASC, CASE WHEN ambito = 'administracion' THEN 0 ELSE 1 END ASC
    """), {"empleado_id": int(empleado_id or 0)}).mappings().all()

    por_actividad = {}
    administracion_por_actividad = {}
    for fila in filas:
        es_personal = fila["ambito"] == "personal"
        if ambito == "administracion" and es_personal:
            continue
        # Prioridad administrativa: configuración del empleado antes que la global.
        clave = fila["actividad_key"]
        prioridad_admin = 2 if fila["empleado_id"] != 0 else 1
        if not es_personal:
            admin_actual = administracion_por_actividad.get(clave)
            if not admin_actual or admin_actual["_prioridad"] <= prioridad_admin:
                administracion_por_actividad[clave] = {
                    "excel_columns": fila["excel_columns"] or [],
                    "repositorios": fila["repositorios"] or [],
                    "_prioridad": prioridad_admin,
                }

        # La configuración personal prevalece sobre la administrativa para ese empleado.
        actual = por_actividad.get(clave)
        prioridad = 3 if es_personal else prioridad_admin
        if actual and actual["_prioridad"] > prioridad:
            continue
        por_actividad[clave] = {
            "empleado_id": fila["empleado_id"],
            "actividad_key": clave,
            "actividad_label": fila["actividad_label"],
            "nombre_tabla": fila["nombre_tabla"],
            "excel_columns": fila["excel_columns"] or [],
            "repositorios": fila["repositorios"] or [],
            "actualizado_en": fila["actualizado_en"].isoformat() if fila["actualizado_en"] else None,
            "ambito": fila["ambito"],
            "_prioridad": prioridad,
        }

    resultado = []
    for clave, item in por_actividad.items():
        # Si el administrador retira una opción después de que el empleado haya
        # personalizado su vista, la preferencia personal se limita automáticamente.
        if item["ambito"] == "personal" and ambito in {"personal", "efectiva"}:
            base_admin = administracion_por_actividad.get(clave)
            if base_admin:
                columnas_admin = set(base_admin["excel_columns"])
                repositorios_admin = set(base_admin["repositorios"])
                item["excel_columns"] = [key for key in item["excel_columns"] if key in columnas_admin]
                item["repositorios"] = [key for key in item["repositorios"] if key in repositorios_admin]
        item.pop("_prioridad", None)
        resultado.append(item)
    return resultado


def _usuario_es_admin_visibilidad(usuario) -> bool:
    """Reconoce la cuenta técnica admin o un rol cuyo nombre sea administrador."""
    nombre_usuario = str(getattr(usuario, "usuario", "") or "").strip().lower()
    if nombre_usuario == "admin" or getattr(usuario, "rol_id", None) == 0:
        return True
    rol = getattr(usuario, "rol", None)
    nombre_rol = (
        getattr(rol, "nombre", None)
        or getattr(rol, "name", None)
        or getattr(usuario, "rol_nombre", None)
        or getattr(usuario, "nombre_rol", None)
        or ""
    )
    nombre_rol = str(nombre_rol).strip().lower()
    return nombre_rol in {"admin", "administrador", "administrator"}


@router.get("/configuracion-visibilidad")
def obtener_configuracion_visibilidad(
    empleado_id: Optional[int] = Query(None),
    ambito: str = Query("administracion", regex="^(administracion|personal|efectiva)$"),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Catálogo de columnas, repositorios y configuración del ámbito solicitado."""
    id_empleado_sesion = int(getattr(usuario, "empleado_id", None) or usuario.id)
    objetivo = int(empleado_id if empleado_id is not None else id_empleado_sesion)
    es_admin = _usuario_es_admin_visibilidad(usuario)

    if ambito == "personal" and objetivo != id_empleado_sesion:
        raise HTTPException(status_code=403, detail="Solo puedes consultar tu propia configuración personal.")
    if objetivo != id_empleado_sesion and not es_admin:
        from backend.app.auth.permissions import require_perm_modulo
        require_perm_modulo(usuario, "seguridad", "editar")

    return {
        "actividades": ACTIVIDADES_VISIBILIDAD,
        "columnas_excel": [
            {"key": atributo, "label": cabecera}
            for cabecera, atributo in COLUMNAS_EXCEL
        ],
        "repositorios": REPOSITORIOS_VISIBILIDAD,
        "configuraciones": _configuraciones_visibilidad(db, objetivo, ambito),
        "configuraciones_administrativas": _configuraciones_visibilidad(db, objetivo, "administracion"),
    }


@router.put("/configuracion-visibilidad")
def guardar_configuracion_visibilidad(
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    from backend.app.auth.permissions import require_perm_modulo
    es_admin = _usuario_es_admin_visibilidad(usuario)
    id_empleado_sesion = int(getattr(usuario, "empleado_id", None) or usuario.id)
    ambito = str(datos.get("ambito") or "administracion").strip().lower()
    if ambito not in {"administracion", "personal"}:
        raise HTTPException(status_code=422, detail="Ámbito de configuración no válido.")

    empleado_id = int(datos.get("empleado_id") or id_empleado_sesion)
    if ambito == "personal":
        if empleado_id != id_empleado_sesion:
            raise HTTPException(status_code=403, detail="Solo puedes guardar tu propia configuración personal.")
    else:
        if not es_admin:
            require_perm_modulo(usuario, "seguridad", "editar")
        if empleado_id == 0 and not es_admin:
            raise HTTPException(status_code=403, detail="No puedes modificar la configuración general.")
    actividad_key = str(datos.get("actividad_key") or "").strip()
    actividad = next((item for item in ACTIVIDADES_VISIBILIDAD if item["key"] == actividad_key), None)
    if not actividad:
        raise HTTPException(status_code=422, detail="Actividad no válida.")

    columnas_validas = {atributo for _, atributo in COLUMNAS_EXCEL}
    repositorios_validos = {item["key"] for item in REPOSITORIOS_VISIBILIDAD}
    columnas = datos.get("excel_columns")
    repositorios = datos.get("repositorios")
    if not isinstance(columnas, list) or not isinstance(repositorios, list):
        raise HTTPException(status_code=422, detail="Las columnas Excel y los repositorios deben ser listas.")
    if any(not isinstance(item, str) or item not in columnas_validas for item in columnas):
        raise HTTPException(status_code=422, detail="La configuración contiene columnas Excel no reconocidas.")
    if any(not isinstance(item, str) or item not in repositorios_validos for item in repositorios):
        raise HTTPException(status_code=422, detail="La configuración contiene repositorios no reconocidos.")

    # Las preferencias personales solo pueden reducir la selección administrativa,
    # nunca activar columnas o repositorios que el administrador no haya habilitado.
    if ambito == "personal":
        configuracion_admin = next(
            (item for item in _configuraciones_visibilidad(db, empleado_id, "administracion")
             if item["actividad_key"] == actividad_key),
            None,
        )
        if configuracion_admin:
            columnas_admin = set(configuracion_admin.get("excel_columns") or [])
            repositorios_admin = set(configuracion_admin.get("repositorios") or [])
            if not set(columnas).issubset(columnas_admin):
                raise HTTPException(status_code=403, detail="Solo puedes seleccionar columnas habilitadas por el administrador.")
            if not set(repositorios).issubset(repositorios_admin):
                raise HTTPException(status_code=403, detail="Solo puedes seleccionar repositorios habilitados por el administrador.")

    nombre_tabla = str(datos.get("nombre_tabla") or "").strip()[:200]
    if not nombre_tabla:
        raise HTTPException(status_code=422, detail="Indica el nombre de la tabla Excel.")
    # Mantener el orden elegido por el usuario y evitar claves repetidas.
    columnas = list(dict.fromkeys(columnas))
    repositorios = list(dict.fromkeys(repositorios))

    try:
        _asegurar_tabla_visibilidad(db)
        db.execute(text("""
            INSERT INTO public.expediente_visibilidad_config
                (empleado_id, actividad_key, actividad_label, nombre_tabla, excel_columns, repositorios, actualizado_en, ambito)
            VALUES
                (:empleado_id, :actividad_key, :actividad_label, :nombre_tabla,
                 CAST(:excel_columns AS jsonb), CAST(:repositorios AS jsonb), CURRENT_TIMESTAMP, :ambito)
            ON CONFLICT (empleado_id, actividad_key, ambito) DO UPDATE SET
                actividad_label = EXCLUDED.actividad_label,
                nombre_tabla = EXCLUDED.nombre_tabla,
                excel_columns = EXCLUDED.excel_columns,
                repositorios = EXCLUDED.repositorios,
                actualizado_en = CURRENT_TIMESTAMP
        """), {
            "empleado_id": empleado_id,
            "ambito": ambito,
            "actividad_key": actividad_key,
            "actividad_label": actividad["label"],
            "nombre_tabla": nombre_tabla,
            "excel_columns": json.dumps(columnas, ensure_ascii=False),
            "repositorios": json.dumps(repositorios, ensure_ascii=False),
        })
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("No se pudo guardar la configuración de visibilidad")
        raise HTTPException(status_code=500, detail="No se pudo guardar la configuración de visibilidad.")

    return {
        "ok": True,
        "empleado_id": empleado_id,
        "ambito": ambito,
        "actividad_key": actividad_key,
        "actividad_label": actividad["label"],
        "nombre_tabla": nombre_tabla,
        "excel_columns": columnas,
        "repositorios": repositorios,
    }



@router.post("/migraciones/actividades")
def migrar_campos_workflow_actividades(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Migración idempotente, reservada a usuarios con permiso administrativo."""
    from backend.app.auth.permissions import require_perm_modulo
    require_perm_modulo(usuario, "seguridad", "editar")
    columnas = {
        "fecha_envio": "DATE",
        "asiento_presentacion_libro_diario": "VARCHAR(300)",
        "fecha_presentacion": "DATE",
        "numero_entrada": "VARCHAR(200)",
        "fecha_recogida_notario_presentacion_telematica": "DATE",
        "copia_simple_escritura": "VARCHAR(500)",
        "fecha_presentacion_tributaria": "DATE",
        "fecha_liquidacion_tributaria": "DATE",
        "oficina_liquidadora": "VARCHAR(200)",
        "base_imponible": "DOUBLE PRECISION",
        "tributacion": "VARCHAR(100)",
        "impuesto_ajd_itp": "VARCHAR(20)",
        "fecha_vencimiento_asiento": "DATE",
        "escritura_simple_cancelacion": "VARCHAR(500)",
        # Campos usados por el formulario y el listado de actividades.
        "ultima_accion": "VARCHAR(500)",
        "fecha_ultima_accion": "DATE",
        "sol": "VARCHAR(100)",
        "cs": "VARCHAR(100)",
        "ns": "VARCHAR(100)",
        "promocion": "VARCHAR(300)",
    }
    try:
        for nombre, tipo_sql in columnas.items():
            db.execute(text(f"ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS {nombre} {tipo_sql}"))
        db.commit()
        return {"ok": True, "mensaje": "Migración de actividades completada.", "columnas_creadas_o_verificadas": list(columnas.keys())}
    except Exception as exc:
        db.rollback()
        logger.exception("Error al aplicar la migración de actividades de expedientes")
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar la migración de actividades. Consulta los logs del backend.",
        ) from exc


@router.post("/reparto/asignar-pendientes")
def asignar_gestores_a_expedientes_pendientes(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Asigna gestor por reglas activas a expedientes sin gestor; conserva asignaciones existentes."""
    from collections import Counter
    from backend.app.auth.permissions import require_perm_modulo

    require_perm_modulo(usuario, "seguridad", "editar")
    expedientes = (
        db.query(Expediente)
        .filter(
            or_(
                Expediente.gestor_asignado_id.is_(None),
                Expediente.gestor_asignado_id == 0,
            )
        )
        .order_by(Expediente.id)
        .all()
    )
    por_actividad = Counter()
    sin_regla = Counter()
    asignaciones = []
    try:
        for expediente in expedientes:
            actividad_key = resolver_key_actividad(
                expediente.actividad_actual,
                expediente.fecha_firma,
            )
            if not actividad_key:
                sin_regla[str(expediente.actividad_actual or "Sin actividad")] += 1
                continue
            gestor_id = asignar_gestor_automaticamente(
                db,
                expediente,
                actividad_key,
                "reparto_inicial_pendientes",
            )
            if not gestor_id:
                sin_regla[actividad_key] += 1
                continue
            gestor = db.query(Empleado).filter(Empleado.id == gestor_id).first()
            nombre_gestor = " ".join(filter(None, [
                getattr(gestor, "nombre", None),
                getattr(gestor, "apellidos", None),
            ])).strip() if gestor else None
            por_actividad[actividad_key] += 1
            asignaciones.append({
                "numero_expediente": expediente.id_expediente,
                "actividad": expediente.actividad_actual,
                "gestor_id": gestor_id,
                "gestor": nombre_gestor,
            })
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception("Error al asignar gestores a expedientes pendientes")
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar el reparto inicial de gestores. Consulta los logs del backend.",
        ) from exc

    return {
        "ok": True,
        "mensaje": "Reparto inicial completado. Las asignaciones existentes se han conservado.",
        "revisados": len(expedientes),
        "asignados": len(asignaciones),
        "sin_regla_compatible": sum(sin_regla.values()),
        "asignados_por_actividad": dict(por_actividad),
        "pendientes_por_actividad_o_motivo": dict(sin_regla),
        "detalle_asignaciones": asignaciones,
    }


# ============================================================
# DOCUMENTACIÓN PREVIA: REQUISITOS
# ============================================================

DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA = [
    "Hoja de Encargo firmada",
    "Justificante de cancelación",
    "Nota simple registral",
]


def documentos_pendientes_documentacion_previa(
    db: Session,
    id_expediente: str,
) -> list[str]:
    """
    Comprueba las categorías obligatorias existentes en la
    carpeta digital del expediente.

    Se considera presente una categoría cuando existe al menos
    un registro documental asociado a ella.
    """
    encontrados = (
        db.query(DocumentoCarpetaDigital.categoria)
        .filter(
            DocumentoCarpetaDigital.expediente_id == str(id_expediente),
            DocumentoCarpetaDigital.categoria.in_(
                DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
            ),
        )
        .distinct()
        .all()
    )

    categorias_guardadas = {
        categoria
        for (categoria,) in encontrados
    }

    return [
        categoria
        for categoria in DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
        if categoria not in categorias_guardadas
    ]


def envio_notario_guardado(expediente: Expediente) -> bool:
    """
    Comprueba que el expediente contiene los datos básicos
    necesarios para considerar guardado el envío a notario.
    """
    return bool(
        expediente.fecha_envio_notario
        and expediente.fecha_solicitud_pnc
        and expediente.numero_solicitud_pnc
        and expediente.numero_solicitud_pnc.strip()
        and expediente.nombre_notario
        and expediente.nombre_notario.strip()
    )


# ============================================================
# MODELO DE DATOS: ENVÍO A NOTARIO
# ============================================================

class DocumentoEscrituraRequest(BaseModel):
    tipo_documento: str
    cuantia: Optional[float] = None


class EnvioANotarioRequest(BaseModel):
    escritura_firmada: bool = False

    fecha_envio: date
    # PNC se completa desde ApoderaGest después de asignar el encargo.
    fecha_solicitud_pnc: Optional[date] = None
    numero_solicitud_pnc: Optional[str] = None

    fecha_firma: Optional[date] = None
    protocolo: Optional[str] = None

    notario_id: Optional[int] = None
    nombre_notario: str
    nif_notario: Optional[str] = None
    notario: Optional[str] = None

    apoderado: Optional[str] = None

    tipo_firma: str
    tipo_documento: str
    documentos_escritura: Optional[List[DocumentoEscrituraRequest]] = None

    # Alias compatible con el modal frontend que envía "documentos".
    documentos: Optional[List[DocumentoEscrituraRequest]] = None
    cuantia: Optional[float] = None

    # Datos de operación que se muestran en el envío a notario.
    contrato: Optional[str] = None
    capital: Optional[float] = None
    capital_documento_notarial: Optional[float] = None
    tipo_operacion: Optional[str] = None
    subtipo_operacion: Optional[str] = None
    importe: Optional[float] = None

    idioma_documento: Optional[str] = None
    formato_escritura: Optional[str] = None
    tipo_tramite: Optional[str] = None

    poblacion: Optional[str] = None
    provincia: Optional[str] = None

    fecha_prevista_firma: Optional[date] = None
    hora_prevista_firma: Optional[time] = time(9, 0)
    hora_fin_prevista_firma: Optional[time] = None
    firma_urgente: bool = False

    # DATOS DE FACTURACIÓN DEL EXPEDIENTE
    facturacion_nombre: Optional[str] = None
    facturacion_apellidos: Optional[str] = None
    facturacion_dni_nif: Optional[str] = None
    facturacion_direccion: Optional[str] = None
    facturacion_codigo_postal: Optional[str] = None
    facturacion_poblacion: Optional[str] = None
    facturacion_provincia: Optional[str] = None
    facturacion_telefono: Optional[str] = None
    facturacion_email: Optional[str] = None
    facturacion_empleado: bool = False


# ============================================================
# ACTIVIDADES DEL EXPEDIENTE
# ============================================================

ACTIVIDADES_EXPEDIENTES = [
    {
        "key": "documentacion-previa",
        "label": "Documentación previa",
        "aliases": [
            "Documentación previa",
            "Documentacion previa",
        ],
    },
    {
        "key": "sede-notarial",
        "label": "Sede notarial",
        "aliases": [
            "Sede notarial",
            "Sede Notarial",
            "Sede NOTARIAL",
            "Sede notarial sin protocolo",
            "Sede Notarial sin protocolo",
        ],
    },
    {
        "key": "sede-notarial-protocolo",
        "label": "Sede notarial con protocolo",
        "aliases": [
            "Sede notarial con protocolo",
            "Sede Notarial con protocolo",
            "Sede NOTARIAL con protocolo",
        ],
    },
    {
        "key": "gestion-economica",
        "label": "Gestión económica",
        "aliases": ["Gestión económica", "Gestion economica"],
    },
    {
        "key": "liquidacion-impuestos",
        "label": "Liquidación de impuestos",
        "aliases": [
            "Liquidación de impuestos",
            "Liquidacion de impuestos",
            "Liquidación impuestos",
            "Liquidacion impuestos",
        ],
    },
    {
        "key": "tramitacion-inscripcion",
        "label": "Tramitación inscripción",
        "aliases": [
            "Tramitación inscripción",
            "Tramitacion inscripcion",
            "Tramitación de inscripción",
            "Tramitacion de inscripcion",
        ],
    },
    {
        "key": "defectos-registrales",
        "label": "Defectos registrales",
        "aliases": [
            "Defectos registrales",
            "Defectos Registrales",
        ],
    },
    {
        "key": "facturacion-cierre",
        "label": "Facturación y cierre",
        "aliases": [
            "Facturación y cierre",
            "Facturacion y cierre",
            "Cierre del expediente",
        ],
    },
]


def normalizar_actividad_texto(valor: Optional[str]) -> str:
    if valor is None:
        return ""

    texto = unicodedata.normalize(
        "NFD",
        str(valor).strip().lower(),
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )

    return " ".join(texto.split())


def resolver_actividad(valor: Optional[str]) -> Optional[str]:
    normalizada = normalizar_actividad_texto(valor)

    if not normalizada:
        return None

    for actividad in ACTIVIDADES_EXPEDIENTES:
        valores = [
            actividad["key"],
            actividad["label"],
            *actividad["aliases"],
        ]

        if any(
            normalizada == normalizar_actividad_texto(item)
            for item in valores
        ):
            return actividad["key"]

    return None


def condicion_actividad(clave_actividad: str):
    actividad = func.trim(Expediente.actividad_actual)

    if clave_actividad == "documentacion-previa":
        return or_(
            actividad.ilike("Documentación previa"),
            actividad.ilike("Documentacion previa"),
        )

    if clave_actividad == "sede-notarial":
        return and_(
            or_(
                actividad.ilike("Sede notarial"),
                actividad.ilike("Sede Notarial"),
                actividad.ilike("Sede notarial sin protocolo"),
                actividad.ilike("Sede Notarial sin protocolo"),
            ),
            Expediente.fecha_firma.is_(None),
        )

    if clave_actividad == "sede-notarial-protocolo":
        return and_(
            or_(
                actividad.ilike("Sede notarial"),
                actividad.ilike("Sede Notarial"),
                actividad.ilike("Sede notarial con protocolo"),
                actividad.ilike("Sede Notarial con protocolo"),
            ),
            Expediente.fecha_firma.isnot(None),
        )

    if clave_actividad == "gestion-economica":
        return or_(
            actividad.ilike("Gestión económica"),
            actividad.ilike("Gestion economica"),
        )

    if clave_actividad == "liquidacion-impuestos":
        return or_(
            actividad.ilike("Liquidación de impuestos"),
            actividad.ilike("Liquidacion de impuestos"),
            actividad.ilike("Liquidación impuestos"),
            actividad.ilike("Liquidacion impuestos"),
        )

    if clave_actividad == "tramitacion-inscripcion":
        return or_(
            actividad.ilike("Tramitación inscripción"),
            actividad.ilike("Tramitacion inscripcion"),
            actividad.ilike("Tramitación de inscripción"),
            actividad.ilike("Tramitacion de inscripcion"),
        )

    if clave_actividad == "defectos-registrales":
        return or_(
            actividad.ilike("Defectos registrales"),
            actividad.ilike("Defectos Registrales"),
        )

    if clave_actividad == "facturacion-cierre":
        return or_(
            actividad.ilike("Facturación y cierre"),
            actividad.ilike("Facturacion y cierre"),
            actividad.ilike("Cierre del expediente"),
        )

    return None


# ============================================================
# CAMPOS DEVUELTOS POR LA API
# ============================================================

CAMPOS_EXPEDIENTE = [
    "id",
    "cliente_id",
    "id_expediente",
    "promocion",
    "tipo_expediente_id",
    "numero_tipo_expediente",
    "promocion_tipo_expediente_id",    "notario_id",
    "apoderado_empleado_id",
    "gestor_asignado_id",
    "estado_expediente",
    "estado_expediente_ancert",
    "liquidado_sin_tramitar",
    "fecha_liquidacion_sin_tramitar",
    "cambio_gestoria",
    "fecha_cambio_gestoria",
    "bloqueo_manual",
    "motivo_bloqueo",
    "fecha_bloqueo",

    "fecha_alta",
    "fecha_firma",
    "fecha_inscripcion",
    "fecha_entregado_cliente",
    "fecha_prevista_firma",
    "fecha_vencimiento",
    "fecha_sol_cgn",
    "fecha_firma_prev_val",
    "fecha_firma_prev_cli",
    "fecha_inicio_actividad",
    "fecha_fin_actividad",

    "fecha_envio_notario",
    "fecha_envio",
    "notargest_estado",
    "notargest_fecha_cierre",
    "notargest_fecha_envio_gestoria",
    "notario_otorgante",
    "fecha_solicitud_pnc",
    "numero_solicitud_pnc",
    "escritura_firmada",
    "hora_prevista_firma",
    "hora_fin_prevista_firma",
    "firma_urgente",
    "asiento_presentacion_libro_diario",
    "asiento_presentacion",
    "libro_diario",
    "tipo_gestoria",
    "fecha_presentacion",
    "numero_entrada",
    "fecha_recogida_notario_presentacion_telematica",
    "copia_simple_escritura",
    "fecha_presentacion_tributaria",
    "fecha_liquidacion_tributaria",
    "oficina_liquidadora",
    "base_imponible",
    "tributacion",
    "impuesto_ajd_itp",
    "fecha_vencimiento_asiento",
    "escritura_simple_cancelacion",

    "nombre_titular",
    "nif_titular",
    "nombre_solicitante",
    "nif_solicitante",
    "apoderado",

    "nombre_notario",
    "nif_notario",
    "notario",

    "tipo_firma",
    "tipo_documento",
    "idioma_documento",
    "formato_escritura",
    "tipo_tramite",
    "poblacion",
    "provincia",

    "oficina",
    "dan",
    "oficina_alta",

    "capital",
    "capital_documento_notarial",
    "importe",
    "saldo_real",
    "saldo_disponible",
    "id_provision",
    "tipo_provision",

    "contrato",
    "num_solicitud_sia",
    "tipo_operacion",
    "subtipo_operacion",
    "vinccanc",
    "protocolo",
    "origen_bankia",
    "producto_gtg",
    "dt",

    "actividad_actual",
    "estado_actividad",
    "id_gestoria_tramite",
    "nombre_gestoria",
    "gestoria",
    "finca",

    "tiene_defectos_abiertos",
    "tipo_error",
    "descripcion_error",
    "falta_defecto",
    "fcierre_defecto",

    "id_expediente_cgn",
    "tipo_acta",
    "lucy",
    "indicador_tt",
    "observaciones",

    "facturacion_nombre",
    "facturacion_apellidos",
    "facturacion_dni_nif",
    "facturacion_direccion",
    "facturacion_codigo_postal",
    "facturacion_poblacion",
    "facturacion_provincia",
    "facturacion_telefono",
    "facturacion_email",
    "facturacion_estado",
    "facturacion_fecha",

    "registral_estado",
    "registral_fecha",

    # Campos del flujo de actividades (si existen en el modelo).
    "ultima_accion",
    "fecha_ultima_accion",
    "sol",
    "cs",
    "ns",
    "asiento_presentacion_libro_diario",
    "numero_entrada",
    "fecha_recogida_notario_presentacion_telematica",
    "copia_simple_escritura",
    "fecha_presentacion_tributaria",
    "fecha_liquidacion_tributaria",
    "oficina_liquidadora",
    "base_imponible",
    "tributacion",
    "impuesto_ajd_itp",
    "fecha_vencimiento_asiento",
    "escritura_simple_cancelacion",
]


# Ordenación segura del listado: permitir todas las columnas reales del modelo
# y no depender de una lista manual que puede quedarse desactualizada.
COLUMNAS_ORDENABLES = {
    columna.key: getattr(Expediente, columna.key)
    for columna in Expediente.__table__.columns
    if hasattr(Expediente, columna.key)
}


# ============================================================
# COLUMNAS DEL EXCEL
# ============================================================

COLUMNAS_EXCEL = [
    ("ID", "id"),
    ("CLIENTEID", "cliente_id"),
    ("IDEXPEDIENTE", "id_expediente"),
    ("ESTADOEXPEDIENTE", "estado_expediente"),
    ("ESTADOEXPEDIENTEANCERT", "estado_expediente_ancert"),

    ("FECHAALTA", "fecha_alta"),
    ("FECHAFIRMA", "fecha_firma"),
    ("FECHAINSCRIPCION", "fecha_inscripcion"),
    ("FECHAENTREGADOCLIENTE", "fecha_entregado_cliente"),
    ("FECHAPREVISTAFIRMA", "fecha_prevista_firma"),
    ("FECHAVENCIMIENTO", "fecha_vencimiento"),
    ("FECHASOLCGN", "fecha_sol_cgn"),
    ("FECHAFIRMAPREVVAL", "fecha_firma_prev_val"),
    ("FECHAFIRMAPREVCLI", "fecha_firma_prev_cli"),
    ("FECHAINICIOACTIVIDAD", "fecha_inicio_actividad"),
    ("FECHAFINACTIVIDAD", "fecha_fin_actividad"),
    ("FECHAENVIONOTARIO", "fecha_envio_notario"),
    ("FECHAENVIO", "fecha_envio"),
    ("ASIENTOPRESENTACIONLIBRODIARIO", "asiento_presentacion_libro_diario"),
    ("FECHAPRESENTACION", "fecha_presentacion"),
    ("NUMEROENTRADA", "numero_entrada"),
    ("FECHARECOGIDANOTARIOPRESENTACIONTELEMATICA", "fecha_recogida_notario_presentacion_telematica"),
    ("COPIASIMPLEESCRITURA", "copia_simple_escritura"),
    ("FECHAPRESENTACIONTRIBUTARIA", "fecha_presentacion_tributaria"),
    ("FECHALIQUIDACIONTRIBUTARIA", "fecha_liquidacion_tributaria"),
    ("OFICINALIQUIDADORA", "oficina_liquidadora"),
    ("BASEIMPONIBLE", "base_imponible"),
    ("TRIBUTACION", "tributacion"),
    ("IMPUESTOAJDITP", "impuesto_ajd_itp"),
    ("FECHAVENCIMIENTOASIENTO", "fecha_vencimiento_asiento"),
    ("HORAPREVISTAFIRMA", "hora_prevista_firma"),
    ("HORAFINPREVISTAFIRMA", "hora_fin_prevista_firma"),
    ("NOTARIOOTORGANTE", "notario_otorgante"),
    ("CAPITALDOCUMENTONOTARIAL", "capital_documento_notarial"),
    ("FECHASOLICITUDPNC", "fecha_solicitud_pnc"),
    ("NUMEROSOLICITUDPNC", "numero_solicitud_pnc"),

    ("NOMBRETITULAR", "nombre_titular"),
    ("NIFTITULAR", "nif_titular"),
    ("NOMBRESOLICITANTE", "nombre_solicitante"),
    ("NIFSOLICITANTE", "nif_solicitante"),
    ("APODERADO", "apoderado"),

    ("NOMBRENOTARIO", "nombre_notario"),
    ("NIFNOTARIO", "nif_notario"),
    ("NOTARIO", "notario"),

    ("TIPOFIRMA", "tipo_firma"),
    ("TIPODOCUMENTO", "tipo_documento"),
    ("IDIOMADOCUMENTO", "idioma_documento"),
    ("FORMATOESCRITURA", "formato_escritura"),
    ("TIPOTRAMITE", "tipo_tramite"),
    ("POBLACION", "poblacion"),
    ("PROVINCIA", "provincia"),

    ("OFICINA", "oficina"),
    ("DAN", "dan"),
    ("OFICINAALTA", "oficina_alta"),

    ("CAPITAL", "capital"),
    ("IMPORTE", "importe"),
    ("SALDOREAL", "saldo_real"),
    ("SALDODISPONIBLE", "saldo_disponible"),
    ("IDPROVISION", "id_provision"),
    ("TIPOPROVISION", "tipo_provision"),

    ("CONTRATO", "contrato"),
    ("NUMSOLICITUDSIA", "num_solicitud_sia"),
    ("TIPOOPERACION", "tipo_operacion"),
    ("SUBTIPOOPERACION", "subtipo_operacion"),
    ("VINCCANC", "vinccanc"),
    ("PROTOCOLO", "protocolo"),
    ("ORIGENBANKIA", "origen_bankia"),
    ("PRODUCTOGTG", "producto_gtg"),
    ("DT", "dt"),

    ("ACTIVIDADACTUAL", "actividad_actual"),
    ("ESTADOACTIVIDAD", "estado_actividad"),
    ("ULTIMAACCION", "ultima_accion"),
    ("FECHAULTIMAACCION", "fecha_ultima_accion"),
    ("SOL", "sol"),
    ("CS", "cs"),
    ("NS", "ns"),
    ("IDGESTORIATRAMITE", "id_gestoria_tramite"),
    ("NOMBREGESTORIA", "nombre_gestoria"),
    ("GESTORIA", "gestoria"),
    ("FINCA", "finca"),

    ("TIENEDEFECTOSABIERTOS", "tiene_defectos_abiertos"),
    ("TIPOERROR", "tipo_error"),
    ("DESCRIPCIONERROR", "descripcion_error"),
    ("FALTADEFECTO", "falta_defecto"),
    ("FCIERREDEFECTO", "fcierre_defecto"),

    ("IDEXPEDIENTECGN", "id_expediente_cgn"),
    ("TIPOACTA", "tipo_acta"),
    ("LUCY", "lucy"),
    ("INDICADORTT", "indicador_tt"),
    ("OBSERVACIONES", "observaciones"),

    ("FACTURACIONNOMBRE", "facturacion_nombre"),
    ("FACTURACIONAPELLIDOS", "facturacion_apellidos"),
    ("FACTURACIONDNINIF", "facturacion_dni_nif"),
    ("FACTURACIONDIRECCION", "facturacion_direccion"),
    ("FACTURACIONCODIGOPOSTAL", "facturacion_codigo_postal"),
    ("FACTURACIONPOBLACION", "facturacion_poblacion"),
    ("FACTURACIONPROVINCIA", "facturacion_provincia"),
    ("FACTURACIONTELEFONO", "facturacion_telefono"),
    ("FACTURACIONEMAIL", "facturacion_email"),
    ("FACTURACIONESTADO", "facturacion_estado"),
    ("FACTURACIONFECHA", "facturacion_fecha"),

    ("REGISTRALESTADO", "registral_estado"),
    ("REGISTRALFECHA", "registral_fecha"),
]


# ============================================================
# SERIALIZACIÓN DE EXPEDIENTES
# ============================================================

def expediente_a_dict(expediente: Expediente) -> dict:
    resultado = {}

    for campo in CAMPOS_EXPEDIENTE:
        valor = getattr(expediente, campo, None)

        if isinstance(valor, (date, datetime, time)):
            valor = valor.isoformat()

        resultado[campo] = valor

    try:
        resultado["documentos_escritura"] = [
            {
                "id": documento.id,
                "tipo_documento": documento.tipo_documento,
                "cuantia": documento.cuantia,
            }
            for documento in (
                getattr(expediente, "documentos_escritura", None) or []
            )
        ]
    except Exception:
        resultado["documentos_escritura"] = []

    return resultado


def adjuntar_promociones_catalogo(db: Session, items: list[dict]) -> list[dict]:
    """Expone el nombre del tipo de expediente como promoción calculada del catálogo."""
    asegurar_catalogo_inicial(db)
    expedientes_ids = {
        str(item["id_expediente"])
        for item in items
        if item.get("id_expediente")
    }
    asignaciones = {}
    if expedientes_ids:
        filas = (
            db.query(
                ExpedientePromocion.expediente_id,
                ExpedientePromocion.tipo_expediente_id,
                TipoExpediente.nombre,
            )
            .outerjoin(TipoExpediente, ExpedientePromocion.tipo_expediente_id == TipoExpediente.id)
            .filter(ExpedientePromocion.expediente_id.in_(expedientes_ids))
            .all()
        )
        asignaciones = {
            str(expediente_id): (int(tipo_id), nombre)
            for expediente_id, tipo_id, nombre in filas
        }
    for item in items:
        asignacion = asignaciones.get(str(item.get("id_expediente") or ""))
        item["promocion_tipo_expediente_id"] = asignacion[0] if asignacion else None
        item["promocion"] = asignacion[1] if asignacion else None
    return items


# ============================================================
# FILTROS
# ============================================================

def parsear_fecha(
    valor: Optional[str],
    nombre_campo: str,
) -> Optional[date]:

    if not valor:
        return None

    try:
        return datetime.strptime(
            valor,
            "%Y-%m-%d",
        ).date()

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"{nombre_campo} debe tener formato YYYY-MM-DD.",
        )


def aplicar_filtros(
    q,
    nif=None,
    actividad=None,
    fechaInicio=None,
    fechaFin=None,
    notario=None,
    oficina=None,
    importeMin=None,
    importeMax=None,
    numeroExpediente=None,
    nifTitular=None,
    nombreTitular=None,
    nifSolicitante=None,
    nombreSolicitante=None,
    nifNotario=None,
    finca=None,
    registroPropiedad=None,
    saldoReal=None,
    saldoDisponible=None,
    importe=None,
    observaciones=None,
    promocion=None,
    estadoActividad=None,
    estadoExpediente=None,
    actividadActual=None,
    origenBankia=None,
    productoGtg=None,
    apoderado=None,
    tipoProvision=None,
    tipoOperacion=None,
    subtipoOperacion=None,
    nombreGestoria=None,
    oficinaAlta=None,
    dan=None,
    tipoError=None,
    estadoExpedienteAncert=None,
    tipoActa=None,
    contrato=None,
    tipoFirma=None,
    tipoDocumento=None,
    provincia=None,
    poblacion=None,
    tributacion=None,
    estadoRegistral=None,
    estadoFacturacion=None,
    tieneDefectosAbiertos=None,
    faltaDefecto=None,
):
    """Aplica los mismos filtros a listado y exportación Excel."""
    fecha_inicio = parsear_fecha(fechaInicio, "fechaInicio")
    fecha_fin = parsear_fecha(fechaFin, "fechaFin")

    if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
        raise HTTPException(
            status_code=400,
            detail="La fecha de inicio no puede ser posterior a la fecha de fin.",
        )

    if importeMin is not None and importeMax is not None and importeMin > importeMax:
        raise HTTPException(
            status_code=400,
            detail="El importe mínimo no puede ser superior al importe máximo.",
        )

    def texto(valor):
        return str(valor).strip() if valor is not None else ""

    def filtro_texto(columna, valor):
        patron = f"%{texto(valor)}%"
        return columna.ilike(patron)

    if numeroExpediente and texto(numeroExpediente):
        q = q.filter(cast(Expediente.id_expediente, String).ilike(f"%{texto(numeroExpediente)}%"))

    # Filtro legado mantenido para llamadas existentes.
    if texto(nif):
        patron = f"%{texto(nif)}%"
        q = q.filter(or_(Expediente.nif_titular.ilike(patron), Expediente.nif_solicitante.ilike(patron)))

    if texto(nifTitular):
        q = q.filter(filtro_texto(Expediente.nif_titular, nifTitular))
    if texto(nombreTitular):
        q = q.filter(filtro_texto(Expediente.nombre_titular, nombreTitular))
    if texto(nifSolicitante):
        q = q.filter(filtro_texto(Expediente.nif_solicitante, nifSolicitante))
    if texto(nombreSolicitante):
        q = q.filter(filtro_texto(Expediente.nombre_solicitante, nombreSolicitante))

    if texto(actividad):
        clave = resolver_actividad(texto(actividad))
        if clave is None:
            raise HTTPException(status_code=400, detail=f"Actividad no válida: {actividad}")
        condicion = condicion_actividad(clave)
        if condicion is not None:
            q = q.filter(condicion)

    if fecha_inicio:
        q = q.filter(Expediente.fecha_alta >= fecha_inicio)
    if fecha_fin:
        q = q.filter(Expediente.fecha_alta <= fecha_fin)

    if texto(notario):
        patron = f"%{texto(notario)}%"
        q = q.filter(or_(Expediente.nombre_notario.ilike(patron), Expediente.nif_notario.ilike(patron), Expediente.notario.ilike(patron)))
    if texto(nifNotario):
        q = q.filter(filtro_texto(Expediente.nif_notario, nifNotario))
    if texto(oficina):
        q = q.filter(Expediente.oficina.ilike(f"%{texto(oficina)}%"))

    # Finca y Registro también se buscan en la relación ExpedienteFinca.
    # Se usa IN/EXISTS lógico para no duplicar expedientes con varias fincas.
    if texto(finca):
        patron_finca = f"%{texto(finca)}%"
        ids_finca = q.session.query(ExpedienteFinca.expediente_id).filter(
            ExpedienteFinca.finca.ilike(patron_finca)
        )
        q = q.filter(or_(Expediente.finca.ilike(patron_finca), Expediente.id.in_(ids_finca)))

    if texto(registroPropiedad):
        patron_registro = f"%{texto(registroPropiedad)}%"
        ids_registro = q.session.query(ExpedienteFinca.expediente_id).filter(
            ExpedienteFinca.registro.ilike(patron_registro)
        )
        q = q.filter(Expediente.id.in_(ids_registro))

    if saldoReal is not None:
        q = q.filter(Expediente.saldo_real == saldoReal)
    if saldoDisponible is not None:
        q = q.filter(Expediente.saldo_disponible == saldoDisponible)
    if importe is not None:
        q = q.filter(Expediente.importe == importe)
    if importeMin is not None:
        q = q.filter(Expediente.importe >= importeMin)
    if importeMax is not None:
        q = q.filter(Expediente.importe <= importeMax)

    if texto(observaciones):
        patron_obs = f"%{texto(observaciones)}%"
        q = q.filter(Expediente.observaciones.ilike(patron_obs))
    if texto(promocion):
        asegurar_catalogo_inicial(q.session)
        q = q.outerjoin(ExpedientePromocion, ExpedientePromocion.expediente_id == Expediente.id_expediente)
        q = q.outerjoin(TipoExpediente, ExpedientePromocion.tipo_expediente_id == TipoExpediente.id)
        q = q.filter(TipoExpediente.nombre.ilike(f"%{texto(promocion)}%"))
    if texto(estadoActividad):
        q = q.filter(func.lower(func.trim(Expediente.estado_actividad)) == texto(estadoActividad).lower())
    # actividadActual es el valor persistido; no debe confundirse con
    # el filtro legado `actividad`, que deriva una categoría del expediente.
    if texto(actividadActual):
        q = q.filter(Expediente.actividad_actual.ilike(f"%{texto(actividadActual)}%"))
    if texto(estadoExpediente):
        q = q.filter(func.lower(func.trim(Expediente.estado_expediente)) == texto(estadoExpediente).lower())

    # Los filtros de categorías usan igualdad sin distinguir mayúsculas y
    # eliminando espacios exteriores, para no mezclar valores parecidos.
    filtros_catalogo = [
        (Expediente.origen_bankia, origenBankia),
        (Expediente.producto_gtg, productoGtg),
        (Expediente.apoderado, apoderado),
        (Expediente.tipo_provision, tipoProvision),
        (Expediente.tipo_operacion, tipoOperacion),
        (Expediente.subtipo_operacion, subtipoOperacion),
        (Expediente.nombre_gestoria, nombreGestoria),
        (Expediente.oficina_alta, oficinaAlta),
        (Expediente.dan, dan),
        (Expediente.tipo_error, tipoError),
        (Expediente.estado_expediente_ancert, estadoExpedienteAncert),
        (Expediente.tipo_acta, tipoActa),
        (Expediente.contrato, contrato),
        (Expediente.tipo_firma, tipoFirma),
        (Expediente.tipo_documento, tipoDocumento),
        (Expediente.provincia, provincia),
        (Expediente.poblacion, poblacion),
        (Expediente.tributacion, tributacion),
        (Expediente.registral_estado, estadoRegistral),
        (Expediente.facturacion_estado, estadoFacturacion),
        (Expediente.tiene_defectos_abiertos, tieneDefectosAbiertos),
        (Expediente.falta_defecto, faltaDefecto),
    ]
    for columna, valor in filtros_catalogo:
        if texto(valor):
            q = q.filter(func.lower(func.trim(columna)) == texto(valor).lower())

    return q


def aplicar_busqueda_rapida(q, busqueda=None):
    """Búsqueda global sin exigir conocer el nombre exacto de cada campo."""
    termino = str(busqueda or "").strip()
    if not termino:
        return q

    # La búsqueda no distingue mayúsculas ni acentos: "Maria" encuentra "María".
    termino_normalizado = unicodedata.normalize("NFD", termino)
    termino_normalizado = "".join(
        caracter for caracter in termino_normalizado
        if unicodedata.category(caracter) != "Mn"
    ).lower()
    patron = f"%{termino_normalizado}%"

    def texto_busqueda(columna):
        return func.translate(
            func.lower(cast(columna, String)),
            "áéíóúüñ",
            "aeiouun",
        ).ilike(patron)

    columnas = [
        Expediente.id_expediente,
        Expediente.nombre_titular,
        Expediente.nif_titular,
        Expediente.nombre_solicitante,
        Expediente.nif_solicitante,
        Expediente.nombre_notario,
        Expediente.nif_notario,
        Expediente.notario,
        Expediente.oficina,
        Expediente.actividad_actual,
        Expediente.estado_expediente,
        Expediente.estado_actividad,
        Expediente.contrato,
        Expediente.tipo_operacion,
        Expediente.subtipo_operacion,
        Expediente.protocolo,
        Expediente.observaciones,
        Expediente.finca,
    ]
    condiciones = [texto_busqueda(columna) for columna in columnas]
    fincas_registros = q.session.query(ExpedienteFinca.expediente_id).filter(
        or_(
            texto_busqueda(ExpedienteFinca.finca),
            texto_busqueda(ExpedienteFinca.registro),
        )
    )
    condiciones.append(Expediente.id.in_(fincas_registros))
    return q.filter(or_(*condiciones))


# ============================================================
# CONTROLES DE GESTIÓN — ALERTAS DEL LISTADO
# ============================================================

ALERTAS_CONTROL_EXPEDIENTES = [
    {"key": "defectos_vencidos", "label": "Defectos registrales fuera de plazo", "descripcion": "Defectos abiertos durante más de 60 días desde la notificación del Registro", "icono": "⚠️"},
    {"key": "sede_notarial", "label": "Sede notarial fuera de plazo", "descripcion": "Más de 5 días desde la fecha de alta sin fecha de envío", "icono": "🖋️"},
    {"key": "sede_notarial_protocolo", "label": "Sede notarial con protocolo fuera de plazo", "descripcion": "Más de 2 días desde el envío sin fecha de firma", "icono": "🖋️"},
    {"key": "liquidacion_pendiente", "label": "Liquidación de impuestos fuera de plazo", "descripcion": "Más de 2 días desde la firma sin fecha de liquidación tributaria", "icono": "🧾"},
    {"key": "facturacion_cierre", "label": "Liquidación y cierre fuera de plazo", "descripcion": "Más de 5 días desde la inscripción sin fecha fin de actividad", "icono": "💶"},
    {"key": "inscripcion_30_dias", "label": "Tramitación inscripción fuera de plazo", "descripcion": "Más de 23 días desde la liquidación tributaria sin fecha de presentación", "icono": "📑"},
    {"key": "sla_global", "label": "SLA global superado", "descripcion": "Más de 40 días para Propia entidad/Vinculada propia entidad o 70 días para Vinculada otra entidad/Otra entidad, desde el envío hasta Fin actividad o hoy", "icono": "⏱️"},
    {"key": "sla_caixabank", "label": "Circuito CaixaBank fuera de plazo", "descripcion": "Más de 40 días desde el envío hasta Fin actividad o hoy para Propia entidad y Vinculada propia entidad", "icono": "🏦"},
    {"key": "sla_otra_entidad", "label": "Circuito otra entidad fuera de plazo", "descripcion": "Más de 70 días desde el envío hasta Fin actividad o hoy para Vinculada otra entidad y Otra entidad", "icono": "🏢"},
]


def aplicar_filtro_alerta_control(q, clave_alerta: Optional[str], db: Session):
    """Filtra expedientes cuyo plazo máximo de la actividad ya ha vencido."""
    if not clave_alerta:
        return q

    hoy = date.today()

    if clave_alerta in {"sla_global", "sla_caixabank", "sla_otra_entidad"}:
        # SLA global independiente de los plazos por actividad.
        # Hipotecario y Crédito Stock se excluyen expresamente.
        expedientes = q.with_entities(
            Expediente.id,
            Expediente.producto_gtg,
            Expediente.fecha_envio_notario,
            Expediente.fecha_envio,
            Expediente.fecha_fin_actividad,
            Expediente.estado_actividad,
        ).all()
        ids_fuera_sla = []
        estados_cerrados = {"cerrada", "cerrado", "cerrada automaticamente", "cerrado automaticamente"}
        for expediente_id, producto, fecha_envio_notario, fecha_envio, fecha_fin, estado_actividad in expedientes:
            producto_norm = normalizar_actividad_texto(producto)
            if producto_norm in {"hipotecario", "credito stock"}:
                continue
            if producto_norm in {"propia entidad", "vinculada propia entidad"}:
                circuito = "caixabank"
                limite_sla = 40
            elif producto_norm in {"vinculada otra entidad", "otra entidad"}:
                circuito = "otra_entidad"
                limite_sla = 70
            else:
                continue
            if clave_alerta == "sla_caixabank" and circuito != "caixabank":
                continue
            if clave_alerta == "sla_otra_entidad" and circuito != "otra_entidad":
                continue

            # fecha_envio_notario es la fecha oficial del envío; fecha_envio
            # se conserva como respaldo para expedientes históricos.
            inicio = fecha_envio_notario or fecha_envio
            if not inicio:
                continue

            # Un expediente cerrado sin fecha_fin_actividad tiene datos incompletos:
            # no se debe tratar erróneamente como si siguiera abierto hasta hoy.
            estado_norm = normalizar_actividad_texto(estado_actividad)
            if fecha_fin:
                fin = fecha_fin
            elif estado_norm in estados_cerrados:
                continue
            else:
                fin = hoy

            # Las columnas pueden llegar como date o datetime según el driver.
            if hasattr(inicio, "date"):
                inicio = inicio.date()
            if hasattr(fin, "date"):
                fin = fin.date()

            dias_transcurridos = (fin - inicio).days
            if dias_transcurridos > limite_sla:
                ids_fuera_sla.append(expediente_id)
        return q.filter(Expediente.id.in_(ids_fuera_sla)) if ids_fuera_sla else q.filter(Expediente.id == -1)

    if clave_alerta == "defectos_vencidos":
        defectos_fuera_plazo = (
            db.query(ExpedienteDefecto.expediente_id)
            .filter(
                ExpedienteDefecto.fecha_notificacion_registro.isnot(None),
                ExpedienteDefecto.fecha_notificacion_registro < hoy - timedelta(days=60),
                ExpedienteDefecto.fecha_cierre_defecto.is_(None),
                ExpedienteDefecto.fecha_entrada_subsanacion.is_(None),
                or_(
                    ExpedienteDefecto.tiene_defectos_abiertos.is_(None),
                    func.upper(func.trim(ExpedienteDefecto.tiene_defectos_abiertos)).notin_(
                        ["NO", "N", "FALSE", "CERRADO", "CERRADA", "0"]
                    ),
                ),
            )
        )
        return q.filter(Expediente.id.in_(defectos_fuera_plazo))

    if clave_alerta == "sede_notarial":
        return q.filter(
            condicion_actividad("sede-notarial"),
            Expediente.fecha_alta.isnot(None),
            Expediente.fecha_alta < hoy - timedelta(days=5),
            Expediente.fecha_envio.is_(None),
            Expediente.fecha_envio_notario.is_(None),
        )

    if clave_alerta == "sede_notarial_protocolo":
        actividad = func.trim(Expediente.actividad_actual)
        fecha_envio = func.coalesce(Expediente.fecha_envio_notario, Expediente.fecha_envio)
        return q.filter(
            or_(
                actividad.ilike("Sede notarial con protocolo"),
                actividad.ilike("Sede Notarial con protocolo"),
            ),
            fecha_envio.isnot(None),
            fecha_envio < hoy - timedelta(days=2),
            Expediente.fecha_firma.is_(None),
        )

    if clave_alerta == "liquidacion_pendiente":
        return q.filter(
            condicion_actividad("liquidacion-impuestos"),
            Expediente.fecha_firma.isnot(None),
            Expediente.fecha_firma < hoy - timedelta(days=2),
            Expediente.fecha_liquidacion_tributaria.is_(None),
        )

    if clave_alerta == "facturacion_cierre":
        return q.filter(
            condicion_actividad("facturacion-cierre"),
            Expediente.fecha_inscripcion.isnot(None),
            Expediente.fecha_inscripcion < hoy - timedelta(days=5),
            Expediente.fecha_fin_actividad.is_(None),
        )

    if clave_alerta == "inscripcion_30_dias":
        return q.filter(
            condicion_actividad("tramitacion-inscripcion"),
            Expediente.fecha_liquidacion_tributaria.isnot(None),
            Expediente.fecha_liquidacion_tributaria < hoy - timedelta(days=23),
            Expediente.fecha_presentacion.is_(None),
        )

    raise HTTPException(status_code=400, detail=f"Alerta de control no válida: {clave_alerta}")


@router.get("/control-alertas")
def obtener_alertas_control_expedientes(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    """Devuelve recuentos globales, calculados sobre todos los expedientes."""
    resultado = []
    for alerta in ALERTAS_CONTROL_EXPEDIENTES:
        consulta = aplicar_filtro_alerta_control(
            aplicar_ambito_reparto(db.query(Expediente), db, usuario),
            alerta["key"],
            db,
        )
        total = consulta.with_entities(func.count(Expediente.id)).scalar() or 0
        resultado.append({**alerta, "total": int(total)})

    return {"fecha_calculo": date.today().isoformat(), "alertas": resultado}


# Claves públicas del listado -> categorías reales almacenadas en la carpeta digital.
# Se aceptan las variantes históricas para no ocultar documentos ya cargados.
COLUMNAS_CARPETA_DIGITAL = {
    "documentos_absis": ["Documentos Absis", "Documentos ABSIS"],
    "hoja_encargo_firmada": ["Hoja de Encargo firmada", "Hoja de encargo firmada"],
    "justificante_cancelacion": ["Justificante de cancelación"],
    "nota_simple_registral": ["Nota simple registral"],
    "borradores_escritura": ["Escrituras/borradores", "Borradores de escrituras", "Borradores de escritura"],
    "presentacion_registro_documentos": ["Presentación Registro", "Presentacion Registro"],
    "copia_simple_documentos": ["Copia simple"],
    "ajd_itp_documentos": ["AJD/ITP", "AJD / ITP", "AJD ITP"],
    "otros_impuestos_documentos": ["Otros impuestos"],
    "hoja_inscripcion_documentos": ["Hoja de Inscripción", "Hoja de inscripcion"],
    "defecto_registral": ["Defecto registral"],
    "subsanacion_defecto": ["Subsanación del defecto", "Subsanacion del defecto"],
    "escritura_digital_final_documentos": ["Escritura digital final"],
    "documento_inscripcion_documentos": ["Documento de inscripción", "Documento de inscripcion"],
    "expediente_digital_completo_documentos": ["Expediente digital completo"],
    "factura_notarial_documentos": ["Factura notarial"],
    "factura_registral_documentos": ["Factura Registral", "Factura registral"],
    "factura_impuestos_documentos": ["Factura impuestos"],
    "honorarios_gestoria_documentos": ["Honorarios gestoría", "Honorarios gestoria"],
    "otra_documentacion": ["Otra documentación", "Otra documentacion"],
    "emails_oficina": ["Mails de la Oficina", "Mails de la oficina", "Emails de oficina"],
    "otros_documentos": ["Otros"],
}


def _normalizar_categoria_documental(valor: str) -> str:
    texto = normalizar_actividad_texto(valor)
    # Unifica variantes como "AJD/ITP", "AJD / ITP" y categorías
    # históricas con barras, guiones o puntuación diferente.
    return " ".join(
        "".join(caracter if caracter.isalnum() else " " for caracter in texto).split()
    )


def agregar_resumen_carpeta_digital(db: Session, items: list[dict]) -> list[dict]:
    """Añade al listado el número real de archivos por repositorio, sin columnas SQL nuevas."""
    if not items:
        return items

    ids = {str(item.get("id_expediente")) for item in items if item.get("id_expediente")}
    if not ids:
        return items

    documentos = (
        db.query(DocumentoCarpetaDigital.expediente_id, DocumentoCarpetaDigital.categoria)
        .filter(DocumentoCarpetaDigital.expediente_id.in_(ids))
        .all()
    )
    por_expediente: dict[str, dict[str, int]] = {}
    categorias_por_clave = {
        clave: {_normalizar_categoria_documental(nombre) for nombre in nombres}
        for clave, nombres in COLUMNAS_CARPETA_DIGITAL.items()
    }
    for expediente_id, categoria in documentos:
        expediente_id = str(expediente_id)
        recuentos = por_expediente.setdefault(expediente_id, {})
        recuentos["__total__"] = recuentos.get("__total__", 0) + 1
        normalizada = _normalizar_categoria_documental(categoria or "")
        for clave, variantes in categorias_por_clave.items():
            if normalizada in variantes:
                recuentos[clave] = recuentos.get(clave, 0) + 1

    for item in items:
        recuentos = por_expediente.get(str(item.get("id_expediente")), {})
        total = recuentos.get("__total__", 0)
        item["carpeta_digital"] = f"{total} archivo(s)"
        for clave in COLUMNAS_CARPETA_DIGITAL:
            cantidad = recuentos.get(clave, 0)
            item[clave] = f"{cantidad} archivo(s)"
    return items


# ============================================================
# LISTADO DE EXPEDIENTES
# ============================================================

@router.get("/listado")
def listado_expedientes(
    pagina: int = Query(1, ge=1),
    porPagina: int = Query(20, ge=1, le=200),
    nif: Optional[str] = None,
    actividad: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    notario: Optional[str] = None,
    oficina: Optional[str] = None,
    importeMin: Optional[float] = None,
    importeMax: Optional[float] = None,
    numeroExpediente: Optional[str] = Query(None, description="Número completo o parcial del expediente"),
    busqueda: Optional[str] = Query(None, description="Búsqueda rápida por número, persona, notario, finca, registro u otros datos"),
    nifTitular: Optional[str] = None,
    nombreTitular: Optional[str] = None,
    nifSolicitante: Optional[str] = None,
    nombreSolicitante: Optional[str] = None,
    nifNotario: Optional[str] = None,
    finca: Optional[str] = None,
    registroPropiedad: Optional[str] = None,
    saldoReal: Optional[float] = None,
    saldoDisponible: Optional[float] = None,
    importe: Optional[float] = None,
    observaciones: Optional[str] = None,
    promocion: Optional[str] = None,
    estadoActividad: Optional[str] = None,
    estadoExpediente: Optional[str] = None,
    actividadActual: Optional[str] = Query(None, description="Filtra por el valor almacenado en actividad_actual"),
    origenBankia: Optional[str] = None,
    productoGtg: Optional[str] = None,
    apoderado: Optional[str] = None,
    tipoProvision: Optional[str] = None,
    tipoOperacion: Optional[str] = None,
    subtipoOperacion: Optional[str] = None,
    nombreGestoria: Optional[str] = None,
    oficinaAlta: Optional[str] = None,
    dan: Optional[str] = None,
    tipoError: Optional[str] = None,
    estadoExpedienteAncert: Optional[str] = None,
    tipoActa: Optional[str] = None,
    contrato: Optional[str] = None,
    tipoFirma: Optional[str] = None,
    tipoDocumento: Optional[str] = None,
    provincia: Optional[str] = None,
    poblacion: Optional[str] = None,
    tributacion: Optional[str] = None,
    estadoRegistral: Optional[str] = None,
    estadoFacturacion: Optional[str] = None,
    tieneDefectosAbiertos: Optional[str] = None,
    faltaDefecto: Optional[str] = None,
    ordenMultiple: Optional[str] = Query(None),
    alerta: Optional[str] = Query(None, description="Filtra por una alerta de control"),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    q = aplicar_filtros(
        db.query(Expediente),
        nif=nif,
        actividad=actividad,
        fechaInicio=fechaInicio,
        fechaFin=fechaFin,
        notario=notario,
        oficina=oficina,
        importeMin=importeMin,
        importeMax=importeMax,
        numeroExpediente=numeroExpediente,
        nifTitular=nifTitular,
        nombreTitular=nombreTitular,
        nifSolicitante=nifSolicitante,
        nombreSolicitante=nombreSolicitante,
        nifNotario=nifNotario,
        finca=finca,
        registroPropiedad=registroPropiedad,
        saldoReal=saldoReal,
        saldoDisponible=saldoDisponible,
        importe=importe,
        observaciones=observaciones,
        promocion=promocion,
        estadoActividad=estadoActividad,
        estadoExpediente=estadoExpediente,
        actividadActual=actividadActual,
        origenBankia=origenBankia,
        productoGtg=productoGtg,
        apoderado=apoderado,
        tipoProvision=tipoProvision,
        tipoOperacion=tipoOperacion,
        subtipoOperacion=subtipoOperacion,
        nombreGestoria=nombreGestoria,
        oficinaAlta=oficinaAlta,
        dan=dan,
        tipoError=tipoError,
        estadoExpedienteAncert=estadoExpedienteAncert,
        tipoActa=tipoActa,
        contrato=contrato,
        tipoFirma=tipoFirma,
        tipoDocumento=tipoDocumento,
        provincia=provincia,
        poblacion=poblacion,
        tributacion=tributacion,
        estadoRegistral=estadoRegistral,
        estadoFacturacion=estadoFacturacion,
        tieneDefectosAbiertos=tieneDefectosAbiertos,
        faltaDefecto=faltaDefecto,
    )
    q = aplicar_busqueda_rapida(q, busqueda)
    q = aplicar_filtro_alerta_control(q, alerta, db)
    q = aplicar_ambito_reparto(q, db, usuario)

    # Ocultar del listado de trabajo los expedientes ya liquidados (LIQ)
    # o liquidados sin tramitar (LST), sin modificar ni borrar sus registros.
    # Se aplica antes del recuento y la paginación para que ambos sean coherentes.
    # Los estados se comparan sin distinguir mayúsculas ni espacios exteriores.
    q = q.filter(
        or_(
            Expediente.estado_expediente.is_(None),
            func.upper(func.trim(Expediente.estado_expediente)).notin_(("LIQ", "LST")),
        )
    )

    orden_aplicado = False

    if ordenMultiple:
        try:
            ordenes = json.loads(ordenMultiple)
        except (json.JSONDecodeError, TypeError, ValueError):
            raise HTTPException(
                status_code=400,
                detail="ordenMultiple no contiene un JSON válido.",
            )

        if not isinstance(ordenes, list):
            raise HTTPException(
                status_code=400,
                detail="ordenMultiple debe ser una lista.",
            )

        for orden in ordenes:
            if not isinstance(orden, dict):
                continue

            campo = COLUMNAS_ORDENABLES.get(orden.get("columna"))

            if campo is None:
                continue

            direccion = str(
                orden.get("direccion", "asc")
            ).lower()

            q = q.order_by(
                campo.desc() if direccion == "desc" else campo.asc()
            )

            orden_aplicado = True

    if not orden_aplicado:
        q = q.order_by(
            Expediente.fecha_alta.desc(),
            Expediente.id_expediente.desc(),
            Expediente.id.desc(),
        )

    total = q.count()
    total_paginas = max(1, (total + porPagina - 1) // porPagina)
    pagina_real = min(pagina, total_paginas)

    items_db = (
        q.offset((pagina_real - 1) * porPagina)
        .limit(porPagina)
        .all()
    )

    items = [
        expediente_a_dict(expediente)
        for expediente in items_db
    ]
    items = adjuntar_promociones_catalogo(db, items)
    items = agregar_resumen_carpeta_digital(db, items)

    # Resumen contable de facturas para el listado general. El estado sale de
    # la obligación económica; adjuntar el documento nunca equivale a pagarla.
    ids_pagina = [item.get("id") for item in items if item.get("id") is not None]
    resumen_facturas = {}
    if ids_pagina:
        tipos_factura = {
            "factura notarial", "factura registral", "factura impuestos",
            "ajd/itp", "ajd", "itp",
        }
        obligaciones = (
            db.query(ExpedienteGasto)
            .filter(ExpedienteGasto.expediente_id.in_(ids_pagina))
            .all()
        )
        for gasto in obligaciones:
            tipo = str(gasto.tipo or "").strip().lower()
            if tipo not in tipos_factura:
                continue
            actual = resumen_facturas.setdefault(
                gasto.expediente_id, {"pendientes": 0, "realizadas": 0, "parciales": 0}
            )
            estado_pago = str(gasto.estado_pago or "Pendiente").strip().lower()
            if estado_pago in {"pagado", "pagada", "abonado", "abonada", "realizado", "realizada", "efectuado", "efectuada"}:
                actual["realizadas"] += 1
            elif estado_pago in {"anulado", "anulada", "anulado pago", "cancelado", "cancelada"}:
                continue
            else:
                actual["pendientes"] += 1
                if estado_pago in {"parcial", "pago parcial", "parcialmente pagado"}:
                    actual["parciales"] += 1
        for item in items:
            resumen = resumen_facturas.get(item.get("id"), {"pendientes": 0, "realizadas": 0, "parciales": 0})
            item["facturas_pendientes"] = resumen["pendientes"]
            item["facturas_realizadas"] = resumen["realizadas"]
            item["facturas_parciales"] = resumen["parciales"]
            if resumen["pendientes"] and resumen["realizadas"]:
                item["estado_facturas"] = f'{resumen["pendientes"]} pendiente(s) · {resumen["realizadas"]} pagada(s)'
            elif resumen["pendientes"]:
                item["estado_facturas"] = f'{resumen["pendientes"]} pendiente(s)'
            elif resumen["realizadas"]:
                item["estado_facturas"] = f'{resumen["realizadas"]} pagada(s)'
            else:
                item["estado_facturas"] = "—"

    return {
        "items": items,
        "total": total,
        "pagina": pagina_real,
        "porPagina": porPagina,
        "total_paginas": total_paginas,
    }


# ============================================================
# RESUMEN DE EXPEDIENTES POR ACTIVIDAD
# ============================================================

@router.get("/resumen")
def resumen_expedientes(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    consulta_visible = aplicar_ambito_reparto(db.query(Expediente), db, usuario)
    total_expedientes = consulta_visible.with_entities(func.count(Expediente.id)).scalar() or 0

    actividades = []

    for actividad in ACTIVIDADES_EXPEDIENTES:
        condicion = condicion_actividad(actividad["key"])

        if condicion is not None:
            total = (
                consulta_visible.filter(condicion)
                .with_entities(func.count(Expediente.id))
                .scalar() or 0
            )
        else:
            total = 0

        actividades.append({
            "key": actividad["key"],
            "actividad": actividad["label"],
            "total": int(total),
        })

    return {
        "total": int(total_expedientes),
        "actividades": actividades,
    }


# ============================================================
# CATÁLOGOS GLOBALES PARA FILTROS DEL LISTADO
# ============================================================

@router.get("/catalogos-listado")
def catalogos_listado_expedientes(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Devuelve opciones globales para los filtros, sin depender de la página actual."""

    def valores_distintos(columna):
        filas = (
            db.query(columna)
            .filter(columna.isnot(None))
            .distinct()
            .all()
        )
        valores = {
            str(fila[0]).strip()
            for fila in filas
            if fila and fila[0] is not None and str(fila[0]).strip()
        }
        return sorted(valores, key=lambda valor: valor.casefold())

    def combinar_catalogos(*columnas):
        valores = set()
        for columna in columnas:
            if columna is not None:
                valores.update(valores_distintos(columna))
        return sorted(valores, key=lambda valor: valor.casefold())

    registros = valores_distintos(ExpedienteFinca.registro)
    estados_actividad = valores_distintos(Expediente.estado_actividad)
    # Catálogo oficial de ABSIS: debe mostrar todos los códigos aunque todavía
    # no haya expedientes cargados con alguno de ellos.
    estados_expediente = sorted(
        set(valores_distintos(Expediente.estado_expediente))
        | {"LIQ", "VIG", "LST", "RTS", "PVA"},
        key=lambda valor: valor.casefold(),
    )

    # Catálogos construidos sobre todos los expedientes, no solo sobre la
    # página actual. Se limpian espacios exteriores y se deduplican valores.
    catalogos = {
        "oficinas": valores_distintos(Expediente.oficina),
        "oficinas_alta": valores_distintos(Expediente.oficina_alta),
        "dans": valores_distintos(Expediente.dan),
        "origenes_bankia": valores_distintos(Expediente.origen_bankia),
        "productos_gtg": valores_distintos(Expediente.producto_gtg),
        "apoderados": valores_distintos(Expediente.apoderado),
        "tipos_provision": valores_distintos(Expediente.tipo_provision),
        "contratos": valores_distintos(Expediente.contrato),
        "tipos_operacion": valores_distintos(Expediente.tipo_operacion),
        "subtipos_operacion": valores_distintos(Expediente.subtipo_operacion),
        "gestorias": valores_distintos(Expediente.nombre_gestoria),
        "tipos_error": valores_distintos(Expediente.tipo_error),
        "defectos_abiertos": valores_distintos(Expediente.tiene_defectos_abiertos),
        "falta_defecto": valores_distintos(Expediente.falta_defecto),
        "estados_ancert": valores_distintos(Expediente.estado_expediente_ancert),
        "tipos_acta": valores_distintos(Expediente.tipo_acta),
        "tipos_firma": valores_distintos(Expediente.tipo_firma),
        "tipos_documento": valores_distintos(Expediente.tipo_documento),
        "provincias": valores_distintos(Expediente.provincia),
        "poblaciones": valores_distintos(Expediente.poblacion),
        "tributaciones": valores_distintos(Expediente.tributacion),
        "estados_registrales": valores_distintos(Expediente.registral_estado),
        "estados_facturacion": valores_distintos(Expediente.facturacion_estado),
        "dts": valores_distintos(Expediente.dt),
        "vinccancs": valores_distintos(Expediente.vinccanc),
        "lucys": valores_distintos(Expediente.lucy),
        "notarios": combinar_catalogos(Expediente.nombre_notario, Expediente.notario),
    }

    # Las actividades del flujo son un catálogo funcional, no una lista inferida
    # de los expedientes importados. Debe incluir también Sede notarial con protocolo
    # aunque todavía no haya filas de esa actividad en el Excel importado.
    actividades = [
        {
            "key": actividad["key"],
            "actividad": actividad["label"],
        }
        for actividad in ACTIVIDADES_EXPEDIENTES
    ]

    return {
        "registros": registros,
        "estados_actividad": estados_actividad,
        "estados_expediente": estados_expediente,
        "actividades": actividades,
        **catalogos,
    }


# ============================================================
# EXPORTACIÓN A EXCEL
# ============================================================

@router.get("/exportar-excel")
def exportar_excel_expedientes(
    nif: Optional[str] = None,
    actividad: Optional[str] = None,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    notario: Optional[str] = None,
    oficina: Optional[str] = None,
    importeMin: Optional[float] = None,
    importeMax: Optional[float] = None,
    numeroExpediente: Optional[str] = Query(None, description="Número completo o parcial del expediente"),
    nifTitular: Optional[str] = None,
    nombreTitular: Optional[str] = None,
    nifSolicitante: Optional[str] = None,
    nombreSolicitante: Optional[str] = None,
    nifNotario: Optional[str] = None,
    finca: Optional[str] = None,
    registroPropiedad: Optional[str] = None,
    saldoReal: Optional[float] = None,
    saldoDisponible: Optional[float] = None,
    importe: Optional[float] = None,
    observaciones: Optional[str] = None,
    promocion: Optional[str] = None,
    estadoActividad: Optional[str] = None,
    estadoExpediente: Optional[str] = None,
    actividadActual: Optional[str] = Query(None, description="Filtra por el valor almacenado en actividad_actual"),
    origenBankia: Optional[str] = None,
    productoGtg: Optional[str] = None,
    apoderado: Optional[str] = None,
    tipoProvision: Optional[str] = None,
    tipoOperacion: Optional[str] = None,
    subtipoOperacion: Optional[str] = None,
    nombreGestoria: Optional[str] = None,
    oficinaAlta: Optional[str] = None,
    dan: Optional[str] = None,
    tipoError: Optional[str] = None,
    estadoExpedienteAncert: Optional[str] = None,
    tipoActa: Optional[str] = None,
    contrato: Optional[str] = None,
    tipoFirma: Optional[str] = None,
    tipoDocumento: Optional[str] = None,
    provincia: Optional[str] = None,
    poblacion: Optional[str] = None,
    tributacion: Optional[str] = None,
    estadoRegistral: Optional[str] = None,
    estadoFacturacion: Optional[str] = None,
    tieneDefectosAbiertos: Optional[str] = None,
    faltaDefecto: Optional[str] = None,
    alerta: Optional[str] = Query(None, description="Filtra por una alerta de control"),
    configActividad: Optional[str] = Query(None, description="Clave de actividad cuya configuración Excel se aplicará"),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    q = aplicar_filtros(
        db.query(Expediente),
        nif=nif,
        actividad=actividad,
        fechaInicio=fechaInicio,
        fechaFin=fechaFin,
        notario=notario,
        oficina=oficina,
        importeMin=importeMin,
        importeMax=importeMax,
        numeroExpediente=numeroExpediente,
        nifTitular=nifTitular,
        nombreTitular=nombreTitular,
        nifSolicitante=nifSolicitante,
        nombreSolicitante=nombreSolicitante,
        nifNotario=nifNotario,
        finca=finca,
        registroPropiedad=registroPropiedad,
        saldoReal=saldoReal,
        saldoDisponible=saldoDisponible,
        importe=importe,
        observaciones=observaciones,
        promocion=promocion,
        estadoActividad=estadoActividad,
        estadoExpediente=estadoExpediente,
        actividadActual=actividadActual,
        origenBankia=origenBankia,
        productoGtg=productoGtg,
        apoderado=apoderado,
        tipoProvision=tipoProvision,
        tipoOperacion=tipoOperacion,
        subtipoOperacion=subtipoOperacion,
        nombreGestoria=nombreGestoria,
        oficinaAlta=oficinaAlta,
        dan=dan,
        tipoError=tipoError,
        estadoExpedienteAncert=estadoExpedienteAncert,
        tipoActa=tipoActa,
        contrato=contrato,
        tipoFirma=tipoFirma,
        tipoDocumento=tipoDocumento,
        provincia=provincia,
        poblacion=poblacion,
        tributacion=tributacion,
        estadoRegistral=estadoRegistral,
        estadoFacturacion=estadoFacturacion,
        tieneDefectosAbiertos=tieneDefectosAbiertos,
        faltaDefecto=faltaDefecto,
    )
    q = aplicar_filtro_alerta_control(q, alerta, db)
    q = aplicar_ambito_reparto(q, db, usuario)
    q = aplicar_ambito_reparto(q, db, usuario)

    expedientes = (
        q.order_by(
            Expediente.fecha_alta.desc(),
            Expediente.id_expediente.desc(),
            Expediente.id.desc(),
        )
        .all()
    )

    columnas_excel_exportacion = COLUMNAS_EXCEL
    nombre_hoja_excel = "Expedientes"
    if configActividad:
        clave = str(configActividad).strip()
        if any(item["key"] == clave for item in ACTIVIDADES_VISIBILIDAD):
            try:
                _asegurar_tabla_visibilidad(db)
                fila_config = db.execute(text("""
                    SELECT nombre_tabla, excel_columns
                    FROM public.expediente_visibilidad_config
                    WHERE actividad_key = :actividad_key
                      AND empleado_id IN (0, :empleado_id)
                    ORDER BY
                      CASE WHEN empleado_id = :empleado_id AND ambito = 'personal' THEN 3
                           WHEN empleado_id = :empleado_id AND ambito = 'administracion' THEN 2
                           ELSE 1 END DESC
                    LIMIT 1
                """), {"actividad_key": clave, "empleado_id": int(getattr(usuario, "empleado_id", None) or usuario.id)}).mappings().first()
                if fila_config is not None:
                    nombre_hoja_excel = str(fila_config["nombre_tabla"] or "Expedientes")
                    configuracion = fila_config["excel_columns"] or []
                    configuracion = configuracion if isinstance(configuracion, list) else json.loads(configuracion)
                    por_atributo = {atributo: cabecera for cabecera, atributo in COLUMNAS_EXCEL}
                    # Mantener el orden exacto elegido en Visibilidad tablas.
                    columnas_excel_exportacion = [
                        (por_atributo[atributo], atributo)
                        for atributo in configuracion
                        if atributo in por_atributo
                    ]
                    if not columnas_excel_exportacion:
                        columnas_excel_exportacion = COLUMNAS_EXCEL
            except Exception:
                logger.exception("No se pudo aplicar la configuración de columnas Excel; se usará el Excel completo.")
                columnas_excel_exportacion = COLUMNAS_EXCEL
                nombre_hoja_excel = "Expedientes"

    wb = openpyxl.Workbook()
    ws = wb.active
    # Excel limita el nombre de hoja a 31 caracteres y prohíbe estos símbolos.
    ws.title = "".join("_" if caracter in "[]:*?\\/" else caracter for caracter in nombre_hoja_excel)[:31] or "Expedientes"

    for col, (cabecera, _) in enumerate(columnas_excel_exportacion, start=1):
        ws.cell(
            row=1,
            column=col,
            value=cabecera,
        ).font = Font(bold=True)

    for fila, expediente in enumerate(expedientes, start=2):
        for col, (_, atributo) in enumerate(columnas_excel_exportacion, start=1):
            valor = getattr(expediente, atributo, None)

            cell = ws.cell(
                row=fila,
                column=col,
                value=valor,
            )

            if isinstance(valor, (date, datetime)):
                cell.number_format = "dd/mm/yyyy"
            elif isinstance(valor, time):
                cell.number_format = "hh:mm"

    ws.freeze_panes = "A2"

    ultima_columna = get_column_letter(max(len(columnas_excel_exportacion), 1))
    ws.auto_filter.ref = f"A1:{ultima_columna}{len(expedientes) + 1}"

    for col, (cabecera, _) in enumerate(columnas_excel_exportacion, start=1):
        max_length = len(str(cabecera))

        for fila in range(2, min(len(expedientes) + 2, 500)):
            valor = ws.cell(row=fila, column=col).value

            if valor is not None:
                max_length = max(max_length, len(str(valor)))

        ws.column_dimensions[
            get_column_letter(col)
        ].width = min(max(max_length + 2, 12), 45)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                'attachment; filename="expedientes.xlsx"'
            )
        },
    )


# ============================================================
# CREAR O ACTUALIZAR CITA DE AGENDA
# ============================================================

def crear_o_actualizar_cita_agenda(
    db: Session,
    expediente: Expediente,
    datos: EnvioANotarioRequest,
):
    if not datos.fecha_prevista_firma:
        return None

    hora_inicio = datos.hora_prevista_firma or time(9, 0)
    hora_fin = datos.hora_fin_prevista_firma
    if hora_fin is None:
        minutos_inicio = hora_inicio.hour * 60 + hora_inicio.minute
        minutos_fin = min(minutos_inicio + 60, 23 * 60 + 59)
        hora_fin = time(minutos_fin // 60, minutos_fin % 60)
    if hora_fin <= hora_inicio:
        raise HTTPException(status_code=400, detail="La hora de fin debe ser posterior a la hora de inicio.")

    cita = (
        db.query(Cita)
        .filter(
            Cita.expediente_id == expediente.id,
            func.lower(func.trim(func.coalesce(Cita.tipo_cita, ""))) == "firma notarial",
        )
        .order_by(Cita.id.desc())
        .first()
    )

    observaciones = (
        f"Firma prevista — Expediente {expediente.id_expediente}"
    )

    # Vincula también la clave foránea del empleado cuando el nombre del
    # apoderado del catálogo coincide con un empleado del ERP. Si no hay
    # coincidencia, se conserva el nombre para la compatibilidad histórica.
    apoderado_id = None
    nombre_apoderado = (datos.apoderado or "").strip()
    if nombre_apoderado:
        apoderado_id = (
            db.query(Empleado.id)
            .filter(
                func.translate(
                    func.lower(func.trim(
                        func.concat(
                            func.coalesce(Empleado.nombre, ""),
                            " ",
                            func.coalesce(Empleado.apellidos, ""),
                        )
                    )),
                    "áéíóúüñ",
                    "aeiouun",
                )
                == func.translate(
                    nombre_apoderado.lower(),
                    "áéíóúüñ",
                    "aeiouun",
                )
            )
            .scalar()
        )

    if cita:
        cita.fecha = datos.fecha_prevista_firma
        cita.hora_inicio = hora_inicio
        cita.hora_fin = hora_fin
        cita.tipo_cita = "Firma notarial"
        cita.notario_id = datos.notario_id
        cita.tipo_firma = datos.tipo_firma
        cita.apoderado = datos.apoderado
        cita.apoderado_id = apoderado_id
        cita.observaciones = observaciones
        return cita

    cita = Cita(
        fecha=datos.fecha_prevista_firma,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        tipo_cita="Firma notarial",
        notario_id=datos.notario_id,
        tipo_firma=datos.tipo_firma,
        apoderado=datos.apoderado,
        apoderado_id=apoderado_id,
        expediente_id=expediente.id,
        observaciones=observaciones,
    )

    db.add(cita)
    return cita


# ============================================================
# ENVÍO A NOTARIO
# ============================================================

@router.put("/{id_expediente}/enviar-a-notario")
def enviar_a_notario(
    id_expediente: str,
    datos: EnvioANotarioRequest,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    if not datos.nombre_notario.strip():
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar un notario.",
        )

    if not datos.tipo_firma.strip():
        raise HTTPException(
            status_code=400,
            detail="El Tipo de firma es obligatorio.",
        )

    # Swagger suele proponer 0 como valor de ejemplo. No es un ID
    # válido de notario y no debe llegar a la clave foránea de Agenda.
    # El identificador solo es imprescindible si se va a crear una cita.
    if datos.fecha_prevista_firma and (
        datos.notario_id is None or datos.notario_id <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Para crear la cita de firma debes indicar el ID real "
                "de un notario. No utilices 0; selecciona un notario "
                "del catálogo."
            ),
        )

    documentos_recibidos = (
        datos.documentos_escritura
        or datos.documentos
        or []
    )

    documentos_limpios = []

    for documento in documentos_recibidos:
        tipo = (documento.tipo_documento or "").strip()

        if not tipo:
            continue

        cuantia = documento.cuantia

        if cuantia is not None and cuantia < 0:
            raise HTTPException(
                status_code=400,
                detail="La cuantía de un documento no puede ser negativa.",
            )

        documentos_limpios.append({
            "tipo_documento": tipo,
            "cuantia": cuantia,
        })

    if not documentos_limpios and datos.tipo_documento.strip():
        documentos_limpios = [{
            "tipo_documento": datos.tipo_documento.strip(),
            "cuantia": None,
        }]

    if not documentos_limpios:
        raise HTTPException(
            status_code=400,
            detail="Debes indicar al menos un Tipo de documento.",
        )

    if datos.fecha_solicitud_pnc and datos.fecha_solicitud_pnc > datos.fecha_envio:
        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha de solicitud PNC no puede ser "
                "posterior a la fecha de envío."
            ),
        )

    if datos.numero_solicitud_pnc is not None and not datos.numero_solicitud_pnc.strip():
        datos.numero_solicitud_pnc = None

    if (
        datos.fecha_prevista_firma
        and datos.fecha_prevista_firma < datos.fecha_envio
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La Fecha prevista de firma no puede ser "
                "anterior a la Fecha de envío."
            ),
        )

    firma_preexistente = bool(
        expediente.fecha_firma or (expediente.protocolo or "").strip()
    )
    if firma_preexistente and datos.escritura_firmada:
        protocolo_entrante = (datos.protocolo or "").strip()
        if datos.fecha_firma != expediente.fecha_firma or protocolo_entrante != (expediente.protocolo or "").strip():
            raise HTTPException(
                status_code=409,
                detail="La firma ya está registrada y no puede sustituirse desde el envío ordinario.",
            )

    if datos.escritura_firmada:
        if not datos.fecha_firma:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Si la escritura está firmada debes indicar "
                    "la Fecha de firma."
                ),
            )

        if datos.fecha_envio > datos.fecha_firma:
            raise HTTPException(
                status_code=400,
                detail=(
                    "La Fecha de envío no puede ser posterior "
                    "a la Fecha de firma."
                ),
            )

        if not datos.protocolo or not datos.protocolo.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Si la escritura está firmada debes indicar "
                    "el Protocolo."
                ),
            )

    try:
        # Guardar los datos de firma, pero no cambiar la actividad.
        # La transición se realiza por separado tras validar
        # los documentos obligatorios.
        if firma_preexistente:
            # El envío puede actualizar otros datos, pero nunca borrar una firma real.
            expediente.escritura_firmada = True
        elif datos.escritura_firmada:
            expediente.fecha_firma = datos.fecha_firma
            expediente.protocolo = datos.protocolo.strip()
            expediente.escritura_firmada = True
        else:
            expediente.fecha_firma = None
            expediente.protocolo = None
            expediente.escritura_firmada = False

        # DATOS DEL ENVÍO
        expediente.fecha_envio_notario = datos.fecha_envio
        # Compatibilidad con listados e informes históricos que consumen fecha_envio.
        expediente.fecha_envio = datos.fecha_envio
        # No borrar valores PNC ya registrados por ApoderaGest cuando el
        # envío inicial no incluya todavía esos datos.
        if datos.fecha_solicitud_pnc is not None:
            expediente.fecha_solicitud_pnc = datos.fecha_solicitud_pnc
        if datos.numero_solicitud_pnc:
            expediente.numero_solicitud_pnc = datos.numero_solicitud_pnc.strip()
        expediente.escritura_firmada = bool(firma_preexistente or datos.escritura_firmada)
        expediente.hora_prevista_firma = (
            datos.hora_prevista_firma or time(9, 0)
        )
        expediente.hora_fin_prevista_firma = datos.hora_fin_prevista_firma or time(
            min((expediente.hora_prevista_firma.hour * 60 + expediente.hora_prevista_firma.minute + 60) // 60, 23),
            (expediente.hora_prevista_firma.hour * 60 + expediente.hora_prevista_firma.minute + 60) % 60,
        )
        expediente.firma_urgente = bool(datos.firma_urgente)
        expediente.fecha_inicio_actividad = datos.fecha_envio

        # DATOS DEL NOTARIO: persistir el identificador CTN, no solo el nombre.
        expediente.nombre_notario = datos.nombre_notario.strip()
        nif_entrante = (
            "".join(c for c in unicodedata.normalize("NFKD", str(datos.nif_notario or "").upper()) if not unicodedata.combining(c))
            .replace("-", "")
            .replace(" ", "")
        )
        notaria_ctn = None
        if datos.notario_id is not None and datos.notario_id > 0:
            notaria_ctn = db.query(Notaria).filter(Notaria.id == datos.notario_id).first()
            if notaria_ctn is None:
                raise HTTPException(status_code=400, detail="El notario seleccionado no existe en el catálogo CTN.")
        if notaria_ctn is None and nif_entrante:
            for candidata in db.query(Notaria).all():
                nif_candidato = (
                    "".join(c for c in unicodedata.normalize("NFKD", str(candidata.nif or "").upper()) if not unicodedata.combining(c))
                    .replace("-", "")
                    .replace(" ", "")
                )
                if nif_candidato == nif_entrante:
                    notaria_ctn = candidata
                    break
        expediente.notario_id = notaria_ctn.id if notaria_ctn else None
        expediente.nif_notario = (
            str(notaria_ctn.nif).strip()
            if notaria_ctn and getattr(notaria_ctn, "nif", None)
            else (datos.nif_notario.strip() if datos.nif_notario and datos.nif_notario.strip() else None)
        )

        # Relación de apoderado por ID. El nombre se conserva para mostrarlo
        # y como compatibilidad con expedientes históricos.
        def normalizar_nombre_apoderado(valor):
            texto_normalizado = "".join(
                caracter for caracter in unicodedata.normalize("NFKD", str(valor or "").casefold())
                if not unicodedata.combining(caracter)
            )
            return " ".join(texto_normalizado.split())

        # Priorizar el apoderado elegido explícitamente en el modal Enviar a notario.
        # El apoderado asociado por defecto al registro CTN solo se usa como respaldo.
        apoderado_id = None
        nombre_objetivo = normalizar_nombre_apoderado(datos.apoderado)
        if nombre_objetivo:
            for empleado in db.query(Empleado).all():
                nombre_empleado = normalizar_nombre_apoderado(" ".join(filter(None, [
                    getattr(empleado, "nombre", None),
                    getattr(empleado, "apellidos", None),
                ])))
                if nombre_empleado and nombre_empleado == nombre_objetivo:
                    apoderado_id = empleado.id
                    break
        # Si se ha indicado un apoderado explícito, no heredar el ID
        # genérico asociado al notario cuando no se encuentra una coincidencia
        # exacta en Empleados: ese ID puede pertenecer a otra persona y hace
        # que ApoderaGest oculte el expediente al apoderado cuyo nombre se guardó.
        # El ID del registro CTN solo es un respaldo cuando no se indicó nombre.
        if apoderado_id is None and not nombre_objetivo and notaria_ctn:
            apoderado_id = getattr(notaria_ctn, "apoderado_id", None)
        expediente.apoderado_empleado_id = apoderado_id

        expediente.notario = (
            datos.notario.strip()
            if datos.notario and datos.notario.strip()
            else datos.nombre_notario.strip()
        )

        expediente.apoderado = (
            datos.apoderado.strip()
            if datos.apoderado and datos.apoderado.strip()
            else None
        )

        # DATOS DE OPERACIÓN: conservar los valores enviados desde el modal.
        for campo in ("contrato", "tipo_operacion", "subtipo_operacion"):
            valor = getattr(datos, campo, None)
            if valor is not None:
                valor = valor.strip() or None
            setattr(expediente, campo, valor)
        if datos.capital_documento_notarial is not None:
            expediente.capital_documento_notarial = datos.capital_documento_notarial
        if datos.importe is not None:
            expediente.importe = datos.importe

        # DATOS DEL DOCUMENTO
        expediente.tipo_firma = datos.tipo_firma.strip()
        expediente.tipo_documento = (
            documentos_limpios[0]["tipo_documento"]
        )

        expediente.idioma_documento = (
            datos.idioma_documento.strip()
            if datos.idioma_documento
            and datos.idioma_documento.strip()
            else None
        )

        expediente.formato_escritura = (
            datos.formato_escritura.strip()
            if datos.formato_escritura
            and datos.formato_escritura.strip()
            else None
        )

        expediente.tipo_tramite = (
            datos.tipo_tramite.strip()
            if datos.tipo_tramite
            and datos.tipo_tramite.strip()
            else None
        )

        expediente.poblacion = (
            datos.poblacion.strip()
            if datos.poblacion and datos.poblacion.strip()
            else None
        )

        expediente.provincia = (
            datos.provincia.strip()
            if datos.provincia and datos.provincia.strip()
            else None
        )

        if datos.fecha_prevista_firma:
            expediente.fecha_prevista_firma = (
                datos.fecha_prevista_firma
            )

        # DATOS DE FACTURACIÓN
        campos_facturacion = [
            "facturacion_nombre",
            "facturacion_apellidos",
            "facturacion_dni_nif",
            "facturacion_direccion",
            "facturacion_codigo_postal",
            "facturacion_poblacion",
            "facturacion_provincia",
            "facturacion_telefono",
            "facturacion_email",
        ]

        for campo in campos_facturacion:
            valor = getattr(datos, campo, None)

            if valor is not None:
                valor = valor.strip() or None

            setattr(expediente, campo, valor)

        expediente.facturacion_empleado = bool(datos.facturacion_empleado)

        # DOCUMENTOS DE ESCRITURA
        db.query(ExpedienteDocumentoEscritura).filter(
            ExpedienteDocumentoEscritura.expediente_id == expediente.id
        ).delete(synchronize_session=False)

        for documento in documentos_limpios:
            db.add(
                ExpedienteDocumentoEscritura(
                    expediente_id=expediente.id,
                    tipo_documento=documento["tipo_documento"],
                    cuantia=documento["cuantia"],
                )
            )

        # CITA VINCULADA A AGENDA
        cita = crear_o_actualizar_cita_agenda(
            db,
            expediente,
            datos,
        )

        db.add(expediente)
        db.commit()
        db.refresh(expediente)

        if cita is not None:
            db.refresh(cita)

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        print(
            "ERROR ENVIANDO EXPEDIENTE A NOTARIO:",
            repr(exc),
            flush=True,
        )

        # Devolvemos una causa legible para que el frontend no oculte
        # el motivo real (por ejemplo, una clave foránea de notario).
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo guardar el envío a notario ni crear la cita "
                "de Agenda. Causa técnica: "
                f"{str(exc)[:500]}"
            ),
        )

    respuesta = expediente_a_dict(expediente)
    respuesta["agenda_cita_creada"] = cita is not None
    respuesta["agenda_cita_id"] = cita.id if cita is not None else None

    return respuesta


# ============================================================
# VALIDACIÓN DE DOCUMENTACIÓN PREVIA
# ============================================================

@router.get("/{id_expediente}/documentacion-previa/validacion")
def validar_documentacion_previa(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    pendientes = documentos_pendientes_documentacion_previa(
        db,
        id_expediente,
    )

    envio_guardado = envio_notario_guardado(expediente)

    return {
        "id_expediente": expediente.id_expediente,
        "actividad_actual": expediente.actividad_actual,
        "fecha_envio_notario": (
            expediente.fecha_envio_notario.isoformat()
            if expediente.fecha_envio_notario
            else None
        ),
        "envio_notario_guardado": envio_guardado,
        "documentos_obligatorios": (
            DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
        ),
        "documentos_pendientes": pendientes,
        "documentacion_completa": len(pendientes) == 0,
        "puede_avanzar": (
            envio_guardado and len(pendientes) == 0
        ),
    }


# ============================================================
# DATOS DE COMUNICACIÓN A ABSIS — DOCUMENTACIÓN PREVIA
# ============================================================

CAMPOS_ABSIS_DOCUMENTACION_PREVIA = {
    "certificado_saldo_cero_erroneo",
    "solicitud_cancelacion_notarial",
    "certificado_cancelacion_administrativo",
    "nota_simple_registral",
    "mover_siguiente_actividad",
}


def asegurar_tabla_estado_absis(db: Session) -> None:
    """Crea la tabla auxiliar si todavía no existe en PostgreSQL."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS expediente_documentacion_previa_absis (
            expediente_id VARCHAR(100) PRIMARY KEY,
            certificado_saldo_cero_erroneo BOOLEAN NOT NULL DEFAULT FALSE,
            solicitud_cancelacion_notarial BOOLEAN NOT NULL DEFAULT FALSE,
            certificado_cancelacion_administrativo BOOLEAN NOT NULL DEFAULT FALSE,
            nota_simple_registral BOOLEAN NOT NULL DEFAULT FALSE,
            mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE,
            enviado_a_absis BOOLEAN NOT NULL DEFAULT FALSE,
            solicitud_registrada_localmente BOOLEAN NOT NULL DEFAULT FALSE,
            fecha_solicitud_local TIMESTAMP WITHOUT TIME ZONE NULL,
            fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # Compatibilidad idempotente con instalaciones anteriores.
    db.execute(text("ALTER TABLE expediente_documentacion_previa_absis ADD COLUMN IF NOT EXISTS mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE"))
    db.execute(text("ALTER TABLE expediente_documentacion_previa_absis ADD COLUMN IF NOT EXISTS solicitud_registrada_localmente BOOLEAN NOT NULL DEFAULT FALSE"))
    db.execute(text("ALTER TABLE expediente_documentacion_previa_absis ADD COLUMN IF NOT EXISTS fecha_solicitud_local TIMESTAMP WITHOUT TIME ZONE NULL"))
    # La implementación anterior marcaba 'enviado_a_absis' aunque no había
    # transporte externo. Convertimos esas marcas antiguas en solicitudes locales.
    db.execute(text("""
        UPDATE expediente_documentacion_previa_absis
        SET solicitud_registrada_localmente = TRUE,
            fecha_solicitud_local = COALESCE(fecha_solicitud_local, fecha_actualizacion),
            enviado_a_absis = FALSE
        WHERE enviado_a_absis IS TRUE
          AND solicitud_registrada_localmente IS FALSE
    """))
    db.flush()


def leer_estado_absis(db: Session, id_expediente: str) -> dict:
    asegurar_tabla_estado_absis(db)
    fila = db.execute(text("""
        SELECT certificado_saldo_cero_erroneo,
               solicitud_cancelacion_notarial,
               certificado_cancelacion_administrativo,
               nota_simple_registral,
               mover_siguiente_actividad,
               enviado_a_absis,
               solicitud_registrada_localmente,
               fecha_solicitud_local,
               fecha_actualizacion
        FROM expediente_documentacion_previa_absis
        WHERE expediente_id = :expediente_id
    """), {"expediente_id": str(id_expediente)}).mappings().first()
    if not fila:
        return {
            "certificado_saldo_cero_erroneo": False,
            "solicitud_cancelacion_notarial": False,
            "certificado_cancelacion_administrativo": False,
            "nota_simple_registral": False,
            "mover_siguiente_actividad": False,
            "enviado_a_absis": False,
            "solicitud_registrada_localmente": False,
            "fecha_solicitud_local": None,
            "fecha_actualizacion": None,
        }
    return dict(fila)


@router.get("/{id_expediente}/documentacion-previa/absis")
def obtener_estado_absis_documentacion_previa(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    try:
        estado = leer_estado_absis(db, id_expediente)
        db.commit()
        return estado
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el estado de ABSIS: {str(exc)[:300]}")


@router.put("/{id_expediente}/documentacion-previa/absis")
def guardar_estado_absis_documentacion_previa(
    id_expediente: str,
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    valores = {campo: bool(datos.get(campo, False)) for campo in CAMPOS_ABSIS_DOCUMENTACION_PREVIA}
    try:
        asegurar_tabla_estado_absis(db)
        db.execute(text("""
            INSERT INTO expediente_documentacion_previa_absis (
                expediente_id, certificado_saldo_cero_erroneo,
                solicitud_cancelacion_notarial, certificado_cancelacion_administrativo,
                nota_simple_registral, mover_siguiente_actividad, enviado_a_absis,
                solicitud_registrada_localmente, fecha_solicitud_local, fecha_actualizacion
            ) VALUES (
                :expediente_id, :certificado_saldo_cero_erroneo,
                :solicitud_cancelacion_notarial, :certificado_cancelacion_administrativo,
                :nota_simple_registral, :mover_siguiente_actividad, FALSE,
                FALSE, NULL, CURRENT_TIMESTAMP
            )
            ON CONFLICT (expediente_id) DO UPDATE SET
                certificado_saldo_cero_erroneo = EXCLUDED.certificado_saldo_cero_erroneo,
                solicitud_cancelacion_notarial = EXCLUDED.solicitud_cancelacion_notarial,
                certificado_cancelacion_administrativo = EXCLUDED.certificado_cancelacion_administrativo,
                nota_simple_registral = EXCLUDED.nota_simple_registral,
                mover_siguiente_actividad = EXCLUDED.mover_siguiente_actividad,
                enviado_a_absis = FALSE,
                solicitud_registrada_localmente = FALSE,
                fecha_solicitud_local = NULL,
                fecha_actualizacion = CURRENT_TIMESTAMP
        """), {"expediente_id": str(id_expediente), **valores})
        db.commit()
        return leer_estado_absis(db, id_expediente)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudieron guardar los datos de ABSIS: {str(exc)[:300]}")


@router.post("/{id_expediente}/documentacion-previa/enviar-a-absis")
def registrar_envio_absis_documentacion_previa(
    id_expediente: str,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    try:
        asegurar_tabla_estado_absis(db)
        # Este endpoint registra el estado de preparación local. La transmisión real
        # requiere una API/credencial ABSIS, que no está definida en este proyecto.
        db.execute(text("""
            INSERT INTO expediente_documentacion_previa_absis (
                expediente_id, enviado_a_absis, solicitud_registrada_localmente,
                fecha_solicitud_local, fecha_actualizacion
            ) VALUES (:expediente_id, FALSE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (expediente_id) DO UPDATE SET
                enviado_a_absis = FALSE,
                solicitud_registrada_localmente = TRUE,
                fecha_solicitud_local = CURRENT_TIMESTAMP,
                fecha_actualizacion = CURRENT_TIMESTAMP
        """), {"expediente_id": str(id_expediente)})
        db.commit()
        return {
            **leer_estado_absis(db, id_expediente),
            "transmitido_a_absis": False,
            "mensaje": "Solicitud registrada localmente. No se ha transmitido a ABSIS; la API externa queda pendiente de implementación.",
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo registrar el envío a ABSIS: {str(exc)[:300]}")


# ============================================================
# AVANZAR DE DOCUMENTACIÓN PREVIA A SEDE NOTARIAL SIN PROTOCOLO
# ============================================================

class AvanzarActividadRequest(BaseModel):
    actividad_destino: Optional[str] = None
    # Permite que el propio flujo «Enviar a notario» confirme el avance
    # sin depender de una segunda confirmación separada de ABSIS.
    confirmar_envio_notario: bool = False


def _valor_no_vacio(valor):
    return valor is not None and str(valor).strip() != ""


def _validar_campos_obligatorios(expediente, nombres, etiquetas):
    pendientes = [etiquetas.get(nombre, nombre) for nombre in nombres
                  if not _valor_no_vacio(getattr(expediente, nombre, None))]
    if pendientes:
        raise HTTPException(
            status_code=409,
            detail={"mensaje": "No se puede avanzar: faltan campos obligatorios.", "campos_pendientes": pendientes},
        )


def _categorias_documentales(db: Session, id_expediente: str) -> list[str]:
    return [str(categoria or "") for (categoria,) in db.query(DocumentoCarpetaDigital.categoria).filter(
        DocumentoCarpetaDigital.expediente_id == str(id_expediente)
    ).all()]


def _tiene_categoria_documental(categorias: list[str], *terminos: str) -> bool:
    normalizadas = [normalizar_actividad_texto(categoria) for categoria in categorias]
    return any(all(normalizar_actividad_texto(termino) in categoria for termino in terminos)
               for categoria in normalizadas)


def _defectos_abiertos(db: Session, expediente) -> list:
    columnas = {c.name for c in ExpedienteDefecto.__table__.columns}
    consulta = db.query(ExpedienteDefecto)
    if "expediente_id" in columnas:
        consulta = consulta.filter(ExpedienteDefecto.expediente_id == expediente.id)
    elif "id_expediente" in columnas:
        consulta = consulta.filter(ExpedienteDefecto.id_expediente == str(expediente.id_expediente))
    else:
        raise HTTPException(status_code=500, detail="No se puede verificar la relación de los defectos con el expediente.")
    defectos = consulta.all()
    abiertos = []
    for defecto in defectos:
        cerrado = any(_valor_no_vacio(getattr(defecto, campo, None)) for campo in (
            "fecha_cierre_defecto", "fecha_subsanacion", "fecha_entrada_subsanacion", "fcierre_defecto"
        ))
        if not cerrado:
            abiertos.append(defecto)
    return abiertos


@router.post("/{id_expediente}/avanzar-actividad")
def avanzar_actividad_expediente(
    id_expediente: str,
    datos: Optional[AvanzarActividadRequest] = None,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    motivo_bloqueo = motivo_bloqueo_expediente(expediente)
    if motivo_bloqueo:
        raise HTTPException(status_code=423, detail=f"Expediente bloqueado: {motivo_bloqueo}. No se puede avanzar la actividad.")

    actual = resolver_actividad(expediente.actividad_actual)
    destino_solicitado = (datos.actividad_destino if datos else None)
    destino = resolver_actividad(destino_solicitado) if destino_solicitado else None
    confirmar_envio_notario = bool(datos and datos.confirmar_envio_notario)
    if confirmar_envio_notario and destino != "sede-notarial":
        raise HTTPException(status_code=400, detail="La confirmación de envío a notario solo permite avanzar a Sede notarial.")
    categorias = _categorias_documentales(db, id_expediente)

    if actual == "documentacion-previa":
        if destino not in (None, "sede-notarial"):
            raise HTTPException(status_code=409, detail="Desde Documentación previa solo se puede pasar a Sede notarial.")
        if not envio_notario_guardado(expediente):
            raise HTTPException(status_code=409, detail="Primero debes completar y guardar los datos de «Enviar a notario».")
        estado_absis = leer_estado_absis(db, id_expediente)
        # El botón Enviar a notario ya confirma el avance dentro del mismo flujo.
        # Se mantiene la confirmación separada para los avances manuales habituales.
        if not estado_absis.get("mover_siguiente_actividad", False) and not confirmar_envio_notario:
            raise HTTPException(status_code=409, detail="Confirma Sí en «Mover el expediente a la siguiente actividad» antes de avanzar.")
        pendientes = documentos_pendientes_documentacion_previa(db, id_expediente)
        if pendientes:
            raise HTTPException(status_code=409, detail={"mensaje": "Faltan documentos obligatorios en la carpeta digital.", "documentos_pendientes": pendientes})
        fincas = db.query(ExpedienteFinca).filter(ExpedienteFinca.expediente_id == expediente.id).all()
        if not fincas:
            raise HTTPException(status_code=409, detail="Antes de avanzar debes informar al menos una finca y su registro de la propiedad.")
        fincas_incompletas = [
            f for f in fincas
            if not _valor_no_vacio(getattr(f, "finca", None))
            or not _valor_no_vacio(getattr(f, "registro", None))
        ]
        if fincas_incompletas:
            raise HTTPException(status_code=409, detail="Todas las fincas deben tener informados el número de finca y el Registro de la Propiedad.")
        # La actividad solo se cierra cuando todas las validaciones han pasado.
        # La fecha de envío a notario es la fecha de fin de Documentación previa.
        if expediente.fecha_envio_notario:
            expediente.fecha_fin_actividad = expediente.fecha_envio_notario
        expediente.actividad_actual = "Sede notarial"

    elif actual == "sede-notarial":
        if not (_valor_no_vacio(expediente.protocolo) and _valor_no_vacio(expediente.fecha_firma)):
            raise HTTPException(status_code=409, detail="Sede notarial permanece activa hasta informar protocolo y fecha de firma.")
        expediente.actividad_actual = "Sede notarial con protocolo"

    elif actual == "sede-notarial-protocolo":
        requeridos = ["apoderado", "tipo_documento", "poblacion", "provincia", "tipo_firma", "fecha_firma", "protocolo", "asiento_presentacion_libro_diario", "fecha_presentacion", "numero_entrada", "fecha_recogida_notario_presentacion_telematica"]
        etiquetas = {"apoderado":"Apoderado", "tipo_documento":"Tipo documento", "poblacion":"Población", "provincia":"Provincia", "tipo_firma":"Tipo firma", "fecha_firma":"Fecha firma", "protocolo":"Protocolo", "asiento_presentacion_libro_diario":"Asiento presentación / Libro diario", "fecha_presentacion":"Fecha presentación", "numero_entrada":"Número de entrada", "fecha_recogida_notario_presentacion_telematica":"Fecha recogida notario o presentación telemática"}
        _validar_campos_obligatorios(expediente, requeridos, etiquetas)
        if str(expediente.apoderado).strip() not in ("Gestoría", "CaixaBank"):
            raise HTTPException(status_code=409, detail="Apoderado debe ser Gestoría o CaixaBank.")
        if not (_tiene_categoria_documental(categorias, "copia simple") or _tiene_categoria_documental(categorias, "copia", "escritura")):
            raise HTTPException(status_code=409, detail={"mensaje":"No se puede avanzar sin la copia simple de escritura en la carpeta digital.", "documentos_pendientes":["Copia simple de escritura"]})
        expediente.actividad_actual = "Liquidación de impuestos"

    elif actual == "liquidacion-impuestos":
        requeridos = ["fecha_presentacion_tributaria", "fecha_liquidacion_tributaria", "oficina_liquidadora", "base_imponible", "tributacion", "impuesto_ajd_itp"]
        etiquetas = {"fecha_presentacion_tributaria":"Fecha presentación tributaria", "fecha_liquidacion_tributaria":"Fecha liquidación tributaria", "oficina_liquidadora":"Oficina liquidadora / comunidad autónoma", "base_imponible":"Base imponible (€)", "tributacion":"Tributación", "impuesto_ajd_itp":"Impuesto (AJD / ITP)"}
        _validar_campos_obligatorios(expediente, requeridos, etiquetas)
        comunidades = {"andalucia", "aragon", "asturias", "illes balears", "canarias", "cantabria", "castilla-la mancha", "castilla y leon", "cataluna", "comunitat valenciana", "extremadura", "galicia", "comunidad de madrid", "region de murcia", "comunidad foral de navarra", "pais vasco", "la rioja", "ceuta", "melilla"}
        if normalizar_actividad_texto(expediente.oficina_liquidadora) not in comunidades:
            raise HTTPException(status_code=409, detail="Selecciona una oficina liquidadora o comunidad autónoma válida.")
        if normalizar_actividad_texto(expediente.tributacion) not in {"prescrito", "exento", "bonificacion", "renuncia", "ajd", "tpo"}:
            raise HTTPException(status_code=409, detail="Selecciona una opción válida en Tributación.")
        if str(expediente.impuesto_ajd_itp).strip().upper() not in ("AJD", "ITP"):
            raise HTTPException(status_code=409, detail="El impuesto debe ser AJD o ITP.")
        if float(expediente.base_imponible or 0) < 0:
            raise HTTPException(status_code=409, detail="La base imponible no puede ser negativa.")
        expediente.actividad_actual = "Tramitación inscripción"
        if not getattr(expediente, "fecha_presentacion", None):
            expediente.fecha_presentacion = expediente.fecha_liquidacion_tributaria

    elif actual == "tramitacion-inscripcion":
        # Un defecto notificado interrumpe temporalmente esta actividad. Se
        # atiende antes de validar el cierre registral y, una vez subsanado,
        # el expediente vuelve aquí para continuar el mismo circuito.
        abiertos = _defectos_abiertos(db, expediente)
        if abiertos:
            expediente.actividad_actual = "Defectos registrales"
        else:
            requeridos = ["fecha_presentacion", "fecha_vencimiento_asiento", "fecha_inscripcion", "escritura_simple_cancelacion", "registral_estado", "registral_fecha"]
            etiquetas = {"fecha_presentacion":"Fecha presentación", "fecha_vencimiento_asiento":"Fecha vencimiento asiento", "fecha_inscripcion":"Fecha inscripción", "escritura_simple_cancelacion":"Hoja de inscripción", "registral_estado":"Estado registral", "registral_fecha":"Fecha registral"}
            _validar_campos_obligatorios(expediente, requeridos, etiquetas)
            if not (_tiene_categoria_documental(categorias, "hoja de inscripcion") or _tiene_categoria_documental(categorias, "inscripcion")):
                raise HTTPException(status_code=409, detail={"mensaje":"Falta incorporar la hoja de inscripción a la carpeta digital.", "documentos_pendientes":["Hoja de inscripción"]})
            expediente.actividad_actual = "Cierre del expediente"

    elif actual == "defectos-registrales":
        abiertos = _defectos_abiertos(db, expediente)
        if abiertos:
            raise HTTPException(status_code=409, detail="No se puede continuar la tramitación mientras existan defectos registrales abiertos.")
        # La subsanación no cierra el expediente: reanuda la actividad que
        # quedó interrumpida por la calificación registral.
        expediente.actividad_actual = "Tramitación inscripción"

    elif actual == "facturacion-cierre":
        if not (str(getattr(expediente, "facturacion_estado", "") or "").strip().lower() in ("generada", "generado", "registrada", "registrado", "cerrada", "cerrado") and getattr(expediente, "facturacion_fecha", None) and getattr(expediente, "fecha_fin_actividad", None)):
            raise HTTPException(status_code=409, detail="El cierre solo se completa después de generar y registrar los honorarios de gestoría.")
        expediente.estado_actividad = "Cerrada"
    else:
        raise HTTPException(status_code=409, detail=f"No se puede avanzar desde la actividad actual: {expediente.actividad_actual or 'sin actividad'}.")

    actividad_destino_real = resolver_actividad(expediente.actividad_actual)
    if actividad_destino_real and actividad_destino_real != actual:
        asignar_gestor_automaticamente(db, expediente, actividad_destino_real)

    try:
        db.add(expediente)
        db.commit()
        db.refresh(expediente)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo actualizar la actividad: {str(exc)[:300]}")

    respuesta = expediente_a_dict(expediente)
    gestor_actual = db.query(Empleado).filter(Empleado.id == expediente.gestor_asignado_id).first() if getattr(expediente, "gestor_asignado_id", None) else None
    respuesta["gestor_asignado_nombre"] = " ".join(filter(None, [getattr(gestor_actual, "nombre", None), getattr(gestor_actual, "apellidos", None)])).strip() if gestor_actual else None
    asignaciones_provisionales = ids_asignaciones_provisionales(db, gestor_actual.id) if gestor_actual else set()
    respuesta["gestor_asignacion_provisional"] = str(expediente.id_expediente) in asignaciones_provisionales
    respuesta["actividad_actualizada"] = True
    respuesta["actividad_actual"] = expediente.actividad_actual
    return respuesta


# ============================================================
# GUARDAR CAMPOS DE LAS ACTIVIDADES
# ============================================================

class ActualizarCamposActividadRequest(BaseModel):
    campos: Dict[str, Any]


CAMPOS_EDITABLES_ACTIVIDAD = {
    campo
    for actividad in ACTIVIDADES_EXPEDIENTES
    for campo in {
        "fecha_inicio_actividad", "fecha_fin_actividad",
        "ultima_accion", "fecha_ultima_accion", "sol", "cs", "ns",
        "facturacion_nombre", "facturacion_apellidos", "facturacion_dni_nif",
        "facturacion_direccion", "facturacion_codigo_postal", "facturacion_poblacion",
        "facturacion_provincia", "facturacion_telefono", "facturacion_email",
        "fecha_envio_notario", "fecha_envio", "nombre_notario", "nif_notario", "apoderado", "observaciones",
        "tipo_documento", "poblacion", "provincia", "tipo_firma",
        "fecha_prevista_firma", "fecha_firma", "protocolo",
        "asiento_presentacion_libro_diario", "asiento_presentacion", "libro_diario", "tipo_gestoria",
        "fecha_presentacion", "numero_entrada", "fecha_recogida_notario_presentacion_telematica",
        "copia_simple_escritura", "fecha_presentacion_tributaria",
        "fecha_liquidacion_tributaria", "oficina_liquidadora",
        "base_imponible", "tributacion", "impuesto_ajd_itp",
        "fecha_vencimiento_asiento", "fecha_inscripcion",
        "escritura_simple_cancelacion", "registral_estado", "registral_fecha",
        "tiene_defectos_abiertos", "tipo_error", "falta_defecto",
        "descripcion_error", "fcierre_defecto", "facturacion_estado",
        "facturacion_fecha", "fecha_entregado_cliente",
    }
}


def convertir_valor_actividad(columna, valor):
    if valor == "":
        return None
    tipo = columna.type
    if isinstance(tipo, DateTime):
        return datetime.fromisoformat(valor) if isinstance(valor, str) else valor
    if isinstance(tipo, Date):
        return date.fromisoformat(valor[:10]) if isinstance(valor, str) else valor
    if isinstance(tipo, Time):
        return time.fromisoformat(valor) if isinstance(valor, str) else valor
    if isinstance(tipo, Boolean):
        if isinstance(valor, bool):
            return valor
        return str(valor).strip().lower() in ("1", "true", "sí", "si", "yes", "on")
    if isinstance(tipo, (Integer,)):
        return int(valor) if valor is not None else None
    if isinstance(tipo, (Float, Numeric)):
        return float(valor) if valor is not None else None
    return valor


@router.put("/{id_expediente}/actividad")
def actualizar_campos_actividad(
    id_expediente: str,
    datos: ActualizarCamposActividadRequest,
    db: Session = Depends(get_db),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    motivo_bloqueo = motivo_bloqueo_expediente(expediente)
    if motivo_bloqueo:
        raise HTTPException(status_code=423, detail=f"Expediente bloqueado: {motivo_bloqueo}. No se pueden modificar las actividades.")

    if not datos.campos:
        raise HTTPException(status_code=400, detail="No se han enviado campos para guardar.")

    columnas = {col.name: col for col in Expediente.__table__.columns}
    guardados = []
    no_disponibles = []

    for nombre, valor in datos.campos.items():
        if nombre not in CAMPOS_EDITABLES_ACTIVIDAD:
            continue
        columna = columnas.get(nombre)
        if columna is None:
            no_disponibles.append(nombre)
            continue
        try:
            setattr(expediente, nombre, convertir_valor_actividad(columna, valor))
            guardados.append(nombre)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Valor no válido para {nombre}: {exc}",
            )

    if not guardados:
        raise HTTPException(
            status_code=400,
            detail={
                "mensaje": "Ninguno de los campos enviados existe en el modelo de expediente.",
                "campos_no_disponibles": no_disponibles,
            },
        )

    if "fecha_presentacion" in guardados and resolver_actividad(expediente.actividad_actual) == "tramitacion-inscripcion" and expediente.fecha_presentacion:
        expediente.fecha_vencimiento_asiento = expediente.fecha_presentacion + timedelta(days=60)

    try:
        db.add(expediente)
        db.commit()
        db.refresh(expediente)
    except Exception as exc:
        db.rollback()
        print("ERROR GUARDANDO CAMPOS DE ACTIVIDAD:", repr(exc), flush=True)
        raise HTTPException(
            status_code=500,
            detail=f"No se pudieron guardar los campos de la actividad: {str(exc)[:400]}",
        )

    respuesta = expediente_a_dict(expediente)
    respuesta["campos_guardados"] = guardados
    respuesta["campos_no_disponibles"] = no_disponibles
    return respuesta


# ============================================================
# REGISTRO LOCAL DE SOLICITUDES ABSIS PARA SEDE NOTARIAL CON PROTOCOLO
# IMPORTANTE: guarda una solicitud pendiente; no llama a ABSIS ni cambia actividad.
# ============================================================

@router.post("/{id_expediente}/sede-notarial-protocolo/enviar-a-absis")
def registrar_solicitud_absis_sede_notarial_protocolo(
    id_expediente: str,
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    mover = bool(datos.get("mover_siguiente_actividad", False))
    payload_json = json.dumps(datos, ensure_ascii=False, default=str)
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS expediente_absis_solicitudes (
                id BIGSERIAL PRIMARY KEY,
                expediente_id VARCHAR(100) NOT NULL,
                actividad VARCHAR(100) NOT NULL,
                payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                solicitado_por INTEGER NULL,
                mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE,
                estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_CONFIGURACION',
                creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        result = db.execute(text("""
            INSERT INTO expediente_absis_solicitudes
                (expediente_id, actividad, payload, solicitado_por,
                 mover_siguiente_actividad, estado, creado_en)
            VALUES
                (:expediente_id, :actividad, CAST(:payload AS JSONB),
                 :solicitado_por, :mover, 'PENDIENTE_CONFIGURACION', CURRENT_TIMESTAMP)
            RETURNING id
        """), {
            "expediente_id": str(id_expediente),
            "actividad": "sede-notarial-protocolo",
            "payload": payload_json,
            "solicitado_por": getattr(usuario, "id", None),
            "mover": mover,
        })
        solicitud_id = result.scalar()
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo registrar localmente la solicitud ABSIS: {str(exc)[:300]}",
        )

    return {
        "ok": True,
        "solicitud_id": solicitud_id,
        "id_expediente": str(id_expediente),
        "actividad": "sede-notarial-protocolo",
        "registrado_localmente": True,
        "transmitido_a_absis": False,
        "mover_siguiente_actividad": mover,
        "actividad_modificada": False,
        "mensaje": (
            "Solicitud guardada localmente. No se ha transmitido a ABSIS ni "
            "se ha cambiado la actividad; falta configurar y probar la integración externa."
        ),
    }


# ============================================================
# REGISTRO LOCAL DE PETICIONES PARA LA FUTURA INTEGRACIÓN EXTERNA
# No envía datos a ABSIS; deja una entrada pendiente para trazabilidad.
# ============================================================

# Todas las actividades pueden dejar preparada una solicitud de envío a ABSIS,
# excepto Gestión económica, cuyo flujo es distinto.
ACTIVIDADES_CON_SOLICITUD_EXTERNA_PENDIENTE = {
    item["key"] for item in ACTIVIDADES_EXPEDIENTES
    if item["key"] != "gestion-economica"
}


def asegurar_tabla_solicitudes_integracion(db: Session) -> None:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS expediente_absis_solicitudes (
            id BIGSERIAL PRIMARY KEY,
            expediente_id VARCHAR(100) NOT NULL,
            actividad VARCHAR(100) NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            solicitado_por INTEGER NULL,
            mover_siguiente_actividad BOOLEAN NOT NULL DEFAULT FALSE,
            estado VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_CONFIGURACION',
            creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.flush()


@router.get("/{id_expediente}/integraciones-pendientes/{actividad}")
def obtener_solicitud_integracion_pendiente(
    id_expediente: str,
    actividad: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Devuelve la solicitud más reciente de una actividad, incluida su fecha de envío registrada."""
    actividad_normalizada = resolver_actividad(actividad)
    if actividad_normalizada not in ACTIVIDADES_CON_SOLICITUD_EXTERNA_PENDIENTE:
        raise HTTPException(status_code=422, detail="Esta actividad no admite solicitudes de integración pendientes.")
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    try:
        asegurar_tabla_solicitudes_integracion(db)
        fila = db.execute(text("""
            SELECT id, payload, estado, creado_en
            FROM expediente_absis_solicitudes
            WHERE expediente_id = :expediente_id AND actividad = :actividad
            ORDER BY id DESC
            LIMIT 1
        """), {
            "expediente_id": str(id_expediente),
            "actividad": actividad_normalizada,
        }).mappings().first()
        if not fila:
            return {"ok": True, "actividad": actividad_normalizada, "fecha_envio_absis": None, "estado": None, "solicitud_id": None}
        payload = fila["payload"] or {}
        if isinstance(payload, str):
            payload = json.loads(payload)
        return {
            "ok": True,
            "actividad": actividad_normalizada,
            "fecha_envio_absis": payload.get("fecha_envio_absis"),
            "estado": fila["estado"],
            "solicitud_id": fila["id"],
            "creado_en": fila["creado_en"],
            "transmitido_a_absis": False,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"No se pudo consultar el estado de envío a ABSIS: {str(exc)[:300]}")


@router.post("/{id_expediente}/integraciones-pendientes/{actividad}")
def registrar_solicitud_integracion_pendiente(
    id_expediente: str,
    actividad: str,
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Registra localmente una solicitud que el equipo informático integrará después.

    Este endpoint deliberadamente NO transmite información a ABSIS ni mueve
    automáticamente la actividad del expediente.
    """
    actividad_normalizada = resolver_actividad(actividad)
    if actividad_normalizada not in ACTIVIDADES_CON_SOLICITUD_EXTERNA_PENDIENTE:
        raise HTTPException(status_code=422, detail="Esta actividad no admite solicitudes de integración pendientes.")

    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    payload = dict(datos or {})
    mover = bool(payload.get("mover_siguiente_actividad", False))
    payload_json = json.dumps(payload, ensure_ascii=False, default=str)
    try:
        asegurar_tabla_solicitudes_integracion(db)
        result = db.execute(text("""
            INSERT INTO expediente_absis_solicitudes
                (expediente_id, actividad, payload, solicitado_por,
                 mover_siguiente_actividad, estado, creado_en)
            VALUES
                (:expediente_id, :actividad, CAST(:payload AS JSONB), :solicitado_por,
                 :mover, 'PENDIENTE_CONFIGURACION', CURRENT_TIMESTAMP)
            RETURNING id
        """), {
            "expediente_id": str(id_expediente),
            "actividad": actividad_normalizada,
            "payload": payload_json,
            "solicitado_por": getattr(usuario, "id", None),
            "mover": mover,
        })
        solicitud_id = result.scalar()
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo registrar la solicitud de integración: {str(exc)[:300]}",
        )

    return {
        "ok": True,
        "solicitud_id": solicitud_id,
        "id_expediente": str(id_expediente),
        "actividad": actividad_normalizada,
        "estado": "PENDIENTE_CONFIGURACION",
        "registrado_localmente": True,
        "transmitido_a_absis": False,
        "actividad_modificada": False,
        "mover_siguiente_actividad_solicitado": mover,
        "mensaje": "Petición registrada en el ERP. No se ha enviado a ABSIS ni se ha cambiado la actividad; queda pendiente de la API externa.",
    }


# ============================================================
# HONORARIOS DE GESTORÍA: REGISTRO IDEMPOTENTE EN EL BLOQUE PPAD
# ============================================================

@router.post("/{id_expediente}/honorarios-gestoria/generar")
def generar_honorarios_gestoria(
    id_expediente: str,
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Calcula la tarifa reconocida por el servidor y la registra en PPAD.

    La petición puede repetirse sin generar conceptos duplicados. El importe que
    envía el navegador no se considera autoritativo; se usa la tarifa conocida.
    Este endpoint registra un concepto interno, no emite una factura fiscal.
    """
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    db.execute(text("""
        CREATE TABLE IF NOT EXISTS facturas_honorarios_gestoria (
            id BIGSERIAL PRIMARY KEY,
            id_expediente VARCHAR(200) NOT NULL UNIQUE,
            numero_factura VARCHAR(40) NOT NULL UNIQUE,
            fecha_factura DATE NOT NULL,
            datos_factura JSONB NOT NULL,
            estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente de registro',
            creada_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            registrada_en TIMESTAMP WITHOUT TIME ZONE
        )
    """))
    factura_registrable = db.execute(text("""
        SELECT numero_factura, fecha_factura, datos_factura, estado
        FROM facturas_honorarios_gestoria
        WHERE id_expediente = :id_expediente
        FOR UPDATE
    """), {"id_expediente": str(id_expediente)}).mappings().first()
    if not factura_registrable:
        raise HTTPException(status_code=409, detail="Primero debe generarse el PDF oficial de la factura para asignar su número correlativo VI.")

    # La tarifa se decide con los datos guardados, no con el importe que envía
    # el navegador. Se consideran tanto los datos generales como las fincas.
    fincas = (
        db.query(ExpedienteFinca)
        .filter(ExpedienteFinca.expediente_id == expediente.id)
        .all()
    )
    entidades_guardadas = " ".join(
        str(f.entidad_original or "") for f in fincas
    ).strip()
    entidad_solicitada = str(datos.get("entidad") or "").strip()
    entidad = (entidades_guardadas or entidad_solicitada or "No identificada")[:300]
    ubicacion_guardada = " ".join(
        [str(expediente.provincia or "")]
        + [str(v or "") for f in fincas for v in (f.provincia, f.poblacion, f.registro)]
    ).casefold()
    # Si el modelo histórico no conserva la entidad, se usa el dato que
    # muestra la ficha como último recurso; la tarifa siempre es fija del servidor.
    entidad_key = (entidades_guardadas or entidad_solicitada).casefold()

    # La interfaz envía la categoría elegida a partir de la ficha y del
    # importe de provisión. El importe final siempre se lee del catálogo del servidor.
    tarifas_permitidas = {
        "Honorarios de gestoría — CaixaBank": ("CaixaBank", "Honorarios de gestoría — CaixaBank"),
        "Honorarios de gestoría — Otra entidad": ("Otras entidades", "Honorarios de gestoría — Otra entidad"),
        "Honorarios de gestoría — Canarias": ("Canarias", "Honorarios de gestoría — Canarias"),
    }
    nombre_solicitado = str(datos.get("tarifa") or "").strip()
    seleccion = tarifas_permitidas.get(nombre_solicitado)

    # Compatibilidad con llamadas antiguas que no enviaban el nombre de tarifa.
    if seleccion is None:
        if any(termino in ubicacion_guardada for termino in (
            "las palmas", "palmas (las)", "santa cruz de tenerife", "tenerife", "canarias", "canary islands"
        )):
            seleccion = ("Canarias", "Honorarios de gestoría — Canarias")
        elif any(termino in entidad_key for termino in (
            "caixabank", "caixa bank", "la caixa"
        )):
            seleccion = ("CaixaBank", "Honorarios de gestoría — CaixaBank")
        else:
            seleccion = ("Otras entidades", "Honorarios de gestoría — Otra entidad")

    tarifa, nombre_catalogo = seleccion
    honorario_catalogo = (
        db.query(HonorarioGestoria)
        .filter(
            HonorarioGestoria.nombre == nombre_catalogo,
            HonorarioGestoria.activo.is_(True),
        )
        .first()
    )
    if honorario_catalogo is None:
        # La ruta de listado crea/restaura las tarifas iniciales, pero el endpoint
        # de generación debe poder recuperarlas aunque se invoque directamente.
        from backend.app.honorarios_gestoria.router import asegurar_catalogo_inicial
        asegurar_catalogo_inicial(db)
        honorario_catalogo = (
            db.query(HonorarioGestoria)
            .filter(
                HonorarioGestoria.nombre == nombre_catalogo,
                HonorarioGestoria.activo.is_(True),
            )
            .first()
        )
    if honorario_catalogo is None:
        raise HTTPException(
            status_code=409,
            detail=f"No existe una tarifa activa en el catálogo: {nombre_catalogo}.",
        )
    importe = Decimal(str(honorario_catalogo.importe or "0")).quantize(Decimal("0.01"))
    if bool(getattr(expediente, "facturacion_empleado", False)):
        importe = (importe * Decimal("0.50")).quantize(Decimal("0.01"))

    imputable_a = str(datos.get("imputable_a") or "Molsan").strip()
    if imputable_a not in ("Molsan", "Externo"):
        raise HTTPException(status_code=422, detail="imputable_a debe ser Molsan o Externo.")

    concepto = f"Honorarios de gestoría - {tarifa}"
    existente = (
        db.query(ExpedientePPAD)
        .filter(
            ExpedientePPAD.expediente_id == expediente.id,
            ExpedientePPAD.concepto == concepto,
        )
        .order_by(ExpedientePPAD.id.desc())
        .first()
    )
    ya_existia = existente is not None
    registro = existente or ExpedientePPAD(
        expediente_id=expediente.id,
        concepto=concepto,
        importe=importe,
        imputable_a=imputable_a,
    )
    registro.importe = importe
    registro.imputable_a = imputable_a
    if not ya_existia:
        db.add(registro)

    datos_factura_guardados = factura_registrable["datos_factura"]
    if isinstance(datos_factura_guardados, str):
        datos_factura_guardados = json.loads(datos_factura_guardados)
    fecha_registro_factura = factura_registrable["fecha_factura"]
    expediente.facturacion_estado = "Registrada"
    expediente.facturacion_fecha = fecha_registro_factura
    try:
        db.execute(text("""
            UPDATE facturas_honorarios_gestoria
            SET estado = 'Registrada', registrada_en = CURRENT_TIMESTAMP
            WHERE id_expediente = :id_expediente
        """), {"id_expediente": str(id_expediente)})
        db.commit()
        db.refresh(registro)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudieron registrar los honorarios y la factura: {str(exc)[:300]}",
        )

    return {
        "ok": True,
        "numero_factura": factura_registrable["numero_factura"],
        "fecha_factura": str(fecha_registro_factura),
        "estado_factura": "Registrada",
        "guardado": True,
        "id": registro.id,
        "ppad_id": registro.id,
        "id_expediente": str(id_expediente),
        "expediente_id": registro.expediente_id,
        "concepto": registro.concepto,
        "importe": float(registro.importe or 0),
        "tarifa": tarifa,
        "entidad": entidad,
        "imputable_a": registro.imputable_a,
        "ya_existia": ya_existia,
        "mensaje": "Honorarios registrados en PPAD." if not ya_existia else "El concepto PPAD ya existía y se ha actualizado.",
    }


@router.post("/{id_expediente}/honorarios-gestoria/factura-pdf")
def generar_documento_factura_honorarios(
    id_expediente: str,
    datos: Dict[str, Any],
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Rellena el DOCX oficial del concepto «honorarios gestoría» y conserva logo/QR."""
    from docx import Document
    from backend.app.tipos_concepto_gastos.models import TipoConceptoGastos
    from backend.app.tipos_concepto_gastos.router import garantizar_catalogo_inicial

    garantizar_catalogo_inicial(db)
    concepto = db.query(TipoConceptoGastos).filter(
        func.lower(func.trim(TipoConceptoGastos.nombre)) == "honorarios gestoría"
    ).order_by(TipoConceptoGastos.id.asc()).first()
    if not concepto:
        raise HTTPException(status_code=409, detail="No existe el concepto «honorarios gestoría» en Tipos de Concepto de Gastos. No se ha generado la factura.")

    db.execute(text("""
        CREATE TABLE IF NOT EXISTS correspondencia_configuracion (
            id INTEGER PRIMARY KEY,
            firma_pie TEXT NOT NULL DEFAULT '',
            factura_nombre VARCHAR(255),
            factura_tipo VARCHAR(160),
            factura_contenido BYTEA,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT correspondencia_configuracion_unica CHECK (id = 1)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS plantilla_factura_concepto_gasto (
            concepto_gasto_id INTEGER PRIMARY KEY,
            nombre_archivo VARCHAR(255) NOT NULL,
            tipo_archivo VARCHAR(160) NOT NULL DEFAULT 'application/octet-stream',
            contenido BYTEA NOT NULL,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS facturas_honorarios_gestoria (
            id BIGSERIAL PRIMARY KEY,
            id_expediente VARCHAR(200) NOT NULL UNIQUE,
            numero_factura VARCHAR(40) NOT NULL UNIQUE,
            fecha_factura DATE NOT NULL,
            datos_factura JSONB NOT NULL,
            estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente de registro',
            creada_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            registrada_en TIMESTAMP WITHOUT TIME ZONE
        )
    """))
    # Migra una plantilla antigua si existía antes de separar la configuración de email.
    db.execute(text("""
        INSERT INTO plantilla_factura_concepto_gasto
            (concepto_gasto_id, nombre_archivo, tipo_archivo, contenido)
        SELECT :concepto_id, factura_nombre, COALESCE(factura_tipo, 'application/octet-stream'), factura_contenido
        FROM correspondencia_configuracion
        WHERE id = 1 AND factura_contenido IS NOT NULL AND factura_nombre IS NOT NULL
        ON CONFLICT (concepto_gasto_id) DO NOTHING
    """), {"concepto_id": concepto.id})
    db.commit()
    plantilla = db.execute(text("""
        SELECT nombre_archivo, contenido
        FROM plantilla_factura_concepto_gasto WHERE concepto_gasto_id = :concepto_id
    """), {"concepto_id": concepto.id}).mappings().first()
    if not plantilla or not plantilla["contenido"]:
        raise HTTPException(status_code=404, detail="Falta cargar la plantilla Word en Catálogos → Tipos de Concepto de Gastos → honorarios gestoría.")

    expediente = db.query(Expediente).filter(Expediente.id_expediente == str(id_expediente)).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    # Serie correlativa VI/NNNNN-AA. El bloqueo transaccional evita duplicados
    # si dos usuarios generan facturas simultáneamente.
    db.execute(text("SELECT pg_advisory_xact_lock(724190281)"))
    factura_existente = db.execute(text("""
        SELECT numero_factura, datos_factura, estado
        FROM facturas_honorarios_gestoria
        WHERE id_expediente = :id_expediente
        FOR UPDATE
    """), {"id_expediente": str(id_expediente)}).mappings().first()
    if factura_existente:
        # Los reintentos conservan el número ya asignado, incluidos documentos
        # antiguos; nunca se renumeran facturas que ya existan.
        datos_guardados = factura_existente["datos_factura"]
        if isinstance(datos_guardados, str):
            datos_guardados = json.loads(datos_guardados)
        datos.clear()
        datos.update(dict(datos_guardados or {}))
        numero_factura = str(factura_existente["numero_factura"])
    else:
        fecha_numero = str(datos.get("fecha_factura") or date.today().isoformat())[:10]
        anio_corto = fecha_numero[2:4]
        siguiente = db.execute(text("""
            SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM 4 FOR 5) AS BIGINT)), 0) + 1
            FROM facturas_honorarios_gestoria
            WHERE numero_factura LIKE :patron
              AND numero_factura ~ :formato
        """), {
            "patron": f"VI/%-{anio_corto}",
            "formato": rf"^VI/[0-9]{{5}}-{anio_corto}$",
        }).scalar()
        numero_factura = f"VI/{int(siguiente or 1):05d}-{anio_corto}"
        datos["numero_factura"] = numero_factura


    def valor(obj, *nombres):
        for nombre in nombres:
            dato = getattr(obj, nombre, None) if obj is not None else None
            if dato is not None and str(dato).strip():
                return str(dato).strip()
        return ""

    def fecha_es(valor_fecha):
        if not valor_fecha:
            return "—"
        try:
            return datetime.fromisoformat(str(valor_fecha)[:10]).strftime("%d/%m/%Y")
        except (ValueError, TypeError):
            return str(valor_fecha)

    def euros(valor_importe):
        try:
            return f"{float(str(valor_importe or 0).replace(',', '.')):,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")
        except (ValueError, TypeError):
            return "0,00 €"

    def poner_en_celda(celda, texto):
        parrafo = celda.paragraphs[0] if celda.paragraphs else celda.add_paragraph()
        if parrafo.runs:
            parrafo.runs[0].text = str(texto)
            for run in parrafo.runs[1:]:
                run.text = ""
        else:
            parrafo.add_run(str(texto))

    try:
        # Validamos la plantilla oficial del concepto y recuperamos su imagen
        # corporativa para que el PDF conserve la identidad del documento.
        from docx import Document
        import zipfile
        import base64
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_LEFT, TA_RIGHT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as PDFImage
        from xml.sax.saxutils import escape

        plantilla_bytes = bytes(plantilla["contenido"])
        Document(io.BytesIO(plantilla_bytes))  # Comprueba que la plantilla oficial sea válida.
        numero_factura = str(datos.get("numero_factura") or numero_factura).strip()
        fecha_factura = fecha_es(datos.get("fecha_factura"))
        cliente_rel = getattr(expediente, "cliente", None)
        cliente = str(datos.get("cliente") or " ".join(filter(None, [valor(expediente, "facturacion_nombre"), valor(expediente, "facturacion_apellidos")])) or valor(cliente_rel, "nombre_facturacion", "nombre_completo") or valor(expediente, "nombre_solicitante", "nombre_titular") or "").strip()
        nif_cliente = str(datos.get("nif_cliente") or valor(expediente, "facturacion_dni_nif", "nif_solicitante", "dni_solicitante", "nif_titular") or valor(cliente_rel, "dni_facturacion", "dni") or "").strip()
        direccion_facturacion = str(datos.get("direccion_facturacion") or valor(expediente, "facturacion_direccion") or valor(cliente_rel, "direccion_facturacion", "direccion") or "").strip()
        codigo_postal_facturacion = str(datos.get("codigo_postal_facturacion") or valor(expediente, "facturacion_codigo_postal") or valor(cliente_rel, "codigo_postal_facturacion", "codigo_postal") or "").strip()
        poblacion_facturacion = str(datos.get("poblacion_facturacion") or valor(expediente, "facturacion_poblacion") or valor(cliente_rel, "poblacion_facturacion", "poblacion") or "").strip()
        provincia_facturacion = str(datos.get("provincia_facturacion") or valor(expediente, "facturacion_provincia") or valor(cliente_rel, "provincia_facturacion", "provincia") or "").strip()
        concepto_factura = str(datos.get("concepto") or "Honorarios de gestoría").strip()
        base = Decimal(str(datos.get("base_imponible") or 0).replace(",", ".")).quantize(Decimal("0.01"))
        impuesto = Decimal(str(datos.get("importe_impuesto") or 0).replace(",", ".")).quantize(Decimal("0.01"))
        total_dato = datos.get("total_factura")
        total = Decimal(str(total_dato if total_dato is not None else base + impuesto).replace(",", ".")).quantize(Decimal("0.01"))
        tipo_impuesto = str(datos.get("tipo_impuesto") or "IVA").strip().upper()
        porcentaje = str(datos.get("porcentaje_impuesto") or ("7" if tipo_impuesto == "IGIC" else "21")).strip()
        numero_expediente = str(id_expediente)
        notario = valor(expediente, "nombre_notario", "notario_otorgante", "notario") or "—"
        protocolo = valor(expediente, "protocolo") or "—"
        fecha_firma = fecha_es(valor(expediente, "fecha_firma"))
        tipo_documento_expediente = valor(expediente, "tipo_documento", "formato_escritura") or "—"
        datos_empresa = {}
        try:
            fila_empresa = db.execute(text("SELECT datos FROM datos_molsan_config WHERE id = 1")).mappings().first()
            datos_empresa = dict((fila_empresa or {}).get("datos") or {})
        except Exception:
            datos_empresa = {}
        razon_social = str(datos_empresa.get("razon_social") or "MOLSAN GESTIÓN Y TRAMITACIÓN").strip()
        nif_empresa = str(datos_empresa.get("nif") or "").strip()
        domicilio_empresa = str(datos_empresa.get("domicilio_fiscal") or "").strip()
        localidad_empresa = " ".join(filter(None, [str(datos_empresa.get("codigo_postal") or "").strip(), str(datos_empresa.get("poblacion") or "").strip(), str(datos_empresa.get("provincia") or "").strip()]))
        telefono_empresa = str(datos_empresa.get("telefono") or "").strip()
        web_empresa = str(datos_empresa.get("web") or "").strip()
        logo_empresa_data = str(datos_empresa.get("logo_data_url") or "").strip()
        tipo_documento_expediente = valor(expediente, "tipo_documento", "formato_escritura") or "—"
        descuento = Decimal(str(datos.get("descuento_empleado") or 0).replace(",", ".")).quantize(Decimal("0.01"))
        es_empleado = str(datos.get("empleado") or "").strip().lower() in {"true", "1", "si", "sí"}
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm,
            topMargin=15*mm, bottomMargin=17*mm,
            title=f"Factura {numero_factura} - expediente {numero_expediente}",
            author="ERP-Molsan",
        )
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name="FacturaTituloMolsan", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=colors.HexColor("#15325b"), alignment=TA_LEFT, spaceAfter=2*mm))
        styles.add(ParagraphStyle(name="FacturaSubMolsan", parent=styles["Normal"], fontSize=9, leading=13, textColor=colors.HexColor("#596579"), spaceAfter=2*mm))
        styles.add(ParagraphStyle(name="FacturaSeccionMolsan", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.HexColor("#15325b"), spaceBefore=4*mm, spaceAfter=2*mm))
        styles.add(ParagraphStyle(name="FacturaCeldaMolsan", parent=styles["BodyText"], fontSize=8.5, leading=11))
        styles.add(ParagraphStyle(name="FacturaCeldaDerMolsan", parent=styles["BodyText"], fontSize=8.5, leading=11, alignment=TA_RIGHT))
        styles.add(ParagraphStyle(name="FacturaTotalMolsan", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=11, leading=14, alignment=TA_RIGHT, textColor=colors.HexColor("#15325b")))
        story = []
        # Reutiliza la primera imagen incrustada en la plantilla Word oficial (normalmente el logo).
        logo = None
        try:
            if logo_empresa_data.startswith("data:image/") and "," in logo_empresa_data:
                logo = PDFImage(io.BytesIO(base64.b64decode(logo_empresa_data.split(",", 1)[1])), width=32*mm, height=18*mm, kind="proportional")
        except Exception:
            logo = None
        try:
            with zipfile.ZipFile(io.BytesIO(plantilla_bytes)) as archivo_docx:
                imagenes = sorted(n for n in archivo_docx.namelist() if n.startswith("word/media/") and not n.endswith("/"))
                if imagenes and not logo:
                    logo = PDFImage(io.BytesIO(archivo_docx.read(imagenes[0])), width=32*mm, height=18*mm, kind="proportional")
        except Exception:
            logo = None
        if logo:
            cabecera = Table([[logo, Paragraph("<b>MOLSAN GESTIÓN Y TRAMITACIÓN</b><br/><font size='8'>Factura de honorarios de gestoría</font>", styles["FacturaSubMolsan"])]], colWidths=[38*mm, 136*mm])
            cabecera.setStyle(TableStyle([
                ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("LEFTPADDING", (0,0), (-1,-1), 0),
                ("RIGHTPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
                ("LINEBELOW", (0,0), (-1,-1), 1, colors.HexColor("#d6deea")),
            ]))
            story.extend([cabecera, Spacer(1, 6*mm)])
        else:
            story.extend([Paragraph("MOLSAN GESTIÓN Y TRAMITACIÓN", styles["FacturaTituloMolsan"]), Paragraph("Factura de honorarios de gestoría", styles["FacturaSubMolsan"]), Spacer(1, 4*mm)])
        story.append(Paragraph("FACTURA", styles["FacturaTituloMolsan"]))
        lineas_empresa = [f"<b>{escape(razon_social)}</b>"]
        if nif_empresa: lineas_empresa.append(f"NIF: {escape(nif_empresa)}")
        if domicilio_empresa: lineas_empresa.append(escape(domicilio_empresa))
        if localidad_empresa: lineas_empresa.append(escape(localidad_empresa))
        if telefono_empresa: lineas_empresa.append(f"Tel. {escape(telefono_empresa)}")
        if web_empresa: lineas_empresa.append(escape(web_empresa))
        story.append(Paragraph("<br/>".join(lineas_empresa), styles["FacturaSubMolsan"]))
        cabecera_datos = [
            [Paragraph("<b>Número de factura</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Fecha</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Expediente</b>", styles["FacturaCeldaMolsan"])],
            [Paragraph(escape(numero_factura), styles["FacturaCeldaMolsan"]), Paragraph(escape(fecha_factura), styles["FacturaCeldaMolsan"]), Paragraph(escape(numero_expediente), styles["FacturaCeldaMolsan"])],
        ]
        tabla_cabecera = Table(cabecera_datos, colWidths=[58*mm, 43*mm, 73*mm])
        tabla_cabecera.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), colors.white),
            ("BOX", (0,0), (-1,-1), .5, colors.HexColor("#d5deea")),
            ("INNERGRID", (0,0), (-1,-1), .35, colors.HexColor("#d5deea")),
            ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7),
            ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 7),
            ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ]))
        story.extend([tabla_cabecera, Paragraph("DATOS DEL CLIENTE", styles["FacturaSeccionMolsan"])])
        cliente_txt = escape(cliente or "—")
        nif_txt = escape(nif_cliente or "—")
        direccion_txt = escape(direccion_facturacion or "—")
        cp_txt = escape(codigo_postal_facturacion or "—")
        poblacion_txt = escape(poblacion_facturacion or "—")
        provincia_txt = escape(provincia_facturacion or "—")
        datos_cliente = Table([
            [Paragraph("<b>Cliente / titular</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>NIF / CIF</b>", styles["FacturaCeldaMolsan"])],
            [Paragraph(cliente_txt, styles["FacturaCeldaMolsan"]), Paragraph(nif_txt, styles["FacturaCeldaMolsan"])],
            [Paragraph("<b>Dirección</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Código postal</b>", styles["FacturaCeldaMolsan"])],
            [Paragraph(direccion_txt, styles["FacturaCeldaMolsan"]), Paragraph(cp_txt, styles["FacturaCeldaMolsan"])],
            [Paragraph("<b>Población</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Provincia</b>", styles["FacturaCeldaMolsan"])],
            [Paragraph(poblacion_txt, styles["FacturaCeldaMolsan"]), Paragraph(provincia_txt, styles["FacturaCeldaMolsan"])],
        ], colWidths=[87*mm, 87*mm])
        datos_cliente.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), colors.white),
            ("BOX", (0,0), (-1,-1), .5, colors.HexColor("#d5deea")),
            ("INNERGRID", (0,0), (-1,-1), .35, colors.HexColor("#d5deea")),
            ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7),
            ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 7),
            ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ]))
        story.extend([datos_cliente, Paragraph("DATOS DEL EXPEDIENTE", styles["FacturaSeccionMolsan"])])
        datos_expediente = [
            [Paragraph("<b>N.º Expediente</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Documento</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Notario</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Protocolo</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Fecha de firma</b>", styles["FacturaCeldaMolsan"])],
            [Paragraph(escape(numero_expediente), styles["FacturaCeldaMolsan"]), Paragraph(escape(tipo_documento_expediente), styles["FacturaCeldaMolsan"]), Paragraph(escape(notario), styles["FacturaCeldaMolsan"]), Paragraph(escape(protocolo), styles["FacturaCeldaMolsan"]), Paragraph(escape(fecha_firma), styles["FacturaCeldaMolsan"])],
        ]
        tabla_exp = Table(datos_expediente, colWidths=[31*mm, 34*mm, 43*mm, 28*mm, 38*mm])
        tabla_exp.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,-1), colors.white),
            ("BOX", (0,0), (-1,-1), .5, colors.HexColor("#d5deea")),
            ("INNERGRID", (0,0), (-1,-1), .35, colors.HexColor("#d5deea")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
            ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        story.extend([tabla_exp, Paragraph("DETALLE DE FACTURACIÓN", styles["FacturaSeccionMolsan"])])
        story.append(Paragraph(f"<b>Concepto:</b> {escape(concepto_factura)}", styles["FacturaCeldaMolsan"]))
        story.append(Spacer(1, 3*mm))
        importe_honorarios_bruto = base + descuento if (es_empleado or descuento > 0) else base
        descripcion_honorarios = f"{concepto_factura} (antes de descuento)" if (es_empleado or descuento > 0) else concepto_factura
        detalle = [
            [Paragraph("<b>Descripción</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Importe</b>", styles["FacturaCeldaDerMolsan"])],
            [Paragraph(escape(descripcion_honorarios), styles["FacturaCeldaMolsan"]), Paragraph(euros(importe_honorarios_bruto), styles["FacturaCeldaDerMolsan"])],
        ]
        tabla_detalle = Table(detalle, colWidths=[125*mm, 49*mm])
        tabla_detalle.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#edf2f8")),
            ("BOX", (0,0), (-1,-1), .5, colors.HexColor("#d5deea")),
            ("INNERGRID", (0,0), (-1,-1), .35, colors.HexColor("#d5deea")),
            ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 7),
            ("RIGHTPADDING", (0,0), (-1,-1), 7), ("TOPPADDING", (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ]))
        story.append(tabla_detalle)
        if es_empleado or descuento > 0:
            resumen = [
                [Paragraph("Honorarios antes del descuento", styles["FacturaCeldaMolsan"]), Paragraph(euros(base + descuento), styles["FacturaCeldaDerMolsan"])],
                [Paragraph("Descuento empleado (50 %)", styles["FacturaCeldaMolsan"]), Paragraph(f"− {euros(descuento)}", styles["FacturaCeldaDerMolsan"])],
                [Paragraph("<b>Base imponible tras descuento</b>", styles["FacturaCeldaMolsan"]), Paragraph(f"<b>{euros(base)}</b>", styles["FacturaCeldaDerMolsan"])],
            ]
        else:
            resumen = [
                [Paragraph("Base imponible", styles["FacturaCeldaMolsan"]), Paragraph(euros(base), styles["FacturaCeldaDerMolsan"])],
            ]
        resumen.extend([
            [Paragraph(f"{escape(tipo_impuesto)} {escape(porcentaje)} %", styles["FacturaCeldaMolsan"]), Paragraph(euros(impuesto), styles["FacturaCeldaDerMolsan"])],
            [Paragraph("<b>TOTAL FACTURA</b>", styles["FacturaTotalMolsan"]), Paragraph(f"<b>{euros(total)}</b>", styles["FacturaTotalMolsan"])],
        ])
        tabla_resumen = Table(resumen, colWidths=[125*mm, 49*mm], hAlign="RIGHT")
        tabla_resumen.setStyle(TableStyle([
            ("LINEABOVE", (0,0), (-1,0), .8, colors.HexColor("#9aabc2")),
            ("BACKGROUND", (0,-1), (-1,-1), colors.white),
            ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
            ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        story.extend([Spacer(1, 3*mm), tabla_resumen, Paragraph("DATOS DEL EXPEDIENTE", styles["FacturaSeccionMolsan"])])
        datos_expediente = [
            [Paragraph("<b>Documento</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Notario</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Protocolo</b>", styles["FacturaCeldaMolsan"]), Paragraph("<b>Fecha de firma</b>", styles["FacturaCeldaMolsan"])],
            [Paragraph(escape(nif_cliente or "—"), styles["FacturaCeldaMolsan"]), Paragraph(escape(notario), styles["FacturaCeldaMolsan"]), Paragraph(escape(protocolo), styles["FacturaCeldaMolsan"]), Paragraph(escape(fecha_firma), styles["FacturaCeldaMolsan"])],
        ]
        tabla_exp = Table(datos_expediente, colWidths=[43.5*mm]*4)
        tabla_exp.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#edf2f8")),
            ("BOX", (0,0), (-1,-1), .5, colors.HexColor("#d5deea")),
            ("INNERGRID", (0,0), (-1,-1), .35, colors.HexColor("#d5deea")),
            ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 5),
            ("RIGHTPADDING", (0,0), (-1,-1), 5), ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(tabla_exp)
        if datos.get("observaciones"):
            story.extend([Paragraph("OBSERVACIONES", styles["FacturaSeccionMolsan"]), Paragraph(escape(str(datos["observaciones"])).replace("\\n", "<br/>"), styles["FacturaCeldaMolsan"])])
        story.extend([Spacer(1, 5*mm), Paragraph("<b>Factura verificable en la Sede Electrónica de la AEAT</b>", styles["FacturaSubMolsan"]), Paragraph("Espacio reservado para el QR fiscal. Se incorporará cuando la emisión Veri*Factu esté integrada y validada; no se genera un código QR ficticio.", styles["FacturaSubMolsan"])])
        doc.build(story)
        buffer.seek(0)
        if not factura_existente:
            db.execute(text("""
                INSERT INTO facturas_honorarios_gestoria
                    (id_expediente, numero_factura, fecha_factura, datos_factura, estado)
                VALUES
                    (:id_expediente, :numero_factura, :fecha_factura, CAST(:datos_factura AS JSONB), 'Pendiente de registro')
            """), {
                "id_expediente": str(id_expediente),
                "numero_factura": numero_factura,
                "fecha_factura": str(datos.get("fecha_factura") or date.today().isoformat())[:10],
                "datos_factura": json.dumps(datos, ensure_ascii=False, default=str),
            })
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.exception("No se pudo generar el PDF oficial de honorarios para %s", id_expediente)
        raise HTTPException(status_code=500, detail="No se pudo generar el PDF de la factura. Revisa que la plantilla oficial del concepto esté íntegra.")

    nombre_salida = f"Factura_honorarios_{id_expediente}.pdf".replace("/", "-").replace("\\\\", "-")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{nombre_salida}"',
            "X-Numero-Factura": numero_factura,
        },
    )

# ============================================================
# CONSULTAR UN EXPEDIENTE
# ============================================================

class ControlBloqueoRequest(BaseModel):
    liquidado_sin_tramitar: bool = False
    fecha_liquidacion_sin_tramitar: Optional[date] = None
    cambio_gestoria: bool = False
    fecha_cambio_gestoria: Optional[date] = None
    bloqueo_manual: bool = False
    motivo_bloqueo: Optional[str] = None
    fecha_bloqueo: Optional[date] = None


def motivo_bloqueo_expediente(expediente: Expediente) -> Optional[str]:
    estado = str(getattr(expediente, "estado_expediente", "") or "").strip().upper()
    if estado.startswith("LST"):
        return "LIQUIDADO SIN TRAMITAR"
    if estado.startswith("RST"):
        return "RETENCIÓN SIN TRAMITAR"
    if bool(getattr(expediente, "liquidado_sin_tramitar", False)):
        return "LIQUIDADO SIN TRAMITAR"
    if bool(getattr(expediente, "cambio_gestoria", False)):
        return "CAMBIO DE GESTORÍA"
    if bool(getattr(expediente, "bloqueo_manual", False)):
        return str(getattr(expediente, "motivo_bloqueo", None) or "BLOQUEO MANUAL")
    return None


@router.put("/{id_expediente}/control-bloqueo")
def actualizar_control_bloqueo(
    id_expediente: str,
    datos: ControlBloqueoRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    # Solo un administrador puede retirar un bloqueo efectivo ya existente.
    estado_actual = str(getattr(expediente, "estado_expediente", "") or "").strip().upper()
    bloqueo_actual = bool(motivo_bloqueo_expediente(expediente))
    bloqueo_solicitado = bool(
        datos.liquidado_sin_tramitar
        or datos.cambio_gestoria
        or datos.bloqueo_manual
        or estado_actual.startswith(("LST", "RST"))
    )
    if bloqueo_actual and not bloqueo_solicitado and not _usuario_es_admin_visibilidad(usuario):
        raise HTTPException(status_code=403, detail="Solo un administrador puede desbloquear un expediente.")

    if datos.liquidado_sin_tramitar and not datos.fecha_liquidacion_sin_tramitar and not str(expediente.estado_expediente or "").strip().upper().startswith("LST"):
        raise HTTPException(status_code=422, detail="Indica la fecha de liquidación sin tramitar.")
    if datos.cambio_gestoria and not datos.fecha_cambio_gestoria:
        raise HTTPException(status_code=422, detail="Indica la fecha del cambio de gestoría.")
    if datos.bloqueo_manual and not (datos.motivo_bloqueo or "").strip():
        raise HTTPException(status_code=422, detail="Indica el motivo del bloqueo manual.")

    expediente.liquidado_sin_tramitar = datos.liquidado_sin_tramitar
    expediente.fecha_liquidacion_sin_tramitar = datos.fecha_liquidacion_sin_tramitar if datos.liquidado_sin_tramitar else None
    expediente.cambio_gestoria = datos.cambio_gestoria
    expediente.fecha_cambio_gestoria = datos.fecha_cambio_gestoria if datos.cambio_gestoria else None
    expediente.bloqueo_manual = datos.bloqueo_manual
    expediente.motivo_bloqueo = (datos.motivo_bloqueo or "").strip() or None if datos.bloqueo_manual else None
    expediente.fecha_bloqueo = datos.fecha_bloqueo if datos.bloqueo_manual else None

    # Mantener los estados heredados LST/RST como bloqueos efectivos.
    db.add(expediente)
    db.commit()
    db.refresh(expediente)
    resultado = expediente_a_dict(expediente)
    resultado["bloqueado"] = bool(motivo_bloqueo_expediente(expediente))
    resultado["motivo_bloqueo_efectivo"] = motivo_bloqueo_expediente(expediente)
    return resultado


@router.get("/{id_expediente}")
def obtener_expediente(
    id_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .first()
    )

    if expediente is None:
        raise HTTPException(
            status_code=404,
            detail="Expediente no encontrado.",
        )

    ids_visibles = ids_expedientes_visibles(db, usuario)
    if ids_visibles is not None and expediente.id not in ids_visibles:
        # No revelar si existe un expediente fuera del ámbito del usuario.
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    resultado = adjuntar_promociones_catalogo(db, [expediente_a_dict(expediente)])[0]
    gestor = db.query(Empleado).filter(Empleado.id == expediente.gestor_asignado_id).first() if getattr(expediente, "gestor_asignado_id", None) else None
    resultado["gestor_asignado_nombre"] = " ".join(filter(None, [getattr(gestor, "nombre", None), getattr(gestor, "apellidos", None)])).strip() if gestor else None
    asignaciones_provisionales = ids_asignaciones_provisionales(db, gestor.id) if gestor else set()
    resultado["gestor_asignacion_provisional"] = str(expediente.id_expediente) in asignaciones_provisionales
    return resultado


# ============================================================
# MIGRACIÓN DE COLUMNAS
# ============================================================

@router.post("/migraciones/actualizar-envio-notario")
def actualizar_columnas_envio_notario(
    db: Session = Depends(get_db),
):
    """Migra el esquema del envío a notario en pasos confirmados por separado.

    Primero crea y confirma la tabla de documentos de escritura. Después añade
    las columnas de expedientes una a una, para que un timeout en una columna
    no deshaga la creación de la tabla ni el trabajo ya confirmado.
    """
    columnas = [
        ("idioma_documento", "VARCHAR(100)"),
        ("formato_escritura", "VARCHAR(200)"),
        ("tipo_tramite", "VARCHAR(200)"),
        ("facturacion_nombre", "VARCHAR(300)"),
        ("facturacion_apellidos", "VARCHAR(300)"),
        ("facturacion_dni_nif", "VARCHAR(50)"),
        ("facturacion_direccion", "VARCHAR(500)"),
        ("facturacion_codigo_postal", "VARCHAR(30)"),
        ("facturacion_poblacion", "VARCHAR(200)"),
        ("facturacion_provincia", "VARCHAR(200)"),
        ("facturacion_telefono", "VARCHAR(50)"),
        ("facturacion_email", "VARCHAR(320)"),
        ("facturacion_estado", "VARCHAR(200)"),
        ("facturacion_fecha", "DATE"),
    ]

    print(
        "INICIO MIGRACIÓN ENVÍO A NOTARIO: "
        f"{len(columnas)} columnas; creando primero la tabla documental",
        flush=True,
    )

    # PASO 1: crear la tabla que utiliza enviar_a_notario y confirmar este
    # cambio por separado. Así, un fallo posterior al añadir columnas no
    # provoca que PostgreSQL deshaga la creación de la tabla.
    try:
        db.execute(text("SET LOCAL lock_timeout = '5s'"))
        db.execute(text("SET LOCAL statement_timeout = '20s'"))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS expediente_documentos_escritura (
                id SERIAL PRIMARY KEY,
                expediente_id INTEGER NOT NULL
                    REFERENCES expedientes(id) ON DELETE CASCADE,
                tipo_documento VARCHAR(300) NOT NULL,
                cuantia DOUBLE PRECISION NULL
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS
            ix_expediente_documentos_escritura_expediente_id
            ON expediente_documentos_escritura (expediente_id)
        """))
        db.commit()
        print(
            "MIGRACIÓN ENVÍO A NOTARIO: tabla e índice confirmados",
            flush=True,
        )
    except Exception as exc:
        db.rollback()
        print(
            "ERROR CREANDO expediente_documentos_escritura:",
            repr(exc),
            flush=True,
        )
        mensaje = str(exc).lower()
        if any(
            token in mensaje
            for token in (
                "lock timeout",
                "statement timeout",
                "canceling statement due to",
                "could not obtain lock",
            )
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "PostgreSQL no pudo crear/verificar "
                    "expediente_documentos_escritura porque está esperando "
                    "un bloqueo o ha superado el tiempo máximo. La tabla "
                    "no se ha confirmado; revisa los logs de Render."
                ),
            )
        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo crear/verificar la tabla "
                "expediente_documentos_escritura. Causa técnica: "
                f"{str(exc)[:400]}"
            ),
        )

    # PASO 2: añadir cada columna en su propia transacción. Se vuelve a
    # configurar lock_timeout/statement_timeout porque SET LOCAL termina
    # al hacer commit o rollback.
    columnas_confirmadas = []
    columnas_pendientes = []

    for indice, (columna, tipo_sql) in enumerate(columnas, start=1):
        try:
            print(
                f"MIGRACIÓN ENVÍO A NOTARIO [{indice}/{len(columnas)}]: "
                f"comprobando {columna}",
                flush=True,
            )
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            db.execute(text("SET LOCAL statement_timeout = '20s'"))
            db.execute(text(
                f"ALTER TABLE expedientes "
                f"ADD COLUMN IF NOT EXISTS {columna} {tipo_sql}"
            ))
            db.commit()
            columnas_confirmadas.append(columna)
            print(
                f"MIGRACIÓN ENVÍO A NOTARIO: {columna} confirmada",
                flush=True,
            )
        except Exception as exc:
            db.rollback()
            columnas_pendientes.append({
                "columna": columna,
                "error": str(exc)[:300],
            })
            print(
                f"ERROR MIGRANDO COLUMNA {columna}: {repr(exc)}",
                flush=True,
            )
            # No seguir intentando bloquear expedientes si ya se ha
            # detectado un timeout; devolver el diagnóstico al operador.
            mensaje = str(exc).lower()
            if any(
                token in mensaje
                for token in (
                    "lock timeout",
                    "statement timeout",
                    "canceling statement due to",
                    "could not obtain lock",
                )
            ):
                break

    if columnas_pendientes:
        timeout = any(
            any(
                token in pendiente["error"].lower()
                for token in (
                    "lock timeout",
                    "statement timeout",
                    "canceling statement due to",
                    "could not obtain lock",
                )
            )
            for pendiente in columnas_pendientes
        )
        raise HTTPException(
            status_code=503 if timeout else 500,
            detail={
                "mensaje": (
                    "La tabla expediente_documentos_escritura está creada "
                    "y confirmada, pero la migración de columnas no ha "
                    "terminado. Puedes volver a ejecutar este endpoint; "
                    "ADD COLUMN IF NOT EXISTS permite reintentarlo."
                ),
                "tabla_confirmada": "expediente_documentos_escritura",
                "columnas_confirmadas": columnas_confirmadas,
                "columnas_pendientes": columnas_pendientes,
            },
        )

    print(
        "FIN MIGRACIÓN ENVÍO A NOTARIO: tabla y columnas confirmadas",
        flush=True,
    )
    return {
        "ok": True,
        "mensaje": "Base de datos actualizada correctamente.",
        "tabla_documentos": "expediente_documentos_escritura",
        "tabla_documentos_confirmada": True,
        "tabla_expedientes": "expedientes",
        "columnas_confirmadas": columnas_confirmadas,
        "columnas_pendientes": [],
    }


# ============================================================
# PROVISIONES DE FONDOS Y CANCELACIONES
# Se monta dentro del router de Expedientes para conservar el RBAC existente.
# ============================================================
from backend.app.provisiones.router import router as provisiones_router
router.include_router(provisiones_router)

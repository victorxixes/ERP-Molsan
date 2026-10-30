
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, or_


import os
import inspect

from backend.app.storage import FOTOS_DIR as STORAGE_FOTOS_DIR

from backend.app.auth.log_redaction import instalar_filtro_credenciales_websocket

instalar_filtro_credenciales_websocket()


# ============================================================
# APP
# ============================================================

app = FastAPI(title="Agenda Intranet Backend")


# ============================================================
# CORS — CONFIGURACIÓN PARA RENDER
# ============================================================

origins = [
    "https://agenda-intranet-f.onrender.com",
    "https://agenda-intranet-b.onrender.com",
    "https://molsan-glass-luxe-preview.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


# ============================================================
# BASE DE DATOS
# ============================================================

from backend.app.database import Base, engine, SessionLocal


# ============================================================
# MODELOS
# ============================================================

from backend.app.expedientes.models import Cliente, Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.fusiones.router import SolicitudFusion
from backend.app.expedientes.gastos.models import ExpedienteGasto
from backend.app.honorarios_gestoria.models import HonorarioGestoria
from backend.app.expedientes.defectos.models import (
    ExpedienteDefecto,
    DefectoSubtipo,
)
from backend.app.expedientes.defectos.historial_model import HistorialDefecto
from backend.app.seguridad.roles.models import Rol
from backend.app.ctn.models import Notaria
from backend.app.agenda.models import Cita
from backend.app.empleados.models import Empleado
from backend.app.mensajes.models import Mensaje
from backend.app.municipios.models import Municipio, MunicipioCodigoPostal
from backend.app.entidades_bancarias.models import EntidadBancaria
from backend.app.registros_propiedad.models import RegistroPropiedad
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.oficinas_liquidadoras.models import OficinaLiquidadora
from backend.app.tipos_carga_hipotecaria.models import TipoCargaHipotecaria
from backend.app.expediente_ppad.models import ExpedientePPAD
from backend.app.expediente_observaciones.models import ExpedienteObservacion
from backend.app.tipos_concepto_gastos.models import TipoConceptoGastos
from backend.app.tipos_expediente.models import TipoExpediente
from backend.app.acciones_expediente.models import AccionExpediente
from backend.app.catalogos_absis.router import router as catalogos_absis_router
from backend.app.oficinas_catalogo.router import router as oficinas_catalogo_router
from backend.app.tipos_impositivos.router import router as tipos_impositivos_router
from backend.app.expediente_acciones.models import ExpedienteAccion


# ============================================================
# STATIC FILES
# ============================================================

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

from backend.app.auth.public_static import PublicStaticFiles

app.mount(
    "/static",
    PublicStaticFiles(directory=STATIC_DIR),
    name="static",
)


# ============================================================
# STATIC — MENSAJES
# ============================================================

TMP_MENSAJES = "/tmp/mensajes"
os.makedirs(TMP_MENSAJES, exist_ok=True)

app.mount(
    "/static/mensajes",
    StaticFiles(directory=TMP_MENSAJES),
    name="mensajes",
)


# ============================================================
# STATIC — FOTOS PROTEGIDAS
# ============================================================

# Las fotos nuevas se sirven desde el almacenamiento central persistente.
# Se mantiene lectura de la carpeta histórica para no romper fotos existentes.
FOTOS_DIR = str(STORAGE_FOTOS_DIR)
os.makedirs(FOTOS_DIR, exist_ok=True)
LEGACY_FOTOS_DIR = os.path.join(STATIC_DIR, "fotos")
os.makedirs(LEGACY_FOTOS_DIR, exist_ok=True)

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo

FOTOS_ROOT = Path(FOTOS_DIR).resolve()
LEGACY_FOTOS_ROOT = Path(LEGACY_FOTOS_DIR).resolve()
FOTOS_ROOTS = (FOTOS_ROOT, LEGACY_FOTOS_ROOT)
EXTENSIONES_FOTO_PERMITIDAS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
}


@app.get("/api/fotos/{ruta:path}", include_in_schema=False)
def servir_fotografia_empleado(
    ruta: str,
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "empleados", "ver")

    if Path(ruta).suffix.lower() not in EXTENSIONES_FOTO_PERMITIDAS:
        raise HTTPException(
            status_code=404,
            detail="Fotografía no encontrada",
        )

    fichero = None
    for raiz in FOTOS_ROOTS:
        candidata = (raiz / ruta).resolve()
        if raiz in candidata.parents and candidata.is_file():
            fichero = candidata
            break

    if fichero is None:
        raise HTTPException(
            status_code=404,
            detail="Fotografía no encontrada",
        )

    return FileResponse(
        path=str(fichero),
        headers={"Cache-Control": "private, no-store, max-age=0"},
    )


# ============================================================
# IMPORTAR ROUTERS
# ============================================================

from backend.app.informes.sla_router import router as informes_sla_router
from backend.app.informes.facturacion_router import router as informes_facturacion_router

from backend.app.auth.router import router as auth_router

from backend.app.expedientes.defectos.migracion_router import (
    router as migracion_defectos_router,
)

from backend.app.expedientes.fincasyregistros.router import (
    router as expedientes_fincas_router,
)
from backend.app.fusiones.router import router as fusiones_router
from backend.app.reclamaciones_oficina.router import router as reclamaciones_oficina_router, EmailReclamacion

from backend.app.seguridad.roles.roles_router import router as roles_router
from backend.app.seguridad.roles.asignar_rol_router import (
    router as asignar_rol_router,
)
from backend.app.seguridad.asignar_password_router import (
    router as asignar_password_router,
)
from backend.app.seguridad.permisos.permisos_router import (
    router as permisos_router,
    MODULOS_BASE,
    PERMISOS_BASE,
)
from backend.app.expedientes.gastos.router import router as gastos_router
from backend.app.honorarios_gestoria.router import router as honorarios_gestoria_router
from backend.app.carpeta_digital.router import router as carpeta_digital_router
from backend.app.seguridad.permisos.asignar_router import (
    router as asignar_router,
)
from backend.app.seguridad.permisos.repair_create_permisos_raw import (
    router as permisos_repair_router,
)
from backend.app.seguridad.obtener_ficha_empleado import (
    router as ficha_empleado_router,
)
from backend.app.seguridad.auditoria.router import (
    router as seguridad_auditoria_router,
)
from backend.app.seguridad.logs.router import router as seguridad_logs_router
from backend.app.seguridad.admin_router import router as admin_router
from backend.app.expedientes.gastos.migracion_router import (
    router as migracion_gastos_router,
)

# AGENDA
from backend.app.agenda.router import router as agenda_router

# EMPLEADOS
from backend.app.empleados.router import router as empleados_router
from backend.app.fichajes.router import router as fichajes_router

# DEFECTOS
from backend.app.expedientes.defectos.router import router as defectos_router

# MAESTROS
from backend.app.maestros.router import router as maestros_router

# INTRANET
from backend.app.intranet.router import router as intranet_router
from backend.app.intranet.documentos.router import (
    router as documentos_router,
)
from backend.app.intranet.noticias.router import router as noticias_router

# WEBSOCKETS
from backend.app.websockets.intranet_ws import router as intranet_ws_router
from backend.app.websockets.empleados_ws import router as empleados_ws_router
from backend.app.websockets.agenda_ws import router as agenda_ws_router
from backend.app.mensajes.router_ws import router as mensajes_ws_router
from backend.app.notificaciones.router_ws import router_notif

# REALTIME
from backend.app.realtime.router import router as realtime_router

# MENSAJES
from backend.app.mensajes.router import router as mensajes_router

# MUNICIPIOS
from backend.app.municipios.router import router as municipios_router

# ENTIDADES BANCARIAS
from backend.app.entidades_bancarias.router import (
    router as entidades_bancarias_router,
)

# REGISTROS DE LA PROPIEDAD
from backend.app.registros_propiedad.router import (
    router as registros_propiedad_router,
)

# OFICINAS LIQUIDADORAS
from backend.app.oficinas_liquidadoras.router import (
    router as oficinas_liquidadoras_router,
)

# TIPOS DE CONCEPTO DE GASTOS
from backend.app.tipos_concepto_gastos.router import (
    router as tipos_concepto_gastos_router,
)
from backend.app.tipos_expediente.router import router as tipos_expediente_router

# ACCIONES DEL EXPEDIENTE
from backend.app.acciones_expediente.router import (
    router as acciones_expediente_router,
)
from backend.app.expediente_acciones.router import (
    router as expediente_acciones_router,
)

# HERRAMIENTAS SWAGGER
from backend.app.herramientasswager.crear_tablas import (
    router as herramientas_router,
)
from backend.app.herramientasswager.reset_intranet import (
    router as reset_intranet_router,
)
from backend.app.herramientasswager.debug_router import (
    router as debug_router,
)
from backend.app.herramientasswager.borrar_roles import (
    router as borrar_roles_router,
)
from backend.app.herramientasswager.borrar_tablas import (
    router as borrar_tablas_router,
)
from backend.app.herramientasswager.asignar_bloqueo_router import (
    router as asignar_bloqueo_router,
)

# CTN
from backend.app.ctn.router import router as ctn_router
from backend.app.notargest.router import router as notargest_router

# DASHBOARD
from backend.app.dashboard.router import router as dashboard_router

# UTILIDADES
from backend.app.Utilidades.router import router as utilidades_router
from backend.app.complementos_saldo import router as complementos_saldo_router, ComplementoSaldo
from backend.app.proceso_absis import router as proceso_absis_router, EnvioAbsis
from backend.app.informes.router import router as informes_router
from backend.app.informes.firmas_notarios_router import (
    router as informes_firmas_notarios_router,
)
from backend.app.Utilidades.importadores.router_absis import (
    router as router_absis,
)

# EXPEDIENTES
from backend.app.expedientes.router import router as expedientes_router
from backend.app.alta_expediente.router import router as alta_expediente_router
from backend.app.expedientes.traspasos_saldo import router as traspasos_saldo_router
from backend.app.expedientes.auditoria_vinculaciones import router as auditoria_vinculaciones_router

# TIPOS DE CARGA HIPOTECARIA
from backend.app.tipos_carga_hipotecaria.router import (
    router as tipos_carga_hipotecaria_router,
)

# PPAD
from backend.app.expediente_ppad.router import (
    router as expediente_ppad_router,
)
from backend.app.expediente_ppad.utilidades_router import (
    router as utilidades_ppad_router,
)

# OBSERVACIONES
from backend.app.expediente_observaciones.router import (
    router as expediente_observaciones_router,
)

# PROVISIONES DE FONDOS Y CANCELACIONES
from backend.app.provisiones.router import router as provisiones_router

# APODERAGEST
from backend.app.apoderagest.router import ( 
    router as apoderagest_router,
)
from backend.app.apoderagest.liquidaciones import router as liquidaciones_apoderagest_router, LiquidacionMensual


# ENCARGAGEST
from backend.app.encargagest.router import router as encargagest_router
from backend.app.mensajeria_molsan.router import router as mensajeria_molsan_router


# ============================================================
# INCLUIR ROUTERS
# ============================================================

app.include_router(auth_router, prefix="/api")

app.include_router(roles_router, prefix="/api")
app.include_router(asignar_rol_router, prefix="/api")
app.include_router(asignar_password_router, prefix="/api")
app.include_router(permisos_router, prefix="/api")
app.include_router(asignar_router, prefix="/api")
app.include_router(permisos_repair_router, prefix="/api")
app.include_router(ficha_empleado_router, prefix="/api")
app.include_router(seguridad_auditoria_router, prefix="/api")
app.include_router(seguridad_logs_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(expedientes_fincas_router, prefix="/api")
app.include_router(fusiones_router, prefix="/api")
app.include_router(reclamaciones_oficina_router, prefix="/api")
app.include_router(gastos_router, prefix="/api")
app.include_router(honorarios_gestoria_router, prefix="/api")

# AGENDA
app.include_router(agenda_router, prefix="/api")

# CARPETA DIGITAL
app.include_router(carpeta_digital_router, prefix="/api")
app.include_router(migracion_gastos_router, prefix="/api")

# DIAGNÓSTICO DE RUTAS DE AGENDA
print(
    "\n================ RUTAS AGENDA REGISTRADAS ================",
    flush=True,
)

for ruta in app.routes:
    if "/api/agenda" in getattr(ruta, "path", ""):
        print(
            "RUTA:",
            getattr(ruta, "path", None),
            "METHODS:",
            getattr(ruta, "methods", None),
            flush=True,
        )

print(
    "===========================================================\n",
    flush=True,
)

# EMPLEADOS
app.include_router(empleados_router, prefix="/api")
app.include_router(fichajes_router, prefix="/api")

# MAESTROS
app.include_router(maestros_router, prefix="/api")
app.include_router(catalogos_absis_router, prefix="/api")
app.include_router(oficinas_catalogo_router, prefix="/api")
app.include_router(tipos_impositivos_router, prefix="/api")

# INTRANET
app.include_router(intranet_router, prefix="/api")
app.include_router(documentos_router, prefix="/api")
app.include_router(noticias_router, prefix="/api")

# WEBSOCKETS
app.include_router(intranet_ws_router)
app.include_router(empleados_ws_router)
app.include_router(agenda_ws_router)
app.include_router(mensajes_ws_router)
app.include_router(router_notif)

# REALTIME
app.include_router(realtime_router)

# MENSAJES REST
app.include_router(mensajes_router, prefix="/api")

# MUNICIPIOS
app.include_router(municipios_router, prefix="/api")

# ENTIDADES BANCARIAS
app.include_router(entidades_bancarias_router, prefix="/api")

# REGISTROS DE LA PROPIEDAD
app.include_router(registros_propiedad_router, prefix="/api")

# OFICINAS LIQUIDADORAS
app.include_router(oficinas_liquidadoras_router, prefix="/api")

# TIPOS DE CONCEPTO DE GASTOS
app.include_router(tipos_concepto_gastos_router, prefix="/api")
app.include_router(tipos_expediente_router, prefix="/api")

# ACCIONES DEL EXPEDIENTE
app.include_router(acciones_expediente_router, prefix="/api")
app.include_router(expediente_acciones_router, prefix="/api")

# HERRAMIENTAS SWAGGER
app.include_router(herramientas_router, prefix="/api")
app.include_router(reset_intranet_router, prefix="/api")
app.include_router(debug_router)
app.include_router(borrar_roles_router)
app.include_router(borrar_tablas_router)
app.include_router(asignar_bloqueo_router, prefix="/api")

# CTN
app.include_router(ctn_router, prefix="/api")
app.include_router(notargest_router, prefix="/api")

# DASHBOARD
app.include_router(dashboard_router, prefix="/api")

# DEFECTOS
app.include_router(defectos_router, prefix="/api")

# UTILIDADES E INFORMES
app.include_router(utilidades_router, prefix="/api")
app.include_router(complementos_saldo_router, prefix="/api")
app.include_router(proceso_absis_router, prefix="/api")
app.include_router(informes_router, prefix="/api")
app.include_router(informes_firmas_notarios_router, prefix="/api")
app.include_router(informes_facturacion_router, prefix="/api")
app.include_router(informes_sla_router, prefix="/api")
app.include_router(router_absis, prefix="/api")

# TIPOS DE CARGA HIPOTECARIA
app.include_router(tipos_carga_hipotecaria_router, prefix="/api")

# EXPEDIENTES
# Las rutas específicas deben registrarse antes de /{id_expediente} del router general.
# Provisiones se registra primero porque sus rutas independientes usan el prefijo
# /api/expedientes y no deben interpretarse como un identificador de expediente.
app.include_router(provisiones_router, prefix="/api/expedientes")
app.include_router(auditoria_vinculaciones_router, prefix="/api")
app.include_router(expedientes_router, prefix="/api")
app.include_router(alta_expediente_router, prefix="/api")
app.include_router(traspasos_saldo_router, prefix="/api")
app.include_router(migracion_defectos_router, prefix="/api")

# PPAD
app.include_router(expediente_ppad_router, prefix="/api")
app.include_router(utilidades_ppad_router, prefix="/api")

# OBSERVACIONES
app.include_router(expediente_observaciones_router, prefix="/api")

#

app.include_router(apoderagest_router, prefix="/api")
app.include_router(liquidaciones_apoderagest_router, prefix="/api")
app.include_router(encargagest_router, prefix="/api")
app.include_router(mensajeria_molsan_router, prefix="/api")

# ============================================================
# MIGRACIÓN DE ESQUEMA DE EXPEDIENTES
# ============================================================

def migrar_esquema_expedientes_inicio():
    """Añade columnas ausentes de forma idempotente y compatible con SQLAlchemy 1.4.

    Todas las operaciones se ejecutan dentro de ``Connection.begin()``. No se usan
    ``Connection.commit()`` ni ``Connection.rollback()`` porque la aplicación usa
    SQLAlchemy 1.4 en modo legacy, donde esos métodos pueden no estar disponibles.
    El advisory lock es de sesión y permanece adquirido entre transacciones.
    """
    import time

    print(
        "[MIGRACION STARTUP] Revisando columnas pendientes de expedientes...",
        flush=True,
    )

    # Mantener estos tipos alineados con backend/app/expedientes/models.py y con
    # los campos usados en la Ficha de expediente/flujo de cierre.
    columnas = [
        # Circuito de actividades
        ("fecha_inicio_actividad", "DATE"),
        ("fecha_fin_actividad", "DATE"),
        ("actividad_actual", "VARCHAR(300)"),
        ("gestor_asignado_id", "INTEGER REFERENCES empleados(id) ON DELETE SET NULL"),
        ("estado_actividad", "VARCHAR(200)"),
        ("liquidado_sin_tramitar", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("fecha_liquidacion_sin_tramitar", "DATE"),
        ("cambio_gestoria", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("fecha_cambio_gestoria", "DATE"),
        ("bloqueo_manual", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("motivo_bloqueo", "VARCHAR(1000)"),
        ("fecha_bloqueo", "DATE"),
        ("fecha_envio", "DATE"),
        ("asiento_presentacion_libro_diario", "VARCHAR(300)"),
        ("asiento_presentacion", "VARCHAR(200)"),
        ("libro_diario", "VARCHAR(200)"),
        ("tipo_gestoria", "VARCHAR(100)"),
        ("fecha_presentacion", "DATE"),
        ("numero_entrada", "VARCHAR(200)"),
        ("fecha_recogida_notario_presentacion_telematica", "DATE"),
        ("copia_simple_escritura", "VARCHAR(500)"),
        ("fecha_presentacion_tributaria", "DATE"),
        ("fecha_liquidacion_tributaria", "DATE"),
        ("oficina_liquidadora", "VARCHAR(200)"),
        ("base_imponible", "DOUBLE PRECISION"),
        ("tributacion", "VARCHAR(100)"),
        ("impuesto_ajd_itp", "VARCHAR(20)"),
        ("fecha_vencimiento_asiento", "DATE"),
        ("fecha_inscripcion", "DATE"),
        ("escritura_simple_cancelacion", "VARCHAR(500)"),
        ("ultima_accion", "VARCHAR(500)"),
        ("fecha_ultima_accion", "DATE"),
        ("sol", "VARCHAR(100)"),
        ("cs", "VARCHAR(100)"),
        ("ns", "VARCHAR(100)"),
        # Defectos registrales que también se muestran en el circuito legacy
        ("tiene_defectos_abiertos", "VARCHAR(50)"),
        ("tipo_error", "VARCHAR(300)"),
        ("falta_defecto", "VARCHAR(1000)"),
        ("descripcion_error", "VARCHAR(1000)"),
        ("fcierre_defecto", "DATE"),
        ("registral_estado", "VARCHAR(200)"),
        ("registral_fecha", "DATE"),
        # Alta manual: tipo de expediente y numeración por tipo.
        # Estas columnas están en el modelo ORM y deben existir antes de cargar Expediente.
        ("tipo_expediente_id", "INTEGER"),
        ("numero_tipo_expediente", "INTEGER"),
        # Envío a notario y documentos de escritura
        ("cliente_id", "INTEGER"),
        ("notario_id", "INTEGER"),
        ("apoderado_empleado_id", "INTEGER"),
        ("capital_documento_notarial", "DOUBLE PRECISION"),
        ("fecha_envio_notario", "DATE"),
        ("fecha_solicitud_pnc", "DATE"),
        ("numero_solicitud_pnc", "VARCHAR(200)"),
        ("notario_otorgante", "VARCHAR(300)"),
        # Columnas del workflow NotarGest, centralizadas para evitar DDL concurrente
        ("notargest_estado", "VARCHAR(80)"),
        ("notargest_fecha_cierre", "DATE"),
        ("notargest_fecha_envio_gestoria", "DATE"),
        ("escritura_firmada", "BOOLEAN"),
        ("hora_prevista_firma", "TIME"),
        ("hora_fin_prevista_firma", "TIME"),
        ("firma_urgente", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("idioma_documento", "VARCHAR(100)"),
        ("formato_escritura", "VARCHAR(200)"),
        ("tipo_tramite", "VARCHAR(200)"),
        # Facturación/cierre: tipos sincronizados con el modelo ORM
        ("facturacion_nombre", "VARCHAR(300)"),
        ("facturacion_apellidos", "VARCHAR(300)"),
        ("facturacion_dni_nif", "VARCHAR(50)"),
        ("facturacion_direccion", "VARCHAR(500)"),
        ("facturacion_codigo_postal", "VARCHAR(30)"),
        ("facturacion_poblacion", "VARCHAR(200)"),
        ("facturacion_provincia", "VARCHAR(200)"),
        ("facturacion_telefono", "VARCHAR(50)"),
        ("facturacion_email", "VARCHAR(320)"),
        ("facturacion_empleado", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("facturacion_estado", "VARCHAR(200)"),
        ("facturacion_fecha", "DATE"),
    ]

    # Clave fija compartida por todas las instancias del servicio.
    clave_bloqueo_migracion = 731208640224
    conexion = None
    bloqueo_adquirido = False
    bloqueo_liberado = False

    def es_bloqueo_temporal(error) -> bool:
        original = getattr(error, "orig", None)
        codigo = getattr(original, "pgcode", None) or getattr(original, "sqlstate", None)
        if codigo == "55P03":
            return True
        mensaje = str(error).lower()
        return any(
            termino in mensaje
            for termino in (
                "locknotavailable",
                "lock timeout",
                "canceling statement due to lock timeout",
                "could not obtain lock",
            )
        )

    def registrar_bloqueos_expedientes(etiqueta: str) -> None:
        """Registra sesiones con locks sobre expedientes sin cancelar ni modificar sesiones."""
        try:
            with conexion.begin():
                filas = conexion.execute(
                    text(
                        """
                        SELECT
                            a.pid,
                            a.usename,
                            a.application_name,
                            a.client_addr::text,
                            a.state,
                            a.wait_event_type,
                            a.wait_event,
                            a.xact_start,
                            now() - a.xact_start AS antiguedad_transaccion,
                            a.query_start,
                            now() - a.query_start AS antiguedad_consulta,
                            l.mode,
                            l.granted,
                            left(regexp_replace(a.query, '[[:space:]]+', ' ', 'g'), 500) AS consulta
                        FROM pg_stat_activity a
                        JOIN pg_locks l ON l.pid = a.pid
                        WHERE l.relation IN ('public.expedientes'::regclass, 'public.empleados'::regclass)
                          AND a.pid <> pg_backend_pid()
                        ORDER BY l.granted DESC, a.xact_start NULLS LAST
                        """
                    )
                ).mappings().all()
            print(
                f"[MIGRACION STARTUP] Diagnóstico de locks para {etiqueta}: "
                f"{[dict(fila) for fila in filas]!r}",
                flush=True,
            )
        except Exception as error_diagnostico:
            print(
                f"[MIGRACION STARTUP] No se pudo consultar el diagnóstico de locks "
                f"para {etiqueta}: {error_diagnostico!r}",
                flush=True,
            )

    def liberar_transacciones_inactivas_expedientes() -> None:
        """Libera solo sesiones antiguas idle-in-transaction que retienen AccessShareLock en las tablas que requieren DDL.

        Una transacción de lectura abandonada puede impedir ALTER TABLE durante el despliegue.
        Se limita a sesiones inactivas más de 5 minutos; nunca termina sesiones activas.
        """
        try:
            with conexion.begin():
                pids = [
                    fila[0]
                    for fila in conexion.execute(
                        text(
                            """
                            SELECT DISTINCT a.pid
                            FROM pg_stat_activity a
                            JOIN pg_locks l ON l.pid = a.pid
                            WHERE l.relation IN ('public.expedientes'::regclass, 'public.empleados'::regclass)
                              AND l.mode = 'AccessShareLock'
                              AND l.granted = TRUE
                              AND a.pid <> pg_backend_pid()
                              AND a.state = 'idle in transaction'
                              AND a.xact_start < now() - CASE
                                  WHEN l.relation = 'public.empleados'::regclass THEN interval '2 minutes'
                                  ELSE interval '5 minutes'
                              END
                            """
                        )
                    ).fetchall()
                ]
            for pid in pids:
                try:
                    with conexion.begin():
                        terminado = bool(
                            conexion.execute(
                                text("SELECT pg_terminate_backend(:pid)"),
                                {"pid": pid},
                            ).scalar()
                        )
                    print(
                        f"[MIGRACION STARTUP] Sesión inactiva pid={pid} "
                        f"terminada={terminado} para liberar bloqueos de esquema.",
                        flush=True,
                    )
                except Exception as error_sesion:
                    print(
                        f"[MIGRACION STARTUP] No se pudo liberar la sesión pid={pid}: {error_sesion!r}",
                        flush=True,
                    )
        except Exception as error_limpieza:
            print(
                f"[MIGRACION STARTUP] No se pudo revisar sesiones inactivas de expedientes: {error_limpieza!r}",
                flush=True,
            )

    def ejecutar_ddl_con_reintentos(etiqueta: str, sql: str) -> None:
        ultimo_error = None
        # En Render puede coincidir el arranque de una instancia con consultas
        # activas de la anterior. No mantener cada intento bloqueado demasiado
        # tiempo, pero conceder una ventana de reintentos suficiente para que
        # PostgreSQL libere el bloqueo de tabla.
        max_intentos = 20
        for intento in range(1, max_intentos + 1):
            # Repetir la limpieza en cada intento: la transacción que bloquea
            # empleados puede superar los 5 minutos mientras se reintenta el DDL.
            liberar_transacciones_inactivas_expedientes()
            try:
                with conexion.begin():
                    conexion.execute(text("SET LOCAL lock_timeout = '3s'"))
                    conexion.execute(text("SET LOCAL statement_timeout = '40s'"))
                    conexion.execute(text(sql))
                return
            except Exception as error:
                ultimo_error = error
                if not es_bloqueo_temporal(error):
                    raise
                if intento == max_intentos:
                    registrar_bloqueos_expedientes(etiqueta)
                    raise
                espera = min(2 * intento, 5)
                print(
                    f"[MIGRACION STARTUP] Bloqueo temporal en {etiqueta}; "
                    f"reintento {intento}/{max_intentos} en {espera}s: {error!r}",
                    flush=True,
                )
                time.sleep(espera)
        raise RuntimeError(f"No se pudo completar {etiqueta}: {ultimo_error!r}")

    try:
        conexion = engine.connect()

        # pg_try_advisory_lock evita que un segundo arranque quede bloqueado
        # indefinidamente mientras otra instancia esté migrando.
        for intento in range(1, 61):
            with conexion.begin():
                adquirido = bool(
                    conexion.execute(
                        text("SELECT pg_try_advisory_lock(:clave)"),
                        {"clave": clave_bloqueo_migracion},
                    ).scalar()
                )
            if adquirido:
                bloqueo_adquirido = True
                break
            time.sleep(1)
        if not bloqueo_adquirido:
            raise RuntimeError(
                "Otra instancia mantiene el bloqueo de migración durante más de 60 segundos."
            )

        # Migración de Control Apoderados: habilitación y tarifa por protocolo.
        # Solo ejecutar DDL cuando la columna falte evita bloqueos innecesarios en cada arranque.
        with conexion.begin():
            existe_honorarios_valor = bool(
                conexion.execute(
                    text("""
                        SELECT EXISTS (
                            SELECT 1
                            FROM pg_attribute
                            WHERE attrelid = 'public.empleados'::regclass
                              AND attname = 'honorarios_valor'
                              AND NOT attisdropped
                        )
                    """)
                ).scalar()
            )
        if not existe_honorarios_valor:
            ejecutar_ddl_con_reintentos(
                "crear columna empleados.honorarios_valor",
                "ALTER TABLE public.empleados ADD COLUMN honorarios_valor DOUBLE PRECISION NOT NULL DEFAULT 0",
            )
            print("[MIGRACION STARTUP] Columna empleados.honorarios_valor creada.", flush=True)
        else:
            print("[MIGRACION STARTUP] Columna empleados.honorarios_valor ya existe; se omite DDL.", flush=True)

        # Habilitación del circuito mensual de liquidaciones.
        with conexion.begin():
            existe_es_colaborador = bool(
                conexion.execute(
                    text("""
                        SELECT EXISTS (
                            SELECT 1
                            FROM pg_attribute
                            WHERE attrelid = 'public.empleados'::regclass
                              AND attname = 'es_colaborador'
                              AND NOT attisdropped
                        )
                    """)
                ).scalar()
            )
        if not existe_es_colaborador:
            ejecutar_ddl_con_reintentos(
                "crear columna empleados.es_colaborador",
                "ALTER TABLE public.empleados ADD COLUMN es_colaborador BOOLEAN NOT NULL DEFAULT FALSE",
            )
            print("[MIGRACION STARTUP] Columna empleados.es_colaborador creada.", flush=True)
        else:
            print("[MIGRACION STARTUP] Columna empleados.es_colaborador ya existe; se omite DDL.", flush=True)
        tabla_liquidaciones_creada = False
        for intento_tabla in range(1, 21):
            try:
                with conexion.begin():
                    conexion.execute(text("SET LOCAL lock_timeout = '3s'"))
                    conexion.execute(text("SET LOCAL statement_timeout = '40s'"))
                    LiquidacionMensual.__table__.create(bind=conexion, checkfirst=True)
                tabla_liquidaciones_creada = True
                break
            except Exception as error_tabla:
                if not es_bloqueo_temporal(error_tabla) or intento_tabla == 20:
                    raise
                espera = min(2 * intento_tabla, 5)
                print(
                    f"[MIGRACION STARTUP] Bloqueo temporal creando apoderagest_liquidaciones; "
                    f"reintento {intento_tabla}/20 en {espera}s: {error_tabla!r}",
                    flush=True,
                )
                time.sleep(espera)
        if not tabla_liquidaciones_creada:
            raise RuntimeError("No se pudo crear la tabla apoderagest_liquidaciones.")

        # Añadir los campos de justificante a instalaciones que ya tengan la tabla.
        with conexion.begin():
            columnas_liquidacion = {
                fila[0] for fila in conexion.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name = 'apoderagest_liquidaciones'"
                )).fetchall()
            }
        columnas_justificante = [
            ("honorarios_valor", "DOUBLE PRECISION NOT NULL DEFAULT 0"),
            ("justificante_bytes", "BYTEA"),
            ("justificante_nombre", "VARCHAR(255)"),
            ("justificante_tipo", "VARCHAR(150)"),
            ("justificante_subido_en", "TIMESTAMP WITH TIME ZONE"),
        ]
        for nombre, tipo_sql in columnas_justificante:
            if nombre not in columnas_liquidacion:
                ejecutar_ddl_con_reintentos(
                    f"crear columna apoderagest_liquidaciones.{nombre}",
                    f'ALTER TABLE public.apoderagest_liquidaciones ADD COLUMN "{nombre}" {tipo_sql}',
                )
                print(f"[MIGRACION STARTUP] Columna apoderagest_liquidaciones.{nombre} creada.", flush=True)

        with conexion.begin():
            resultado = conexion.execute(
                text(
                    "SELECT column_name "
                    "FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name = 'expedientes'"
                )
            )
            columnas_existentes = {fila[0] for fila in resultado.fetchall()}

        if not columnas_existentes:
            raise RuntimeError(
                "No se encuentra public.expedientes en PostgreSQL. "
                "No se ha ejecutado ninguna alteración."
            )

        pendientes = [
            (nombre, tipo_sql)
            for nombre, tipo_sql in columnas
            if nombre not in columnas_existentes
        ]
        print(
            f"[MIGRACION STARTUP] {len(columnas) - len(pendientes)} columnas ya existen; "
            f"{len(pendientes)} pendientes.",
            flush=True,
        )

        for indice, (nombre, tipo_sql) in enumerate(pendientes, start=1):
            ejecutar_ddl_con_reintentos(
                f"crear columna {nombre}",
                f'ALTER TABLE public.expedientes ADD COLUMN "{nombre}" {tipo_sql}',
            )
            columnas_existentes.add(nombre)
            print(
                f"[MIGRACION STARTUP] Columna {nombre} añadida "
                f"({indice}/{len(pendientes)}).",
                flush=True,
            )

        with conexion.begin():
            indice_cliente = conexion.execute(
                text(
                    "SELECT 1 FROM pg_indexes "
                    "WHERE schemaname = 'public' "
                    "AND indexname = 'ix_expedientes_cliente_id'"
                )
            ).first()

        if not indice_cliente:
            ejecutar_ddl_con_reintentos(
                "crear índice ix_expedientes_cliente_id",
                "CREATE INDEX IF NOT EXISTS ix_expedientes_cliente_id "
                "ON public.expedientes (cliente_id)",
            )

        # Campos de auditoría para PPAD y acciones; migración idempotente.
        ejecutar_ddl_con_reintentos(
            "añadir usuario_creador a expediente_ppad",
            "ALTER TABLE public.expediente_ppad ADD COLUMN IF NOT EXISTS usuario_creador VARCHAR(200)",
        )
        ejecutar_ddl_con_reintentos(
            "añadir usuario_creador a expediente_acciones",
            "ALTER TABLE public.expediente_acciones ADD COLUMN IF NOT EXISTS usuario_creador VARCHAR(200)",
        )

        print(
            "[MIGRACION STARTUP] Migración de expedientes completada.",
            flush=True,
        )

    except Exception as error:
        # Los bloques Connection.begin() ya revierten cada transacción fallida.
        # No llamar conexion.rollback(): no está disponible en el modo legacy
        # de SQLAlchemy utilizado por este proyecto.
        print(f"[MIGRACION STARTUP] ERROR: {error!r}", flush=True)
        raise

    finally:
        if conexion is not None:
            if bloqueo_adquirido:
                try:
                    with conexion.begin():
                        bloqueo_liberado = bool(
                            conexion.execute(
                                text("SELECT pg_advisory_unlock(:clave)"),
                                {"clave": clave_bloqueo_migracion},
                            ).scalar()
                        )
                    if not bloqueo_liberado:
                        print(
                            "[MIGRACION STARTUP] PostgreSQL indicó que el advisory lock ya no estaba retenido.",
                            flush=True,
                        )
                except Exception as error:
                    print(
                        f"[MIGRACION STARTUP] No se pudo liberar el advisory lock: {error!r}. "
                        "Se invalidará la conexión para forzar el cierre de la sesión.",
                        flush=True,
                    )
                    try:
                        conexion.invalidate()
                    except Exception:
                        pass
            try:
                conexion.close()
            except Exception:
                pass


# ============================================================
# INICIALIZAR TABLAS AUXILIARES
# ============================================================

from contextlib import contextmanager, wraps
import time


def _serializar_inicializacion_startup(funcion):
    """Serializa el arranque auxiliar entre instancias usando el lock de migraciones."""
    @wraps(funcion)
    def envoltura(*args, **kwargs):
        clave = 731208640224
        conexion_lock = None
        adquirido = False
        try:
            conexion_lock = engine.connect()
            for intento in range(1, 121):
                with conexion_lock.begin():
                    adquirido = bool(
                        conexion_lock.execute(
                            text("SELECT pg_try_advisory_lock(:clave)"),
                            {"clave": clave},
                        ).scalar()
                    )
                if adquirido:
                    print(
                        f"[STARTUP LOCK] Bloqueo global adquirido; intento={intento}.",
                        flush=True,
                    )
                    break
                if intento % 10 == 0:
                    print(
                        f"[STARTUP LOCK] Esperando otra inicialización; intento={intento}/120.",
                        flush=True,
                    )
                time.sleep(1)
            if not adquirido:
                raise RuntimeError(
                    "No se pudo adquirir el bloqueo global de inicialización tras 120 segundos. "
                    "Se aborta el arranque para evitar migraciones concurrentes."
                )
            return funcion(*args, **kwargs)
        except Exception as error:
            print(
                f"[STARTUP LOCK] ERROR de inicialización: {type(error).__name__}: {error!r}",
                flush=True,
            )
            raise
        finally:
            if conexion_lock is not None:
                if adquirido:
                    try:
                        with conexion_lock.begin():
                            liberado = bool(
                                conexion_lock.execute(
                                    text("SELECT pg_advisory_unlock(:clave)"),
                                    {"clave": clave},
                                ).scalar()
                            )
                        print(
                            f"[STARTUP LOCK] Bloqueo global liberado={liberado}.",
                            flush=True,
                        )
                    except Exception as error_unlock:
                        print(
                            f"[STARTUP LOCK] No se pudo liberar el bloqueo: {error_unlock!r}.",
                            flush=True,
                        )
                        try:
                            conexion_lock.invalidate()
                        except Exception:
                            pass
                conexion_lock.close()
    return envoltura


@contextmanager
def _transaccion_inicio_segura(etiqueta):
    """Limita esperas SQL durante migraciones de arranque y deja diagnóstico."""
    inicio = time.monotonic()
    print(f"[STARTUP SQL] INICIO transacción: {etiqueta}", flush=True)
    try:
        with engine.begin() as conexion:
            # Evita que DDL/UPDATE espere indefinidamente por un bloqueo.
            # SET LOCAL solo afecta a esta transacción; no limita consultas normales.
            conexion.execute(text("SET LOCAL lock_timeout = '5s'"))
            conexion.execute(text("SET LOCAL statement_timeout = '30s'"))
            yield conexion
        duracion = time.monotonic() - inicio
        print(
            f"[STARTUP SQL] FIN transacción: {etiqueta}; duración={duracion:.2f}s",
            flush=True,
        )
    except Exception as error:
        duracion = time.monotonic() - inicio
        print(
            f"[STARTUP SQL] ERROR transacción: {etiqueta}; "
            f"duración={duracion:.2f}s; tipo={type(error).__name__}; detalle={error!r}",
            flush=True,
        )
        # Tras hacer rollback, consulta desde otra conexión qué sesiones mantienen
        # bloqueos. No registra el texto SQL, que podría contener datos sensibles.
        try:
            with engine.connect() as diagnostico:
                bloqueos = diagnostico.execute(text("""
                    SELECT
                        actividad.pid AS proceso_bloqueado,
                        pg_blocking_pids(actividad.pid) AS procesos_bloqueadores,
                        actividad.application_name AS aplicacion,
                        actividad.state AS estado,
                        actividad.wait_event_type AS tipo_espera,
                        actividad.wait_event AS evento_espera,
                        EXTRACT(EPOCH FROM (NOW() - actividad.query_start))::INTEGER AS segundos_consulta
                    FROM pg_stat_activity AS actividad
                    WHERE actividad.datname = current_database()
                      AND cardinality(pg_blocking_pids(actividad.pid)) > 0
                    ORDER BY actividad.query_start NULLS LAST
                    LIMIT 20
                """)).mappings().all()
            if bloqueos:
                print(f"[STARTUP SQL] SESIONES BLOQUEADAS: {list(bloqueos)!r}", flush=True)
            else:
                print(
                    "[STARTUP SQL] Diagnóstico de bloqueos: no se encontraron "
                    "sesiones bloqueadas visibles en el momento del análisis.",
                    flush=True,
                )
        except Exception as error_diagnostico:
            print(
                f"[STARTUP SQL] No se pudo consultar pg_stat_activity: "
                f"{type(error_diagnostico).__name__}: {error_diagnostico}",
                flush=True,
            )
        raise


@app.on_event("startup")
@_serializar_inicializacion_startup
def inicializar_tablas_auxiliares():
    print(
        "[INICIALIZACION] Comprobando tablas auxiliares...",
        flush=True,
    )

    try:
        HonorarioGestoria.__table__.create(bind=engine, checkfirst=True)
        print("[HONORARIOS GESTORIA] Catálogo disponible.", flush=True)

        # Relación de códigos postales por municipio; creación idempotente.
        MunicipioCodigoPostal.__table__.create(bind=engine, checkfirst=True)
        print("[MUNICIPIOS] Tabla de códigos postales disponible.", flush=True)

        # Referencia interna de promoción para expedientes.
        # Evita DDL innecesario en cada arranque: incluso IF NOT EXISTS puede bloquear.
        with engine.connect() as conexion_catalogo:
            objetos_promocion = conexion_catalogo.execute(text("""
                SELECT
                    to_regclass('public.expedientes') IS NOT NULL AS existe_expedientes,
                    EXISTS (
                        SELECT 1 FROM pg_attribute
                        WHERE attrelid = to_regclass('public.expedientes')
                          AND attname = 'promocion' AND NOT attisdropped
                    ) AS existe_columna_promocion,
                    EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE schemaname = 'public'
                          AND tablename = 'expedientes'
                          AND indexname = 'ix_expedientes_promocion'
                    ) AS existe_indice_promocion,
                    to_regclass('public.expediente_promociones') IS NOT NULL AS existe_tabla_promociones,
                    EXISTS (
                        SELECT 1 FROM pg_indexes
                        WHERE schemaname = 'public'
                          AND tablename = 'expediente_promociones'
                          AND indexname = 'ix_expediente_promociones_tipo_expediente_id'
                    ) AS existe_indice_tipo_expediente
            """)).mappings().one()
        if all(objetos_promocion.values()):
            print(
                "[PROMOCIONES] Esquema completo; se omite DDL de promoción.",
                flush=True,
            )
        else:
            print(
                f"[PROMOCIONES] Faltan objetos de esquema: {dict(objetos_promocion)!r}",
                flush=True,
            )
            with _transaccion_inicio_segura("conexion_promocion") as conexion_promocion:
                if objetos_promocion["existe_expedientes"] and not objetos_promocion["existe_columna_promocion"]:
                    conexion_promocion.execute(text(
                        "ALTER TABLE public.expedientes ADD COLUMN promocion VARCHAR(300)"
                    ))
                if objetos_promocion["existe_expedientes"] and not objetos_promocion["existe_indice_promocion"]:
                    conexion_promocion.execute(text(
                        "CREATE INDEX ix_expedientes_promocion ON public.expedientes (promocion)"
                    ))
                if not objetos_promocion["existe_tabla_promociones"]:
                    conexion_promocion.execute(text("""
                        CREATE TABLE public.expediente_promociones (
                            expediente_id VARCHAR(100) PRIMARY KEY,
                            tipo_expediente_id INTEGER NOT NULL
                        )
                    """))
                if not objetos_promocion["existe_indice_tipo_expediente"]:
                    conexion_promocion.execute(text("""
                        CREATE INDEX ix_expediente_promociones_tipo_expediente_id
                        ON public.expediente_promociones (tipo_expediente_id)
                    """))

        # Campos del defecto registral solicitados por el cliente.
        # Migración idempotente: conserva todos los defectos ya registrados.
        with _transaccion_inicio_segura("conexion_defectos_absis") as conexion_defectos_absis:
            print("[STARTUP SQL] INICIO linea 1030", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS fecha_calificacion DATE
            """))
            print("[STARTUP SQL] INICIO linea 1034", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS fecha_renovacion_asiento DATE
            """))
            print("[STARTUP SQL] INICIO linea 1038", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS asiento_renovacion_libro_diario VARCHAR(200)
            """))
            print("[STARTUP SQL] INICIO linea 1042", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS vencimiento_asiento_renovacion DATE
            """))
            print("[STARTUP SQL] INICIO linea 1046", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS anotacion_suspensiva BOOLEAN
            """))
            print("[STARTUP SQL] INICIO linea 1050", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS vencimiento_anotacion DATE
            """))
            print("[STARTUP SQL] INICIO linea 1054", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS calificacion_sustitutoria BOOLEAN
            """))
            print("[STARTUP SQL] INICIO linea 1058", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS recurso_gubernativo BOOLEAN
            """))
            print("[STARTUP SQL] INICIO linea 1062", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS estado_envio_absis VARCHAR(30) NOT NULL DEFAULT 'Pendiente'
            """))
            print("[STARTUP SQL] INICIO linea 1066", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS enviado_absis_en TIMESTAMP WITH TIME ZONE
            """))
            print("[STARTUP SQL] INICIO linea 1070", flush=True)
            conexion_defectos_absis.execute(text("""
                ALTER TABLE IF EXISTS public.expediente_defectos
                ADD COLUMN IF NOT EXISTS respuesta_absis TEXT
            """))
        print("[DEFECTOS REGISTRALES] Campos de cliente y trazabilidad ABSIS comprobados.", flush=True)

        # Catálogo configurable de importes estimativos de Provisiones.
        from backend.app.provisiones.models import ConceptoImporteProvision
        ConceptoImporteProvision.__table__.create(bind=engine, checkfirst=True)
        # Migración compatible con instalaciones que ya tienen operaciones guardadas.
        # El backfill debe ejecutarse SOLO al crear cada columna: hacerlo en cada
        # arranque sobrescribiría con importes legacy cualquier cero legítimo
        # guardado posteriormente en los campos *_base.
        with _transaccion_inicio_segura("conn") as conn:
            columnas_operaciones_antes = {
                fila[0]
                for fila in conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'provisiones_operaciones'
                """)).fetchall()
            }
            print("[STARTUP SQL] INICIO linea 1081", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS notaria NUMERIC(14,2) NOT NULL DEFAULT 0"))
            print("[STARTUP SQL] INICIO linea 1082", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS impuestos NUMERIC(14,2) NOT NULL DEFAULT 0"))
            print("[STARTUP SQL] INICIO linea 1083", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS gastos_registro_base NUMERIC(14,2) NOT NULL DEFAULT 0"))
            print("[STARTUP SQL] INICIO linea 1084", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS suplidos_base NUMERIC(14,2) NOT NULL DEFAULT 0"))
            print("[STARTUP SQL] INICIO linea 1085", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS otros_gastos_base NUMERIC(14,2) NOT NULL DEFAULT 0"))
            print("[STARTUP SQL] INICIO linea 1086", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS ajustes_motivo TEXT"))
            print("[STARTUP SQL] INICIO linea 1087", flush=True)
            conn.execute(text("ALTER TABLE provisiones_operaciones ADD COLUMN IF NOT EXISTS ajustes_auditoria JSON NOT NULL DEFAULT '[]'"))
            print("[STARTUP SQL] INICIO linea 1088", flush=True)
            conn.execute(text("ALTER TABLE provisiones_conceptos_importes ADD COLUMN IF NOT EXISTS reglas JSON NOT NULL DEFAULT '{}'"))
            print("[STARTUP SQL] INICIO linea 1089", flush=True)
            if "gastos_registro_base" not in columnas_operaciones_antes:
                conn.execute(text("""
                    UPDATE provisiones_operaciones
                    SET gastos_registro_base = gastos_registro
                """))
            print("[STARTUP SQL] INICIO linea 1090", flush=True)
            if "suplidos_base" not in columnas_operaciones_antes:
                conn.execute(text("""
                    UPDATE provisiones_operaciones
                    SET suplidos_base = suplidos
                """))
            print("[STARTUP SQL] INICIO linea 1091", flush=True)
            if "otros_gastos_base" not in columnas_operaciones_antes:
                conn.execute(text("""
                    UPDATE provisiones_operaciones
                    SET otros_gastos_base = otros_gastos
                """))
        print("[PROVISIONES] Tabla de conceptos e importes disponible; migración de operaciones comprobada.", flush=True)

        ExpedienteAccion.__table__.create(
            bind=engine,
            checkfirst=True,
        )

        # El histórico se usa dentro de la misma transacción al crear defectos.
        # Crearlo aquí evita que el POST falle si la migración SQL no se ha ejecutado.
        HistorialDefecto.__table__.create(bind=engine, checkfirst=True)
        print("[DEFECTOS REGISTRALES] Tabla de historial disponible.", flush=True)

        SolicitudFusion.__table__.create(
            bind=engine,
            checkfirst=True,
        )

        ComplementoSaldo.__table__.create(bind=engine, checkfirst=True)
        # Migración segura del catálogo bancario: conserva todos los registros existentes.
        with _transaccion_inicio_segura("conexion_entidades_bancarias") as conexion_entidades_bancarias:
            print("[STARTUP SQL] INICIO linea 1112", flush=True)
            conexion_entidades_bancarias.execute(text(
                "ALTER TABLE public.entidades_bancarias "
                "ADD COLUMN IF NOT EXISTS entidad_actual_id INTEGER NULL "
                "REFERENCES public.entidades_bancarias(id) ON DELETE SET NULL"
            ))
        print("[ENTIDADES BANCARIAS] Columna entidad_actual_id comprobada.", flush=True)
        # Completa automáticamente sucesiones bancarias históricas conocidas.
        # Solo rellena relaciones vacías: nunca sobrescribe una asignación manual.
        with _transaccion_inicio_segura("conexion_sucesiones_bancarias") as conexion_sucesiones_bancarias:
            print("[STARTUP SQL] INICIO linea 1121", flush=True)
            conexion_sucesiones_bancarias.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND (
                          UPPER(actual.nombre) = 'CAIXABANK'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK,%'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK %'
                      )
                    ORDER BY
                      CASE WHEN UPPER(actual.nombre) = 'CAIXABANK' THEN 0 ELSE 1 END,
                      actual.id
                    LIMIT 1
                )
                WHERE origen.entidad_actual_id IS NULL
                  AND (
                    UPPER(origen.nombre) LIKE '%BARCLAYS BANK SUCURSAL EN ESPAÑA%'
                    OR UPPER(origen.nombre) LIKE '%BANCA CÍVICA%'
                    OR UPPER(origen.nombre) LIKE '%BANCAJA%'
                    OR UPPER(origen.nombre) LIKE '%BANKIA%'
                    OR UPPER(origen.nombre) = 'BFA'
                    OR UPPER(origen.nombre) LIKE '%BANCO MARE NOSTRUM%'
                    OR UPPER(origen.nombre) LIKE '%BANCO DE VALENCIA%'
                    OR UPPER(origen.nombre) LIKE '%BANCO DE MURCIA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA GIRONA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA LAIETANA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA ESTALVIS LAIETANA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA PENEDÈS%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA PENEDES%'
                    OR UPPER(origen.nombre) LIKE '%CAJA ÁVILA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA AVILA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS DE LA RIOJA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA GRANADA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA INSULAR CANARIAS%'
                    OR UPPER(origen.nombre) LIKE '%CAJA MADRID%'
                    OR UPPER(origen.nombre) LIKE '%CAJA MURCIA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA RIOJA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA SEGOVIA%'
                    OR UPPER(origen.nombre) LIKE '%CAJASOL%'
                    OR UPPER(origen.nombre) LIKE '%SA NOSTRA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA GENERAL DE AHORROS DE CANARIAS%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y PENSIONES DE BARCELONA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE BARCELONA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS MUNICIPAL DE BURGOS%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD MUNICIPAL DE PAMPLONA%'
                    OR UPPER(origen.nombre) LIKE '%MONTE DE PIEDAD Y CAJA DE AHORROS DE HUELVA Y SEVILLA%'
                    OR UPPER(origen.nombre) LIKE '%MONTE DE PIEDAD Y CAJA DE AHORROS SAN FERNANDO%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS PROVINCIAL SAN FERNANDO%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS DE VALENCIA, CASTELLÓN Y ALICANTE%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS DE VALENCIA, CASTELLON Y ALICANTE%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE ÁVILA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE AVILA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE SEGOVIA%'
                  )
                  AND EXISTS (
                    SELECT 1
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND (
                          UPPER(actual.nombre) = 'CAIXABANK'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK,%'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK %'
                      )
                  )
            """))
        print("[ENTIDADES BANCARIAS] Sucesiones históricas conocidas de CaixaBank comprobadas.", flush=True)
        # Otras sucesiones conocidas que terminaron en CaixaBank.
        with _transaccion_inicio_segura("conexion_sucesiones_adicionales") as conexion_sucesiones_adicionales:
            print("[STARTUP SQL] INICIO linea 1193", flush=True)
            conexion_sucesiones_adicionales.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND (
                          UPPER(actual.nombre) = 'CAIXABANK'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK,%'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK %'
                      )
                    ORDER BY
                      CASE WHEN UPPER(actual.nombre) = 'CAIXABANK' THEN 0 ELSE 1 END,
                      actual.id
                    LIMIT 1
                )
                WHERE origen.entidad_actual_id IS NULL
                  AND (
                    UPPER(origen.nombre) LIKE '%BANCO ZARAGOZANO%'
                    OR UPPER(origen.nombre) LIKE '%BANCO DE LA PEQUEÑA Y MEDIANA EMPRESA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS PROVINCIAL DE GUADALAJARA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE NAVARRA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE ALCALÁ DE HENARES%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE ALCIRA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE JÁTIVA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE JATIVA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE SEGORBE%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS DE VILLARREAL%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y PRÉSTAMOS DE CARLET%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y PRESTAMOS DE CARLET%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y SOCORROS Y MONTE DE PIEDAD DE GANDÍA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y SOCORROS Y MONTE DE PIEDAD DE GANDIA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y SOCORROS Y MONTE DE PIEDAD DE ALBERIQUE%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA D´ESTALVIS SAGRADA FAMILIA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA D''ESTALVIS SAGRADA FAMILIA%'
                  )
                  AND EXISTS (
                    SELECT 1
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND (
                          UPPER(actual.nombre) = 'CAIXABANK'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK,%'
                          OR UPPER(actual.nombre) LIKE 'CAIXABANK %'
                      )
                  )
            """))
            # La Caja de Ahorros Provincial de Ciudad Real pasó a CCM,
            # después a Liberbank y finalmente a Unicaja Banco.
            print("[STARTUP SQL] INICIO linea 1244", flush=True)
            conexion_sucesiones_adicionales.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND UPPER(actual.nombre) LIKE '%UNICAJA%'
                    ORDER BY actual.id
                    LIMIT 1
                )
                WHERE origen.entidad_actual_id IS NULL
                  AND UPPER(origen.nombre) LIKE '%CAJA DE AHORROS PROVINCIAL DE CIUDAD REAL%'
                  AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(actual.nombre) LIKE '%UNICAJA%'
                  )
            """))
            # Las antiguas cajas de Catalunya, Tarragona, Manresa y Lleida
            # terminaron integradas en CatalunyaCaixa/Unnim y posteriormente BBVA.
            print("[STARTUP SQL] INICIO linea 1265", flush=True)
            conexion_sucesiones_adicionales.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND UPPER(actual.nombre) LIKE 'BBVA%'
                    ORDER BY actual.id
                    LIMIT 1
                )
                WHERE origen.entidad_actual_id IS NULL
                  AND (
                    UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE LÉRIDA%'
                    OR UPPER(origen.nombre) LIKE '%CAJA DE AHORROS Y MONTE DE PIEDAD DE LERIDA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA CATALUNYA%'
                    OR UPPER(origen.nombre) LIKE '%CATALUNYACAIXA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA TARRAGONA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA MANRESA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA SABADELL%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA TERRASSA%'
                    OR UPPER(origen.nombre) LIKE '%CAIXA MANLLEU%'
                    OR UPPER(origen.nombre) LIKE '%UNNIM%'
                  )
                  AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(actual.nombre) LIKE 'BBVA%'
                  )
            """))
        # Completa sucesiones históricas de otros grupos bancarios españoles.
        # La migración es idempotente y respeta cualquier asignación manual existente.
        # Solo relaciona nombres históricos cuando la entidad sucesora activa está en el catálogo.
        # El código europeo se conserva como dato opcional para cajas históricas y entidades
        # que no disponen de un identificador europeo en la documentación disponible.
        with _transaccion_inicio_segura("conexion_codigo_entidad") as conexion_codigo_entidad:
            print("[STARTUP SQL] INICIO linea 1301", flush=True)
            conexion_codigo_entidad.execute(text(
                "ALTER TABLE public.entidades_bancarias ALTER COLUMN codigo_europeo DROP NOT NULL"
            ))

        # Carga idempotente del catálogo histórico publicado por CaixaBank (fusiones históricas).
        # Los códigos europeos y LEI se dejan vacíos cuando no están acreditados; no son obligatorios.
        # Se conserva el nombre histórico y se vincula a CaixaBank solo si no existe una relación manual.
        entidades_historicas_caixabank = [
            ("Barclays Bank SAU"),
            ("Bankia"),
            ("BFA"),
            ("Banco Mare Nostrum (BMN)"),
            ("Banca Cívica"),
            ("Caixa de Girona"),
            ("Caixa Penedès"),
            ("Sa Nostra"),
            ("Caixa d'Estalvis de l'Empordà, Figueres"),
            ("Caixa d’Estalvis del Sindicat Agrícola de l’Institut Obrer de la Seu d’Urgell"),
            ("Caixa Adherida del Cercle Obrer de Banyoles"),
            ("Caixa Adherida de Sant Joan de les Abadesses"),
            ("Caixa d'Estalvis de Palamós"),
            ("Caixa Adherida de la Joventut Seràfica d'Arenys de Mar"),
            ("Mont de Pietat (i Caixa d'Estalvis) de la Verge de l'Esperança de Barcelona"),
            ("Caixa Adherida de la Congregació Mariana de Canet de Mar"),
            ("Caixa Rural de Torroella de Montgrí"),
            ("Caixa d'Estalvis de l'Ateneu Social de St. Feliu de Guíxols"),
            ("Caixa d'Estalvis de Súria"),
            ("Caixa d'Estalvis de Palafrugell"),
            ("Caixa Rural de Santa Coloma de Queralt"),
            ("Caixa Adherida del Centre Parroquial de Torelló"),
            ("Caixa Rural de la Federació Catòlico-Agrària d'Eivissa"),
            ("Caixa Rural de Petra"),
            ("Caixa d'Estalvis del Patronat Obrer de Cardona"),
            ("Caixa d'Estalvis de la Fàbrica Bebié (La Farga) Ripoll"),
            ("Caixa Adherida de Premià de Mar"),
            ("Caixa Rural de Moià"),
            ("Caixa Rural de Son Cervera"),
            ("Caixa d'Estalvis de Vilanova i la Geltrú"),
            ("Caixa Rural de la Bisbal de l'Empordà"),
            ("Caixa d'Estalvis del Patronat d'Esparreguera"),
            ("Caixa Adherida de la Colònia Bonmatí (Amer)"),
            ("Caixa d'Estalvis Parroquial de Sant Hilari Sacalm"),
            ("Caixa Rural de Sant Sadurní d'Anoia"),
            ("Caixa de la Federació Agrària de Girona"),
            ("Caixa d'Estalvis del Cercle Catòlic de Gràcia-Barcelona"),
            ("Caixa d'Estalvis i Mont de Pietat de Manacor"),
            ("Caixa d'Estalvis Social de Mataró"),
            ("Caixa Rural d'Estalvis i Préstecs de Sineu"),
            ("Caixa Rural del Sindicat Agrícola de Campos del Port"),
            ("Caixa Rural d'Estalvis i Préstecs de Felanitx"),
            ("Caixa Rural del Sindicat Agrícola Catòlic de Capdepera"),
            ("Caixa Rural d'Estalvis i Préstecs de Capdepera"),
            ("Banc de Crèdit Agrícola i Comercial de Llucmajor"),
            ("Caixa Rural d'Estalvis i Préstecs de Porreres"),
            ("Sindicat Agrícola i Caixa Rural d'Estalvis i Préstecs de Sineu"),
            ("Caixa d'Estalvis i Previsió Molletenca, Mollet del Vallès"),
            ("Foment Agrícola, Comercial i Industrial de Llucmajor"),
            ("Caixa Rural del Sindicat Agrícola La Torre de Campos del Port"),
            ("Caixa Rural d'Estalvis i Préstecs d'Artà"),
            ("Caixa d'Estalvis de Castellar del Vallès"),
            ("Caixa adherida al Patronat Social de Vilassar"),
            ("Caixa d'Estalvis del Foment de Cultura de St. Feliu de Codines"),
            ("Caixa d'Estalvis Municipal de la Pobla de Lillet"),
            ("Caixa d'Estalvis de Darnius"),
            ("Caixa del Sindicat Agrícola de Ses Salines"),
            ("Caixa Rural de Crèdit i Estalvi de Castelló d'Empúries"),
            ("Caixa d'Estalvis de Sant Llorenç de Morunys"),
            ("Caixa d'Estalvis de Calonge"),
            ("Caixa d'Estalvis de la Bisbal del Penedès"),
            ("Caixa d'Estalvis i Mont de Pietat de Maó"),
            ("Caixa d'Estalvis i Mont de Pietat de Lleida"),
            ("Caja Rural de Talavera"),
            ("Caja Rural de Palencia"),
            ("Caja Rural de Cantabria"),
            ("Banque pour la Construction et l'Équipement"),
            ("Société de Crédit et de Banque"),
            ("Banco de las Islas Canarias"),
            ("Caixa de la Sagrada Família"),
            ("Caixa Rural del Pirineu"),
            ("Caixa Rural de la Cooperativa Agrícola de Calafell"),
            ("Caixa Rural de la Cooperativa Agrícola del Perelló"),
            ("Caixa Rural d'Almenar"),
            ("Caixa Rural Provincial de Barcelona"),
            ("Cooperativa Agrícola de Jesús i Maria"),
            ("Isbanc"),
            ("Banco de Europa"),
            ("Banco Herrero"),
            ("Banco Granada-Jerez"),
            ("Parte del negocio de banca privada de Morgan Stanley en España"),
            ("Bankpime"),
            ("Banco de Valencia"),
            ("CaixaBank"),
            ("BPI"),
            ("Banco BPI, S.A."),
            ("Caja de Pensiones"),
            ("Caja de Barcelona"),
            ("Caja de Ahorros y Pensiones de Barcelona"),
            ("Caixa Penedès"),
            ("Caja Navarra"),
            ("CajaCanarias"),
            ("Caja de Burgos"),
            ("Cajasol"),
            ("Banco Popular Español"),
            ("Banco Popular"),
            ("Banco Pastor"),
            ("Banco Español de Crédito (Banesto)"),
            ("Banesto"),
            ("Banif"),
            ("Banco Central Hispano"),
            ("Banco Hispano Americano"),
            ("Banco Central"),
            ("Banco de Andalucía"),
            ("Banco de Castilla"),
            ("Banco de Galicia"),
            ("Banco de Vasconia"),
            ("Crédito Balear"),
            ("Banco Bilbao Vizcaya"),
            ("Banco de Bilbao"),
            ("Banco de Vizcaya"),
            ("Argentaria"),
            ("Banco Exterior de España"),
            ("Banco de Crédito Local"),
            ("Uno-e"),
            ("Banco Atlántico"),
            ("Banco Urquijo"),
            ("Banco Guipuzcoano"),
            ("Banco CAM"),
            ("Caja de Ahorros del Mediterráneo"),
            ("Banco Gallego"),
            ("NatWest España"),
            ("Solbank"),
            ("Lloyds Bank España"),
            ("Caja de Ahorros de Asturias"),
            ("Cajastur"),
            ("Caja de Ahorros de Cantabria"),
            ("Caja de Extremadura"),
            ("Caja de Castilla-La Mancha"),
            ("CCM"),
            ("Liberbank"),
            ("Caja España"),
            ("Caja Duero"),
            ("EspañaDuero"),
            ("Caja de Jaén"),
            ("Caja de Ronda"),
            ("Caja de Ahorros de Antequera"),
            ("Caixa Galicia"),
            ("Caixanova"),
            ("Novacaixagalicia"),
            ("NCG Banco"),
            ("Banco Etcheverría"),
            ("Banco Echeverría"),
            ("BBK"),
            ("Kutxa"),
            ("Caja Vital"),
            ("Caja Vital Kutxa"),
            ("Cajasur"),
            ("Caja Inmaculada"),
            ("Caja de Ahorros de la Inmaculada"),
            ("Caja Círculo"),
            ("Caja de Ahorros y Monte de Piedad del Círculo Católico de Burgos"),
            ("Caja Badajoz"),
            ("Banco Grupo Caja3"),
            ("Caja3"),
            ("Ruralcaja"),
            ("Caja Rural del Mediterráneo"),
            ("Cajas Rurales Unidas"),
            ("EVO Banco"),
            ("Banco Zaragozano"),
            ("Banco de Alicante"),
            ("Banco de Crédito Balear"),
            ("Banco de Castilla-La Mancha"),
            ("Caja de Ahorros Provincial de Ciudad Real"),
            ("Banco de Crédito Industrial"),
            ("Banco de Fomento"),
            ("Banco de Bilbao Vizcaya Argentaria"),
            ("Banco de Crédito Industrial"),
            ("Banco Hipotecario de España"),
            ("Banco de Valladolid"),
            ("Banca de Medina"),
            ("Santander Consumer Finance, S.A."),
            ("Banco Industrial de León"),
            ("Banco Central Hispano Hipotecario"),
            ("Banco Caixa Geral"),
            ("Bankoa"),
            ("Banca Catalana"),
            ("Banco de Comercio"),
            ("Banco de Negocios Argentaria"),
            ("Banco Meridional"),
            ("Banco de Crédito Canario"),
            ("Unoe Bank"),
            ("Activobank"),
            ("Banco de Asturias"),
            ("Banco de Aragón"),
            ("Banco Industrial de Barcelona"),
            ("Banco Continental"),
            ("Banco de Canarias"),
            ("Crédito Navarro"),
            ("Banco de San Sebastián"),
            ("Banco de Gijón"),
            ("Mercantil e Industrial"),
            ("Banco Ibérico"),
            ("Banco de Mataró"),
            ("Banco de Tolosa"),
            ("Banco de La Coruña"),
            ("Banco de Jerez"),
            ("Banco de Granada"),
            ("Banco de Progreso")
        ]
        with _transaccion_inicio_segura("conexion_semillas_caixabank") as conexion_semillas_caixabank:
            for nombre_historico in entidades_historicas_caixabank:
                print(f"[STARTUP SQL] INICIO linea 1511 semilla_historica={nombre_historico}", flush=True)
                conexion_semillas_caixabank.execute(text("""
                    INSERT INTO public.entidades_bancarias
                        (codigo_europeo, lei, nombre, categoria, direccion, entidad_actual_id, activo)
                    SELECT NULL, NULL, :nombre, 'Entidad de crédito', NULL, NULL, TRUE
                    WHERE NOT EXISTS (
                        SELECT 1 FROM public.entidades_bancarias existente
                        WHERE UPPER(TRIM(existente.nombre)) = UPPER(TRIM(:nombre))
                    )
                """), {"nombre": nombre_historico})
        print("[ENTIDADES BANCARIAS] Catálogo histórico de CaixaBank comprobado (sin duplicados).", flush=True)

        # Entidades que el listado facilitado indica que deben vincularse a CaixaBank.
        # Se respetan los valores de entidad_actual_id que ya estén asignados manualmente.
        patrones_caixabank_facilitados = [
                  "%CAIXA D'ESTALVIS DE L'EMPORDÀ%", "%BANCO GRANADA-JEREZ%", "%BANCO DE GRANADA%", "%BANCO DE JEREZ%",
                  "%CAIXA D’ESTALVIS DEL SINDICAT AGRÍCOLA%",
                  "%CAIXA ADHERIDA DEL CERCLE OBRER DE BANYOLES%",
                  "%CAIXA ADHERIDA DE SANT JOAN DE LES ABADESSES%",
                  "%CAIXA D'ESTALVIS DE PALAMÓS%",
                  "%JOVENTUT SERÀFICA D'ARENYS DE MAR%",
                  "%MONT DE PIETAT%",
                  "%VERGE DE L'ESPERANÇA%",
                  "%CONGREGACIÓ MARIANA DE CANET DE MAR%",
                  "%CAIXA RURAL DE TORROELLA DE MONTGRÍ%",
                  "%ATENEU SOCIAL DE ST. FELIU DE GUÍXOLS%",
                  "%CAIXA D'ESTALVIS DE SÚRIA%",
                  "%CAIXA D'ESTALVIS DE PALAFRUGELL%",
                  "%SANTA COLOMA DE QUERALT%",
                  "%CENTRE PARROQUIAL DE TORELLÓ%",
                  "%FEDERACIÓ CATÒLICO-AGRÀRIA D'EIVISSA%",
                  "%CAIXA RURAL DE PETRA%",
                  "%PATRONAT OBRER DE CARDONA%",
                  "%FÀBRICA BEBIÉ%",
                  "%PREMIÀ DE MAR%",
                  "%CAIXA RURAL DE MOIÀ%",
                  "%SON CERVERA%",
                  "%VILANOVA I LA GELTRÚ%",
                  "%BISBAL DE L'EMPORDÀ%",
                  "%PATRONAT D'ESPARREGUERA%",
                  "%COLÒNIA BONMATÍ%",
                  "%SANT HILARI SACALM%",
                  "%SANT SADURNÍ D'ANOIA%",
                  "%FEDERACIÓ AGRÀRIA DE GIRONA%",
                  "%CERCLE CATÒLIC DE GRÀCIA%",
                  "%MANACOR%",
                  "%MATA RÓ%",
                  "%SINEU%",
                  "%CAMPOS DEL PORT%",
                  "%FELANITX%",
                  "%CAPDEPERA%",
                  "%LLUCMAJOR%",
                  "%PORRERES%",
                  "%MOLLETENCA%",
                  "%FOMENT AGRÍCOLA, COMERCIAL I INDUSTRIAL DE LLUCMAJOR%",
                  "%LA TORRE%",
                  "%ARTÀ%",
                  "%CASTELLAR DEL VALLÈS%",
                  "%PATRONAT SOCIAL DE VILASSAR%",
                  "%FOMENT DE CULTURA DE ST. FELIU DE CODINES%",
                  "%POBLA DE LILLET%",
                  "%DARNIUS%",
                  "%SES SALINES%",
                  "%CASTELLÓ D'EMPÚRIES%",
                  "%SANT LLORENÇ DE MORUNYS%",
                  "%CALONGE%",
                  "%BISBAL DEL PENEDÈS%",
                  "%MAÓ%",
                  "%MONT DE PIETAT DE LLEIDA%",
                  "%CAJA RURAL DE TALAVERA%",
                  "%CAJA RURAL DE PALENCIA%",
                  "%CAJA RURAL DE CANTABRIA%",
                  "%BANQUE POUR LA CONSTRUCTION ET L'ÉQUIPEMENT%",
                  "%SOCIÉTÉ DE CRÉDIT ET DE BANQUE%",
                  "%BANCO DE LAS ISLAS CANARIAS%",
                  "%CAIXA DE LA SAGRADA FAMÍLIA%",
                  "%CAIXA RURAL DEL PIRINEU%",
                  "%COOPERATIVA AGRÍCOLA DE CALAFELL%",
                  "%COOPERATIVA AGRÍCOLA DEL PERELLÓ%",
                  "%CAIXA RURAL D'ALMENAR%",
                  "%CAIXA RURAL PROVINCIAL DE BARCELONA%",
                  "%ISBANC%",
                  "%BANCO DE EUROPA%",
                  "%BANCO GRANADA-JEREZ%",
                  "%MORGAN STANLEY%",
                  "%CAIXA DE GIRONA%",
                  "%BANKPIME%",
                  "%BANCA CÍVICA%",
        "%ADQUISICIÓN DE UNA RED DE 29 OFICINAS AL BANCO DE LAS ISLAS CANARIAS%",
        "%ADQUISICIÓN DE ISBANC%",
        "%ADQUISICIÓN DE BANCO DE EUROPA%",
        "%PARTE DEL NEGOCIO DE BANCA PRIVADA DE MORGAN STANLEY%",
        "%BANCO DE VALENCIA%",
                  "%BARCLAYS BANK SAU%",
                  "%BARCLAYS BANK%",
                  "%BANKIA%",
                  "%BFA%",
                  "%BANCO MARE NOSTRUM%",
                  "%BMN%",
                  "%SA NOSTRA%",
                  "%CAIXA PENEDÈS%",
                  "%CAIXA PENEDES%",
                  "%CAIXA D'ESTALVIS DE PENEDÈS%",
                  "%CAIXA D'ESTALVIS DE PENEDES%",
                  "%CAIXA GIRONA%",
                  "%CAIXA DE GIRONA%"
        ]
        with _transaccion_inicio_segura("conexion_caixabank_facilitados") as conexion_caixabank_facilitados:
            for patron_origen in patrones_caixabank_facilitados:
                print(f"[STARTUP SQL] INICIO linea 1619 sucesion_caixabank_facilitados patron={patron_origen}", flush=True)
                conexion_caixabank_facilitados.execute(
                    text("""
                        UPDATE public.entidades_bancarias AS origen
                        SET entidad_actual_id = (
                            SELECT actual.id
                            FROM public.entidades_bancarias AS actual
                            WHERE actual.activo IS TRUE
                              AND actual.id <> origen.id
                              AND UPPER(TRIM(actual.nombre)) = 'CAIXABANK'
                            ORDER BY actual.id
                            LIMIT 1
                        )
                        WHERE origen.entidad_actual_id IS NULL
                          AND UPPER(origen.nombre) LIKE :patron
                          AND EXISTS (
                            SELECT 1 FROM public.entidades_bancarias AS actual
                            WHERE actual.activo IS TRUE
                              AND actual.id <> origen.id
                              AND UPPER(TRIM(actual.nombre)) = 'CAIXABANK'
                          )
                    """),
                    {"patron": patron_origen},
                )
        # Reparar vínculos históricos que por coincidencia de prefijo quedaron enlazados
        # al fondo "CAIXABANK MONETARIO RENDIMIENTO, FI" en lugar del banco CaixaBank.
        with _transaccion_inicio_segura("conexion_corregir_destino_caixabank") as conexion_corregir_destino_caixabank:
            print("[STARTUP SQL] INICIO linea 1645", flush=True)
            conexion_corregir_destino_caixabank.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT banco.id
                    FROM public.entidades_bancarias AS banco
                    WHERE banco.activo IS TRUE
                      AND UPPER(TRIM(banco.nombre)) = 'CAIXABANK'
                    ORDER BY banco.id
                    LIMIT 1
                )
                WHERE origen.entidad_actual_id IN (
                    SELECT fondo.id
                    FROM public.entidades_bancarias AS fondo
                    WHERE UPPER(TRIM(fondo.nombre)) = 'CAIXABANK MONETARIO RENDIMIENTO, FI'
                )
                AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS banco
                    WHERE banco.activo IS TRUE
                      AND UPPER(TRIM(banco.nombre)) = 'CAIXABANK'
                )
            """))
        # BPI sigue operando como Banco BPI, S.A.; es filial del grupo, no un banco absorbido por CaixaBank.
        with _transaccion_inicio_segura("conexion_bpi") as conexion_bpi:
            print("[STARTUP SQL] INICIO linea 1668", flush=True)
            conexion_bpi.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(TRIM(actual.nombre)) IN ('BANCO BPI, S.A.', 'BANCO BPI')
                      AND actual.id <> origen.id
                    ORDER BY CASE WHEN UPPER(TRIM(actual.nombre)) = 'BANCO BPI, S.A.' THEN 0 ELSE 1 END, actual.id
                    LIMIT 1
                )
                WHERE UPPER(TRIM(origen.nombre)) = 'BPI'
                  AND origen.entidad_actual_id IS NULL
                  AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(TRIM(actual.nombre)) IN ('BANCO BPI, S.A.', 'BANCO BPI')
                      AND actual.id <> origen.id
                  )
            """))
        # Banco Herrero terminó integrado en Banco Sabadell; corregir también vínculos previos erróneos.
        with _transaccion_inicio_segura("conexion_herrero") as conexion_herrero:
            print("[STARTUP SQL] INICIO linea 1690", flush=True)
            conexion_herrero.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND (
                        UPPER(TRIM(actual.nombre)) LIKE 'BANCO DE SABADELL%'
                        OR UPPER(TRIM(actual.nombre)) LIKE 'BANCO SABADELL%'
                      )
                    ORDER BY
                      CASE WHEN UPPER(TRIM(actual.nombre)) = 'BANCO SABADELL' THEN 0 ELSE 1 END,
                      actual.id
                    LIMIT 1
                )
                WHERE UPPER(TRIM(origen.nombre)) LIKE '%BANCO HERRERO%'
                  AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND actual.id <> origen.id
                      AND (
                        UPPER(TRIM(actual.nombre)) LIKE 'BANCO DE SABADELL%'
                        OR UPPER(TRIM(actual.nombre)) LIKE 'BANCO SABADELL%'
                      )
                  )
            """))
        print("[ENTIDADES BANCARIAS] Sucesiones CaixaBank del listado facilitado comprobadas.", flush=True)

        reglas_sucesion_bancaria = [
            (
                "CAIXABANK",
                "UPPER(TRIM(actual.nombre)) = 'CAIXABANK'",
                [
                    "%CAJA NAVARRA%", "%CAJA DE AHORROS Y MONTE DE PIEDAD DE NAVARRA%",
                    "%CAJA DE BURGOS%", "%CAJA DE AHORROS MUNICIPAL DE BURGOS%",
                    "%CAJA GUADALAJARA%", "%CAJA DE AHORROS PROVINCIAL DE GUADALAJARA%",
                    "%CAJA CANARIAS%", "%CAJA DE CANARIAS%", "%CAJA GENERAL DE AHORROS DE CANARIAS%",
                    "%GENERAL DE CANARIAS%", "%CAJASOL%", "%BANCA CIVICA%", "%BANCA CÍVICA%",
                    "%LA CAIXA%", "%CAJA DE PENSIONES%", "%CAJA DE BARCELONA%",
                    "%CAJA DE AHORROS Y PENSIONES DE BARCELONA%", "%CAIXABANK, S.A.%",
                    "%BARCLAYS BANK%", "%BANKIA%", "%BFA%", "%BANCO MARE NOSTRUM%", "%BMN%",
                    "%BANCO DE VALENCIA%", "%BANCO ZARAGOZANO%", "%BANCO DE VALLADOLID%", "%BANCA DE MEDINA%", "%BANKPIME%", "%BANCO DE LAS ISLAS CANARIAS%",
                    "%CAIXA GIRONA%", "%CAIXA DE GIRONA%", "%CAIXA PENEDÈS%", "%CAIXA PENEDES%",
                    "%SA NOSTRA%", "%BANCO DE LAS ISLAS CANARIAS%", "%ISBANC%", "%BANCO DE EUROPA%",
                    "%MORGAN STANLEY%", "%CAIXA D'ESTALVIS DE L'EMPORDÀ%"
                ],
            ),
            (
                "BBVA",
                "UPPER(actual.nombre) LIKE 'BBVA%'",
                [
                    "%UNNIM%", "%UNNIM BANC%", "%CATALUNYACAIXA%", "%CATALUNYA BANC%",
                    "%CAIXA CATALUNYA%", "%CAIXA TARRAGONA%", "%CAIXA MANRESA%", "%CAIXA SABADELL%",
                    "%CAIXA TERRASSA%", "%CAIXA MANLLEU%", "%CAJA DE AHORROS Y MONTE DE PIEDAD DE LÉRIDA%",
                    "%CAJA DE AHORROS Y MONTE DE PIEDAD DE LERIDA%", "%BANCO DE CRÉDITO LOCAL%",
                    "%BANCO DE CREDITO LOCAL%", "%UNO-E%", "%ARGENTARIA%", "%BANCO BILBAO VIZCAYA%",
                    "%BANCO DE BILBAO%", "%BANCO DE VIZCAYA%", "%BANCO EXTERIOR DE ESPAÑA%",
                    "%BANCO EXTERIOR DE ESPANA%", "%BANCO DE LA CORUÑA%", "%BANCO DE LA CORUNA%", "%BANCO DE CRÉDITO INDUSTRIAL%", "%BANCO DE CREDITO INDUSTRIAL%", "%BANCO HIPOTECARIO DE ESPAÑA%", "%BANCO HIPOTECARIO DE ESPANA%", "%CAJA POSTAL%", "%BANCO DE ALICANTE%", "%BANCA CATALANA%", "%BANCO DE COMERCIO%", "%BANCO DE NEGOCIOS ARGENTARIA%", "%BANCO MERIDIONAL%", "%BANCO DE CRÉDITO CANARIO%", "%BANCO DE CREDITO CANARIO%", "%UNOE BANK%", "%UNOE BANK S.A.%"
                ],
            ),
            (
                "BANCO SANTANDER",
                """(
                    UPPER(actual.nombre) LIKE 'BANCO SANTANDER%'
                    OR UPPER(actual.nombre) LIKE 'SANTANDER%'
                )""",
                [
                    "%BANCO POPULAR%", "%BANCO POPULAR ESPAÑOL%", "%BANCO PASTOR%", "%BANESTO%",
                    "%BANCO ESPAÑOL DE CRÉDITO%", "%BANCO ESPANOL DE CREDITO%", "%BANIF%",
                    "%BANCO CENTRAL HISPANO%", "%BANCO HISPANO AMERICANO%", "%BANCO CENTRAL, S.A.%",
                    "%BANCO DE ANDALUCÍA%", "%BANCO DE ANDALUCIA%", "%BANCO DE CASTILLA%",
                    "%BANCO DE GALICIA%", "%BANCO DE VASCONIA%", "%CRÉDITO BALEAR%",
                    "%CREDITO BALEAR%", "%BANCO DE ARAGÓN%", "%BANCO DE ARAGON%", "%BANCO DE MATARÓ%", "%BANCO DE MATARO%", "%BANCO DE TOLOSA%", "%BANCO INDUSTRIAL DE BARCELONA%", "%BANCO CONTINENTAL%", "%BANCO DE CANARIAS%", "%CRÉDITO NAVARRO%", "%CREDITO NAVARRO%", "%BANCO DE SAN SEBASTIÁN%", "%BANCO DE SAN SEBASTIAN%", "%BANCO DE GIJÓN%", "%BANCO DE GIJON%", "%MERCANTIL E INDUSTRIAL%", "%BANCO IBÉRICO%", "%BANCO IBERICO%"
                ],
            ),
            (
                "BANCO SABADELL",
                """(
                    UPPER(actual.nombre) LIKE 'BANCO DE SABADELL%'
                    OR UPPER(actual.nombre) LIKE 'BANCO SABADELL%'
                )""",
                [
                    "%BANCO CAM%", "%CAJA DE AHORROS DEL MEDITERRÁNEO%",
                    "%CAJA DE AHORROS DEL MEDITERRANEO%", "%CAJA MEDITERRÁNEO%",
                    "%CAJA MEDITERRANEO%", "%BANCO GUIPUZCOANO%", "%BANCO GALLEGO%", "%ACTIVOBANK%", "%BANCO DE ASTURIAS%",
                    "%BANCO ATLÁNTICO%", "%BANCO ATLANTICO%", "%BANCO HERRERO%", "%BANCO URQUIJO%",
                    "%BANCO DE PROGRESO%", "%NATWEST ESPAÑA%", "%NATWEST ESPANA%", "%SOLBANK%", "%LLOYDS BANK ESPAÑA%",
                    "%LLOYDS BANK ESPANA%"
                ],
            ),
            (
                "UNICAJA",
                "UPPER(actual.nombre) LIKE 'UNICAJA%'",
                [
                    "%BANCO CEISS%", "%CAJA ESPAÑA-DUERO%", "%CAJA ESPANA-DUERO%",
                    "%CAJA ESPAÑA DE INVERSIONES%", "%CAJA ESPANA DE INVERSIONES%", "%CAJA DUERO%",
                    "%CAJA ESPAÑA%", "%CAJA ESPANA%", "%CAJA DE JAÉN%", "%CAJA DE JAEN%",
                    "%CAJA JAÉN%", "%CAJA JAEN%", "%LIBERBANK%", "%CAJASTUR%",
                    "%CAJA DE AHORROS DE ASTURIAS%", "%CAJA CANTABRIA%", "%CAJA DE AHORROS DE CANTABRIA%",
                    "%CAJA EXTREMADURA%", "%CAJA DE EXTREMADURA%", "%CAJA CASTILLA LA MANCHA%",
                    "%CAJA CASTILLA-LA MANCHA%", "%CAJA DE CASTILLA-LA MANCHA%",
                    "%CCM%", "%CAJA DE AHORROS PROVINCIAL DE CIUDAD REAL%", "%CAJA DE RONDA%",
                    "%CAJA DE AHORROS DE ANTEQUERA%"
                ],
            ),
            (
                "KUTXABANK",
                "UPPER(actual.nombre) LIKE 'KUTXABANK%'",
                [
                    "%CAJASUR%", "%CAJA SUR%", "%CAJA DE AHORROS Y MONTE DE PIEDAD DE CÓRDOBA%",
                    "%CAJA DE AHORROS Y MONTE DE PIEDAD DE CORDOBA%", "%BBK%", "%KUTXA%",
                    "%CAJA VITAL%", "%CAJA VITAL KUTXA%", "%CAJA DE AHORROS DE VITORIA Y ÁLAVA%",
                    "%CAJA DE AHORROS DE VITORIA Y ALAVA%"
                ],
            ),
            (
                "IBERCAJA",
                "UPPER(actual.nombre) LIKE 'IBERCAJA%'",
                [
                    "%CAJA3%", "%CAJA 3%", "%CAJA INMACULADA%", "%CAJA DE AHORROS DE LA INMACULADA%",
                    "%CAJA CÍRCULO%", "%CAJA CIRCULO%", "%CÍRCULO CATÓLICO DE BURGOS%",
                    "%CIRCULO CATOLICO DE BURGOS%", "%CAJA BADAJOZ%", "%BANCO GRUPO CAJA 3%",
                    "%BANCO GRUPO CAJA3%"
                ],
            ),
            (
                "ABANCA",
                "UPPER(actual.nombre) LIKE 'ABANCA%'",
                [
                    "%NOVACAIXAGALICIA%", "%NOVAGALICIA%", "%NCG BANCO%", "%CAIXA GALICIA%",
                    "%CAIXA GALÍCIA%", "%CAIXANOVA%", "%CAIXA NOVA%", "%BANCO ETCHEVERRÍA%",
                    "%BANCO ETCHEVERRIA%", "%BANCO ECHEVERRÍA%", "%BANCO ECHEVERRIA%", "%BANCO CAIXA GERAL%", "%BANKOA%"
                ],
            ),
            (
                "CAJAMAR",
                "UPPER(actual.nombre) LIKE 'CAJAMAR%'",
                [
                    "%RURALCAJA%", "%CAJA RURAL DEL MEDITERRÁNEO%", "%CAJA RURAL DEL MEDITERRANEO%",
                    "%CAJAS RURALES UNIDAS%", "%CRU-CAJAS RURALES UNIDAS%",
                    "%GRUPO COOPERATIVO CAJAMAR%"
                ],
            ),
            (
                "SANTANDER CONSUMER FINANCE",
                "UPPER(actual.nombre) LIKE 'SANTANDER CONSUMER FINANCE%'",
                [
                    "%BANCO DE FOMENTO%", "%BANCO INDUSTRIAL DE LEÓN%", "%BANCO INDUSTRIAL DE LEON%",
                    "%BANCO CENTRAL HISPANO HIPOTECARIO%"
                ],
            ),
            (
                "BANKINTER",
                "UPPER(actual.nombre) LIKE 'BANKINTER%'",
                ["%EVO BANCO%", "%EVO BANCO, S.A.%"],
            ),
        ]
        with _transaccion_inicio_segura("conexion_sucesiones_ampliadas") as conexion_sucesiones_ampliadas:
            for nombre_grupo, condicion_destino, patrones_origen in reglas_sucesion_bancaria:
                for patron_origen in patrones_origen:
                    print(f"[STARTUP SQL] INICIO linea 1851 sucesiones_ampliadas grupo={nombre_grupo} patron={patron_origen}", flush=True)
                    conexion_sucesiones_ampliadas.execute(
                        text(f"""
                            UPDATE public.entidades_bancarias AS origen
                            SET entidad_actual_id = (
                                SELECT actual.id
                                FROM public.entidades_bancarias AS actual
                                WHERE actual.activo IS TRUE
                                  AND actual.id <> origen.id
                                  AND {condicion_destino}
                                ORDER BY
                                  CASE
                                    WHEN UPPER(actual.nombre) = '{nombre_grupo}' THEN 0
                                    ELSE 1
                                  END,
                                  actual.id
                                LIMIT 1
                            )
                            WHERE origen.entidad_actual_id IS NULL
                              AND UPPER(origen.nombre) LIKE :patron_origen
                              AND EXISTS (
                                SELECT 1
                                FROM public.entidades_bancarias AS actual
                                WHERE actual.activo IS TRUE
                                  AND actual.id <> origen.id
                                  AND {condicion_destino}
                              )
                        """),
                        {"patron_origen": patron_origen},
                    )
        # Corrección de sucesiones históricas que apuntaban por error a un fondo monetario.
        # Kutxa, Caja Vital y Cajasur corresponden al banco Kutxabank, S.A.;
        # el fondo KUTXABANK MONETARIO AHORRO, FI no es el banco sucesor.
        with _transaccion_inicio_segura("conexion_correcciones_catalogo") as conexion_correcciones_catalogo:
            print("[STARTUP SQL] INICIO linea 1884", flush=True)
            conexion_correcciones_catalogo.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(TRIM(actual.nombre)) = 'KUTXABANK, S.A.'
                    ORDER BY actual.id
                    LIMIT 1
                )
                WHERE UPPER(TRIM(origen.nombre)) IN (
                    'CAJASUR',
                    'CAJA VITAL',
                    'CAJA VITAL KUTXA',
                    'KUTXA'
                )
                  AND EXISTS (
                    SELECT 1
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(TRIM(actual.nombre)) = 'KUTXABANK, S.A.'
                  )
            """))
            print("[STARTUP SQL] INICIO linea 1907", flush=True)
            conexion_correcciones_catalogo.execute(text("""
                UPDATE public.entidades_bancarias
                SET entidad_actual_id = NULL
                WHERE UPPER(TRIM(nombre)) = 'KUTXABANK MONETARIO AHORRO, FI'
            """))
            print("[STARTUP SQL] INICIO linea 1912", flush=True)
            conexion_correcciones_catalogo.execute(text("""
                UPDATE public.entidades_bancarias
                SET entidad_actual_id = NULL
                WHERE UPPER(TRIM(nombre)) = 'KUTXABANK, S.A.'
                  AND entidad_actual_id IN (
                    SELECT id FROM public.entidades_bancarias
                    WHERE UPPER(TRIM(nombre)) = 'KUTXABANK MONETARIO AHORRO, FI'
                  )
            """))
        # Sucesiones que deben quedar cubiertas incluso si la regla genérica no encontró
        # la fila de origen en una inicialización anterior.
        with _transaccion_inicio_segura("conexion_sucesiones_puntuales") as conexion_sucesiones_puntuales:
            print("[STARTUP SQL] INICIO linea 1924", flush=True)
            conexion_sucesiones_puntuales.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(TRIM(actual.nombre)) LIKE 'UNICAJA%'
                    ORDER BY
                      CASE WHEN UPPER(TRIM(actual.nombre)) = 'UNICAJA BANCO, S.A.' THEN 0 ELSE 1 END,
                      actual.id
                    LIMIT 1
                )
                WHERE UPPER(TRIM(origen.nombre)) IN (
                    'ESPAÑADUERO',
                    'ESPANADUERO',
                    'BANCO CEISS',
                    'BANCO DE CAJA ESPAÑA DE INVERSIONES, SALAMANCA Y SORIA, S.A.'
                )
                  AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE AND UPPER(TRIM(actual.nombre)) LIKE 'UNICAJA%'
                  )
            """))
            print("[STARTUP SQL] INICIO linea 1947", flush=True)
            conexion_sucesiones_puntuales.execute(text("""
                UPDATE public.entidades_bancarias AS origen
                SET entidad_actual_id = (
                    SELECT actual.id
                    FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE
                      AND UPPER(TRIM(actual.nombre)) LIKE 'BBVA%'
                    ORDER BY actual.id
                    LIMIT 1
                )
                WHERE UPPER(TRIM(origen.nombre)) IN ('UNO-E', 'UNO-E BANK', 'UNOE BANK')
                  AND EXISTS (
                    SELECT 1 FROM public.entidades_bancarias AS actual
                    WHERE actual.activo IS TRUE AND UPPER(TRIM(actual.nombre)) LIKE 'BBVA%'
                  )
            """))
        print("[ENTIDADES BANCARIAS] Correcciones de Kutxabank/Cajasur y fondos revisadas.", flush=True)
        print("[ENTIDADES BANCARIAS] Sucesiones de grupos bancarios españoles comprobadas.", flush=True)
        print("[ENTIDADES BANCARIAS] Sucesiones históricas adicionales comprobadas.", flush=True)
        with _transaccion_inicio_segura("conexion_complementos") as conexion_complementos:
            print("[STARTUP SQL] INICIO linea 1967", flush=True)
            conexion_complementos.execute(text(
                "ALTER TABLE public.complementos_saldo ADD COLUMN IF NOT EXISTS provisionado DOUBLE PRECISION NOT NULL DEFAULT 0"
            ))
            print("[STARTUP SQL] INICIO linea 1970", flush=True)
            conexion_complementos.execute(text(
                "ALTER TABLE public.complementos_saldo ADD COLUMN IF NOT EXISTS saldo_disponible DOUBLE PRECISION NOT NULL DEFAULT 0"
            ))
            print("[STARTUP SQL] INICIO linea 1973", flush=True)
            conexion_complementos.execute(text(
                "ALTER TABLE public.complementos_saldo ADD COLUMN IF NOT EXISTS motivo VARCHAR(2000)"
            ))
        print("[COMPLEMENTOS SALDO] Campos de provisión y motivo comprobados.", flush=True)
        EnvioAbsis.__table__.create(bind=engine, checkfirst=True)
        print("[PROCESO ABSIS] Tabla disponible.", flush=True)
        print("[COMPLEMENTOS SALDO] Tabla disponible.", flush=True)

        EmailReclamacion.__table__.create(
            bind=engine,
            checkfirst=True,
        )
        print("[RECLAMACIONES OFICINA] Tabla de histórico disponible.", flush=True)
        print("[FUSIONES] Tabla de solicitudes disponible.", flush=True)
        print(
            "[EXPEDIENTE ACCIONES] Tabla disponible.",
            flush=True,
        )

        DocumentoCarpetaDigital.__table__.create(
            bind=engine,
            checkfirst=True,
        )
        print(
            "[CARPETA DIGITAL] Tabla disponible.",
            flush=True,
        )

        ExpedientePPAD.__table__.create(
            bind=engine,
            checkfirst=True,
        )

        # Migración compatible con la tabla PPAD ya existente.
        with _transaccion_inicio_segura("conexion_ppad") as conexion_ppad:
            print("[STARTUP SQL] INICIO linea 2008", flush=True)
            conexion_ppad.execute(text(
                "ALTER TABLE public.expediente_ppad "
                "ADD COLUMN IF NOT EXISTS compensado BOOLEAN NOT NULL DEFAULT FALSE"
            ))
            print("[STARTUP SQL] INICIO linea 2012", flush=True)
            conexion_ppad.execute(text(
                "ALTER TABLE public.expediente_ppad "
                "ADD COLUMN IF NOT EXISTS fecha_compensacion TIMESTAMP WITH TIME ZONE"
            ))
        print("[PPAD] Campos de compensación comprobados.", flush=True)

        ExpedienteObservacion.__table__.create(
            bind=engine,
            checkfirst=True,
        )
        # Migración idempotente: trazabilidad de recepción y validación interna.
        with _transaccion_inicio_segura("conexion_observaciones") as conexion_observaciones:
            print("[STARTUP SQL] INICIO linea 2024", flush=True)
            conexion_observaciones.execute(text(
                "ALTER TABLE public.expediente_observaciones "
                "ADD COLUMN IF NOT EXISTS estado_validacion VARCHAR(20) NOT NULL DEFAULT 'No requiere'"
            ))
            print("[STARTUP SQL] INICIO linea 2028", flush=True)
            conexion_observaciones.execute(text(
                "ALTER TABLE public.expediente_observaciones "
                "ADD COLUMN IF NOT EXISTS validado_por_empleado_id INTEGER NULL "
                "REFERENCES public.empleados(id)"
            ))
            print("[STARTUP SQL] INICIO linea 2033", flush=True)
            conexion_observaciones.execute(text(
                "ALTER TABLE public.expediente_observaciones "
                "ADD COLUMN IF NOT EXISTS validado_en TIMESTAMP WITH TIME ZONE NULL"
            ))
            print("[STARTUP SQL] INICIO linea 2037", flush=True)
            conexion_observaciones.execute(text(
                "UPDATE public.expediente_observaciones "
                "SET estado_validacion = 'Pendiente' "
                "WHERE visibilidad = 'Gestor' AND empleado_destinatario_id IS NOT NULL "
                "AND estado_validacion = 'No requiere'"
            ))

        print(
            "[PPAD/OBSERVACIONES] Tablas y validación interna disponibles.",
            flush=True,
        )

    except Exception as error:
        print(
            f"[INICIALIZACION] ERROR en tablas auxiliares: {error!r}",
            flush=True,
        )
        raise


# ============================================================
# REPARTO AUTOMÁTICO INICIAL DE GESTORES
# ============================================================

@app.on_event("startup")
def asignar_gestores_pendientes_al_iniciar():
    """
    Aplica automáticamente las reglas activas de la ficha de empleado
    a expedientes que todavía no tienen gestor. Nunca reemplaza un gestor
    ya asignado; los nuevos cambios de actividad/importaciones mantienen
    sus propios puntos de reparto.
    """
    from collections import Counter
    from backend.app.expedientes.reparto import (
        asignar_gestor_automaticamente,
        resolver_key_actividad,
    )

    db = SessionLocal()
    try:
        # Garantiza que el histórico existe aunque EncargaGest aún no haya
        # ejecutado su propia inicialización en esta instancia.
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS public.expediente_gestor_historial (
                id BIGSERIAL PRIMARY KEY,
                expediente_id VARCHAR(100) NOT NULL,
                actividad VARCHAR(100) NULL,
                gestor_id INTEGER NULL,
                gestor_anterior_id INTEGER NULL,
                motivo VARCHAR(100) NOT NULL DEFAULT 'reparto_automatico',
                fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.commit()

        pendientes = (
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
        if not pendientes:
            print("[REPARTO AUTOMÁTICO] No hay expedientes sin gestor.", flush=True)
            return

        asignados = 0
        sin_regla = Counter()
        por_actividad = Counter()
        for expediente in pendientes:
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
                "reparto_automatico_arranque",
            )
            if gestor_id:
                asignados += 1
                por_actividad[actividad_key] += 1
            else:
                sin_regla[actividad_key] += 1

            # La sesión está configurada con autoflush=False: hacemos flush
            # para que el siguiente cálculo de carga vea la asignación actual.
            db.flush()
            # Confirma en bloques pequeños para no mantener una transacción
            # larga si hay muchos expedientes históricos.
            if (asignados + sum(sin_regla.values())) % 100 == 0:
                db.commit()

        db.commit()
        print(
            "[REPARTO AUTOMÁTICO] Revisados={}; asignados={}; sin regla compatible={}; por actividad={}; motivos={}".format(
                len(pendientes),
                asignados,
                sum(sin_regla.values()),
                dict(por_actividad),
                dict(sin_regla),
            ),
            flush=True,
        )
    except Exception as error:
        db.rollback()
        # El reparto no debe impedir que el ERP arranque; dejamos el error
        # explícito en Render para poder corregirlo sin perder disponibilidad.
        print(f"[REPARTO AUTOMÁTICO] ERROR al asignar gestores pendientes: {error!r}", flush=True)
    finally:
        db.close()


# ============================================================
# INSTRUMENTACIÓN DEL ARRANQUE
# ============================================================

def instrumentar_inicio_aplicacion():
    manejadores_originales = list(app.router.on_startup)
    manejadores_instrumentados = []

    for indice, manejador in enumerate(manejadores_originales):
        nombre = getattr(
            manejador,
            "__qualname__",
            getattr(manejador, "__name__", repr(manejador)),
        )

        if inspect.iscoroutinefunction(manejador):

            async def manejador_async(
                funcion=manejador,
                nombre_funcion=nombre,
                numero=indice,
            ):
                print(
                    f"[STARTUP DIAG] INICIO {numero}: {nombre_funcion}",
                    flush=True,
                )

                try:
                    resultado = await funcion()

                    print(
                        f"[STARTUP DIAG] FIN {numero}: {nombre_funcion}",
                        flush=True,
                    )
                    return resultado

                except Exception as error:
                    print(
                        f"[STARTUP DIAG] ERROR {numero}: "
                        f"{nombre_funcion}: {error!r}",
                        flush=True,
                    )
                    raise

            manejadores_instrumentados.append(manejador_async)

        else:

            def manejador_sync(
                funcion=manejador,
                nombre_funcion=nombre,
                numero=indice,
            ):
                print(
                    f"[STARTUP DIAG] INICIO {numero}: {nombre_funcion}",
                    flush=True,
                )

                try:
                    resultado = funcion()

                    print(
                        f"[STARTUP DIAG] FIN {numero}: {nombre_funcion}",
                        flush=True,
                    )
                    return resultado

                except Exception as error:
                    print(
                        f"[STARTUP DIAG] ERROR {numero}: "
                        f"{nombre_funcion}: {error!r}",
                        flush=True,
                    )
                    raise

            manejadores_instrumentados.append(manejador_sync)

    app.router.on_startup[:] = manejadores_instrumentados

    print(
        f"[STARTUP DIAG] Total de tareas de inicio: "
        f"{len(manejadores_instrumentados)}",
        flush=True,
    )


# ============================================================
def migrar_catalogo_honorarios_impuestos():
    """Añade de forma idempotente base e impuesto al catálogo de honorarios."""
    with engine.begin() as conexion:
        existe = conexion.execute(text("SELECT to_regclass('public.honorarios_gestoria_catalogo')")).scalar()
        if not existe:
            print("[MIGRACION HONORARIOS] Tabla aún no creada; se revisará en la siguiente petición.", flush=True)
            return
        conexion.execute(text("ALTER TABLE public.honorarios_gestoria_catalogo ADD COLUMN IF NOT EXISTS base_imponible NUMERIC(12,2)"))
        conexion.execute(text("ALTER TABLE public.honorarios_gestoria_catalogo ADD COLUMN IF NOT EXISTS tipo_impuesto VARCHAR(20) NOT NULL DEFAULT 'IVA'"))
        conexion.execute(text("ALTER TABLE public.honorarios_gestoria_catalogo ADD COLUMN IF NOT EXISTS porcentaje_impuesto NUMERIC(5,2) NOT NULL DEFAULT 21"))
        # Los registros antiguos guardaban el total con IVA incluido.
        conexion.execute(text("UPDATE public.honorarios_gestoria_catalogo SET base_imponible = ROUND(importe / 1.21, 2) WHERE base_imponible IS NULL AND importe IS NOT NULL"))
        print("[MIGRACION HONORARIOS] Base e impuesto revisados.", flush=True)


def migrar_catalogo_absis():
    """Crea el almacén del catálogo ABSIS y carga los valores iniciales solo al crearlo."""
    with engine.begin() as conexion:
        existe = conexion.execute(
            text("SELECT to_regclass('public.catalogos_absis')")
        ).scalar()
        conexion.execute(text("""
            CREATE TABLE IF NOT EXISTS public.catalogos_absis (
                id BIGSERIAL PRIMARY KEY,
                categoria VARCHAR(100) NOT NULL,
                valor VARCHAR(300) NOT NULL DEFAULT '',
                codigo VARCHAR(40),
                descripcion TEXT NOT NULL DEFAULT '',
                activo BOOLEAN NOT NULL DEFAULT TRUE,
                creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        if not existe:
            iniciales = [
                ("Estados expedientes", "LIQ", None, ""),
                ("Estados expedientes", "VIG", None, ""),
                ("Estados expedientes", "LST", None, ""),
                ("Estados expedientes", "RTS", None, ""),
                ("Estados expedientes", "PVA", None, ""),
                ("ESTADO", "PAGADO", None, ""),
                ("ESTADO", "ANULADO", None, ""),
                ("ESTADO", "PAG_RETRO", None, ""),
                ("ESTADO", "PTE_CONS", None, ""),
                ("ESTADO", "PAG_DENEGADO", None, ""),
                ("ESTADO", "ENTREGADA", None, ""),
                ("ESTADO", "PTE_RESP_FAC", None, ""),
                ("ESTADOJUSTIFICANTE", "Justificado", None, ""),
                ("ESTADOJUSTIFICANTE", "Pte. Justificar", None, ""),
                ("ESTADOJUSTIFICANTE", "Pte. validación", None, ""),
                ("Producto GTG", "Propia entidad", None, ""),
                ("Producto GTG", "Vinculada otra entidad", None, ""),
                ("Producto GTG", "Vinculada propia entidad", None, ""),
                ("Producto GTG", "Hipotecario", None, ""),
                ("Producto GTG", "Crédito Stock", None, ""),
                ("Actividad Actual", "Facturación y cierre", None, ""),
                ("Actividad Actual", "Documentación previa", None, ""),
                ("Actividad Actual", "Sede Notarial", None, ""),
                ("Actividad Actual", "Tramitación inscripción", None, ""),
                ("Actividad Actual", "Liquidación impuestos", None, ""),
                ("Estado Actividad", "Cerrada", None, ""),
                ("Estado Actividad", "Abierta", None, ""),
                ("Estado Actividad", "Reabierta", None, ""),
                ("Estado Actividad", "Cerrada automáticamente", None, ""),
                ("Tipo Provision", "E", None, "Encargo"),
                ("Tipo Provision", "P", None, "Provisión"),
                ("Tipo de operación", "Cancelación sin provisión", None, ""),
                ("Tipo de operación", "Cancelación con provisión", None, ""),
                ("Tipo de operación", "Constitución", None, ""),
                ("Tipo de operación", "Novación", None, ""),
                ("Tipo de operación", "Subrogación", None, ""),
                ("Subtipo operación", "Préstamo", None, ""),
                ("Subtipo operación", "Dictamen", None, ""),
                ("Subtipo operación", "Crédito abierto", None, ""),
                ("Tipos de errores de defecto", "", "118", "Anterior a LCI_Falta un documento judicial previo"),
                ("Tipos de errores de defecto", "", "113", "Anterior a LCI_Defectos relacionados con aspectos de la finca"),
                ("Tipos de errores de defecto", "", "121", "Anterior a LCI_Falta un documento previo a aportar por el Cliente"),
                ("Tipos de errores de defecto", "", "112", "Anterior a LCI_Defectos en aspectos relacionados con el cliente"),
                ("Tipos de errores de defecto", "", "116", "Anterior a LCI_Defectos en documento judicial"),
                ("Tipos de errores de defecto", "", "126", "LCI_Constitución P.Hipotecario-Defect.falta transparencia (escritura,proyecto,FEIN-ANEXOS)"),
                ("Tipos de errores de defecto", "", "124", "LCI_Constitución P.Hipotecario-Defect.cláusula préstamo Hip(vencimiento,demora,comisión,tasación)"),
                ("Tipos de errores de defecto", "", "115", "Anterior a LCI_Defectos relacionados con alguna cláusula de la hipoteca u otra garantía"),
                ("Tipos de errores de defecto", "", "120", "Anterior a LCI_Falta un documento previo a aportar por la Oficina"),
                ("Tipos de errores de defecto", "", "123", "LCI_Constitución Préstamo Hipotecario-Defectos relacionados con aspectos de la finca."),
                ("Tipos de errores de defecto", "", "122", "LCI_Constitución Préstamo Hipotecario-Defectos relacionados con los intervinientes"),
                ("Tipos de errores de defecto", "", "125", "LCI_Constitución P.Hipotecario-Defect.carácter documental (acta, inscripción CGC, protocolización)"),
                ("Tipos de errores de defecto", "", "114", "Anterior a LCI_Defectos relacionados con la Ley 1/13, de 14 de mayo (reforma de la ley hipotecaria)"),
            ]
            conexion.execute(
                text("""
                    INSERT INTO public.catalogos_absis (categoria, valor, codigo, descripcion)
                    VALUES (:categoria, :valor, :codigo, :descripcion)
                """),
                [
                    {"categoria": categoria, "valor": valor, "codigo": codigo, "descripcion": descripcion}
                    for categoria, valor, codigo, descripcion in iniciales
                ],
            )
            print(f"[CATÁLOGO ABSIS] Cargadas {len(iniciales)} entradas iniciales.", flush=True)
        else:
            # Corrige la semilla anterior "Pendiente" a los códigos E/P usados por Excel.
            # Solo actúa sobre ese valor heredado; conserva el resto de entradas configuradas.
            conexion.execute(text("""
                UPDATE public.catalogos_absis
                SET valor = 'E', descripcion = 'Encargo'
                WHERE categoria = 'Tipo Provision' AND valor = 'Pendiente'
                  AND NOT EXISTS (
                      SELECT 1 FROM public.catalogos_absis existente
                      WHERE existente.categoria = 'Tipo Provision' AND existente.valor = 'E'
                  )
            """))
            conexion.execute(text("""
                INSERT INTO public.catalogos_absis (categoria, valor, codigo, descripcion)
                SELECT 'Tipo Provision', 'P', NULL, 'Provisión'
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.catalogos_absis
                    WHERE categoria = 'Tipo Provision' AND valor = 'P'
                )
            """))
            # Añade las listas de estado ABSIS de forma idempotente también en
            # instalaciones existentes; conserva todas las entradas configuradas.
            estados_absis = [
                ("ESTADO", "PAGADO"),
                ("ESTADO", "ANULADO"),
                ("ESTADO", "PAG_RETRO"),
                ("ESTADO", "PTE_CONS"),
                ("ESTADO", "PAG_DENEGADO"),
                ("ESTADO", "ENTREGADA"),
                ("ESTADO", "PTE_RESP_FAC"),
                ("ESTADOJUSTIFICANTE", "Justificado"),
                ("ESTADOJUSTIFICANTE", "Pte. Justificar"),
                ("ESTADOJUSTIFICANTE", "Pte. validación"),
            ]
            for categoria_absis, valor_absis in estados_absis:
                conexion.execute(text("""
                    INSERT INTO public.catalogos_absis
                        (categoria, valor, codigo, descripcion, activo)
                    SELECT :categoria, :valor, NULL, '', TRUE
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM public.catalogos_absis
                        WHERE categoria = :categoria
                          AND LOWER(TRIM(valor)) = LOWER(TRIM(:valor))
                          AND codigo IS NULL
                    )
                """), {"categoria": categoria_absis, "valor": valor_absis})
            print("[CATÁLOGO ABSIS] Tabla verificada; listas ESTADO y ESTADOJUSTIFICANTE verificadas sin duplicados.", flush=True)

def migrar_visibilidad_empleado():
    """Añade el campo solo si falta, evitando bloquear empleados en cada arranque."""
    with engine.begin() as conexion:
        # Consultar el catálogo del sistema primero. ADD COLUMN IF NOT EXISTS aún
        # solicita un bloqueo sobre empleados aunque la columna ya exista.
        existe = conexion.execute(text("""
            SELECT EXISTS (
                SELECT 1
                FROM pg_attribute
                WHERE attrelid = 'public.empleados'::regclass
                  AND attname = 'visible_en_listado'
                  AND NOT attisdropped
            )
        """)).scalar()

        if not existe:
            conexion.execute(text(
                "ALTER TABLE public.empleados "
                "ADD COLUMN visible_en_listado BOOLEAN NOT NULL DEFAULT TRUE"
            ))
            print("[EMPLEADOS] Columna visible_en_listado creada.", flush=True)
        else:
            print("[EMPLEADOS] Columna visible_en_listado ya existe; no se altera la tabla.", flush=True)



def reparar_vinculos_apoderado_expedientes():
    """
    Repara expedientes ya enviados cuyo nombre de apoderado coincide
    inequívocamente con un empleado, pero cuya FK quedó vacía.
    No sustituye identificadores ya asignados ni modifica el nombre guardado.
    """
    with engine.begin() as conexion:
        resultado = conexion.execute(text("""
            WITH nombres_empleado AS (
                SELECT
                    id,
                    lower(trim(regexp_replace(
                        translate(
                            coalesce(nombre, '') || ' ' || coalesce(apellidos, ''),
                            'áéíóúüñÁÉÍÓÚÜÑ',
                            'aeiouunAEIOUUN'
                        ),
                        '\\s+', ' ', 'g'
                    ))) AS nombre_normalizado
                FROM public.empleados
            ),
            coincidencias_unicas AS (
                SELECT nombre_normalizado, MIN(id) AS empleado_id
                FROM nombres_empleado
                WHERE nombre_normalizado <> ''
                GROUP BY nombre_normalizado
                HAVING COUNT(*) = 1
            )
            UPDATE public.expedientes AS e
            SET apoderado_empleado_id = c.empleado_id
            FROM coincidencias_unicas AS c
            WHERE e.apoderado_empleado_id IS NULL
              AND NULLIF(trim(e.apoderado), '') IS NOT NULL
              AND (e.fecha_envio_notario IS NOT NULL OR e.fecha_envio IS NOT NULL)
              AND lower(trim(regexp_replace(
                    translate(
                        coalesce(e.apoderado, ''),
                        'áéíóúüñÁÉÍÓÚÜÑ',
                        'aeiouunAEIOUUN'
                    ),
                    '\\s+', ' ', 'g'
                  ))) = c.nombre_normalizado
        """))
        if resultado.rowcount:
            print(
                f"[APODERAGEST] Reparados {resultado.rowcount} vínculos de apoderado por coincidencia única.",
                flush=True,
            )
        else:
            print("[APODERAGEST] No hay vínculos de apoderado pendientes de reparar.", flush=True)


# ORDEN DE ARRANQUE
# ============================================================

# La base de datos de pruebas parte vacía. En esa instancia aislada se
# materializan primero las tablas definidas por los modelos SQLAlchemy y,
# a continuación, se ejecutan las migraciones incrementales habituales.
# La opción está desactivada por defecto y solo debe activarse en el servicio
# molsan-glass-luxe-preview-api; producción conserva su esquema preexistente.
def inicializar_esquema_base_preview():
    habilitado = os.getenv("MOLSAN_PREVIEW_BOOTSTRAP_SCHEMA", "").strip().lower()
    if habilitado not in {"1", "true", "yes", "si", "sí"}:
        print("[PREVIEW SCHEMA] Bootstrap desactivado; se conserva el flujo normal.", flush=True)
        return

    print("[PREVIEW SCHEMA] Creando únicamente tablas ausentes desde los modelos registrados...", flush=True)
    Base.metadata.create_all(bind=engine, checkfirst=True)
    with engine.connect() as conexion_preview:
        comprobacion = conexion_preview.execute(text("""
            SELECT
                to_regclass('public.roles') IS NOT NULL AS roles,
                to_regclass('public.empleados') IS NOT NULL AS empleados
        """)).mappings().one()
    if not comprobacion["roles"] or not comprobacion["empleados"]:
        raise RuntimeError(
            "[PREVIEW SCHEMA] No se han podido crear las tablas base roles/empleados."
        )
    print("[PREVIEW SCHEMA] Tablas base roles/empleados disponibles.", flush=True)



def crear_administrador_preview():
    """Crea o repara el administrador únicamente en la API aislada de preview.

    No inicializa el esquema ni cambia la contraseña de una cuenta existente.
    La comprobación del hostname impide ejecutar este bootstrap en producción,
    aunque la variable de activación se configurase allí por error.
    """
    habilitado = os.getenv("MOLSAN_PREVIEW_BOOTSTRAP_ADMIN", "").strip().lower()
    if habilitado not in {"1", "true", "yes", "si", "sí"}:
        return

    hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip().lower()
    hostname_esperado = "molsan-glass-luxe-preview-api.onrender.com"
    if hostname != hostname_esperado:
        raise RuntimeError(
            "[PREVIEW ADMIN] Bootstrap bloqueado: el servicio no es la API de preview autorizada."
        )

    usuario = os.getenv("MOLSAN_PREVIEW_ADMIN_USERNAME", "").strip()
    password = os.getenv("MOLSAN_PREVIEW_ADMIN_PASSWORD", "")
    if not usuario:
        raise RuntimeError("[PREVIEW ADMIN] Falta MOLSAN_PREVIEW_ADMIN_USERNAME.")

    modulos_admin = list(MODULOS_BASE)
    permisos_admin = {
        modulo: list(PERMISOS_BASE)
        for modulo in modulos_admin
    }

    from backend.app.empleados.service import hash_password

    db = SessionLocal()
    try:
        rol_admin = db.query(Rol).filter(
            or_(
                Rol.nombre.ilike("admin"),
                Rol.nombre.ilike("administrador"),
                Rol.nombre.ilike("administradora"),
                Rol.nombre.ilike("superadmin"),
            )
        ).first()
        if rol_admin is None:
            rol_admin = Rol(
                nombre="Admin",
                descripcion="Administrador del entorno aislado de pruebas",
            )
            db.add(rol_admin)
            db.flush()

        existente = (
            db.query(Empleado)
            .filter(Empleado.usuario == usuario)
            .first()
        )

        if existente:
            # La cuenta se identifica explícitamente mediante la variable de
            # entorno del administrador de preview. Se repara el rol y los
            # permisos explícitos; nunca se sobrescribe su contraseña.
            existente.rol_id = rol_admin.id
            existente.activo = True
            existente.modulos_visibles_list = modulos_admin
            existente.permisos_modulo_dict = permisos_admin
            db.commit()
            print(
                "[PREVIEW ADMIN] Cuenta existente reparada: rol, módulos y permisos explícitos actualizados; contraseña conservada.",
                flush=True,
            )
            return

        if len(password) < 20:
            raise RuntimeError(
                "[PREVIEW ADMIN] Para crear una cuenta nueva, MOLSAN_PREVIEW_ADMIN_PASSWORD debe tener al menos 20 caracteres."
            )

        administrador = Empleado(
            nombre="Administrador",
            apellidos="Preview",
            dni="PREVIEW-ADMIN",
            usuario=usuario,
            password=hash_password(password),
            activo=True,
            foto="default-avatar.png",
            rol_id=rol_admin.id,
            modulos_visibles_list=modulos_admin,
            permisos_modulo_dict=permisos_admin,
        )
        db.add(administrador)
        db.commit()
        print(
            "[PREVIEW ADMIN] Cuenta administradora de pruebas creada con permisos explícitos para todos los módulos base.",
            flush=True,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Las migraciones incrementales siguen ejecutándose en su orden original.
app.router.on_startup.insert(
    0,
    migrar_esquema_expedientes_inicio,
)
app.router.on_startup.insert(1, migrar_catalogo_honorarios_impuestos)
app.router.on_startup.insert(2, migrar_catalogo_absis)
app.router.on_startup.insert(3, migrar_visibilidad_empleado)
app.router.on_startup.insert(4, reparar_vinculos_apoderado_expedientes)

# Solo el servicio aislado de preview activa la creación inicial del esquema.
# El bootstrap del administrador es independiente: puede reparar permisos en
# una base ya inicializada sin volver a ejecutar create_all ni exigir el flag schema.
if os.getenv("MOLSAN_PREVIEW_BOOTSTRAP_SCHEMA", "").strip().lower() in {"1", "true", "yes", "si", "sí"}:
    app.router.on_startup.insert(0, inicializar_esquema_base_preview)

if os.getenv("MOLSAN_PREVIEW_BOOTSTRAP_ADMIN", "").strip().lower() in {"1", "true", "yes", "si", "sí"}:
    app.router.on_startup.append(crear_administrador_preview)

instrumentar_inicio_aplicacion()

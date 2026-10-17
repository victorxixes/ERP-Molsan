
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text


import os
import inspect


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

from backend.app.database import Base, engine


# ============================================================
# MODELOS
# ============================================================

from backend.app.expedientes.models import Cliente, Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.fusiones.router import SolicitudFusion
from backend.app.expedientes.gastos.models import ExpedienteGasto
from backend.app.expedientes.defectos.models import (
    ExpedienteDefecto,
    DefectoSubtipo,
)
from backend.app.seguridad.roles.models import Rol
from backend.app.ctn.models import Notaria
from backend.app.agenda.models import Cita
from backend.app.empleados.models import Empleado
from backend.app.mensajes.models import Mensaje
from backend.app.municipios.models import Municipio
from backend.app.entidades_bancarias.models import EntidadBancaria
from backend.app.registros_propiedad.models import RegistroPropiedad
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital
from backend.app.oficinas_liquidadoras.models import OficinaLiquidadora
from backend.app.tipos_carga_hipotecaria.models import TipoCargaHipotecaria
from backend.app.expediente_ppad.models import ExpedientePPAD
from backend.app.expediente_observaciones.models import ExpedienteObservacion
from backend.app.tipos_concepto_gastos.models import TipoConceptoGastos
from backend.app.acciones_expediente.models import AccionExpediente
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

FOTOS_DIR = os.path.join(STATIC_DIR, "fotos")
os.makedirs(FOTOS_DIR, exist_ok=True)

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo

FOTOS_ROOT = Path(FOTOS_DIR).resolve()
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

    fichero = (FOTOS_ROOT / ruta).resolve()

    if FOTOS_ROOT not in fichero.parents or not fichero.is_file():
        raise HTTPException(
            status_code=404,
            detail="Fotografía no encontrada",
        )

    if fichero.suffix.lower() not in EXTENSIONES_FOTO_PERMITIDAS:
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
)
from backend.app.expedientes.gastos.router import router as gastos_router
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
from backend.app.informes.router import router as informes_router
from backend.app.informes.firmas_notarios_router import (
    router as informes_firmas_notarios_router,
)
from backend.app.Utilidades.importadores.router_absis import (
    router as router_absis,
)

# EXPEDIENTES
from backend.app.expedientes.router import router as expedientes_router

# TIPOS DE CARGA HIPOTECARIA
from backend.app.tipos_carga_hipotecaria.router import (
    router as tipos_carga_hipotecaria_router,
)

# PPAD
from backend.app.expediente_ppad.router import (
    router as expediente_ppad_router,
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

# MAESTROS
app.include_router(maestros_router, prefix="/api")

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
app.include_router(informes_router, prefix="/api")
app.include_router(informes_firmas_notarios_router, prefix="/api")
app.include_router(router_absis, prefix="/api")

# TIPOS DE CARGA HIPOTECARIA
app.include_router(tipos_carga_hipotecaria_router, prefix="/api")

# EXPEDIENTES
app.include_router(expedientes_router, prefix="/api")
app.include_router(migracion_defectos_router, prefix="/api")

# PPAD
app.include_router(expediente_ppad_router, prefix="/api")

# OBSERVACIONES
app.include_router(expediente_observaciones_router, prefix="/api")

# Provisiones: el router aporta rutas relativas a /{id_expediente}/provisiones
app.include_router(provisiones_router, prefix="/api/expedientes")

#
app.include_router(apoderagest_router, prefix="/api")

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
        # Envío a notario y documentos de escritura
        ("cliente_id", "INTEGER"),
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

    def ejecutar_ddl_con_reintentos(etiqueta: str, sql: str) -> None:
        ultimo_error = None
        # En Render puede coincidir el arranque de una instancia con consultas
        # activas de la anterior. No mantener cada intento bloqueado demasiado
        # tiempo, pero conceder una ventana de reintentos suficiente para que
        # PostgreSQL libere el bloqueo de tabla.
        max_intentos = 20
        for intento in range(1, max_intentos + 1):
            try:
                with conexion.begin():
                    conexion.execute(text("SET LOCAL lock_timeout = '3s'"))
                    conexion.execute(text("SET LOCAL statement_timeout = '40s'"))
                    conexion.execute(text(sql))
                return
            except Exception as error:
                ultimo_error = error
                if not es_bloqueo_temporal(error) or intento == max_intentos:
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

@app.on_event("startup")
def inicializar_tablas_auxiliares():
    print(
        "[INICIALIZACION] Comprobando tablas auxiliares...",
        flush=True,
    )

    try:
        ExpedienteAccion.__table__.create(
            bind=engine,
            checkfirst=True,
        )

        SolicitudFusion.__table__.create(
            bind=engine,
            checkfirst=True,
        )

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

        ExpedienteObservacion.__table__.create(
            bind=engine,
            checkfirst=True,
        )

        print(
            "[PPAD/OBSERVACIONES] Tablas disponibles.",
            flush=True,
        )

    except Exception as error:
        print(
            f"[INICIALIZACION] ERROR en tablas auxiliares: {error!r}",
            flush=True,
        )
        raise


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
# ORDEN DE ARRANQUE
# ============================================================

# La migración se ejecuta antes de crear o comprobar las tablas auxiliares.
app.router.on_startup.insert(
    0,
    migrar_esquema_expedientes_inicio,
)

instrumentar_inicio_aplicacion()

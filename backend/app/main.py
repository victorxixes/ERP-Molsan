
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


# ============================================================
# MIGRACIÓN DE ESQUEMA DE EXPEDIENTES
# ============================================================

def migrar_esquema_expedientes_inicio():
    """Migra columnas pendientes sin ejecutar ALTER TABLE innecesarios.

    En versiones anteriores se lanzaba ALTER TABLE ... IF NOT EXISTS para todas
    las columnas en cada arranque, incluso si ya existían. PostgreSQL necesita
    bloquear la tabla para procesar ALTER TABLE aunque la columna exista; eso
    ocasionaba LockNotAvailable y dejaba el backend fuera de servicio.

    Esta versión consulta primero el catálogo, solo altera columnas ausentes,
    confirma cada columna por separado y reintenta bloqueos temporales. Un
    advisory lock de sesión serializa los arranques que usan esta versión.
    """
    import time

    print(
        "[MIGRACION STARTUP] Revisando columnas pendientes de expedientes...",
        flush=True,
    )

    columnas = [
        # Actividades y workflow
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
        ("escritura_simple_cancelacion", "VARCHAR(500)"),
        ("ultima_accion", "VARCHAR(500)"),
        ("fecha_ultima_accion", "DATE"),
        ("sol", "VARCHAR(100)"),
        ("cs", "VARCHAR(100)"),
        ("ns", "VARCHAR(100)"),
        # Clientes, envío a notario y facturación
        ("cliente_id", "INTEGER"),
        ("fecha_envio_notario", "DATE"),
        ("fecha_solicitud_pnc", "DATE"),
        ("numero_solicitud_pnc", "VARCHAR(200)"),
        ("escritura_firmada", "BOOLEAN"),
        ("hora_prevista_firma", "TIME"),
        ("facturacion_nombre", "VARCHAR(300)"),
        ("facturacion_dni_nif", "VARCHAR(50)"),
        ("facturacion_direccion", "VARCHAR(300)"),
        ("facturacion_codigo_postal", "VARCHAR(20)"),
        ("facturacion_poblacion", "VARCHAR(200)"),
        ("facturacion_provincia", "VARCHAR(200)"),
        ("facturacion_telefono", "VARCHAR(50)"),
        ("facturacion_email", "VARCHAR(200)"),
    ]

    # La clave es fija para que todas las instancias de esta aplicación
    # serialicen el proceso de migración sin depender de la tabla expedientes.
    clave_bloqueo_migracion = 731208640224
    conexion = None
    bloqueo_adquirido = False

    try:
        conexion = engine.connect()
        conexion.execute(
            text("SELECT pg_advisory_lock(:clave)"),
            {"clave": clave_bloqueo_migracion},
        )
        conexion.commit()
        bloqueo_adquirido = True

        resultado = conexion.execute(
            text(
                "SELECT column_name "
                "FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = 'expedientes'"
            )
        )
        columnas_existentes = {fila[0] for fila in resultado.fetchall()}
        conexion.commit()

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
        ya_existentes = len(columnas) - len(pendientes)
        print(
            f"[MIGRACION STARTUP] {ya_existentes} columnas ya existen; "
            f"{len(pendientes)} pendientes.",
            flush=True,
        )

        for indice, (nombre, tipo_sql) in enumerate(pendientes, start=1):
            creado = False
            ultimo_error = None
            for intento in range(1, 7):
                try:
                    with conexion.begin():
                        conexion.execute(text("SET LOCAL lock_timeout = '8s'"))
                        conexion.execute(text("SET LOCAL statement_timeout = '40s'"))
                        conexion.execute(
                            text(
                                'ALTER TABLE public.expedientes '
                                f'ADD COLUMN "{nombre}" {tipo_sql}'
                            )
                        )
                    creado = True
                    columnas_existentes.add(nombre)
                    print(
                        f"[MIGRACION STARTUP] Columna {nombre} añadida "
                        f"({indice}/{len(pendientes)}).",
                        flush=True,
                    )
                    break
                except Exception as error:
                    ultimo_error = error
                    mensaje = str(error).lower()
                    es_bloqueo_temporal = any(
                        termino in mensaje
                        for termino in (
                            "locknotavailable",
                            "lock timeout",
                            "canceling statement due to lock timeout",
                            "could not obtain lock",
                        )
                    )
                    if not es_bloqueo_temporal or intento == 6:
                        raise
                    espera = min(2 * intento, 10)
                    print(
                        f"[MIGRACION STARTUP] Bloqueo temporal al añadir "
                        f"{nombre}; reintento {intento}/6 en {espera}s: "
                        f"{error!r}",
                        flush=True,
                    )
                    time.sleep(espera)

            if not creado:
                raise RuntimeError(
                    f"No se pudo añadir la columna {nombre}: {ultimo_error!r}"
                )

        indice = conexion.execute(
            text(
                "SELECT 1 FROM pg_indexes "
                "WHERE schemaname = 'public' "
                "AND indexname = 'ix_expedientes_cliente_id'"
            )
        ).first()
        conexion.commit()
        if not indice:
            creado_indice = False
            for intento in range(1, 7):
                try:
                    with conexion.begin():
                        conexion.execute(text("SET LOCAL lock_timeout = '8s'"))
                        conexion.execute(text("SET LOCAL statement_timeout = '40s'"))
                        conexion.execute(
                            text(
                                "CREATE INDEX IF NOT EXISTS ix_expedientes_cliente_id "
                                "ON public.expedientes (cliente_id)"
                            )
                        )
                    creado_indice = True
                    break
                except Exception as error:
                    mensaje = str(error).lower()
                    es_bloqueo_temporal = any(
                        termino in mensaje
                        for termino in (
                            "locknotavailable",
                            "lock timeout",
                            "canceling statement due to lock timeout",
                            "could not obtain lock",
                        )
                    )
                    if not es_bloqueo_temporal or intento == 6:
                        raise
                    espera = min(2 * intento, 10)
                    print(
                        "[MIGRACION STARTUP] Bloqueo temporal al crear índice; "
                        f"reintento {intento}/6 en {espera}s: {error!r}",
                        flush=True,
                    )
                    time.sleep(espera)
            if not creado_indice:
                raise RuntimeError(
                    "No se pudo crear el índice ix_expedientes_cliente_id."
                )

        print(
            "[MIGRACION STARTUP] Migración de expedientes completada.",
            flush=True,
        )
    except Exception as error:
        if conexion is not None:
            try:
                conexion.rollback()
            except Exception:
                pass
        print(
            f"[MIGRACION STARTUP] ERROR: {error!r}",
            flush=True,
        )
        raise
    finally:
        if conexion is not None:
            if bloqueo_adquirido:
                try:
                    conexion.execute(
                        text("SELECT pg_advisory_unlock(:clave)"),
                        {"clave": clave_bloqueo_migracion},
                    )
                    conexion.commit()
                except Exception as error:
                    print(
                        f"[MIGRACION STARTUP] No se pudo liberar advisory lock: "
                        f"{error!r}",
                        flush=True,
                    )
            conexion.close()


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

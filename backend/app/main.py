from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

import os
import inspect


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Agenda Intranet Backend"
)


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

from backend.app.database import (
    Base,
    engine,
)


# ============================================================
# MODELOS
# ============================================================

from backend.app.expedientes.models import (
    Cliente,
    Expediente,
)

from backend.app.expedientes.fincasyregistros.models import (
    ExpedienteFinca,
)

from backend.app.expedientes.gastos.models import (
    ExpedienteGasto,
)

from backend.app.expedientes.defectos.models import (
    ExpedienteDefecto,
)

from backend.app.seguridad.roles.models import (
    Rol,
)

from backend.app.ctn.models import (
    Notaria,
)

from backend.app.agenda.models import (
    Cita,
)

from backend.app.empleados.models import (
    Empleado,
)

from backend.app.mensajes.models import (
    Mensaje,
)

from backend.app.municipios.models import (
    Municipio,
)

from backend.app.entidades_bancarias.models import (
    EntidadBancaria,
)

from backend.app.registros_propiedad.models import (
    RegistroPropiedad,
)

from backend.app.oficinas_liquidadoras.models import (
    OficinaLiquidadora,
)

from backend.app.tipos_carga_hipotecaria.models import (
    TipoCargaHipotecaria,
)

from backend.app.tipos_concepto_gastos.models import (
    TipoConceptoGastos,
)

from backend.app.acciones_expediente.models import (
    AccionExpediente,
)

from backend.app.expediente_acciones.models import (
    ExpedienteAccion,
)


# ============================================================
# STATIC FILES
# ============================================================

STATIC_DIR = os.path.join(
    os.path.dirname(__file__),
    "static",
)

os.makedirs(
    STATIC_DIR,
    exist_ok=True,
)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)


# ============================================================
# STATIC — MENSAJES
# ============================================================

TMP_MENSAJES = "/tmp/mensajes"

os.makedirs(
    TMP_MENSAJES,
    exist_ok=True,
)

app.mount(
    "/static/mensajes",
    StaticFiles(directory=TMP_MENSAJES),
    name="mensajes",
)


# ============================================================
# STATIC — FOTOS
# ============================================================

FOTOS_DIR = os.path.join(
    os.path.dirname(__file__),
    "static",
    "fotos",
)

os.makedirs(
    FOTOS_DIR,
    exist_ok=True,
)

app.mount(
    "/api/fotos",
    StaticFiles(directory=FOTOS_DIR),
    name="fotos",
)


# ============================================================
# IMPORTAR ROUTERS
# ============================================================

# AUTH
from backend.app.auth.router import (
    router as auth_router,
)

# SEGURIDAD
from backend.app.seguridad.roles.roles_router import (
    router as roles_router,
)

from backend.app.seguridad.roles.asignar_rol_router import (
    router as asignar_rol_router,
)

from backend.app.seguridad.asignar_password_router import (
    router as asignar_password_router,
)

from backend.app.seguridad.permisos.permisos_router import (
    router as permisos_router,
)

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

from backend.app.seguridad.logs.router import (
    router as seguridad_logs_router,
)

from backend.app.seguridad.admin_router import (
    router as admin_router,
)

# AGENDA
from backend.app.agenda.router import (
    router as agenda_router,
)

# EMPLEADOS
from backend.app.empleados.router import (
    router as empleados_router,
)

# DEFECTOS
from backend.app.expedientes.defectos.router import (
    router as defectos_router,
)

# MAESTROS
from backend.app.maestros.router import (
    router as maestros_router,
)

# INTRANET
from backend.app.intranet.router import (
    router as intranet_router,
)

from backend.app.intranet.documentos.router import (
    router as documentos_router,
)

from backend.app.intranet.noticias.router import (
    router as noticias_router,
)

# WEBSOCKETS
from backend.app.websockets.intranet_ws import (
    router as intranet_ws_router,
)

from backend.app.websockets.empleados_ws import (
    router as empleados_ws_router,
)

from backend.app.websockets.agenda_ws import (
    router as agenda_ws_router,
)

from backend.app.mensajes.router_ws import (
    router as mensajes_ws_router,
)

from backend.app.notificaciones.router_ws import (
    router_notif,
)

# REALTIME
from backend.app.realtime.router import (
    router as realtime_router,
)

# MENSAJES
from backend.app.mensajes.router import (
    router as mensajes_router,
)

# MUNICIPIOS
from backend.app.municipios.router import (
    router as municipios_router,
)

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
from backend.app.ctn.router import (
    router as ctn_router,
)

# DASHBOARD
from backend.app.dashboard.router import (
    router as dashboard_router,
)

# UTILIDADES
from backend.app.Utilidades.router import (
    router as utilidades_router,
)

from backend.app.informes.router import (
    router as informes_router,
)

from backend.app.Utilidades.importadores.router_absis import (
    router as router_absis,
)

# EXPEDIENTES
from backend.app.expedientes.router import (
    router as expedientes_router,
)

# TIPOS DE CARGA HIPOTECARIA
from backend.app.tipos_carga_hipotecaria.router import (
    router as tipos_carga_hipotecaria_router,
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

# AGENDA
app.include_router(agenda_router, prefix="/api")


# ============================================================
# DEBUG — RUTAS AGENDA
# ============================================================

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
app.include_router(defectos_router,prefix="/api",)

# UTILIDADES
app.include_router(utilidades_router, prefix="/api")
app.include_router(informes_router, prefix="/api")
app.include_router(router_absis, prefix="/api")

# TIPOS DE CARGA HIPOTECARIA
app.include_router(tipos_carga_hipotecaria_router, prefix="/api")

# EXPEDIENTES
app.include_router(expedientes_router, prefix="/api")


# ============================================================
# MIGRACIÓN AUTOMÁTICA — CLIENTES, FACTURACIÓN Y ENVÍO A NOTARIO
# ============================================================

def migrar_clientes_facturacion_envio_notario():
    print(
        "[MOLSAN STARTUP TEST 2026-10-09] "
        "LA FUNCION DE MIGRACION HA COMENZADO",
        flush=True,
    )

    migraciones_columnas = [
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

    print(
        "[MIGRACION DIAG] Comprobando conexión a base de datos...",
        flush=True,
    )

    try:
        print(
            "[MOLSAN STARTUP TEST] ANTES DE engine.begin()",
            flush=True,
        )

        with engine.begin() as conexion:
            print(
                "[MOLSAN STARTUP TEST] CONEXION OBTENIDA",
                flush=True,
            )

            # ====================================================
            # DIAGNÓSTICO DE BLOQUEO EN LA CONSULTA
            # ====================================================

            # Si la consulta espera un bloqueo de tabla, PostgreSQL
            # debe interrumpirla tras 5 segundos.
            print(
                "[MIGRACION DIAG] Configurando límites de espera...",
                flush=True,
            )

            conexion.execute(
                text("SET LOCAL lock_timeout = '5s'")
            )

            conexion.execute(
                text("SET LOCAL statement_timeout = '10s'")
            )

            print(
                "[MIGRACION DIAG] Límites configurados.",
                flush=True,
            )

            print(
                "[MIGRACION DIAG] "
                "Antes de ejecutar SELECT sobre expedientes",
                flush=True,
            )

            resultado = conexion.execute(
                text("SELECT 1 FROM expedientes LIMIT 1")
            )

            print(
                "[MIGRACION DIAG] "
                "SELECT ejecutado; antes de leer resultado",
                flush=True,
            )

            resultado.fetchone()

            print(
                "[MIGRACION DIAG] "
                "Lectura terminada correctamente",
                flush=True,
            )

            print(
                "[MIGRACION DIAG] Tabla expedientes accesible.",
                flush=True,
            )

            # ====================================================
            # AÑADIR COLUMNAS QUE FALTEN
            # ====================================================

            for nombre_columna, tipo_columna in migraciones_columnas:
                print(
                    f"[MIGRACION DIAG] INICIO columna: "
                    f"{nombre_columna}",
                    flush=True,
                )

                conexion.execute(
                    text(
                        f"""
                        ALTER TABLE expedientes
                        ADD COLUMN IF NOT EXISTS
                        {nombre_columna} {tipo_columna}
                        """
                    )
                )

                print(
                    f"[MIGRACION DIAG] FIN columna: "
                    f"{nombre_columna}",
                    flush=True,
                )

            # ====================================================
            # ÍNDICE CLIENTE
            # ====================================================

            print(
                "[MIGRACION DIAG] INICIO creación de índice...",
                flush=True,
            )

            conexion.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS
                    ix_expedientes_cliente_id
                    ON expedientes (cliente_id)
                    """
                )
            )

            print(
                "[MIGRACION DIAG] FIN creación de índice.",
                flush=True,
            )

        print(
            "[MIGRACION DIAG] "
            "Migración completada correctamente.",
            flush=True,
        )

    except Exception as error:
        print(
            f"[MIGRACION DIAG] ERROR: {error!r}",
            flush=True,
        )
        raise


# ============================================================
# DIAGNÓSTICO TEMPORAL — IDENTIFICAR BLOQUEOS EN STARTUP
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
                    f"[STARTUP DIAG] INICIO {numero}: "
                    f"{nombre_funcion}",
                    flush=True,
                )

                try:
                    resultado = await funcion()

                    print(
                        f"[STARTUP DIAG] FIN {numero}: "
                        f"{nombre_funcion}",
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
                    f"[STARTUP DIAG] INICIO {numero}: "
                    f"{nombre_funcion}",
                    flush=True,
                )

                try:
                    resultado = funcion()

                    print(
                        f"[STARTUP DIAG] FIN {numero}: "
                        f"{nombre_funcion}",
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


instrumentar_inicio_aplicacion()

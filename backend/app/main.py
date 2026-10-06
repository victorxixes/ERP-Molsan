from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text
from sqlalchemy.orm import Session

import os


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


# ------------------------------------------------------------
# CLIENTES
# ------------------------------------------------------------

from backend.app.expedientes.clientes.models import (
    Cliente,
)


# ------------------------------------------------------------
# EXPEDIENTES
# ------------------------------------------------------------

from backend.app.expedientes.models import (
    Expediente,
)


# ------------------------------------------------------------
# ACTIVIDADES DE EXPEDIENTES
# ------------------------------------------------------------

from backend.app.expedientes.actividades.models import (
    ExpedienteActividad,
)


# ------------------------------------------------------------
# FINCAS Y REGISTROS
# ------------------------------------------------------------

from backend.app.expedientes.fincasyregistros.models import (
    ExpedienteFinca,
)


# ------------------------------------------------------------
# GASTOS
# ------------------------------------------------------------

from backend.app.expedientes.gastos.models import (
    ExpedienteGasto,
)


# ------------------------------------------------------------
# DEFECTOS
# ------------------------------------------------------------

from backend.app.expedientes.defectos.models import (
    ExpedienteDefecto,
)


# ------------------------------------------------------------
# DETALLE DE EXPEDIENTES
# ------------------------------------------------------------

from backend.app.expedientes.detalle.models import (
    ExpedienteDetalle,
)


# ------------------------------------------------------------
# ROLES
# ------------------------------------------------------------

from backend.app.seguridad.roles.models import (
    Rol,
)


# ------------------------------------------------------------
# NOTARIAS
#
# IMPORTANTE:
# Cita tiene una relación con Notaria.
# Notaria debe cargarse antes de Cita.
# ------------------------------------------------------------

from backend.app.ctn.models import (
    Notaria,
)


# ------------------------------------------------------------
# CITAS
#
# IMPORTANTE:
# Empleado tiene una relación con Cita.
# Cita tiene una relación con Notaria.
# ------------------------------------------------------------

from backend.app.agenda.models import (
    Cita,
)


# ------------------------------------------------------------
# EMPLEADOS
#
# IMPORTANTE:
# Empleado tiene relaciones con Rol y Cita.
# ------------------------------------------------------------

from backend.app.empleados.models import (
    Empleado,
)


# ------------------------------------------------------------
# MENSAJES
#
# IMPORTANTE:
# Mensaje tiene una relación con Empleado.
# ------------------------------------------------------------

from backend.app.mensajes.models import (
    Mensaje,
)


# ------------------------------------------------------------
# MUNICIPIOS
# ------------------------------------------------------------

from backend.app.municipios.models import (
    Municipio,
)


# ------------------------------------------------------------
# ENTIDADES BANCARIAS
# ------------------------------------------------------------

from backend.app.entidades_bancarias.models import (
    EntidadBancaria,
)


# ------------------------------------------------------------
# REGISTROS DE LA PROPIEDAD
# ------------------------------------------------------------

from backend.app.registros_propiedad.models import (
    RegistroPropiedad,
)


# ------------------------------------------------------------
# OFICINAS LIQUIDADORAS
# ------------------------------------------------------------

from backend.app.oficinas_liquidadoras.models import (
    OficinaLiquidadora,
)


# ------------------------------------------------------------
# TIPOS DE CARGA HIPOTECARIA
# ------------------------------------------------------------

from backend.app.tipos_carga_hipotecaria.models import (
    TipoCargaHipotecaria,
)


# ------------------------------------------------------------
# ACCIONES DEL EXPEDIENTE
# ------------------------------------------------------------

from backend.app.acciones_expediente.models import (
    AccionExpediente,
)


# ============================================================
# CREAR TABLAS
# ============================================================

Base.metadata.create_all(
    bind=engine
)


# ============================================================
# FIX SCHEMA — MUNICIPIOS
# ============================================================

with engine.begin() as connection:

    connection.execute(
        text(
            """
            ALTER TABLE municipios
            ADD COLUMN IF NOT EXISTS activo
            BOOLEAN NOT NULL DEFAULT TRUE
            """
        )
    )


# ============================================================
# DATOS INICIALES — TIPOS DE CARGA HIPOTECARIA
# ============================================================

TIPOS_CARGA_HIPOTECARIA_INICIALES = [

    "cancelacion de prestamo o credito",

    "cancelacion por instancia",

    "devolucion",

    "mandamiento judicial de cancelación",

    "mandamiento judicial",

    "cancelacion de condicion resolutoria",

    "cancelacion embargo",

    "mandamiento de cancelación",

    "cancelacion por certificacion de cargas",

    "prestamo hipotecario",

    "cancelacion de prestamo o credito adicional",

    "cancelacion embargo adicional",

    "cancelación parcial y liberación de garantía",

    "cancelacion parcial y liberacion de finca",

    "condicion resolutoria",

    "cancelacion de usufructo",

    "cancelacion de condicion resolutoria adicional",

]


# ============================================================
# CREAR TIPOS DE CARGA SI NO EXISTEN
# ============================================================

with Session(bind=engine) as db:

    for nombre in (
        TIPOS_CARGA_HIPOTECARIA_INICIALES
    ):

        existe = (
            db.query(
                TipoCargaHipotecaria
            )
            .filter(
                TipoCargaHipotecaria.nombre
                == nombre
            )
            .first()
        )

        if not existe:

            db.add(
                TipoCargaHipotecaria(
                    nombre=nombre,
                    activo=True,
                )
            )

    db.commit()


# ============================================================
# STATIC FILES
# ============================================================

STATIC_DIR = os.path.join(
    os.path.dirname(__file__),
    "static",
)

app.mount(
    "/static",
    StaticFiles(
        directory=STATIC_DIR
    ),
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
    StaticFiles(
        directory=TMP_MENSAJES
    ),
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

app.mount(
    "/api/fotos",
    StaticFiles(
        directory=FOTOS_DIR
    ),
    name="fotos",
)


# ============================================================
# IMPORTAR ROUTERS
# ============================================================


# ============================================================
# AUTH
# ============================================================

from backend.app.auth.router import (
    router as auth_router,
)


# ============================================================
# SEGURIDAD
# ============================================================

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


# ============================================================
# AGENDA
# ============================================================

from backend.app.agenda.router import (
    router as agenda_router,
)


# ============================================================
# EMPLEADOS
# ============================================================

from backend.app.empleados.router import (
    router as empleados_router,
)


# ============================================================
# MAESTROS
# ============================================================

from backend.app.maestros.router import (
    router as maestros_router,
)


# ============================================================
# TIPOS DE CARGA HIPOTECARIA
# ============================================================

from backend.app.tipos_carga_hipotecaria.router import (
    router as tipos_carga_hipotecaria_router,
)


# ============================================================
# INTRANET
# ============================================================

from backend.app.intranet.router import (
    router as intranet_router,
)

from backend.app.intranet.documentos.router import (
    router as documentos_router,
)

from backend.app.intranet.noticias.router import (
    router as noticias_router,
)


# ============================================================
# WEBSOCKETS
# ============================================================

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


# ============================================================
# REALTIME
# ============================================================

from backend.app.realtime.router import (
    router as realtime_router,
)


# ============================================================
# MENSAJES
# ============================================================

from backend.app.mensajes.router import (
    router as mensajes_router,
)


# ============================================================
# MUNICIPIOS
# ============================================================

from backend.app.municipios.router import (
    router as municipios_router,
)


# ============================================================
# ENTIDADES BANCARIAS
# ============================================================

from backend.app.entidades_bancarias.router import (
    router as entidades_bancarias_router,
)


# ============================================================
# REGISTROS DE LA PROPIEDAD
# ============================================================

from backend.app.registros_propiedad.router import (
    router as registros_propiedad_router,
)


# ============================================================
# OFICINAS LIQUIDADORAS
# ============================================================

from backend.app.oficinas_liquidadoras.router import (
    router as oficinas_liquidadoras_router,
)


# ============================================================
# ACCIONES DEL EXPEDIENTE
# ============================================================

from backend.app.acciones_expediente.router import (
    router as acciones_expediente_router,
)


# ============================================================
# HERRAMIENTAS SWAGGER
# ============================================================

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


# ============================================================
# CTN
# ============================================================

from backend.app.ctn.router import (
    router as ctn_router,
)


# ============================================================
# DASHBOARD
# ============================================================

from backend.app.dashboard.router import (
    router as dashboard_router,
)


# ============================================================
# UTILIDADES
# ============================================================

from backend.app.Utilidades.router import (
    router as utilidades_router,
)

from backend.app.informes.router import (
    router as informes_router,
)

from backend.app.Utilidades.importadores.router_absis import (
    router as router_absis,
)


# ============================================================
# EXPEDIENTES
# ============================================================

from backend.app.expedientes.router import (
    router as expedientes_router,
)


# ============================================================
# INCLUIR ROUTERS
# ============================================================


# ============================================================
# AUTH
# ============================================================

app.include_router(
    auth_router,
    prefix="/api",
)


# ============================================================
# SEGURIDAD
# ============================================================

app.include_router(
    roles_router,
    prefix="/api",
)

app.include_router(
    asignar_rol_router,
    prefix="/api",
)

app.include_router(
    asignar_password_router,
    prefix="/api",
)

app.include_router(
    permisos_router,
    prefix="/api",
)

app.include_router(
    asignar_router,
    prefix="/api",
)

app.include_router(
    permisos_repair_router,
    prefix="/api",
)

app.include_router(
    ficha_empleado_router,
    prefix="/api",
)

app.include_router(
    seguridad_auditoria_router,
    prefix="/api",
)

app.include_router(
    seguridad_logs_router,
    prefix="/api",
)

app.include_router(
    admin_router,
    prefix="/api",
)


# ============================================================
# AGENDA
# ============================================================

app.include_router(
    agenda_router,
    prefix="/api",
)


# ============================================================
# EMPLEADOS
# ============================================================

app.include_router(
    empleados_router,
    prefix="/api",
)


# ============================================================
# MAESTROS
# ============================================================

app.include_router(
    maestros_router,
    prefix="/api",
)


# ============================================================
# INTRANET
# ============================================================

app.include_router(
    intranet_router,
    prefix="/api",
)

app.include_router(
    documentos_router,
    prefix="/api",
)

app.include_router(
    noticias_router,
    prefix="/api",
)


# ============================================================
# WEBSOCKETS
# ============================================================

app.include_router(
    intranet_ws_router,
)

app.include_router(
    empleados_ws_router,
)

app.include_router(
    agenda_ws_router,
)

app.include_router(
    mensajes_ws_router,
)

app.include_router(
    router_notif,
)


# ============================================================
# REALTIME
# ============================================================

app.include_router(
    realtime_router,
)


# ============================================================
# MUNICIPIOS
# ============================================================

app.include_router(
    municipios_router,
    prefix="/api",
)


# ============================================================
# ENTIDADES BANCARIAS
# ============================================================

app.include_router(
    entidades_bancarias_router,
    prefix="/api",
)


# ============================================================
# REGISTROS DE LA PROPIEDAD
# ============================================================

app.include_router(
    registros_propiedad_router,
    prefix="/api",
)


# ============================================================
# OFICINAS LIQUIDADORAS
# ============================================================

app.include_router(
    oficinas_liquidadoras_router,
    prefix="/api",
)


# ============================================================
# ACCIONES DEL EXPEDIENTE
# ============================================================

app.include_router(
    acciones_expediente_router,
    prefix="/api",
)


# ============================================================
# HERRAMIENTAS SWAGGER
# ============================================================

app.include_router(
    herramientas_router,
    prefix="/api",
)

app.include_router(
    reset_intranet_router,
    prefix="/api",
)

app.include_router(
    debug_router,
)

app.include_router(
    borrar_roles_router,
)

app.include_router(
    borrar_tablas_router,
)

app.include_router(
    asignar_bloqueo_router,
    prefix="/api",
)


# ============================================================
# CTN
# ============================================================

app.include_router(
    ctn_router,
    prefix="/api",
)


# ============================================================
# DASHBOARD
# ============================================================

app.include_router(
    dashboard_router,
    prefix="/api",
)


# ============================================================
# MENSAJES REST
# ============================================================

app.include_router(
    mensajes_router,
    prefix="/api",
)


# ============================================================
# UTILIDADES
# ============================================================

app.include_router(
    utilidades_router,
    prefix="/api",
)

app.include_router(
    informes_router,
    prefix="/api",
)

app.include_router(
    router_absis,
    prefix="/api",
)


# ============================================================
# TIPOS DE CARGA HIPOTECARIA
# ============================================================

app.include_router(
    tipos_carga_hipotecaria_router,
    prefix="/api",
)


# ============================================================
# EXPEDIENTES
# ============================================================

app.include_router(
    expedientes_router,
    prefix="/api",
)

"""Autenticación JWT y permisos por módulo/acción para rutas HTTP /api.

Se registra desde backend.app.auth.router y se ejecuta al inicio, cuando
main.py ya ha incluido todos los routers. Las rutas de login/health se dejan
públicas de forma explícita. Las rutas API conocidas reciben el permiso que
corresponde a su módulo y al método HTTP; las rutas nuevas no mapeadas siguen
exigiendo JWT y quedan identificadas en los logs para añadir su módulo.

Las rutas con identificador de expediente reciben además una comprobación
compartida del ámbito de reparto; las rutas de NotarGest y EncargaGest conservan
sus propios controles de ámbito y autenticación.
"""
from __future__ import annotations

import sys
from typing import Any, Callable

from fastapi import Depends, Request
from fastapi.dependencies.utils import get_dependant
from fastapi.routing import APIRoute
from starlette.routing import Mount

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import SessionLocal
from backend.app.expedientes.reparto import validar_visibilidad_expediente_request
from backend.app.seguridad.auditoria.service import registrar_auditoria


RUTAS_PUBLICAS_EXACTAS = {
    "/api/auth/login",
    "/api/notargest/login",
    # Endpoint histórico conservado para no romper clientes antiguos.
    "/api/empleados/login",
    "/api/health",
    "/api/health/live",
    "/api/health/ready",
}

# Los prefijos más específicos van primero. Los nombres de módulo/acciones
# corresponden a backend/app/seguridad/router.py y auth/permissions.py.
_PREFIJOS_MODULO = (
    ("/api/seguridad-auditoria", "auditoria"),
    ("/api/auditoria", "auditoria"),
    ("/api/seguridad-logs", "logs"),
    ("/api/logs", "logs"),
    ("/api/ficha-empleado", "empleados"),
    ("/api/asignar-bloqueo", "empleados"),
    ("/api/asignar-rol", "seguridad"),
    ("/api/asignar-password", "seguridad"),
    ("/api/permisos-repair", "seguridad"),
    ("/api/permisos", "seguridad"),
    ("/api/catalogos-absis", "maestros"),
    ("/api/oficinas-catalogo", "catalogos"),
    ("/api/tipos-impositivos", "maestros"),
    ("/api/acciones-expediente", "expedientes"),
    ("/api/expediente-acciones", "expedientes"),
    ("/api/expediente-ppad", "expedientes"),
    ("/api/expediente-gastos", "expedientes"),
    ("/api/expediente-observaciones", "expedientes"),
    ("/api/entidades-bancarias", "maestros"),
    ("/api/registros-propiedad", "maestros"),
    ("/api/oficinas-liquidadoras", "maestros"),
    ("/api/tipos-carga-hipotecaria", "maestros"),
    ("/api/tipos-concepto-gastos", "maestros"),
    ("/api/tipos-expediente", "maestros"),
    ("/api/municipios", "maestros"),
    ("/api/maestros", "maestros"),
    ("/api/panel-tecnico", "panel-tecnico"),
    ("/api/herramientasswager", "herramientas"),
    ("/api/roles", "seguridad"),
    ("/api/seguridad", "seguridad"),
    ("/api/admin", "seguridad"),
    ("/api/empleados", "empleados"),
    ("/api/agenda", "agenda"),
    ("/api/mensajeria", "mensajeria"),
    ("/api/apoderagest", "apoderagest"),
    ("/api/mantenimiento-defectos", "seguridad"),
    ("/api/complementos-saldo", "expedientes"),
    ("/api/proceso-absis", "utilidades"),
    ("/api/honorarios-gestoria", "utilidades"),
    ("/api/fusiones", "fusiones"),
    ("/api/fotos", "empleados"),
    ("/api/ctn", "ctn"),
    ("/api/alta-expediente", "expedientes"),
    ("/api/expedientes", "expedientes"),
    ("/api/mensajes", "mensajes"),
    ("/api/notificaciones", "notificaciones"),
    ("/api/intranet", "intranet"),
    ("/api/documentos", "documentos"),
    ("/api/noticias", "noticias"),
    ("/api/realtime", "realtime"),
    ("/api/dashboard", "dashboard"),
    # El catálogo de permisos no define un módulo "informes" independiente.
    # Los informes y exportaciones generales se gestionan dentro de utilidades.
    ("/api/informes-sla", "utilidades"),
    ("/api/informes", "utilidades"),
    ("/api/utilidades", "utilidades"),
    ("/api/absis", "utilidades"),
    ("/api/importador-absis", "utilidades"),
    ("/api/auth", "seguridad"),
    ("/api/roles", "seguridad"),
)

# POST normalmente crea. Estas rutas actúan sobre un registro/flujo existente
# o ejecutan una importación/migración, por lo que exigen permiso "editar".
# Rutas que realizan autorización propia dentro del endpoint (incluye reglas
# condicionales como "mi ficha" o permisos alternativos Expedientes/Seguridad).
# El guard global sigue exigiendo JWT y registra auditoría, pero no añade un
# segundo permiso modular que contradiga la autorización funcional interna.
_RUTAS_CON_AUTORIZACION_INTERNA = {
    "/api/seguridad/empleado/{empleado_id}/ficha-completa": "seguridad",
    "/api/apoderagest/encargos/reparar-asignacion": "apoderagest",
    "/api/expedientes/configuracion-visibilidad": "expedientes",
    # Estas rutas aplican autorización dinámica por portal (NotarGestWeb o
    # EncargaGestWeb); no deben exigir además el permiso genérico ctn.
    "/api/ctn/accesos-portales/resumen": "ctn",
    # El selector de notarios se comparte con Agenda: la ruta aplica CTN:ver
    # o Agenda:ver y oculta los IBAN a quien solo tiene acceso a Agenda.
    "/api/ctn/notarias": "ctn",
    "/api/ctn/notarias/{notaria_id}": "ctn",
    "/api/ctn/notarias/{notaria_id}/accesos-portales": "ctn",
    "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/password": "ctn",
    "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/habilitado": "ctn",
    "/api/ctn/notarias/{notaria_id}/accesos-portales/{portal}/reset-password": "ctn",
}


_POST_ES_EDICION = (
    "/actividad",
    # Operaciones sobre expedientes ya existentes; no requieren permiso de alta.
    "/carpeta-digital",
    "/calificacion",
    "/pagos",
    "/avanzar-actividad",
    "/validar",
    "/compensar",
    "/revisar",
    "/enviar-a-notario",
    "/enviar-a-absis",
    "/integraciones-pendientes",
    "/honorarios-gestoria",
    "/proceso-absis",
    "/crear-tablas",
    "/complementos-saldo",
    "/complementos-saldo/estado",
    "/migracion",
    "/migraciones",
    "/geocode",
    "/importar",
    "/previsualizar",
    "/importador",
    "/asociadas",
    "/reset-password",
    "/password",
    "/crear-base",
    "/install-unaccent",
    "/roles",
    "/migrar",
    "/rol/",
    "/permisos",
    "/modulos",
    "/bloqueo",
    "/mover",
    "/aceptar",
    "/anular",
    "/habilitado",
    "/asignar-promocion",
    "/reasignar-gestor",
    "/provisiones-independientes/",
    "/integracion-absis",
    "/plantilla-factura",
    "/correspondencia/firma/factura",
    "/informes-sla/fechas/",
    "/reparto/asignar-pendientes",
    "/add_columna_gestoria_expedientes",
    "/admin/periodos",
    "/firmar",
    "/reparar",
    "/sincronizar",
    # La administración de plantillas se gestiona con permiso de edición de Utilidades.
    "/correspondencia/plantillas",
)


def _normalizar_path(path: str) -> str:
    valor = str(path or "").strip()
    if len(valor) > 1:
        valor = valor.rstrip("/")
    return valor


def _ya_tiene_autenticacion(dependant: Any) -> bool:
    """Evita duplicar JWT y tolera grafos de dependencias compartidos o cíclicos."""
    pendientes = [dependant]
    visitados: set[int] = set()
    while pendientes:
        actual = pendientes.pop()
        identidad = id(actual)
        if identidad in visitados:
            continue
        visitados.add(identidad)
        if getattr(actual, "call", None) is get_current_user:
            return True
        pendientes.extend(getattr(actual, "dependencies", []) or [])
    return False


def _ya_tiene_auditoria(dependant: Any) -> bool:
    pendientes = [dependant]
    visitados: set[int] = set()
    while pendientes:
        actual = pendientes.pop()
        identidad = id(actual)
        if identidad in visitados:
            continue
        visitados.add(identidad)
        if getattr(getattr(actual, "call", None), "_molsan_audit_guard", False):
            return True
        pendientes.extend(getattr(actual, "dependencies", []) or [])
    return False


def _ya_tiene_visibilidad_expediente(dependant: Any) -> bool:
    pendientes = [dependant]
    visitados: set[int] = set()
    while pendientes:
        actual = pendientes.pop()
        identidad = id(actual)
        if identidad in visitados:
            continue
        visitados.add(identidad)
        if getattr(getattr(actual, "call", None), "_molsan_visibilidad_guard", False):
            return True
        pendientes.extend(getattr(actual, "dependencies", []) or [])
    return False


def _ya_tiene_permiso(dependant: Any, modulo: str, accion: str) -> bool:
    """Busca el permiso sin recursión y sin recorrer dos veces el mismo nodo."""
    esperado = (modulo, accion)
    pendientes = [dependant]
    visitados: set[int] = set()
    while pendientes:
        actual = pendientes.pop()
        identidad = id(actual)
        if identidad in visitados:
            continue
        visitados.add(identidad)
        if getattr(getattr(actual, "call", None), "_molsan_permiso_guard", None) == esperado:
            return True
        pendientes.extend(getattr(actual, "dependencies", []) or [])
    return False


def _resolver_modulo(path: str, methods: set[str] | None = None) -> str | None:
    path = _normalizar_path(path)
    metodos = {str(m).upper() for m in (methods or set())}

    # La auditoría/reparación de vínculos de expedientes está autorizada
    # explícitamente por Seguridad, no por los permisos operativos de Expedientes.
    if path == "/api/expedientes/auditoria-vinculaciones" or path.startswith("/api/expedientes/auditoria-vinculaciones/"):
        return "seguridad"

    # Operaciones administrativas bajo /expedientes cuya autorización funcional
    # es Seguridad, no los permisos operativos ordinarios de Expedientes.
    if path in {
        "/api/expedientes/migraciones/actividades",
        "/api/expedientes/reparto/asignar-pendientes",
        "/api/expedientes/gastos/migracion/aplicar",
        "/api/utilidades/add_columna_gestoria_expedientes",
    }:
        return "seguridad"

    # Los endpoints administrativos de fichajes usan el módulo específico
    # Control de Fichajes; los endpoints personales usan Fichajes.
    if path == "/api/fichajes/catalogo-ausencias" and "POST" in metodos:
        return "control-fichajes"
    if path == "/api/fichajes/admin" or path.startswith("/api/fichajes/admin/"):
        return "control-fichajes"
    if path == "/api/fichajes" or path.startswith("/api/fichajes/"):
        return "fichajes"

    # El bloqueo/desbloqueo de empleados está implementado en el router de
    # seguridad/asignar, pero su dependencia funcional exige empleados:editar.
    # Resolverlo antes del prefijo general /api/seguridad evita exigir además
    # el permiso incorrecto seguridad:crear.
    if path.startswith("/api/seguridad/asignar/empleado/") and (
        path.endswith("/bloquear") or path.endswith("/desbloquear")
    ):
        return "empleados"

    # Routers montados dentro de /seguridad usan módulos de permiso específicos.
    # Se resuelven antes del prefijo general /api/seguridad.
    if path == "/api/seguridad/auditoria" or path.startswith("/api/seguridad/auditoria/"):
        return "auditoria"
    if path == "/api/seguridad/logs" or path.startswith("/api/seguridad/logs/"):
        return "logs"

    for prefijo, modulo in _PREFIJOS_MODULO:
        if path == prefijo or path.startswith(prefijo + "/"):
            # La gestión de módulos/permisos de empleados es sensible y usa
            # el módulo "seguridad", aunque el path base sea /empleados.
            if prefijo == "/api/empleados" and any(
                trozo in path for trozo in (
                    "/permisos",
                    "/modulos",
                    "/reset-password",
                    "/colaborador-apoderagest",
                )
            ):
                return "seguridad"
            return modulo
    return None


def _resolver_accion(path: str, methods: set[str] | None) -> str:
    path = _normalizar_path(path).casefold()
    metodos = {str(m).upper() for m in (methods or set())}
    if path == "/api/expedientes/auditoria-vinculaciones" or path.startswith("/api/expedientes/auditoria-vinculaciones/"):
        return "editar"
    metodos.discard("HEAD")
    metodos.discard("OPTIONS")

    # Bloquear/desbloquear es una modificación de la ficha del empleado,
    # no una creación, aunque el endpoint use POST por compatibilidad.
    if path.endswith("/bloquear") or path.endswith("/desbloquear"):
        return "editar"

    # Para endpoints con varios métodos, los permisos deben cubrir todos los
    # efectos: la acción más restrictiva se aplica a la ruta completa.
    if "DELETE" in metodos:
        return "eliminar"
    if "PUT" in metodos or "PATCH" in metodos:
        return "editar"
    if "POST" in metodos:
        if any(fragmento in path for fragmento in _POST_ES_EDICION):
            return "editar"
        return "crear"
    return "ver"


def _nombre_actor(usuario: Any) -> str:
    """Obtiene el login del actor autenticado, nunca del cuerpo de la petición."""
    for campo in ("usuario", "username", "email"):
        valor = getattr(usuario, campo, None)
        if valor:
            return str(valor).strip()[:100]
    identificador = getattr(usuario, "id", None) or getattr(usuario, "empleado_id", None)
    return f"empleado:{identificador}" if identificador is not None else "usuario_autenticado"


def _registrar_evento_api(request: Request, usuario: Any, modulo: str, resultado: str, detalle: str = "") -> None:
    """Audita una petición protegida usando identidad de sesión y una sesión DB independiente."""
    db = SessionLocal()
    try:
        metodos = {"GET": "CONSULTA", "HEAD": "CONSULTA", "POST": "CREAR", "PUT": "EDITAR", "PATCH": "EDITAR", "DELETE": "ELIMINAR"}
        verbo = metodos.get(request.method.upper(), request.method.upper())
        ip = request.client.host if request.client else None
        ruta = str(request.url.path or "")[:300]
        descripcion = f"{resultado} | {request.method.upper()} {ruta}"
        if detalle:
            descripcion += f" | {detalle[:150]}"
        registrar_auditoria(
            db=db,
            usuario=_nombre_actor(usuario),
            modulo=(modulo or "sin_modulo")[:100],
            accion=(f"{verbo}_{resultado}" if resultado != "OK" else verbo)[:100],
            descripcion=descripcion[:500],
            ip=ip,
        )
    except Exception as exc:
        db.rollback()
        print(f"[AUDITORIA GLOBAL] No se pudo registrar evento API: {exc!r}", flush=True)
    finally:
        db.close()


def _crear_dependencia_auditoria(modulo: str, accion: str, comprobar_permiso: bool = True) -> Callable[..., Any]:
    def auditar_ruta_api(request: Request, usuario=Depends(get_current_user)):
        if comprobar_permiso:
            try:
                require_perm_modulo(usuario, modulo, accion)
            except Exception as exc:
                _registrar_evento_api(request, usuario, modulo, "DENEGADO", type(exc).__name__)
                raise
        try:
            yield usuario
        except Exception as exc:
            _registrar_evento_api(request, usuario, modulo, "ERROR", type(exc).__name__)
            raise
        else:
            _registrar_evento_api(request, usuario, modulo, "OK")

    auditar_ruta_api.__name__ = f"auditar_{modulo}_{accion}"
    setattr(auditar_ruta_api, "_molsan_audit_guard", True)
    if comprobar_permiso:
        setattr(auditar_ruta_api, "_molsan_permiso_guard", (modulo, accion))
    return auditar_ruta_api


def _crear_dependencia_permiso(modulo: str, accion: str) -> Callable[..., Any]:
    return _crear_dependencia_auditoria(modulo, accion, comprobar_permiso=True)


def proteger_rutas_api(app: Any) -> dict[str, int]:
    """Protege las rutas HTTP /api con JWT y, si están mapeadas, permisos."""
    autenticadas = 0
    ya_autenticadas = 0
    con_permiso = 0
    ya_con_permiso = 0
    sin_mapeo: list[str] = []

    # Los adjuntos se descargan por un endpoint autenticado que verifica la
    # conversación. Se retira el montaje específico para evitar servirlos sin control.
    for mounted in list(getattr(app, "routes", []) or []):
        if isinstance(mounted, Mount) and _normalizar_path(
            getattr(mounted, "path", "")
        ) == "/static/mensajes":
            try:
                app.router.routes.remove(mounted)
                print("[AUTH GUARD] Montaje /static/mensajes retirado.", flush=True)
            except ValueError:
                pass

    rutas_registradas = list(getattr(app, "routes", []) or [])
    total_rutas = sum(1 for ruta in rutas_registradas if isinstance(ruta, APIRoute))
    print(f"[AUTH GUARD] Inicio de revisión de {total_rutas} rutas HTTP.", flush=True)

    procesadas = 0
    for route in rutas_registradas:
        if not isinstance(route, APIRoute):
            continue

        procesadas += 1
        if procesadas % 100 == 0:
            print(f"[AUTH GUARD] Revisadas {procesadas}/{total_rutas} rutas.", flush=True)

        path = _normalizar_path(getattr(route, "path", ""))
        if not path.startswith("/api/"):
            continue

        if path in RUTAS_PUBLICAS_EXACTAS or path.startswith("/api/notargest/") or path.startswith("/api/encargagest/"):
            # EncargaGest autentica internamente las sesiones ERP y las cuentas externas.
            # El login externo queda público; el resto valida el JWT en get_encargagest_actor.

            # NotarGest valida su propio JWT con ámbito de notaría.
            continue

        if _ya_tiene_autenticacion(route.dependant):
            ya_autenticadas += 1
        else:
            dependencia_auth = get_dependant(
                path=getattr(route, "path_format", route.path),
                call=get_current_user,
            )
            route.dependant.dependencies.append(dependencia_auth)
            autenticadas += 1

        path_formato = getattr(route, "path_format", route.path)
        parametros_query_expediente = any(
            getattr(parametro, "name", None) in {"expediente_id", "id_expediente"}
            for parametro in (getattr(route.dependant, "query_params", []) or [])
        )
        if (
            (
                "{expediente_id}" in path_formato
                or "{id_expediente}" in path_formato
                or parametros_query_expediente
            )
            and not _ya_tiene_visibilidad_expediente(route.dependant)
        ):
            dependencia_visibilidad = get_dependant(
                path=path_formato,
                call=validar_visibilidad_expediente_request,
            )
            route.dependant.dependencies.append(dependencia_visibilidad)

        if path in _RUTAS_CON_AUTORIZACION_INTERNA:
            if not _ya_tiene_auditoria(route.dependant):
                dependencia_auditoria = get_dependant(
                    path=getattr(route, "path_format", route.path),
                    call=_crear_dependencia_auditoria(
                        _RUTAS_CON_AUTORIZACION_INTERNA[path],
                        _resolver_accion(path, getattr(route, "methods", None)),
                        comprobar_permiso=False,
                    ),
                )
                route.dependant.dependencies.append(dependencia_auditoria)
            continue

        modulo = _resolver_modulo(path, getattr(route, "methods", None))
        if not modulo:
            sin_mapeo.append(path)
            if not _ya_tiene_auditoria(route.dependant):
                dependencia_auditoria = get_dependant(
                    path=getattr(route, "path_format", route.path),
                    call=_crear_dependencia_auditoria("sin_modulo", _resolver_accion(path, getattr(route, "methods", None)), comprobar_permiso=False),
                )
                route.dependant.dependencies.append(dependencia_auditoria)
            continue

        accion = _resolver_accion(path, getattr(route, "methods", None))
        if _ya_tiene_permiso(route.dependant, modulo, accion):
            ya_con_permiso += 1
            if not _ya_tiene_auditoria(route.dependant):
                dependencia_auditoria = get_dependant(
                    path=getattr(route, "path_format", route.path),
                    call=_crear_dependencia_auditoria(modulo, accion, comprobar_permiso=False),
                )
                route.dependant.dependencies.append(dependencia_auditoria)
            continue

        dependencia_permiso = get_dependant(
            path=getattr(route, "path_format", route.path),
            call=_crear_dependencia_permiso(modulo, accion),
        )
        route.dependant.dependencies.append(dependencia_permiso)
        con_permiso += 1

    resultado = {
        "autenticadas_nuevas": autenticadas,
        "ya_autenticadas": ya_autenticadas,
        "con_permiso_nuevo": con_permiso,
        "ya_con_permiso": ya_con_permiso,
        "sin_mapeo": len(sin_mapeo),
    }
    print(
        "[AUTH GUARD] Rutas /api: "
        f"{autenticadas} con JWT nuevo; {ya_autenticadas} ya autenticadas; "
        f"{con_permiso} con permiso modular nuevo; {ya_con_permiso} ya autorizadas.",
        flush=True,
    )
    if sin_mapeo:
        ejemplos = ", ".join(sorted(set(sin_mapeo))[:20])
        print(
            "[AUTH GUARD] AVISO: rutas API sin mapeo granular (siguen con JWT): "
            f"{ejemplos}",
            flush=True,
        )
    return resultado


def registrar_guard_global() -> bool:
    """Registra el guard para que se ejecute después de incluir todos los routers."""
    app = None
    for nombre_modulo in ("backend.app.main", "app.main", "main"):
        modulo_main = sys.modules.get(nombre_modulo)
        posible_app = getattr(modulo_main, "app", None) if modulo_main else None
        if posible_app is not None:
            app = posible_app
            break

    if app is None:
        print(
            "[AUTH GUARD] No se pudo registrar: main.app aún no existe.",
            flush=True,
        )
        return False

    if getattr(app, "_molsan_route_guard_registered", False):
        return True

    async def aplicar_guard() -> None:
        proteger_rutas_api(app)

    app.add_event_handler("startup", aplicar_guard)
    setattr(app, "_molsan_route_guard_registered", True)
    return True

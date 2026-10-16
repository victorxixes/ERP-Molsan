"""Autenticación JWT y permisos por módulo/acción para rutas HTTP /api.

Se registra desde backend.app.auth.router y se ejecuta al inicio, cuando
main.py ya ha incluido todos los routers. Las rutas de login/health se dejan
públicas de forma explícita. Las rutas API conocidas reciben el permiso que
corresponde a su módulo y al método HTTP; las rutas nuevas no mapeadas siguen
exigiendo JWT y quedan identificadas en los logs para añadir su módulo.

Esto no sustituye la autorización de ámbito del recurso (por ejemplo, si un
usuario puede ver un expediente concreto), que debe comprobarse en el router
cuando exista esa restricción funcional.
"""
from __future__ import annotations

import sys
from typing import Any, Callable

from fastapi import Depends
from fastapi.dependencies.utils import get_dependant
from fastapi.routing import APIRoute
from starlette.routing import Mount

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo


RUTAS_PUBLICAS_EXACTAS = {
    "/api/auth/login",
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
    ("/api/municipios", "maestros"),
    ("/api/maestros", "maestros"),
    ("/api/panel-tecnico", "panel-tecnico"),
    ("/api/herramientasswager", "herramientas"),
    ("/api/roles", "seguridad"),
    ("/api/seguridad", "seguridad"),
    ("/api/admin", "seguridad"),
    ("/api/empleados", "empleados"),
    ("/api/agenda", "agenda"),
    ("/api/ctn", "ctn"),
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
    ("/api/informes", "utilidades"),
    ("/api/utilidades", "utilidades"),
    ("/api/absis", "utilidades"),
    ("/api/importador-absis", "utilidades"),
    ("/api/auth", "seguridad"),
    ("/api/roles", "seguridad"),
)

# POST normalmente crea. Estas rutas actúan sobre un registro/flujo existente
# o ejecutan una importación/migración, por lo que exigen permiso "editar".
_POST_ES_EDICION = (
    "/actividad",
    "/enviar-a-notario",
    "/enviar-a-absis",
    "/integraciones-pendientes",
    "/honorarios-gestoria",
    "/migracion",
    "/migraciones",
    "/geocode",
    "/importar",
    "/importador",
    "/asociadas",
    "/reset-password",
    "/permisos",
    "/modulos",
    "/bloqueo",
    "/mover",
    "/reparar",
    "/sincronizar",
)


def _normalizar_path(path: str) -> str:
    valor = str(path or "").strip()
    if len(valor) > 1:
        valor = valor.rstrip("/")
    return valor


def _ya_tiene_autenticacion(dependant: Any) -> bool:
    """Evita insertar get_current_user si una ruta ya lo declara."""
    if getattr(dependant, "call", None) is get_current_user:
        return True
    for child in getattr(dependant, "dependencies", []) or []:
        if _ya_tiene_autenticacion(child):
            return True
    return False


def _ya_tiene_permiso(dependant: Any, modulo: str, accion: str) -> bool:
    esperado = (modulo, accion)
    if getattr(getattr(dependant, "call", None), "_molsan_permiso_guard", None) == esperado:
        return True
    for child in getattr(dependant, "dependencies", []) or []:
        if _ya_tiene_permiso(child, modulo, accion):
            return True
    return False


def _resolver_modulo(path: str) -> str | None:
    path = _normalizar_path(path)

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
                trozo in path for trozo in ("/permisos", "/modulos", "/reset-password")
            ):
                return "seguridad"
            return modulo
    return None


def _resolver_accion(path: str, methods: set[str] | None) -> str:
    path = _normalizar_path(path).casefold()
    metodos = {str(m).upper() for m in (methods or set())}
    metodos.discard("HEAD")
    metodos.discard("OPTIONS")

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


def _crear_dependencia_permiso(modulo: str, accion: str) -> Callable[..., Any]:
    def autorizar_ruta_api(usuario=Depends(get_current_user)):
        require_perm_modulo(usuario, modulo, accion)
        return usuario

    autorizar_ruta_api.__name__ = f"autorizar_{modulo}_{accion}"
    setattr(autorizar_ruta_api, "_molsan_permiso_guard", (modulo, accion))
    return autorizar_ruta_api


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

    for route in list(getattr(app, "routes", []) or []):
        if not isinstance(route, APIRoute):
            continue

        path = _normalizar_path(getattr(route, "path", ""))
        if not path.startswith("/api/"):
            continue

        if path in RUTAS_PUBLICAS_EXACTAS:
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

        modulo = _resolver_modulo(path)
        if not modulo:
            sin_mapeo.append(path)
            continue

        accion = _resolver_accion(path, getattr(route, "methods", None))
        if _ya_tiene_permiso(route.dependant, modulo, accion):
            ya_con_permiso += 1
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

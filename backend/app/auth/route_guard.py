"""Protección global JWT para rutas HTTP bajo /api.

Se registra desde backend.app.auth.router cuando main.app ya existe.
La instalación se añade a los eventos de inicio para que se ejecute
DESPUÉS de que main.py haya incluido todos los routers.

Esto proporciona autenticación, no reemplaza la autorización granular
por módulo/acción.
"""

from __future__ import annotations

import sys
from typing import Any

from fastapi.dependencies.utils import get_dependant
from fastapi.routing import APIRoute
from starlette.routing import Mount

from fastapi import Depends
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo


RUTAS_PUBLICAS_EXACTAS = {
    "/api/auth/login",
    # Endpoint histórico; se conserva para no romper clientes antiguos.
    "/api/empleados/login",
    "/api/health",
    "/api/health/live",
    "/api/health/ready",
}




def _permiso_requerido_para_ruta(path: str, methods: set[str]):
    """Permisos estrictos para administración de roles y seguridad."""
    ruta = path.rstrip("/") or "/"
    metodo = next(iter(sorted(methods)), "GET")
    if ruta.startswith("/api/seguridad/roles") or ruta.startswith("/api/seguridad/permisos"):
        accion = {"GET": "ver", "HEAD": "ver", "POST": "crear", "PUT": "editar", "PATCH": "editar", "DELETE": "eliminar"}.get(metodo, "editar")
        return ("seguridad", accion)
    if ruta.startswith("/api/seguridad/asignar"):
        return ("empleados", "editar")
    if ruta.startswith("/api/admin") or ruta.startswith("/api/crear-tablas"):
        return ("seguridad", "editar")
    return None

def _dependencia_permiso(modulo: str, accion: str):
    def comprobar_permiso(usuario=Depends(get_current_user)):
        require_perm_modulo(usuario, modulo, accion)
        return usuario
    comprobar_permiso.__name__ = f"permiso_{modulo}_{accion}"
    comprobar_permiso.__qualname__ = comprobar_permiso.__name__
    return comprobar_permiso

def _ya_tiene_autenticacion(dependant: Any) -> bool:
    """Evita añadir get_current_user dos veces a una ruta."""
    if getattr(dependant, "call", None) is get_current_user:
        return True
    for child in getattr(dependant, "dependencies", []) or []:
        if _ya_tiene_autenticacion(child):
            return True
    return False



def proteger_rutas_api(app: Any) -> dict[str, int]:
    """Añade JWT a todas las rutas FastAPI HTTP bajo /api, salvo login/health."""
    protegidas = 0
    omitidas = 0

    # Los adjuntos de Mensajes ya no se deben servir como ficheros estáticos
    # públicos. Se descargan por /api/mensajes/archivo/{nombre}, que comprueba
    # que el fichero corresponde a un mensaje del usuario autenticado.
    for mounted in list(getattr(app, "routes", []) or []):
        if isinstance(mounted, Mount) and str(getattr(mounted, "path", "")).rstrip("/") == "/static/mensajes":
            try:
                app.router.routes.remove(mounted)
                print("[AUTH GUARD] Montaje público /static/mensajes retirado.", flush=True)
            except ValueError:
                pass

    for route in list(getattr(app, "routes", []) or []):
        if not isinstance(route, APIRoute):
            continue

        path = str(getattr(route, "path", "") or "")
        if not path.startswith("/api/"):
            continue

        if path in RUTAS_PUBLICAS_EXACTAS:
            omitidas += 1
            continue

        regla = _permiso_requerido_para_ruta(path, set(getattr(route, "methods", set()) or set()))
        if regla and not getattr(route, "_molsan_perm_guarded", False):
            modulo, accion = regla
            dep_permiso = get_dependant(path=route.path_format, call=_dependencia_permiso(modulo, accion))
            route.dependant.dependencies.append(dep_permiso)
            setattr(route, "_molsan_perm_guarded", True)

        if _ya_tiene_autenticacion(route.dependant):
            omitidas += 1
            continue

        dependencia = get_dependant(path=route.path_format, call=get_current_user)
        route.dependant.dependencies.append(dependencia)
        protegidas += 1

    resultado = {"protegidas": protegidas, "omitidas": omitidas}
    print(
        "[AUTH GUARD] Rutas HTTP /api procesadas: "
        f"{protegidas} protegidas, {omitidas} ya protegidas o públicas.",
        flush=True,
    )
    return resultado



def registrar_guard_global() -> bool:
    """Registra protección global en backend.app.main.app sin editar main.py.

    El módulo auth.router se importa cuando main.py ya ha creado `app` pero
    antes de registrar los routers. El handler de startup se ejecutará más
    tarde, una vez que todas las rutas están registradas.
    """
    modulo_main = None
    for nombre_modulo in ("backend.app.main", "app.main", "main"):
        modulo_main = sys.modules.get(nombre_modulo)
        app = getattr(modulo_main, "app", None) if modulo_main else None
        if app is not None:
            break
    else:
        app = None
    if app is None:
        print(
            "[AUTH GUARD] No se pudo registrar: backend.app.main.app aún no existe.",
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

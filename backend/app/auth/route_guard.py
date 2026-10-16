"""Protección global de API ERP-Molsan.

- Autentica las rutas HTTP /api mediante JWT.
- Aplica permisos por módulo/acción cuando la ruta no declara ya una
  dependencia de permiso explícita.
- Deja públicos únicamente login y health checks concretos.
- Retira el montaje estático público de los adjuntos de Mensajes.

El guard se registra desde backend.app.auth.router y se ejecuta en startup,
cuando main.py ya ha registrado todos los routers.
"""
from __future__ import annotations

import sys
from typing import Any, Optional, Tuple

from fastapi import Depends, HTTPException, Request
from fastapi.dependencies.utils import get_dependant
from fastapi.routing import APIRoute
from starlette.routing import Mount

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo

RUTAS_PUBLICAS_EXACTAS = {
    "/api/auth/login",
    # Compatibilidad con clientes anteriores.
    "/api/empleados/login",
    "/api/health",
    "/api/health/live",
    "/api/health/ready",
}

# Catálogo central de los módulos disponibles en authStore/permisos.
# Los catálogos maestros que se editan desde Herramientas pertenecen a
# "utilidades"; las operaciones de una ficha pertenecen a "expedientes".
PREFIJOS_MODULO = (
    ("/api/seguridad/auditoria", "auditoria"),
    ("/api/seguridad/logs", "logs"),
    ("/api/seguridad", "seguridad"),
    ("/api/admin", "seguridad"),
    ("/api/roles", "seguridad"),
    ("/api/permisos", "seguridad"),
    ("/api/asignar-bloqueo", "seguridad"),
    ("/api/herramientas", "seguridad"),
    ("/api/debug", "seguridad"),
    ("/api/reset-intranet", "seguridad"),
    ("/api/borrar-roles", "seguridad"),
    ("/api/borrar-tablas", "seguridad"),
    ("/api/expedientes", "expedientes"),
    ("/api/expediente-acciones", "expedientes"),
    ("/api/carpeta-digital", "expedientes"),
    ("/api/agenda", "agenda"),
    ("/api/empleados", "empleados"),
    ("/api/ctn", "ctn"),
    ("/api/notarios", "notarios"),
    ("/api/mensajes", "mensajes"),
    ("/api/dashboard", "dashboard"),
    ("/api/informes", "informes"),
    ("/api/maestros", "maestros"),
    ("/api/intranet", "intranet"),
    ("/api/documentos", "documentos"),
    ("/api/noticias", "intranet"),
    ("/api/realtime", "realtime"),
    ("/api/auditoria", "auditoria"),
    ("/api/logs", "logs"),
    ("/api/utilidades", "utilidades"),
    ("/api/absis", "utilidades"),
    ("/api/importador-absis", "utilidades"),
    ("/api/municipios", "utilidades"),
    ("/api/entidades-bancarias", "utilidades"),
    ("/api/registros-propiedad", "utilidades"),
    ("/api/oficinas-liquidadoras", "utilidades"),
    ("/api/tipos-carga-hipotecaria", "utilidades"),
    ("/api/tipos-concepto-gastos", "utilidades"),
    ("/api/acciones-expediente", "utilidades"),
)

# Estas rutas requieren permiso de Seguridad, incluso si el módulo de negocio
# dispone de permisos más amplios. Evita que un permiso de Expedientes permita
# ejecutar cambios de esquema, depuración o reinicializaciones.
RUTAS_TECNICAS = (
    "/debug/",
    "/migracion",
    "/migraciones",
    "/reset",
    "/borrar",
    "/crear-tablas",
    "/repair",
    "/reparar",
    "/fix-schema",
    "/fix-table",
    "/mantenimiento-defectos",
)

ACCIONES_DE_EDICION_POST = (
    "/enviar",
    "/mover",
    "/subsan",
    "/marcar",
    "/leido",
    "/asociadas",
    "/geocode",
    "/permisos",
    "/modulos",
    "/reset-password",
    "/bloqueo",
    "/desbloqueo",
    "/activar",
    "/desactivar",
    "/import",
    "/generar",
)


def _es_prefijo(path: str, prefijo: str) -> bool:
    return path == prefijo or path.startswith(prefijo + "/")


def _modulo_para_ruta(path: str) -> Optional[str]:
    ruta = (path or "").split("?", 1)[0].rstrip("/") or "/"
    ruta_lower = ruta.lower()

    # Operaciones técnicas siempre reservadas a Seguridad.
    if any(marca in ruta_lower for marca in RUTAS_TECNICAS):
        return "seguridad"

    # Las operaciones sobre permisos, módulos o credenciales de empleados son
    # parte de Seguridad, no del CRUD ordinario de empleados.
    if _es_prefijo(ruta_lower, "/api/empleados") and any(
        marca in ruta_lower
        for marca in ("/permisos", "/modulos", "/reset-password", "/bloqueo", "/desbloqueo")
    ):
        return "seguridad"

    for prefijo, modulo in PREFIJOS_MODULO:
        if _es_prefijo(ruta_lower, prefijo):
            return modulo
    return None


def _accion_para_ruta(path: str, methods: set[str]) -> str:
    ruta = (path or "").lower()
    metodos = {str(m).upper() for m in methods}
    metodo = next((m for m in ("DELETE", "PATCH", "PUT", "POST", "GET", "HEAD") if m in metodos), "GET")

    if any(marca in ruta for marca in RUTAS_TECNICAS):
        return "editar"

    if metodo in {"GET", "HEAD"}:
        return "ver"
    if metodo in {"PUT", "PATCH", "DELETE"}:
        return "editar" if metodo != "DELETE" else "eliminar"
    if metodo == "POST":
        if any(marca in ruta for marca in ACCIONES_DE_EDICION_POST):
            return "editar"
        return "crear"
    return "editar"


def verificar_permiso_api(request: Request, usuario=Depends(get_current_user)):
    """Dependencia por petición para autorizar por módulo y acción."""
    path = request.url.path
    modulo = _modulo_para_ruta(path)
    if not modulo:
        raise HTTPException(
            status_code=403,
            detail=f"La ruta API no tiene un módulo de permisos configurado: {path}",
        )
    accion = _accion_para_ruta(path, {request.method})
    require_perm_modulo(usuario, modulo, accion)
    return usuario


def _ya_tiene_autenticacion(dependant: Any) -> bool:
    if getattr(dependant, "call", None) is get_current_user:
        return True
    return any(_ya_tiene_autenticacion(child) for child in (getattr(dependant, "dependencies", []) or []))


def _ya_tiene_permiso_explicito(dependant: Any) -> bool:
    """Reconoce dependencias granulares definidas directamente en routers."""
    call = getattr(dependant, "call", None)
    if call is not None:
        nombre = str(getattr(call, "__name__", "")).lower()
        modulo = str(getattr(call, "__module__", "")).lower()
        if (
            nombre.startswith("permiso_")
            or "comprobar_permiso" in nombre
            or "require_perm_modulo" in nombre
            or "require_permission" in nombre
            or modulo.endswith(".auth.permissions")
        ):
            return True
    return any(_ya_tiene_permiso_explicito(child) for child in (getattr(dependant, "dependencies", []) or []))


def proteger_rutas_api(app: Any) -> dict[str, int]:
    """Aplica autenticación y RBAC a las rutas HTTP /api registradas."""
    protegidas = 0
    omitidas = 0

    # Los adjuntos de Mensajes solo se sirven a través de su endpoint privado.
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
        if getattr(route, "_molsan_rbac_guarded", False):
            omitidas += 1
            continue

        # Los routers que ya declaran permiso de módulo mantienen su regla
        # específica; los demás reciben el guard común de módulo/acción.
        if not _ya_tiene_permiso_explicito(route.dependant):
            dependency = get_dependant(path=route.path_format, call=verificar_permiso_api)
            route.dependant.dependencies.append(dependency)
        elif not _ya_tiene_autenticacion(route.dependant):
            dependency = get_dependant(path=route.path_format, call=get_current_user)
            route.dependant.dependencies.append(dependency)

        setattr(route, "_molsan_rbac_guarded", True)
        protegidas += 1

    resultado = {"procesadas": protegidas, "omitidas": omitidas}
    print(
        "[AUTH GUARD] Rutas HTTP /api procesadas: "
        f"{protegidas} con autenticación/RBAC, {omitidas} públicas o ya procesadas.",
        flush=True,
    )
    return resultado


def registrar_guard_global() -> bool:
    """Instala el guard en main.app, tras registrar todos los routers."""
    app = None
    for nombre_modulo in ("backend.app.main", "app.main", "main"):
        modulo_main = sys.modules.get(nombre_modulo)
        candidato = getattr(modulo_main, "app", None) if modulo_main else None
        if candidato is not None:
            app = candidato
            break
    if app is None:
        print("[AUTH GUARD] No se pudo registrar: main.app aún no existe.", flush=True)
        return False
    if getattr(app, "_molsan_route_guard_registered", False):
        return True

    async def aplicar_guard() -> None:
        proteger_rutas_api(app)

    app.add_event_handler("startup", aplicar_guard)
    setattr(app, "_molsan_route_guard_registered", True)
    return True

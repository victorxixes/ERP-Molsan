"""Almacenamiento local configurable y comprobable para ERP-Molsan.

En Render debe montarse un Persistent Disk en /var/data y configurar:
    MOLSAN_STORAGE_ROOT=/var/data/molsan
    MOLSAN_REQUIRE_PERSISTENT_STORAGE=true

Los directorios concretos pueden sobrescribirse mediante variables de entorno,
pero en modo obligatorio deben permanecer dentro de MOLSAN_STORAGE_ROOT.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Mapping


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "si", "sí", "on"}


def _inside(parent: Path, child: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except (ValueError, OSError):
        return False


def resolve_storage_paths(
    root: str | Path,
    overrides: Mapping[str, str | Path] | None = None,
) -> dict[str, Path]:
    """Pure helper to resolve child paths and reject paths escaping the root."""
    base = Path(root).expanduser().resolve()
    overrides = overrides or {}
    names = {
        "carpeta_digital": "CARPETA_DIGITAL_DIR",
        "mensajes": "MENSAJES_DIR",
        "documentos_intranet": "DOCUMENTOS_INTRANET_DIR",
        "fotos_empleados": "FOTOS_EMPLEADOS_DIR",
    }
    result: dict[str, Path] = {"root": base}
    defaults = {
        "carpeta_digital": base / "carpeta_digital",
        "mensajes": base / "mensajes",
        "documentos_intranet": base / "documentos_intranet",
        "fotos_empleados": base / "fotos" / "empleados",
    }
    for key, variable in names.items():
        raw = overrides.get(variable) if overrides is not None else os.getenv(variable)
        candidate = Path(raw).expanduser().resolve() if raw else defaults[key].resolve()
        if not _inside(base, candidate):
            raise ValueError(
                f"{variable} debe quedar dentro de MOLSAN_STORAGE_ROOT ({base}); "
                f"ruta recibida: {candidate}"
            )
        result[key] = candidate
    return result


def _validate_persistent_root(root: Path) -> None:
    data_mount = Path("/var/data").resolve()
    if not _inside(data_mount, root):
        raise RuntimeError(
            "MOLSAN_REQUIRE_PERSISTENT_STORAGE está activado, pero "
            "MOLSAN_STORAGE_ROOT no está dentro de /var/data. En Render, "
            "monta un Persistent Disk en /var/data y usa, por ejemplo, "
            "MOLSAN_STORAGE_ROOT=/var/data/molsan."
        )


def _probe_directory(path: Path) -> None:
    """Confirma permisos reales de escritura y lectura sin dejar archivos."""
    path.mkdir(parents=True, exist_ok=True)
    probe = path / ".molsan_storage_probe"
    try:
        probe.write_text("ok", encoding="utf-8")
        if probe.read_text(encoding="utf-8") != "ok":
            raise OSError("el contenido de comprobación no coincide")
    finally:
        try:
            probe.unlink(missing_ok=True)
        except OSError:
            pass


ROOT_VALUE = os.getenv("MOLSAN_STORAGE_ROOT", "./data/molsan").strip()
if not ROOT_VALUE:
    raise RuntimeError("MOLSAN_STORAGE_ROOT no puede estar vacío")
STORAGE_ROOT = Path(ROOT_VALUE).expanduser().resolve()
REQUIRE_PERSISTENT_STORAGE = _env_bool("MOLSAN_REQUIRE_PERSISTENT_STORAGE", False)

if REQUIRE_PERSISTENT_STORAGE:
    _validate_persistent_root(STORAGE_ROOT)

_PATHS = resolve_storage_paths(STORAGE_ROOT)
CARPETA_DIGITAL_DIR = _PATHS["carpeta_digital"]
MENSAJES_DIR = _PATHS["mensajes"]
DOCUMENTOS_INTRANET_DIR = _PATHS["documentos_intranet"]
FOTOS_EMPLEADOS_DIR = _PATHS["fotos_empleados"]
FOTOS_DIR = FOTOS_EMPLEADOS_DIR.parent

for _directory in (
    CARPETA_DIGITAL_DIR,
    MENSAJES_DIR,
    DOCUMENTOS_INTRANET_DIR,
    FOTOS_EMPLEADOS_DIR,
):
    _directory.mkdir(parents=True, exist_ok=True)
    if REQUIRE_PERSISTENT_STORAGE:
        _probe_directory(_directory)


def storage_status() -> dict[str, object]:
    """Status safe for logs; does not expose filenames or user documents."""
    paths = {
        "root": STORAGE_ROOT,
        "carpeta_digital": CARPETA_DIGITAL_DIR,
        "mensajes": MENSAJES_DIR,
        "documentos_intranet": DOCUMENTOS_INTRANET_DIR,
        "fotos_empleados": FOTOS_EMPLEADOS_DIR,
    }
    status: dict[str, object] = {
        "persistent_required": REQUIRE_PERSISTENT_STORAGE,
        "root": str(STORAGE_ROOT),
        "directories": {},
    }
    dirs: dict[str, object] = {}
    for key, path in paths.items():
        dirs[key] = {
            "path": str(path),
            "exists": path.is_dir(),
            "writable": os.access(path, os.W_OK),
            "inside_root": _inside(STORAGE_ROOT, path),
        }
    status["directories"] = dirs
    return status

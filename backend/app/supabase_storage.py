"""Private Supabase Storage adapter for ERP-Molsan.

The service-role key is server-only. Never return it to clients, log it, or
construct public URLs. Objects are referenced by opaque bucket/key pairs and
downloaded only after the ERP route has authorized the requesting employee.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import quote

import requests


@dataclass(frozen=True)
class SupabaseStorageConfig:
    url: str
    service_role_key: str
    bucket: str
    timeout_seconds: float = 30.0

    @classmethod
    def from_env(cls) -> "SupabaseStorageConfig":
        url = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
        key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
        bucket = (os.getenv("MOLSAN_STORAGE_BUCKET") or "molsan-private").strip()
        if not url or not key:
            raise RuntimeError(
                "El almacenamiento Supabase está activado, pero faltan "
                "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
            )
        if not bucket or "/" in bucket:
            raise RuntimeError("MOLSAN_STORAGE_BUCKET no es válido.")
        return cls(url=url, service_role_key=key, bucket=bucket)


class SupabaseStorageError(RuntimeError):
    """Storage operation failed; message deliberately excludes credentials."""


def _object_path(value: str) -> str:
    path = str(value or "").strip().strip("/")
    parts = path.split("/")
    if (
        not path
        or "\\" in path
        or any(part in {"", ".", ".."} for part in parts)
        or any(ord(char) < 32 for char in path)
    ):
        raise ValueError("La clave del objeto no es válida.")
    return "/".join(quote(part, safe="-_.~") for part in parts)


class SupabasePrivateStorage:
    """Small synchronous adapter using Supabase's private Storage HTTP API."""

    def __init__(self, config: SupabaseStorageConfig | None = None, session=None):
        self.config = config or SupabaseStorageConfig.from_env()
        self.session = session or requests.Session()

    def _url(self, path: str) -> str:
        return f"{self.config.url}/storage/v1/{path}"

    def _headers(self, content_type: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self.config.service_role_key,
            "Authorization": f"Bearer {self.config.service_role_key}",
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def upload(self, key: str, content: bytes, content_type: str, *, upsert: bool = False) -> str:
        if not isinstance(content, bytes) or not content:
            raise ValueError("No se puede subir un archivo vacío.")
        path = _object_path(key)
        url = self._url(f"object/{quote(self.config.bucket, safe='-_.~')}/{path}")
        headers = self._headers(content_type or "application/octet-stream")
        headers["x-upsert"] = "true" if upsert else "false"
        try:
            # Supabase Storage's standard REST upload endpoint uses POST.
            response = self.session.post(
                url, data=content, headers=headers, timeout=self.config.timeout_seconds
            )
            if response.status_code not in (200, 201):
                raise SupabaseStorageError(
                    f"Supabase Storage rechazó la subida (HTTP {response.status_code})."
                )
        except requests.RequestException as exc:
            raise SupabaseStorageError("No se pudo conectar con Supabase Storage.") from exc
        return f"supabase://{self.config.bucket}/{key.strip('/')}"

    def download(self, key: str) -> bytes:
        path = _object_path(key)
        url = self._url(f"object/{quote(self.config.bucket, safe='-_.~')}/{path}")
        try:
            response = self.session.get(
                url, headers=self._headers(), timeout=self.config.timeout_seconds
            )
            if response.status_code == 404:
                raise FileNotFoundError("El objeto solicitado no existe.")
            if response.status_code != 200:
                raise SupabaseStorageError(
                    f"Supabase Storage rechazó la descarga (HTTP {response.status_code})."
                )
            return response.content
        except requests.RequestException as exc:
            raise SupabaseStorageError("No se pudo conectar con Supabase Storage.") from exc

    def exists(self, key: str) -> bool:
        """Check object existence without downloading its body."""
        path = _object_path(key)
        url = self._url(f"object/{quote(self.config.bucket, safe='-_.~')}/{path}")
        response = None
        try:
            response = self.session.get(
                url,
                headers=self._headers(),
                timeout=self.config.timeout_seconds,
                stream=True,
            )
            if response.status_code == 404:
                return False
            if response.status_code != 200:
                raise SupabaseStorageError(
                    f"Supabase Storage rechazó la comprobación (HTTP {response.status_code})."
                )
            return True
        except requests.RequestException as exc:
            raise SupabaseStorageError("No se pudo conectar con Supabase Storage.") from exc
        finally:
            if response is not None:
                response.close()

    def delete(self, key: str) -> None:
        path = _object_path(key)
        url = self._url(f"object/{quote(self.config.bucket, safe='-_.~')}")
        try:
            response = self.session.delete(
                url,
                json={"prefixes": [path]},
                headers=self._headers("application/json"),
                timeout=self.config.timeout_seconds,
            )
            if response.status_code not in (200, 204):
                raise SupabaseStorageError(
                    f"Supabase Storage rechazó el borrado (HTTP {response.status_code})."
                )
        except requests.RequestException as exc:
            raise SupabaseStorageError("No se pudo conectar con Supabase Storage.") from exc


def storage_backend_is_supabase() -> bool:
    """Render must never silently fall back to an ephemeral local filesystem."""
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        return True
    return (os.getenv("MOLSAN_STORAGE_BACKEND") or "local").strip().lower() == "supabase"


def is_supabase_object(reference: str | None) -> bool:
    return isinstance(reference, str) and reference.startswith("supabase://")


def parse_object_reference(reference: str) -> tuple[str, str]:
    if not is_supabase_object(reference):
        raise ValueError("La referencia no pertenece a Supabase Storage.")
    bucket, separator, key = reference[len("supabase://"):].partition("/")
    if not separator or not bucket or not key:
        raise ValueError("La referencia de almacenamiento no es válida.")
    _object_path(key)
    return bucket, key

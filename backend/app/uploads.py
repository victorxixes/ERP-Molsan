"""Lectura acotada de ficheros subidos por API."""
import os

from fastapi import HTTPException, UploadFile

MAX_EXCEL_UPLOAD_BYTES = max(
    1,
    int(os.getenv("MOLSAN_MAX_EXCEL_UPLOAD_BYTES", str(100 * 1024 * 1024))),
)


async def read_upload_limited(
    upload: UploadFile,
    max_bytes: int,
    label: str = "archivo",
) -> bytes:
    """Lee como máximo max_bytes + 1 y cierra siempre el stream."""
    try:
        content = await upload.read(max_bytes + 1)
    finally:
        await upload.close()

    if len(content) > max_bytes:
        limite_mb = max(1, max_bytes // (1024 * 1024))
        raise HTTPException(
            status_code=413,
            detail=f"El {label} supera el límite de {limite_mb} MB.",
        )
    return content

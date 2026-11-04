from __future__ import annotations

from io import BytesIO
from typing import Any
import re
import unicodedata

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from backend.app.database import engine, get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.uploads import MAX_EXCEL_UPLOAD_BYTES, read_upload_limited

router = APIRouter(
    dependencies=[Depends(get_current_user)],prefix="/oficinas-catalogo", tags=["Catálogo de oficinas"])

COLUMNAS = [
    "Oficina", "Nombre", "Dirección", "Población", "Cod. Postal",
    "Cod. Provincia", "Provincia", "Cod. DT", "DT", "Cod. DG", "DG",
    "Cod. DAN", "DAN",
]
CAMPOS = [
    "oficina", "nombre", "direccion", "poblacion", "cod_postal",
    "cod_provincia", "provincia", "cod_dt", "dt", "cod_dg", "dg",
    "cod_dan", "dan",
]


def _crear_tabla() -> None:
    """Crea el catálogo vacío; nunca introduce oficinas de fuentes externas."""
    with engine.begin() as conexion:
        conexion.execute(text("""
            CREATE TABLE IF NOT EXISTS public.catalogo_oficinas (
                id BIGSERIAL PRIMARY KEY,
                oficina VARCHAR(100) NOT NULL UNIQUE,
                nombre TEXT NOT NULL DEFAULT '',
                direccion TEXT NOT NULL DEFAULT '',
                poblacion TEXT NOT NULL DEFAULT '',
                cod_postal TEXT NOT NULL DEFAULT '',
                cod_provincia TEXT NOT NULL DEFAULT '',
                provincia TEXT NOT NULL DEFAULT '',
                cod_dt TEXT NOT NULL DEFAULT '',
                dt TEXT NOT NULL DEFAULT '',
                cod_dg TEXT NOT NULL DEFAULT '',
                dg TEXT NOT NULL DEFAULT '',
                cod_dan TEXT NOT NULL DEFAULT '',
                dan TEXT NOT NULL DEFAULT '',
                creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))


@router.on_event("startup")
def inicializar_catalogo_oficinas() -> None:
    _crear_tabla()


def _normalizar_cabecera(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", texto.casefold())


_CABECERAS = {_normalizar_cabecera(nombre): nombre for nombre in COLUMNAS}


def _leer_excel(contenido: bytes, nombre_archivo: str) -> tuple[list[dict[str, str]], list[str]]:
    extension = str(nombre_archivo or "").lower().rsplit(".", 1)
    if len(extension) < 2 or extension[-1] not in {"xlsx", "xls"}:
        raise HTTPException(status_code=400, detail="El archivo debe ser un Excel .xlsx o .xls.")
    try:
        marco = pd.read_excel(BytesIO(contenido), dtype=str, keep_default_na=False)
    except ImportError as error:
        raise HTTPException(
            status_code=400,
            detail="No está disponible el lector para este formato Excel. Guarda el archivo como .xlsx e inténtalo de nuevo.",
        ) from error
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"No se ha podido leer el Excel: {error}") from error

    encontradas: dict[str, Any] = {}
    for original in marco.columns:
        clave = _normalizar_cabecera(original)
        if clave in _CABECERAS:
            encontradas[_CABECERAS[clave]] = original
    faltan = [columna for columna in COLUMNAS if columna not in encontradas]
    if faltan:
        raise HTTPException(
            status_code=400,
            detail="Faltan columnas obligatorias: " + ", ".join(faltan),
        )

    filas: list[dict[str, str]] = []
    errores: list[str] = []
    vistos: dict[str, int] = {}
    for indice, (_, serie) in enumerate(marco.iterrows(), start=2):
        fila = {
            campo: str(serie[encontradas[columna]] or "").strip()
            for columna, campo in zip(COLUMNAS, CAMPOS)
        }
        if not any(fila.values()):
            continue
        codigo = fila["oficina"].strip()
        if not codigo:
            errores.append(f"Fila {indice}: falta el código de Oficina.")
            continue
        clave = codigo.casefold()
        if clave in vistos:
            errores.append(
                f"Fila {indice}: el código de oficina «{codigo}» está duplicado en el Excel (fila {vistos[clave]})."
            )
            continue
        vistos[clave] = indice
        fila["oficina"] = codigo
        filas.append(fila)
    if not filas and not errores:
        errores.append("El Excel no contiene ninguna oficina para importar.")
    return filas, errores


def _serializar(fila: Any) -> dict[str, Any]:
    return {campo: fila[campo] or "" for campo in ["id", *CAMPOS]}


def _existentes(db: Session, codigos: list[str]) -> set[str]:
    if not codigos:
        return set()
    consulta = text(
        "SELECT oficina FROM public.catalogo_oficinas WHERE oficina IN :codigos"
    ).bindparams(bindparam("codigos", expanding=True))
    filas = db.execute(consulta, {"codigos": codigos}).all()
    return {str(fila[0]).casefold() for fila in filas}


@router.get("")
def listar_oficinas(
    q: str = Query(default="", max_length=200),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="oficina", regex="^(oficina|nombre|direccion|poblacion|cod_postal|cod_provincia|provincia|cod_dt|dt|cod_dg|dg|cod_dan|dan)$"),
    sort_dir: str = Query(default="asc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    termino = f"%{q.strip()}%"
    filtro = ""
    parametros: dict[str, Any] = {"termino": termino}
    if q.strip():
        filtro = " WHERE " + " OR ".join(f"COALESCE({campo}, '') ILIKE :termino" for campo in CAMPOS)
    total = db.execute(
        text(f"SELECT COUNT(*) FROM public.catalogo_oficinas{filtro}"),
        parametros,
    ).scalar() or 0
    filas = db.execute(
        text(f"""
            SELECT id, {", ".join(CAMPOS)}
            FROM public.catalogo_oficinas
            {filtro}
            ORDER BY {sort_by} {sort_dir.upper()}, oficina ASC
            LIMIT :limite OFFSET :desplazamiento
        """),
        {**parametros, "limite": limit, "desplazamiento": offset},
    ).mappings().all()
    return {"items": [_serializar(fila) for fila in filas], "total": int(total), "limit": limit, "offset": offset}


@router.post("/previsualizar")
async def previsualizar_importacion(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contenido = await read_upload_limited(
        archivo,
        MAX_EXCEL_UPLOAD_BYTES,
        "Excel de oficinas",
    )
    filas, errores = _leer_excel(contenido, archivo.filename or "")
    existentes = _existentes(db, [fila["oficina"] for fila in filas])
    return {
        "archivo": archivo.filename,
        "total_filas": len(filas) + len(errores),
        "oficinas_validas": len(filas),
        "nuevas": sum(1 for fila in filas if fila["oficina"].casefold() not in existentes),
        "actualizaciones": sum(1 for fila in filas if fila["oficina"].casefold() in existentes),
        "errores": errores,
        "muestra": [{campo: fila[campo] for campo in CAMPOS} for fila in filas[:10]],
    }


@router.post("/importar")
async def importar_oficinas(
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    contenido = await read_upload_limited(
        archivo,
        MAX_EXCEL_UPLOAD_BYTES,
        "Excel de oficinas",
    )
    filas, errores = _leer_excel(contenido, archivo.filename or "")
    if errores:
        raise HTTPException(
            status_code=422,
            detail={"mensaje": "El Excel contiene errores. No se ha importado ningún dato.", "errores": errores},
        )
    codigos = [fila["oficina"] for fila in filas]
    existentes = _existentes(db, codigos)
    columnas_sql = ", ".join(CAMPOS)
    parametros_sql = ", ".join(f":{campo}" for campo in CAMPOS)
    actualizaciones_sql = ", ".join(
        f"{campo} = EXCLUDED.{campo}" for campo in CAMPOS if campo != "oficina"
    )
    consulta = text(f"""
        INSERT INTO public.catalogo_oficinas ({columnas_sql})
        VALUES ({parametros_sql})
        ON CONFLICT (oficina) DO UPDATE SET
            {actualizaciones_sql},
            actualizado_en = CURRENT_TIMESTAMP
    """)
    try:
        db.execute(consulta, filas)
        db.commit()
    except Exception:
        db.rollback()
        raise
    actualizaciones = sum(1 for codigo in codigos if codigo.casefold() in existentes)
    return {
        "ok": True,
        "total_importadas": len(filas),
        "nuevas": len(filas) - actualizaciones,
        "actualizadas": actualizaciones,
        "mensaje": f"Importación completada: {len(filas) - actualizaciones} nuevas y {actualizaciones} actualizadas.",
    }

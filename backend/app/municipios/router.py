import csv
import io
import re
import unicodedata
import urllib.request
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.uploads import MAX_EXCEL_UPLOAD_BYTES, read_upload_limited
from backend.app.municipios.models import Municipio, MunicipioCodigoPostal
from backend.app.Utilidades.importadores.municipios_importer import (
    importar_excel_municipios,
)


# ============================================================
# ROUTER
# MOLSAN ERP
# ============================================================

router = APIRouter(
    prefix="/municipios",
    tags=["Municipios"],
    dependencies=[Depends(get_current_user)],
)


# ============================================================
# SCHEMAS
# ============================================================

class MunicipioBase(BaseModel):

    ccaa: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    provincia: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    municipio: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    # Optional para que clientes antiguos no borren los CP al editar.
    codigos_postales: Optional[List[str]] = None
    codigo_postal_principal: Optional[str] = None


class MunicipioCreate(MunicipioBase):
    pass


class MunicipioUpdate(MunicipioBase):
    pass


class MunicipioResponse(MunicipioBase):

    id: int
    activo: bool
    codigos_postales: List[str] = Field(default_factory=list)
    codigo_postal_principal: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True




URL_DATASET_CODIGOS_POSTALES = (
    "https://raw.githubusercontent.com/regi-es/"
    "ds-codigos-postales-ine-es/master/data/codigos_postales_municipios.csv"
)

PROVINCIAS_INE = {
    "01": ["Álava", "Araba"], "02": ["Albacete"],
    "03": ["Alicante", "Alacant"], "04": ["Almería"],
    "05": ["Ávila"], "06": ["Badajoz"],
    "07": ["Illes Balears", "Baleares", "Islas Baleares"],
    "08": ["Barcelona"], "09": ["Burgos"], "10": ["Cáceres"],
    "11": ["Cádiz"], "12": ["Castellón", "Castelló"],
    "13": ["Ciudad Real"], "14": ["Córdoba"],
    "15": ["A Coruña", "La Coruña"], "16": ["Cuenca"],
    "17": ["Girona", "Gerona"], "18": ["Granada"],
    "19": ["Guadalajara"], "20": ["Gipuzkoa", "Guipúzcoa"],
    "21": ["Huelva"], "22": ["Huesca"], "23": ["Jaén"],
    "24": ["León"], "25": ["Lleida", "Lérida"],
    "26": ["La Rioja", "Rioja"], "27": ["Lugo"],
    "28": ["Madrid"], "29": ["Málaga"], "30": ["Murcia"],
    "31": ["Navarra"], "32": ["Ourense", "Orense"],
    "33": ["Asturias"], "34": ["Palencia"],
    "35": ["Las Palmas"], "36": ["Pontevedra"],
    "37": ["Salamanca"], "38": ["Santa Cruz de Tenerife"],
    "39": ["Cantabria"], "40": ["Segovia"], "41": ["Sevilla"],
    "42": ["Soria"], "43": ["Tarragona"], "44": ["Teruel"],
    "45": ["Toledo"], "46": ["Valencia", "València"],
    "47": ["Valladolid"], "48": ["Bizkaia", "Vizcaya"],
    "49": ["Zamora"], "50": ["Zaragoza"],
    "51": ["Ceuta"], "52": ["Melilla"],
}


def clave_territorial(valor):
    texto = unicodedata.normalize("NFKD", str(valor or "").casefold())
    texto = "".join(caracter for caracter in texto if not unicodedata.combining(caracter))
    palabras = re.findall(r"[a-z0-9]+", texto)
    palabras = [palabra for palabra in palabras if palabra not in {"a", "la", "el", "los", "las", "de", "del", "l", "d"}]
    return " ".join(sorted(palabras))


# ============================================================
# LIMPIAR TEXTO
# ============================================================

def limpiar_texto(valor: str) -> str:

    if valor is None:
        return ""

    return " ".join(
        str(valor).strip().split()
    )


def validar_codigos_postales(valores, principal=None):
    """Normaliza códigos postales sin convertirlos a número."""
    codigos = []
    for valor in valores or []:
        cp = str(valor).strip()
        if not re.fullmatch(r"\d{5}", cp):
            raise HTTPException(
                status_code=400,
                detail=f"El código postal '{cp}' debe contener exactamente 5 dígitos.",
            )
        if cp not in codigos:
            codigos.append(cp)
    cp_principal = str(principal).strip() if principal else (codigos[0] if codigos else None)
    if cp_principal and cp_principal not in codigos:
        raise HTTPException(
            status_code=400,
            detail="El código postal principal debe estar incluido en la lista de códigos postales.",
        )
    return codigos, cp_principal


def sincronizar_codigos_postales(municipio, valores, principal=None):
    codigos, cp_principal = validar_codigos_postales(valores, principal)
    existentes = {registro.codigo_postal: registro for registro in municipio.codigos_postales}
    for registro in list(municipio.codigos_postales):
        if registro.codigo_postal not in codigos:
            municipio.codigos_postales.remove(registro)
    for cp in codigos:
        registro = existentes.get(cp)
        if registro is None:
            registro = MunicipioCodigoPostal(codigo_postal=cp, principal=(cp == cp_principal))
            municipio.codigos_postales.append(registro)
        else:
            registro.principal = cp == cp_principal
    if not codigos:
        municipio.codigos_postales.clear()


def serializar_municipio(municipio):
    codigos = sorted(municipio.codigos_postales, key=lambda item: (not item.principal, item.codigo_postal))
    return {
        "id": municipio.id,
        "ccaa": municipio.ccaa,
        "provincia": municipio.provincia,
        "municipio": municipio.municipio,
        "activo": municipio.activo,
        "codigos_postales": [item.codigo_postal for item in codigos],
        "codigo_postal_principal": next((item.codigo_postal for item in codigos if item.principal), None),
    }


# ============================================================
# GET /api/municipios
# ============================================================

@router.get(
    "",
    response_model=List[MunicipioResponse],
)
def listar_municipios(
    db: Session = Depends(get_db),
):

    municipios = (
        db.query(Municipio)
        .filter(
            Municipio.activo.is_(True)
        )
        .order_by(
            Municipio.ccaa.asc(),
            Municipio.provincia.asc(),
            Municipio.municipio.asc(),
        )
        .all()
    )

    return [
        serializar_municipio(municipio)
        for municipio in municipios
    ]


# ============================================================
# POST /api/municipios
# ============================================================

@router.post(
    "",
    response_model=MunicipioResponse,
)
def crear_municipio(
    datos: MunicipioCreate,
    db: Session = Depends(get_db),
):

    ccaa = limpiar_texto(
        datos.ccaa
    )

    provincia = limpiar_texto(
        datos.provincia
    )

    municipio_nombre = limpiar_texto(
        datos.municipio
    )

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not ccaa:

        raise HTTPException(
            status_code=400,
            detail="La comunidad autónoma es obligatoria.",
        )

    if not provincia:

        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria.",
        )

    if not municipio_nombre:

        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio.",
        )

    # --------------------------------------------------------
    # BUSCAR EXISTENTE
    # --------------------------------------------------------

    existente = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == municipio_nombre,
        )
        .first()
    )

    # --------------------------------------------------------
    # REACTIVAR SI EXISTÍA INACTIVO
    # --------------------------------------------------------

    if existente:

        if not existente.activo:

            existente.activo = True
            if datos.codigos_postales is not None:
                sincronizar_codigos_postales(
                    existente,
                    datos.codigos_postales,
                    datos.codigo_postal_principal,
                )

            try:

                db.commit()

                db.refresh(
                    existente
                )

            except Exception as exc:

                db.rollback()

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "No se pudo reactivar el municipio: "
                        f"{exc}"
                    ),
                )

            return serializar_municipio(existente)

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe un municipio con "
                "la misma comunidad autónoma, "
                "provincia y municipio."
            ),
        )

    # --------------------------------------------------------
    # CREAR
    # --------------------------------------------------------

    nuevo = Municipio(
        ccaa=ccaa,
        provincia=provincia,
        municipio=municipio_nombre,
        activo=True,
    )

    try:

        db.add(
            nuevo
        )
        db.flush()
        if datos.codigos_postales is not None:
            sincronizar_codigos_postales(nuevo, datos.codigos_postales, datos.codigo_postal_principal)

        db.commit()

        db.refresh(
            nuevo
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"No se pudo crear el municipio: {exc}"
            ),
        )

    return serializar_municipio(nuevo)


# ============================================================
# POST /api/municipios/importar-codigos-postales
# Carga masiva desde la relación pública derivada de datos abiertos del INE.
# No crea ni renombra municipios: solo enlaza códigos a registros existentes.
# ============================================================

@router.post("/importar-codigos-postales")
def importar_codigos_postales_nacionales(db: Session = Depends(get_db)):
    try:
        solicitud = urllib.request.Request(
            URL_DATASET_CODIGOS_POSTALES,
            headers={"User-Agent": "MOLSAN-ERP/2027", "Accept": "text/csv"},
        )
        with urllib.request.urlopen(solicitud, timeout=45) as respuesta:
            contenido = respuesta.read(25 * 1024 * 1024 + 1)
        if len(contenido) > 25 * 1024 * 1024:
            raise HTTPException(status_code=502, detail="El fichero de códigos postales supera el tamaño permitido.")
        texto_csv = contenido.decode("utf-8-sig")
        lector = csv.DictReader(io.StringIO(texto_csv))
        columnas = {str(nombre or "").strip().lower() for nombre in (lector.fieldnames or [])}
        if not {"codigo_postal", "municipio_id", "municipio_nombre"}.issubset(columnas):
            raise HTTPException(status_code=502, detail="El fichero de códigos postales no tiene el formato esperado.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"No se pudo descargar el catálogo nacional de códigos postales: {exc}") from exc

    registros = db.query(Municipio).filter(Municipio.activo.is_(True)).all()
    por_nombre = {}
    for registro in registros:
        clave = clave_territorial(registro.municipio)
        por_nombre.setdefault(clave, []).append(registro)

    codigos_por_municipio = {}
    filas_fuente = 0
    filas_invalidas = 0
    municipios_no_encontrados = 0
    municipios_ambiguos = 0
    for fila in lector:
        filas_fuente += 1
        cp = str(fila.get("codigo_postal") or "").strip()
        ine = str(fila.get("municipio_id") or "").strip().zfill(5)
        nombre = str(fila.get("municipio_nombre") or "").strip()
        if not re.fullmatch(r"\d{5}", cp) or not re.fullmatch(r"\d{5}", ine) or ine[:2] not in PROVINCIAS_INE or not nombre:
            filas_invalidas += 1
            continue
        clave_nombre = clave_territorial(nombre)
        candidatas = por_nombre.get(clave_nombre, [])
        provincias_validas = {clave_territorial(p) for p in PROVINCIAS_INE[ine[:2]]}
        candidatas = [m for m in candidatas if clave_territorial(m.provincia) in provincias_validas]
        if not candidatas:
            municipios_no_encontrados += 1
            continue
        if len(candidatas) > 1:
            municipios_ambiguos += 1
            continue
        municipio = candidatas[0]
        codigos_por_municipio.setdefault(municipio.id, {"municipio": municipio, "codigos": set()})["codigos"].add(cp)

    relaciones_nuevas = 0
    municipios_actualizados = 0
    try:
        for datos in codigos_por_municipio.values():
            municipio = datos["municipio"]
            codigos = datos["codigos"]
            existentes = {registro.codigo_postal: registro for registro in municipio.codigos_postales}
            principal_existente = next((registro.codigo_postal for registro in existentes.values() if registro.principal), None)
            hubo_cambio = False
            for cp in sorted(codigos):
                if cp in existentes:
                    continue
                registro = MunicipioCodigoPostal(codigo_postal=cp, principal=False)
                municipio.codigos_postales.append(registro)
                relaciones_nuevas += 1
                hubo_cambio = True
            if principal_existente is None and (existentes or codigos):
                principal_nuevo = min(set(existentes.keys()) | codigos)
                for registro in municipio.codigos_postales:
                    registro.principal = registro.codigo_postal == principal_nuevo
            if hubo_cambio:
                municipios_actualizados += 1
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudieron guardar los códigos postales: {exc}") from exc

    return {
        "ok": True,
        "fuente": "Dataset de códigos postales derivado de datos abiertos del INE",
        "filas_fuente": filas_fuente,
        "filas_invalidas": filas_invalidas,
        "municipios_no_encontrados_en_catalogo": municipios_no_encontrados,
        "coincidencias_ambiguas_omitidas": municipios_ambiguos,
        "municipios_con_coincidencia": len(codigos_por_municipio),
        "municipios_actualizados": municipios_actualizados,
        "relaciones_nuevas": relaciones_nuevas,
        "nota": "Se conservaron los códigos postales principales ya definidos. Solo se añadieron códigos para municipios existentes con coincidencia inequívoca de nombre y provincia.",
    }


# ============================================================
# POST /api/municipios/importar-excel
#
# IMPORTANTE:
# Esta ruta va antes de /{municipio_id}
# ============================================================

@router.post(
    "/importar-excel"
)
async def importar_municipios_excel(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    # ========================================================
    # VALIDAR NOMBRE DEL ARCHIVO
    # ========================================================

    nombre = (
        fichero.filename or ""
    ).strip().lower()

    if not (
        nombre.endswith(".xlsx")
        or nombre.endswith(".xls")
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "El archivo debe ser un Excel "
                "con extensión .xlsx o .xls."
            ),
        )

    # ========================================================
    # LEER ARCHIVO
    # ========================================================

    try:

        contenido = await read_upload_limited(
            fichero,
            MAX_EXCEL_UPLOAD_BYTES,
            "Excel de municipios",
        )

    except HTTPException:
        raise
    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=(
                f"No se pudo leer el archivo: {exc}"
            ),
        )

    if not contenido:

        raise HTTPException(
            status_code=400,
            detail="El archivo Excel está vacío.",
        )

    # ========================================================
    # IMPORTAR
    # ========================================================

    try:

        resultado = importar_excel_municipios(
            contenido,
            db,
        )

        return resultado

    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Error durante la importación: {exc}"
            ),
        )


# ============================================================
# PUT /api/municipios/{municipio_id}
# ============================================================

@router.put(
    "/{municipio_id}",
    response_model=MunicipioResponse,
)
def actualizar_municipio(
    municipio_id: int,
    datos: MunicipioUpdate,
    db: Session = Depends(get_db),
):

    municipio_actual = (
        db.query(Municipio)
        .filter(
            Municipio.id == municipio_id
        )
        .first()
    )

    if not municipio_actual:

        raise HTTPException(
            status_code=404,
            detail="Municipio no encontrado.",
        )

    ccaa = limpiar_texto(
        datos.ccaa
    )

    provincia = limpiar_texto(
        datos.provincia
    )

    municipio_nombre = limpiar_texto(
        datos.municipio
    )

    # --------------------------------------------------------
    # VALIDACIONES
    # --------------------------------------------------------

    if not ccaa:

        raise HTTPException(
            status_code=400,
            detail="La comunidad autónoma es obligatoria.",
        )

    if not provincia:

        raise HTTPException(
            status_code=400,
            detail="La provincia es obligatoria.",
        )

    if not municipio_nombre:

        raise HTTPException(
            status_code=400,
            detail="El municipio es obligatorio.",
        )

    # --------------------------------------------------------
    # DUPLICADO
    # --------------------------------------------------------

    duplicado = (
        db.query(Municipio)
        .filter(
            Municipio.ccaa == ccaa,
            Municipio.provincia == provincia,
            Municipio.municipio == municipio_nombre,
            Municipio.id != municipio_id,
        )
        .first()
    )

    if duplicado:

        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe otro municipio con "
                "la misma comunidad autónoma, "
                "provincia y municipio."
            ),
        )

    # --------------------------------------------------------
    # ACTUALIZAR
    # --------------------------------------------------------

    municipio_actual.ccaa = ccaa
    municipio_actual.provincia = provincia
    municipio_actual.municipio = municipio_nombre
    municipio_actual.activo = True
    # Los clientes antiguos omiten estos campos; en ese caso se conservan los CP existentes.
    if datos.codigos_postales is not None:
        sincronizar_codigos_postales(
            municipio_actual,
            datos.codigos_postales,
            datos.codigo_postal_principal,
        )

    try:

        db.commit()

        db.refresh(
            municipio_actual
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"No se pudo actualizar el municipio: {exc}"
            ),
        )

    return serializar_municipio(municipio_actual)


# ============================================================
# DELETE /api/municipios/{municipio_id}
# ============================================================

@router.delete(
    "/{municipio_id}"
)
def eliminar_municipio(
    municipio_id: int,
    db: Session = Depends(get_db),
):

    municipio = (
        db.query(Municipio)
        .filter(
            Municipio.id == municipio_id
        )
        .first()
    )

    if not municipio:

        raise HTTPException(
            status_code=404,
            detail="Municipio no encontrado.",
        )

    try:

        # ----------------------------------------------------
        # BORRADO LÓGICO
        # ----------------------------------------------------

        municipio.activo = False

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"No se pudo eliminar el municipio: {exc}"
            ),
        )

    return {
        "ok": True,
        "mensaje": "Municipio eliminado correctamente.",
    }

import io
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import Column, ForeignKey, Integer, Table, and_, func, or_, text
from sqlalchemy.orm import Session
from openpyxl import Workbook

from backend.app.database import Base, get_db, engine
from backend.app.auth.dependencies import get_current_user
from backend.app.ctn.models import Notaria
from backend.app.ctn.service import obtener_notaria
from backend.app.ctn.schemas import NotariaResponse
from backend.app.agenda.models import Cita
from backend.app.expedientes.models import Expediente
from backend.app.utils.distancia import distancia_km, MOLSAN_LAT, MOLSAN_LNG
from backend.app.ctn.geocode import geocode_todas_notarias
from backend.app.ctn.migracion import agregar_coordenadas

router = APIRouter(
    prefix="/ctn",
    tags=["CTN"],
    # Todas las operaciones CTN requieren una sesión JWT válida.
    dependencies=[Depends(get_current_user)],
)


# ============================================================
# TABLA DE ASOCIACIONES RECÍPROCAS
# ============================================================
if "ctn_notarios_asociados" in Base.metadata.tables:
    notarios_asociados_table = Base.metadata.tables["ctn_notarios_asociados"]
else:
    notarios_asociados_table = Table(
        "ctn_notarios_asociados",
        Base.metadata,
        Column(
            "notario_id", Integer,
            ForeignKey("ctn_notarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        Column(
            "asociado_id", Integer,
            ForeignKey("ctn_notarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


@router.on_event("startup")
def crear_tabla_asociaciones_ctn():
    """Crea la tabla de asociaciones si falta; no borra datos existentes."""
    notarios_asociados_table.create(bind=engine, checkfirst=True)


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================
def _nombre_completo(notaria):
    partes = [getattr(notaria, "nombre", None) or "", getattr(notaria, "apellidos", None) or ""]
    return " ".join(parte.strip() for parte in partes if parte and parte.strip()).strip()


def _notaria_basica(notaria):
    data = NotariaResponse.from_orm(notaria).dict()
    data["nombre_completo"] = _nombre_completo(notaria)
    data["notargest_habilitado"] = bool(getattr(notaria, "notargest_habilitado", False))
    return data


def _asociaciones_de(db: Session, notaria_id: int):
    filas = (
        db.query(notarios_asociados_table.c.asociado_id)
        .filter(notarios_asociados_table.c.notario_id == notaria_id)
        .all()
    )
    ids = [fila[0] for fila in filas]
    if not ids:
        return []
    notarias = db.query(Notaria).filter(Notaria.id.in_(ids)).all()
    por_id = {notaria.id: notaria for notaria in notarias}
    return [
        {
            "id": por_id[ident].id,
            "nombre": por_id[ident].nombre,
            "apellidos": por_id[ident].apellidos,
            "nombre_completo": _nombre_completo(por_id[ident]),
            "nif": por_id[ident].nif,
        }
        for ident in ids
        if ident in por_id
    ]


def _notaria_con_asociaciones(db: Session, notaria):
    data = _notaria_basica(notaria)
    asociadas = _asociaciones_de(db, notaria.id)
    data["notarios_asociados"] = asociadas
    data["notario_asociado"] = ", ".join(
        item["nombre_completo"] or item["nif"] or str(item["id"])
        for item in asociadas
    )
    return data


def _condicion_videoconferencia():
    """Agrupa todos los valores históricos que representan VC.

    El importador antiguo guardaba VideoConferencia/Presencial, mientras
    que algunos Excels y el filtro de la UI utilizan SI/NO.
    """
    valor = func.lower(func.trim(func.coalesce(Notaria.vc, "")))
    return or_(
        valor.ilike("%videoconfer%"),
        valor.ilike("%video%confer%"),
        valor.in_(("si", "sí", "s", "yes", "true", "1", "vc", "video", "videoconference")),
    )


def _es_filtro_vc_positivo(valor: str) -> bool:
    normalizado = unicodedata.normalize("NFKD", valor.strip().lower())
    normalizado = "".join(c for c in normalizado if not unicodedata.combining(c))
    compacto = normalizado.replace(" ", "").replace("-", "").replace("_", "")
    return compacto in {"si", "s", "yes", "true", "1", "vc", "video", "videoconferencia", "videoconference"}


def _es_filtro_vc_negativo(valor: str) -> bool:
    normalizado = unicodedata.normalize("NFKD", valor.strip().lower())
    normalizado = "".join(c for c in normalizado if not unicodedata.combining(c))
    compacto = normalizado.replace(" ", "").replace("-", "").replace("_", "")
    return compacto in {"no", "n", "false", "0", "presencial"}


def _aplicar_filtros_notarias(
    db: Session,
    provincia=None,
    municipio=None,
    vc=None,
    apoderado=None,
    q=None,
    asociado=None,
):
    query = db.query(Notaria)

    if provincia and provincia.strip():
        query = query.filter(
            func.unaccent(func.coalesce(Notaria.provincia, "")).ilike(
                func.unaccent(f"%{provincia.strip()}%")
            )
        )

    if municipio and municipio.strip():
        query = query.filter(
            func.unaccent(func.coalesce(Notaria.municipio, "")).ilike(
                func.unaccent(f"%{municipio.strip()}%")
            )
        )

    if vc and vc.strip():
        filtro_vc = vc.strip()
        if _es_filtro_vc_positivo(filtro_vc):
            query = query.filter(_condicion_videoconferencia())
        elif _es_filtro_vc_negativo(filtro_vc):
            query = query.filter(~_condicion_videoconferencia())
        else:
            query = query.filter(
                func.lower(func.trim(func.coalesce(Notaria.vc, "")))
                == filtro_vc.lower()
            )

    if apoderado and apoderado.strip():
        termino_apoderado = f"%{apoderado.strip()}%"
        query = query.filter(
            func.unaccent(func.coalesce(Notaria.apoderado, "")).ilike(
                func.unaccent(termino_apoderado)
            )
        )

    if q and q.strip():
        # Buscar por palabras permite encontrar nombres compuestos aunque
        # nombre y apellidos estén guardados en columnas distintas.
        texto_busqueda = unicodedata.normalize("NFKD", q.strip().lower())
        texto_busqueda = "".join(
            caracter for caracter in texto_busqueda
            if not unicodedata.combining(caracter)
        )
        palabras = [
            palabra for palabra in texto_busqueda.split()
            if palabra not in {"notario", "notaria", "de", "del"}
        ]
        campos_busqueda = (
            func.unaccent(func.coalesce(Notaria.nombre, "")),
            func.unaccent(func.coalesce(Notaria.apellidos, "")),
            func.unaccent(func.coalesce(Notaria.nif, "")),
            func.unaccent(func.coalesce(Notaria.codigo, "")),
            func.unaccent(func.coalesce(Notaria.municipio, "")),
            func.unaccent(func.coalesce(Notaria.provincia, "")),
            func.unaccent(
                func.concat(
                    func.coalesce(Notaria.nombre, ""),
                    " ",
                    func.coalesce(Notaria.apellidos, ""),
                )
            ),
        )
        # Cada palabra puede aparecer en cualquier campo, y en cualquier orden.
        for palabra in palabras:
            termino = f"%{palabra}%"
            query = query.filter(
                or_(*[
                    campo.ilike(func.unaccent(termino))
                    for campo in campos_busqueda
                ])
            )

    if asociado and asociado.strip():
        termino_asociado = f"%{asociado.strip()}%"
        ids_coincidentes = (
            db.query(notarios_asociados_table.c.notario_id)
            .join(Notaria, Notaria.id == notarios_asociados_table.c.asociado_id)
            .filter(
                or_(
                    func.unaccent(func.coalesce(Notaria.nombre, "")).ilike(func.unaccent(termino_asociado)),
                    func.unaccent(func.coalesce(Notaria.apellidos, "")).ilike(func.unaccent(termino_asociado)),
                    func.unaccent(func.coalesce(Notaria.nif, "")).ilike(func.unaccent(termino_asociado)),
                )
            )
            .distinct()
            .subquery()
        )
        query = query.filter(Notaria.id.in_(db.query(ids_coincidentes.c.notario_id)))

    return query


def _clasificar_tipo_firma(tipo_firma):
    valor = unicodedata.normalize("NFKD", str(tipo_firma or ""))
    valor = "".join(c for c in valor if not unicodedata.combining(c)).strip().lower()
    compacto = valor.replace(" ", "").replace("-", "_").replace("_", "")
    if not valor:
        return "SIN_CLASIFICAR"
    if compacto in {"vc", "video", "videoconferencia", "videoconference"}:
        return "VC"
    if "videoconferencia" in compacto or "videoconference" in compacto:
        return "VC"
    if "presencial" in compacto or compacto in {"p", "fisica"}:
        return "PRESENCIAL"
    return "SIN_CLASIFICAR"


def _valor_fecha(valor):
    return valor.isoformat() if valor else None


def _distancia_de_notaria(notaria):
    try:
        lat = getattr(notaria, "lat", None)
        lng = getattr(notaria, "lng", None)
        if lat is None or lng is None:
            return None
        return distancia_km(MOLSAN_LAT, MOLSAN_LNG, float(lat), float(lng))
    except (TypeError, ValueError):
        return None


# ============================================================
# GEOCODIFICACIÓN Y MIGRACIÓN
# ============================================================
@router.post("/geocode/notarias")
def geocode_notarias(db: Session = Depends(get_db)):
    return geocode_todas_notarias(db)


@router.post("/migracion/agregar-coordenadas")
def migrar_coordenadas(db: Session = Depends(get_db)):
    return agregar_coordenadas(db)


# ============================================================
# LISTADO Y EXPORTACIÓN
# ============================================================
@router.get("/notarias")
def listar_notarias(
    provincia: str | None = None,
    municipio: str | None = None,
    vc: str | None = None,
    apoderado: str | None = None,
    q: str | None = None,
    asociado: str | None = Query(None, description="Filtra por nombre, apellidos o NIF del notario asociado"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = _aplicar_filtros_notarias(db, provincia, municipio, vc, apoderado, q, asociado)
    total = query.count()
    filas = (
        query.order_by(Notaria.apellidos.asc().nullslast(), Notaria.nombre.asc().nullslast())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for notaria in filas:
        data = _notaria_con_asociaciones(db, notaria)
        data["distancia_km"] = _distancia_de_notaria(notaria)
        items.append(data)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/exportar-excel")
def exportar_notarias_excel(
    provincia: str | None = None,
    municipio: str | None = None,
    vc: str | None = None,
    apoderado: str | None = None,
    q: str | None = None,
    asociado: str | None = None,
    db: Session = Depends(get_db),
):
    query = _aplicar_filtros_notarias(db, provincia, municipio, vc, apoderado, q, asociado)
    filas = query.order_by(Notaria.apellidos.asc().nullslast(), Notaria.nombre.asc().nullslast()).all()
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Notarías"
    hoja.append([
        "Código", "Nombre", "Apellidos", "NIF", "Teléfono", "Provincia", "Municipio",
        "CP", "Dirección", "Videoconferencia", "Apoderado", "Departamento cancelaciones",
        "Departamento copias", "Otros departamentos", "Notarios asociados", "Observaciones", "Distancia km",
    ])
    for notaria in filas:
        nombres_asociados = "; ".join(
            item["nombre_completo"] or item["nif"] or str(item["id"])
            for item in _asociaciones_de(db, notaria.id)
        )
        hoja.append([
            getattr(notaria, "codigo", None), getattr(notaria, "nombre", None),
            getattr(notaria, "apellidos", None), getattr(notaria, "nif", None),
            getattr(notaria, "telefono", None), getattr(notaria, "provincia", None),
            getattr(notaria, "municipio", None), getattr(notaria, "cp", None),
            getattr(notaria, "direccion", None), getattr(notaria, "vc", None),
            getattr(notaria, "apoderado", None), getattr(notaria, "departamento_cancelaciones", None),
            getattr(notaria, "departamento_copias", None), getattr(notaria, "otros_departamentos", None),
            nombres_asociados, getattr(notaria, "observacion", None), _distancia_de_notaria(notaria),
        ])
    hoja.freeze_panes = "A2"
    hoja.auto_filter.ref = hoja.dimensions
    for columna in hoja.columns:
        letra = columna[0].column_letter
        longitud_maxima = max((len(str(celda.value)) for celda in columna if celda.value is not None), default=10)
        hoja.column_dimensions[letra].width = min(max(longitud_maxima + 2, 12), 45)
    buffer = io.BytesIO()
    libro.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="notarias.xlsx"'},
    )


# ============================================================
# FICHA Y ASOCIACIONES RECÍPROCAS
# ============================================================
@router.get("/notarias/{notaria_id}")
def detalle_notaria(notaria_id: int, db: Session = Depends(get_db)):
    notaria = obtener_notaria(db, notaria_id)
    if notaria is None:
        raise HTTPException(status_code=404, detail="Notario no encontrado")
    return _notaria_con_asociaciones(db, notaria)


@router.get("/notarias/{notaria_id}/asociadas")
def listar_notarias_asociadas(notaria_id: int, db: Session = Depends(get_db)):
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    if notaria is None:
        raise HTTPException(status_code=404, detail="Notario no encontrado")
    return {"notaria_id": notaria_id, "items": _asociaciones_de(db, notaria_id)}


@router.post("/notarias/{notaria_id}/asociadas/{asociada_id}")
def asociar_notarios(notaria_id: int, asociada_id: int, db: Session = Depends(get_db)):
    if notaria_id == asociada_id:
        raise HTTPException(status_code=400, detail="Un notario no puede asociarse consigo mismo")
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    asociada = db.query(Notaria).filter(Notaria.id == asociada_id).first()
    if notaria is None or asociada is None:
        raise HTTPException(status_code=404, detail="No se ha encontrado uno de los notarios")
    try:
        for origen, destino in ((notaria_id, asociada_id), (asociada_id, notaria_id)):
            existe = (
                db.query(notarios_asociados_table.c.notario_id)
                .filter(and_(
                    notarios_asociados_table.c.notario_id == origen,
                    notarios_asociados_table.c.asociado_id == destino,
                ))
                .first()
            )
            if not existe:
                db.execute(notarios_asociados_table.insert().values(notario_id=origen, asociado_id=destino))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {
        "ok": True,
        "notario_id": notaria_id,
        "asociado": {"id": asociada.id, "nombre_completo": _nombre_completo(asociada), "nif": asociada.nif},
        "items": _asociaciones_de(db, notaria_id),
    }


@router.delete("/notarias/{notaria_id}/asociadas/{asociada_id}")
def desasociar_notarios(notaria_id: int, asociada_id: int, db: Session = Depends(get_db)):
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    asociada = db.query(Notaria).filter(Notaria.id == asociada_id).first()
    if notaria is None or asociada is None:
        raise HTTPException(status_code=404, detail="No se ha encontrado uno de los notarios")
    try:
        db.execute(notarios_asociados_table.delete().where(or_(
            and_(notarios_asociados_table.c.notario_id == notaria_id, notarios_asociados_table.c.asociado_id == asociada_id),
            and_(notarios_asociados_table.c.notario_id == asociada_id, notarios_asociados_table.c.asociado_id == notaria_id),
        )))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"ok": True, "notario_id": notaria_id, "asociada_id": asociada_id}


# ============================================================
# RESUMEN LEGADO DE CITAS DE AGENDA (NO SON FIRMAS REALIZADAS)
# ============================================================
@router.get("/notarias/{notaria_id}/firmas")
def obtener_resumen_citas_notario(notaria_id: int, db: Session = Depends(get_db)):
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    if notaria is None:
        raise HTTPException(status_code=404, detail="Notario no encontrado")
    total = db.query(func.count(Cita.id)).filter(Cita.notario_id == notaria_id).scalar() or 0
    total_vc = db.query(func.count(Cita.id)).filter(Cita.notario_id == notaria_id, Cita.tipo_cita == "VC").scalar() or 0
    total_presencial = db.query(func.count(Cita.id)).filter(Cita.notario_id == notaria_id, Cita.tipo_cita == "P").scalar() or 0
    return {
        "notaria_id": notaria_id,
        "total_firmas": total,
        "total_vc": total_vc,
        "total_presencial": total_presencial,
        "tipo_dato": "citas_agenda_no_firmas_realizadas",
    }


# ============================================================
# HISTÓRICO REAL DE FIRMAS: EXPEDIENTES CON FECHA_FIRMA
# ============================================================
@router.get("/notarias/{notaria_id}/firmas/historico")
def historico_firmas_notario(
    notaria_id: int,
    modalidad: str | None = Query(None, description="VC o PRESENCIAL"),
    q: str | None = None,
    db: Session = Depends(get_db),
):
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    if notaria is None:
        raise HTTPException(status_code=404, detail="Notario no encontrado")

    condiciones = [Expediente.fecha_firma.isnot(None)]
    # CORRECCIÓN: si hay NIF, se filtra por NIF; solo se usa el nombre como fallback si no hay NIF.
    nif_notaria = (notaria.nif or "").strip()
    if nif_notaria:
        condiciones.append(
            func.lower(func.trim(func.coalesce(Expediente.nif_notario, ""))) == nif_notaria.lower()
        )
    else:
        nombre = _nombre_completo(notaria)
        if not nombre:
            return {
                "notaria_id": notaria_id, "notario": "", "nif_notario": notaria.nif,
                "items": [], "total": 0, "total_vc": 0, "total_presencial": 0,
                "total_sin_clasificar": 0,
            }
        condiciones.append(or_(
            func.lower(func.trim(func.coalesce(Expediente.nombre_notario, ""))) == nombre.lower(),
            func.lower(func.trim(func.coalesce(Expediente.notario, ""))) == nombre.lower(),
        ))

    expedientes = (
        db.query(Expediente).filter(*condiciones)
        .order_by(Expediente.fecha_firma.desc(), Expediente.id.desc()).all()
    )
    modalidad_filtro = (modalidad or "").strip().upper()
    if modalidad_filtro not in {"", "VC", "VIDEOCONFERENCIA", "P", "PRESENCIAL"}:
        raise HTTPException(status_code=400, detail="Modalidad debe ser VC o PRESENCIAL")

    items = []
    for expediente in expedientes:
        tipo = _clasificar_tipo_firma(getattr(expediente, "tipo_firma", None))
        if modalidad_filtro in {"VC", "VIDEOCONFERENCIA"} and tipo != "VC":
            continue
        if modalidad_filtro in {"P", "PRESENCIAL"} and tipo != "PRESENCIAL":
            continue
        campos_busqueda = [
            getattr(expediente, "id_expediente", None), getattr(expediente, "nombre_titular", None),
            getattr(expediente, "nif_titular", None), getattr(expediente, "nombre_solicitante", None),
            getattr(expediente, "nif_solicitante", None), getattr(expediente, "protocolo", None),
            getattr(expediente, "oficina", None),
        ]
        if q and q.strip():
            texto_busqueda = " ".join(str(v or "") for v in campos_busqueda).lower()
            if q.strip().lower() not in texto_busqueda:
                continue
        items.append({
            "id": expediente.id,
            "id_expediente": getattr(expediente, "id_expediente", None),
            "fecha_firma": _valor_fecha(getattr(expediente, "fecha_firma", None)),
            "tipo_firma": getattr(expediente, "tipo_firma", None),
            "modalidad": tipo,
            "protocolo": getattr(expediente, "protocolo", None),
            "nombre_titular": getattr(expediente, "nombre_titular", None),
            "nif_titular": getattr(expediente, "nif_titular", None),
            "nombre_solicitante": getattr(expediente, "nombre_solicitante", None),
            "nif_solicitante": getattr(expediente, "nif_solicitante", None),
            "oficina": getattr(expediente, "oficina", None),
            "capital": getattr(expediente, "capital", None),
            "importe": getattr(expediente, "importe", None),
            "estado_expediente": getattr(expediente, "estado_expediente", None),
            "observaciones": getattr(expediente, "observaciones", None),
        })

    return {
        "notaria_id": notaria_id,
        "notario": _nombre_completo(notaria),
        "nif_notario": notaria.nif,
        "items": items,
        "total": len(items),
        "total_vc": sum(1 for item in items if item["modalidad"] == "VC"),
        "total_presencial": sum(1 for item in items if item["modalidad"] == "PRESENCIAL"),
        "total_sin_clasificar": sum(1 for item in items if item["modalidad"] == "SIN_CLASIFICAR"),
    }


# ACCESO INDIVIDUAL A NOTARGEST
@router.on_event("startup")
def migrar_columna_acceso_notargest():
    """Añade el indicador de acceso sin modificar los datos CTN existentes."""
    with engine.begin() as conexion:
        conexion.execute(text(
            "ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS "
            "notargest_habilitado BOOLEAN NOT NULL DEFAULT FALSE"
        ))


@router.put("/notarias/{notaria_id}/notargest")
def cambiar_acceso_notargest(
    notaria_id: int,
    habilitado: bool = Query(...),
    db: Session = Depends(get_db),
):
    """Habilita o revoca el acceso al portal para una notaría concreta."""
    notaria = db.query(Notaria).filter(Notaria.id == notaria_id).first()
    if not notaria:
        raise HTTPException(status_code=404, detail="Notaría no encontrada")
    notaria.notargest_habilitado = bool(habilitado)
    db.commit()
    db.refresh(notaria)
    return {
        "ok": True,
        "notaria_id": notaria.id,
        "habilitado": bool(notaria.notargest_habilitado),
        "mensaje": "Acceso a NotarGest habilitado" if habilitado else "Acceso a NotarGest deshabilitado",
    }

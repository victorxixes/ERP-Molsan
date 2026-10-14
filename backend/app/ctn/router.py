
import io
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    Table,
    and_,
    func,
    or_,
)
from sqlalchemy.orm import Session
from openpyxl import Workbook

from backend.app.database import Base, get_db
from backend.app.ctn.models import Notaria
from backend.app.ctn.service import obtener_notaria
from backend.app.ctn.schemas import NotariaResponse
from backend.app.agenda.models import Cita
from backend.app.expedientes.models import Expediente
from backend.app.utils.distancia import (
    distancia_km,
    MOLSAN_LAT,
    MOLSAN_LNG,
)
from backend.app.ctn.geocode import geocode_todas_notarias
from backend.app.ctn.migracion import agregar_coordenadas

router = APIRouter(prefix="/ctn", tags=["CTN"])


# ============================================================
# TABLA DE ASOCIACIONES RECÍPROCAS
# ============================================================

if "ctn_notarios_asociados" in Base.metadata.tables:
    notarios_asociados_table = Base.metadata.tables[
        "ctn_notarios_asociados"
    ]
else:
    notarios_asociados_table = Table(
        "ctn_notarios_asociados",
        Base.metadata,
        Column(
            "notario_id",
            Integer,
            ForeignKey("ctn_notarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        Column(
            "asociado_id",
            Integer,
            ForeignKey("ctn_notarios.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


# ============================================================
# HELPERS
# ============================================================

def _nombre_completo(notaria):
    return " ".join(
        parte.strip()
        for parte in (
            getattr(notaria, "nombre", None) or "",
            getattr(notaria, "apellidos", None) or "",
        )
        if parte and parte.strip()
    ).strip()


def _notaria_basica(notaria):
    data = NotariaResponse.from_orm(notaria).dict()
    data["nombre_completo"] = _nombre_completo(notaria)
    return data


def _asociaciones_de(db: Session, notaria_id: int):
    filas = (
        db.query(notarios_asociados_table.c.asociado_id)
        .filter(
            notarios_asociados_table.c.notario_id == notaria_id
        )
        .all()
    )

    ids = [fila[0] for fila in filas]

    if not ids:
        return []

    notarias = (
        db.query(Notaria)
        .filter(Notaria.id.in_(ids))
        .all()
    )

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
            func.unaccent(
                func.coalesce(Notaria.provincia, "")
            ).ilike(func.unaccent(f"%{provincia.strip()}%"))
        )

    if municipio and municipio.strip():
        query = query.filter(
            func.unaccent(
                func.coalesce(Notaria.municipio, "")
            ).ilike(func.unaccent(f"%{municipio.strip()}%"))
        )

    if vc and vc.strip():
        query = query.filter(Notaria.vc == vc.strip())

    if apoderado and apoderado.strip():
        termino_apoderado = f"%{apoderado.strip()}%"
        query = query.filter(
            func.unaccent(
                func.coalesce(Notaria.apoderado, "")
            ).ilike(func.unaccent(termino_apoderado))
        )

    if q and q.strip():
        termino = f"%{q.strip()}%"
        query = query.filter(
            or_(
                func.unaccent(
                    func.coalesce(Notaria.nombre, "")
                ).ilike(func.unaccent(termino)),
                func.unaccent(
                    func.coalesce(Notaria.apellidos, "")
                ).ilike(func.unaccent(termino)),
                func.unaccent(
                    func.coalesce(Notaria.nif, "")
                ).ilike(func.unaccent(termino)),
                func.unaccent(
                    func.coalesce(Notaria.codigo, "")
                ).ilike(func.unaccent(termino)),
                func.unaccent(
                    func.coalesce(Notaria.municipio, "")
                ).ilike(func.unaccent(termino)),
                func.unaccent(
                    func.coalesce(Notaria.provincia, "")
                ).ilike(func.unaccent(termino)),
            )
        )

    # Buscar notarías asociadas por nombre, apellidos o NIF.
    # La búsqueda se ejecuta en la base de datos y abarca todas
    # las páginas, no solo los elementos visibles en el frontend.
    if asociado and asociado.strip():
        termino_asociado = f"%{asociado.strip()}%"

        ids_coincidentes = (
            db.query(notarios_asociados_table.c.notario_id)
            .join(
                Notaria,
                Notaria.id
                == notarios_asociados_table.c.asociado_id,
            )
            .filter(
                or_(
                    func.unaccent(
                        func.coalesce(Notaria.nombre, "")
                    ).ilike(func.unaccent(termino_asociado)),
                    func.unaccent(
                        func.coalesce(Notaria.apellidos, "")
                    ).ilike(func.unaccent(termino_asociado)),
                    func.unaccent(
                        func.coalesce(Notaria.nif, "")
                    ).ilike(func.unaccent(termino_asociado)),
                )
            )
            .distinct()
            .subquery()
        )

        query = query.filter(
            Notaria.id.in_(
                db.query(ids_coincidentes.c.notario_id)
            )
        )

    return query


def _clasificar_tipo_firma(tipo_firma):
    valor = unicodedata.normalize(
        "NFKD",
        str(tipo_firma or ""),
    )
    valor = "".join(
        caracter
        for caracter in valor
        if not unicodedata.combining(caracter)
    ).strip().lower()

    compacto = (
        valor.replace(" ", "")
        .replace("-", "_")
        .replace("_", "")
    )

    if not valor:
        return "SIN_CLASIFICAR"

    if compacto in {
        "vc",
        "video",
        "videoconferencia",
        "videoconference",
    }:
        return "VC"

    if (
        "videoconferencia" in compacto
        or "videoconference" in compacto
    ):
        return "VC"

    if "presencial" in compacto or compacto in {"p", "fisica"}:
        return "PRESENCIAL"

    return "SIN_CLASIFICAR"


def _valor_fecha(valor):
    return valor.isoformat() if valor else None


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
# LISTADO DE NOTARÍAS
# ============================================================

@router.get("/notarias")
def listar_notarias(
    provincia: str | None = None,
    municipio: str | None = None,
    vc: str | None = None,
    apoderado: str | None = None,
    q: str | None = None,
    asociado: str | None = Query(
        None,
        description=(
            "Filtra por nombre, apellidos o NIF "
            "del notario asociado"
        ),
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = _aplicar_filtros_notarias(
        db=db,
        provincia=provincia,
        municipio=municipio,
        vc=vc,
        apoderado=apoderado,
        q=q,
        asociado=asociado,
    )

    total = query.count()

    filas = (
        query.order_by(
            Notaria.apellidos.asc().nullslast(),
            Notaria.nombre.asc().nullslast(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []

    for notaria in filas:
        data = _notaria_con_asociaciones(db, notaria)

        try:
            lat = getattr(notaria, "lat", None)
            lng = getattr(notaria, "lng", None)

            data["distancia_km"] = (
                distancia_km(
                    MOLSAN_LAT,
                    MOLSAN_LNG,
                    float(lat),
                    float(lng),
                )
                if lat is not None and lng is not None
                else None
            )
        except (TypeError, ValueError):
            data["distancia_km"] = None

        items.append(data)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ============================================================
# EXPORTACIÓN EXCEL
# ============================================================

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
    query = _aplicar_filtros_notarias(
        db=db,
        provincia=provincia,
        municipio=municipio,
        vc=vc,
        apoderado=apoderado,
        q=q,
        asociado=asociado,
    )

    filas = (
        query.order_by(
            Notaria.apellidos.asc().nullslast(),
            Notaria.nombre.asc().nullslast(),
        )
        .all()
    )

    libro = Workbook()
    hoja = libro.active
    hoja.title = "Notarías"

    hoja.append([
        "Código",
        "Nombre",
        "Apellidos",
        "NIF",
        "Teléfono",
        "Provincia",
        "Municipio",
        "CP",
        "Dirección",
        "Videoconferencia",
        "Apoderado",
        "Departamento cancelaciones",
        "Departamento copias",
        "Otros departamentos",
        "Notarios asociados",
        "Observaciones",
        "Distancia km",
    ])

    for notaria in filas:
        asociados = _asociaciones_de(db, notaria.id)

        nombres_asociados = "; ".join(
            item["nombre_completo"] or item["nif"] or str(item["id"])
            for item in asociados
        )

        try:
            lat = getattr(notaria, "lat", None)
            lng = getattr(notaria, "lng", None)

            distancia = (
                distancia_km(
                    MOLSAN_LAT,
                    MOLSAN_LNG,
                    float(lat),
                    float(lng),
                )
                if lat is not None and lng is not None
                else None
            )
        except (TypeError, ValueError):
            distancia = None

        hoja.append([
            getattr(notaria, "codigo", None),
            getattr(notaria, "nombre", None),
            getattr(notaria, "apellidos", None),
            getattr(notaria, "nif", None),
            getattr(notaria, "telefono", None),
            getattr(notaria, "provincia", None),
            getattr(notaria, "municipio", None),
            getattr(notaria, "cp", None),
            getattr(notaria, "direccion", None),
            getattr(notaria, "vc", None),
            getattr(notaria, "apoderado", None),
            getattr(notaria, "departamento_cancelaciones", None),
            getattr(notaria, "departamento_copias", None),
            getattr(notaria, "otros_departamentos", None),
            nombres_asociados,
            getattr(notaria, "observacion", None),
            distancia,
        ])

    hoja.freeze_panes = "A2"
    hoja.auto_filter.ref = hoja.dimensions

    for columna in hoja.columns:
        letra = columna[0].column_letter
        longitud_maxima = max(
            (
                len(str(celda.value))
                for celda in columna
                if celda.value is not None
            ),
            default=10,
        )
        hoja.column_dimensions[letra].width = min(
            max(longitud_maxima + 2, 12),
            45,
        )

    buffer = io.BytesIO()
    libro.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                'attachment; filename="notarias.xlsx"'
            )
        },
    )


# ============================================================
# FICHA DE NOTARÍA
# ============================================================

@router.get("/notarias/{notaria_id}")
def detalle_notaria(
    notaria_id: int,
    db: Session = Depends(get_db),
):
    notaria = obtener_notaria(db, notaria_id)

    if notaria is None:
        raise HTTPException(
            status_code=404,
            detail="Notario no encontrado",
        )

    return _notaria_con_asociaciones(db, notaria)


# ============================================================
# ASOCIACIONES RECÍPROCAS
# ============================================================

@router.get("/notarias/{notaria_id}/asociadas")
def listar_notarias_asociadas(
    notaria_id: int,
    db: Session = Depends(get_db),
):
    notaria = (
        db.query(Notaria)
        .filter(Notaria.id == notaria_id)
        .first()
    )

    if notaria is None:
        raise HTTPException(
            status_code=404,
            detail="Notario no encontrado",
        )

    return {
        "notaria_id": notaria_id,
        "items": _asociaciones_de(db, notaria_id),
    }


@router.post("/notarias/{notaria_id}/asociadas/{asociada_id}")
def asociar_notarios(
    notaria_id: int,
    asociada_id: int,
    db: Session = Depends(get_db),
):
    if notaria_id == asociada_id:
        raise HTTPException(
            status_code=400,
            detail="Un notario no puede asociarse consigo mismo",
        )

    notaria = (
        db.query(Notaria)
        .filter(Notaria.id == notaria_id)
        .first()
    )
    asociada = (
        db.query(Notaria)
        .filter(Notaria.id == asociada_id)
        .first()
    )

    if notaria is None or asociada is None:
        raise HTTPException(
            status_code=404,
            detail="No se ha encontrado uno de los notarios",
        )

    try:
        # Guardar las dos direcciones garantiza que la asociación
        # aparezca en las dos fichas.
        for origen, destino in (
            (notaria_id, asociada_id),
            (asociada_id, notaria_id),
        ):
            existe = (
                db.query(notarios_asociados_table.c.notario_id)
                .filter(
                    and_(
                        notarios_asociados_table.c.notario_id == origen,
                        notarios_asociados_table.c.asociado_id == destino,
                    )
                )
                .first()
            )

            if not existe:
                db.execute(
                    notarios_asociados_table.insert().values(
                        notario_id=origen,
                        asociado_id=destino,
                    )
                )

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "ok": True,
        "notario_id": notaria_id,
        "asociado": {
            "id": asociada.id,
            "nombre_completo": _nombre_completo(asociada),
            "nif": asociada.nif,
        },
        "items": _asociaciones_de(db, notaria_id),
    }


@router.delete("/notarias/{notaria_id}/asociadas/{asociada_id}")
def desasociar_notarios(
    notaria_id: int,
    asociada_id: int,
    db: Session = Depends(get_db),
):
    notaria = (
        db.query(Notaria)
        .filter(Notaria.id == notaria_id)
        .first()
    )
    asociada = (
        db.query(Notaria)
        .filter(Notaria.id == asociada_id)
        .first()
    )

    if notaria is None or asociada is None:
        raise HTTPException(
            status_code=404,
            detail="No se ha encontrado uno de los notarios",
        )

    try:
        db.execute(
            notarios_asociados_table.delete().where(
                or_(
                    and_(
                        notarios_asociados_table.c.notario_id == notaria_id,
                        notarios_asociados_table.c.asociado_id == asociada_id,
                    ),
                    and_(
                        notarios_asociados_table.c.notario_id == asociada_id,
                        notarios_asociados_table.c.asociado_id == notaria_id,
                    ),
                )
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "ok": True,
        "notario_id": notaria_id,
        "asociada_id": asociada_id,
    }


# ============================================================
# RESUMEN LEGADO DE CITAS DE AGENDA
# IMPORTANTE: NO SON FIRMAS REALIZADAS.
# ============================================================

@router.get("/notarias/{notaria_id}/firmas")
def obtener_resumen_citas_notario(
    notaria_id: int,
    db: Session = Depends(get_db),
):
    notaria = (
        db.query(Notaria)
        .filter(Notaria.id == notaria_id)
        .first()
    )

    if notaria is None:
        raise HTTPException(
            status_code=404,
            detail="Notario no encontrado",
        )

    total = (
        db.query(func.count(Cita.id))
        .filter(Cita.notario_id == notaria_id)
        .scalar()
        or 0
    )

    total_vc = (
        db.query(func.count(Cita.id))
        .filter(
            Cita.notario_id == notaria_id,
            Cita.tipo_cita == "VC",
        )
        .scalar()
        or 0
    )

    total_presencial = (
        db.query(func.count(Cita.id))
        .filter(
            Cita.notario_id == notaria_id,
            Cita.tipo_cita == "P",
        )
        .scalar()
        or 0
    )

    return {
        "notaria_id": notaria_id,
        "total_firmas": total,
        "total_vc": total_vc,
        "total_presencial": total_presencial,
        "tipo_dato": "citas_agenda_no_firmas_realizadas",
    }


# ============================================================
# HISTÓRICO REAL DE FIRMAS
# Solo expedientes con fecha_firma informada.
# No consulta Cita.
# ============================================================

@router.get("/notarias/{notaria_id}/firmas/historico")
def historico_firmas_notario(
    notaria_id: int,
    modalidad: str | None = Query(
        None,
        description="VC o PRESENCIAL",
    ),
    q: str | None = None,
    db: Session = Depends(get_db),
):
    notaria = (
        db.query(Notaria)
        .filter(Notaria.id == notaria_id)
        .first()
    )

    if notaria is None:
        raise HTTPException(
            status_code=404,
            detail="Notario no encontrado",
        )

    condiciones = [Expediente.fecha_firma.isnot(None)]

    if notaria.nif and notaria.nif.strip():
        condiciones.append(
            func.lower(
                func.trim(
                    func.coalesce(Expediente.nif_notario, "")
                )
            )
            == notaria.nif.strip().lower()
        )
    else:
        nombre = _nombre_completo(notaria)

        if not nombre:
            return {
                "notaria_id": notaria_id,
                "notario": "",
                "nif_notario": notaria.nif,
                "items": [],
                "total": 0,
                "total_vc": 0,
                "total_presencial": 0,
                "total_sin_clasificar": 0,
            }

        condiciones.append(
            or_(
                func.lower(
                    func.trim(
                        func.coalesce(Expediente.nombre_notario, "")
                    )
                ) == nombre.lower(),
                func.lower(
                    func.trim(
                        func.coalesce(Expediente.notario, "")
                    )
                ) == nombre.lower(),
            )
        )

    expedientes = (
        db.query(Expediente)
        .filter(*condiciones)
        .order_by(
            Expediente.fecha_firma.desc(),
            Expediente.id.desc(),
        )
        .all()
    )

    modalidad_filtro = (modalidad or "").strip().upper()

    if modalidad_filtro not in {
        "",
        "VC",
        "VIDEOCONFERENCIA",
        "P",
        "PRESENCIAL",
    }:
        raise HTTPException(
            status_code=400,
            detail="Modalidad debe ser VC o PRESENCIAL",
        )

    items = []

    for expediente in expedientes:
        tipo = _clasificar_tipo_firma(
            getattr(expediente, "tipo_firma", None)
        )

        if modalidad_filtro in {"VC", "VIDEOCONFERENCIA"}:
            if tipo != "VC":
                continue

        if modalidad_filtro in {"P", "PRESENCIAL"}:
            if tipo != "PRESENCIAL":
                continue

        campos_busqueda = [
            getattr(expediente, "id_expediente", None),
            getattr(expediente, "nombre_titular", None),
            getattr(expediente, "nif_titular", None),
            getattr(expediente, "nombre_solicitante", None),
            getattr(expediente, "nif_solicitante", None),
            getattr(expediente, "protocolo", None),
            getattr(expediente, "oficina", None),
        ]

        if q and q.strip():
            texto_busqueda = " ".join(
                str(valor or "")
                for valor in campos_busqueda
            ).lower()

            if q.strip().lower() not in texto_busqueda:
                continue

        items.append({
            "id": expediente.id,
            "id_expediente": getattr(
                expediente, "id_expediente", None
            ),
            "fecha_firma": _valor_fecha(
                getattr(expediente, "fecha_firma", None)
            ),
            "tipo_firma": getattr(
                expediente, "tipo_firma", None
            ),
            "modalidad": tipo,
            "protocolo": getattr(
                expediente, "protocolo", None
            ),
            "nombre_titular": getattr(
                expediente, "nombre_titular", None
            ),
            "nif_titular": getattr(
                expediente, "nif_titular", None
            ),
            "nombre_solicitante": getattr(
                expediente, "nombre_solicitante", None
            ),
            "nif_solicitante": getattr(
                expediente, "nif_solicitante", None
            ),
            "oficina": getattr(
                expediente, "oficina", None
            ),
            "capital": getattr(
                expediente, "capital", None
            ),
            "importe": getattr(
                expediente, "importe", None
            ),
            "estado_expediente": getattr(
                expediente, "estado_expediente", None
            ),
            "observaciones": getattr(
                expediente, "observaciones", None
            ),
        })

    return {
        "notaria_id": notaria_id,
        "notario": _nombre_completo(notaria),
        "nif_notario": notaria.nif,
        "items": items,
        "total": len(items),
        "total_vc": sum(
            1 for item in items
            if item["modalidad"] == "VC"
        ),
        "total_presencial": sum(
            1 for item in items
            if item["modalidad"] == "PRESENCIAL"
        ),
        "total_sin_clasificar": sum(
            1 for item in items
            if item["modalidad"] == "SIN_CLASIFICAR"
        ),
    }

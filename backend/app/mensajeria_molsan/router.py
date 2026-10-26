from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/mensajeria", tags=["Mensajería Molsan"])


def _ensure_tables(db: Session):
    """Tablas auxiliares propias del módulo; creación idempotente y sin tocar datos existentes."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS mensajeria_servicios (
            id SERIAL PRIMARY KEY, codigo VARCHAR(40) UNIQUE, nombre VARCHAR(160) NOT NULL,
            descripcion TEXT, modalidad VARCHAR(80), tarifa_base NUMERIC(12,2),
            suplemento NUMERIC(12,2) NOT NULL DEFAULT 0, tipo_impuesto VARCHAR(20),
            porcentaje_impuesto NUMERIC(6,3), codigo_proveedor VARCHAR(80),
            condiciones TEXT, vigente_desde DATE, vigente_hasta DATE,
            activo BOOLEAN NOT NULL DEFAULT TRUE, creado_en TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS mensajeria_solicitudes (
            id SERIAL PRIMARY KEY, referencia VARCHAR(30) UNIQUE,
            solicitante_id INTEGER, solicitante_nombre VARCHAR(180) NOT NULL,
            origen TEXT NOT NULL, destino TEXT NOT NULL, fecha_solicitada DATE,
            prioridad VARCHAR(20) NOT NULL DEFAULT 'Normal', descripcion TEXT,
            expediente_id VARCHAR(100), contacto_origen VARCHAR(180),
            contacto_destino VARCHAR(180), telefono_destino VARCHAR(80),
            servicio_id INTEGER REFERENCES mensajeria_servicios(id) ON DELETE SET NULL,
            responsable VARCHAR(180), estado VARCHAR(40) NOT NULL DEFAULT 'Pendiente',
            estado_proveedor VARCHAR(120), incidencia TEXT, coste_previsto NUMERIC(12,2),
            creado_en TIMESTAMP NOT NULL DEFAULT NOW(), actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS mensajeria_albaranes (
            id SERIAL PRIMARY KEY, numero_interno VARCHAR(80), numero_proveedor VARCHAR(120),
            proveedor VARCHAR(180), fecha DATE, solicitud_id INTEGER REFERENCES mensajeria_solicitudes(id) ON DELETE SET NULL,
            servicio_id INTEGER REFERENCES mensajeria_servicios(id) ON DELETE SET NULL,
            importe NUMERIC(12,2), entregado BOOLEAN NOT NULL DEFAULT FALSE,
            fecha_entrega DATE, observaciones TEXT, documento_url TEXT,
            creado_en TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS mensajeria_facturas (
            id SERIAL PRIMARY KEY, proveedor VARCHAR(180) NOT NULL, numero VARCHAR(100) NOT NULL,
            fecha_emision DATE, fecha_vencimiento DATE, base_imponible NUMERIC(12,2),
            tipo_impuesto VARCHAR(20), importe_impuesto NUMERIC(12,2), total NUMERIC(12,2),
            estado_revision VARCHAR(40) NOT NULL DEFAULT 'Pendiente de revisión',
            estado_pago VARCHAR(40) NOT NULL DEFAULT 'Pendiente de pago',
            fecha_pago DATE, observaciones TEXT, documento_url TEXT,
            creado_en TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE(proveedor, numero)
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS mensajeria_factura_albaran (
            factura_id INTEGER NOT NULL REFERENCES mensajeria_facturas(id) ON DELETE CASCADE,
            albaran_id INTEGER NOT NULL REFERENCES mensajeria_albaranes(id) ON DELETE CASCADE,
            PRIMARY KEY (factura_id, albaran_id)
        )
    """))
    db.commit()


def _dict(row):
    return dict(row._mapping) if row is not None else None


def _rows(db, sql, params=None):
    return [_dict(r) for r in db.execute(text(sql), params or {}).fetchall()]


class ServicioIn(BaseModel):
    codigo: str | None = None
    nombre: str = Field(min_length=1, max_length=160)
    descripcion: str | None = None
    modalidad: str | None = None
    tarifa_base: Decimal | None = None
    suplemento: Decimal = Decimal("0")
    tipo_impuesto: str | None = None
    porcentaje_impuesto: Decimal | None = None
    codigo_proveedor: str | None = None
    condiciones: str | None = None
    vigente_desde: date | None = None
    vigente_hasta: date | None = None
    activo: bool = True


class SolicitudIn(BaseModel):
    solicitante_id: int | None = None
    solicitante_nombre: str = Field(min_length=1, max_length=180)
    origen: str = Field(min_length=1)
    destino: str = Field(min_length=1)
    fecha_solicitada: date | None = None
    prioridad: str = "Normal"
    descripcion: str | None = None
    expediente_id: str | None = None
    contacto_origen: str | None = None
    contacto_destino: str | None = None
    telefono_destino: str | None = None
    servicio_id: int | None = None
    responsable: str | None = None
    estado: str = "Pendiente"
    estado_proveedor: str | None = None
    incidencia: str | None = None
    coste_previsto: Decimal | None = None


class AlbaranIn(BaseModel):
    numero_interno: str | None = None
    numero_proveedor: str | None = None
    proveedor: str | None = None
    fecha: date | None = None
    solicitud_id: int | None = None
    servicio_id: int | None = None
    importe: Decimal | None = None
    entregado: bool = False
    fecha_entrega: date | None = None
    observaciones: str | None = None
    documento_url: str | None = None


class FacturaIn(BaseModel):
    proveedor: str = Field(min_length=1, max_length=180)
    numero: str = Field(min_length=1, max_length=100)
    fecha_emision: date | None = None
    fecha_vencimiento: date | None = None
    base_imponible: Decimal | None = None
    tipo_impuesto: str | None = None
    importe_impuesto: Decimal | None = None
    total: Decimal | None = None
    estado_revision: str = "Pendiente de revisión"
    estado_pago: str = "Pendiente de pago"
    fecha_pago: date | None = None
    observaciones: str | None = None
    documento_url: str | None = None
    albaran_ids: list[int] = []


@router.get("/resumen")
def resumen(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    return {
        "solicitudes": db.execute(text("SELECT COUNT(*) FROM mensajeria_solicitudes")).scalar() or 0,
        "pendientes": db.execute(text("SELECT COUNT(*) FROM mensajeria_solicitudes WHERE estado NOT IN ('Entregada','Cancelada')")).scalar() or 0,
        "albaranes": db.execute(text("SELECT COUNT(*) FROM mensajeria_albaranes")).scalar() or 0,
        "facturas_pendientes": db.execute(text("SELECT COUNT(*) FROM mensajeria_facturas WHERE estado_pago <> 'Pagada'")).scalar() or 0,
    }


@router.get("/servicios")
def listar_servicios(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    return _rows(db, "SELECT * FROM mensajeria_servicios ORDER BY activo DESC, nombre")


@router.post("/servicios")
def crear_servicio(data: ServicioIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    try:
        result = db.execute(text("""
            INSERT INTO mensajeria_servicios
            (codigo,nombre,descripcion,modalidad,tarifa_base,suplemento,tipo_impuesto,porcentaje_impuesto,codigo_proveedor,condiciones,vigente_desde,vigente_hasta,activo)
            VALUES (:codigo,:nombre,:descripcion,:modalidad,:tarifa_base,:suplemento,:tipo_impuesto,:porcentaje_impuesto,:codigo_proveedor,:condiciones,:vigente_desde,:vigente_hasta,:activo)
            RETURNING *
        """), data.model_dump() if hasattr(data, "model_dump") else data.dict())
        db.commit()
        return _dict(result.fetchone())
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se pudo guardar el servicio. Comprueba que el código no esté duplicado.") from exc


@router.patch("/servicios/{servicio_id}")
def actualizar_servicio(servicio_id: int, data: ServicioIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    payload["id"] = servicio_id
    result = db.execute(text("""
        UPDATE mensajeria_servicios SET codigo=:codigo,nombre=:nombre,descripcion=:descripcion,modalidad=:modalidad,
        tarifa_base=:tarifa_base,suplemento=:suplemento,tipo_impuesto=:tipo_impuesto,porcentaje_impuesto=:porcentaje_impuesto,
        codigo_proveedor=:codigo_proveedor,condiciones=:condiciones,vigente_desde=:vigente_desde,vigente_hasta=:vigente_hasta,
        activo=:activo WHERE id=:id RETURNING *
    """), payload)
    db.commit()
    row = result.fetchone()
    if not row: raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return _dict(row)


@router.get("/solicitudes")
def listar_solicitudes(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    return _rows(db, """SELECT s.*, c.nombre AS servicio_nombre FROM mensajeria_solicitudes s
        LEFT JOIN mensajeria_servicios c ON c.id=s.servicio_id ORDER BY s.creado_en DESC""")


@router.post("/solicitudes")
def crear_solicitud(data: SolicitudIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    result = db.execute(text("""
        INSERT INTO mensajeria_solicitudes
        (referencia,solicitante_id,solicitante_nombre,origen,destino,fecha_solicitada,prioridad,descripcion,expediente_id,contacto_origen,contacto_destino,telefono_destino,servicio_id,responsable,estado,estado_proveedor,incidencia,coste_previsto)
        VALUES (:referencia,:solicitante_id,:solicitante_nombre,:origen,:destino,:fecha_solicitada,:prioridad,:descripcion,:expediente_id,:contacto_origen,:contacto_destino,:telefono_destino,:servicio_id,:responsable,:estado,:estado_proveedor,:incidencia,:coste_previsto)
        RETURNING *
    """), {"referencia": None, **payload})
    row = _dict(result.fetchone())
    referencia = f"MSG-{date.today():%Y%m}-{row['id']:05d}"
    db.execute(text("UPDATE mensajeria_solicitudes SET referencia=:ref WHERE id=:id"), {"ref": referencia, "id": row["id"]})
    db.commit()
    return _rows(db, "SELECT * FROM mensajeria_solicitudes WHERE id=:id", {"id": row["id"]})[0]


@router.patch("/solicitudes/{solicitud_id}")
def actualizar_solicitud(solicitud_id: int, data: SolicitudIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    payload.update({"id": solicitud_id})
    result = db.execute(text("""
        UPDATE mensajeria_solicitudes SET solicitante_id=:solicitante_id,solicitante_nombre=:solicitante_nombre,
        origen=:origen,destino=:destino,fecha_solicitada=:fecha_solicitada,prioridad=:prioridad,descripcion=:descripcion,
        expediente_id=:expediente_id,contacto_origen=:contacto_origen,contacto_destino=:contacto_destino,
        telefono_destino=:telefono_destino,servicio_id=:servicio_id,responsable=:responsable,estado=:estado,
        estado_proveedor=:estado_proveedor,incidencia=:incidencia,coste_previsto=:coste_previsto,actualizado_en=NOW()
        WHERE id=:id RETURNING *
    """), payload)
    row = result.fetchone()
    if not row: db.rollback(); raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    db.commit()
    return _dict(row)


@router.get("/albaranes")
def listar_albaranes(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    return _rows(db, """SELECT a.*, s.referencia AS solicitud_referencia FROM mensajeria_albaranes a
        LEFT JOIN mensajeria_solicitudes s ON s.id=a.solicitud_id ORDER BY a.fecha DESC NULLS LAST, a.id DESC""")


@router.post("/albaranes")
def crear_albaran(data: AlbaranIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    result = db.execute(text("""
        INSERT INTO mensajeria_albaranes (numero_interno,numero_proveedor,proveedor,fecha,solicitud_id,servicio_id,importe,entregado,fecha_entrega,observaciones,documento_url)
        VALUES (:numero_interno,:numero_proveedor,:proveedor,:fecha,:solicitud_id,:servicio_id,:importe,:entregado,:fecha_entrega,:observaciones,:documento_url)
        RETURNING *
    """), payload)
    row = _dict(result.fetchone()); db.commit(); return row


@router.patch("/albaranes/{albaran_id}")
def actualizar_albaran(albaran_id: int, data: AlbaranIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    payload["id"] = albaran_id
    result = db.execute(text("""
        UPDATE mensajeria_albaranes SET numero_interno=:numero_interno,numero_proveedor=:numero_proveedor,proveedor=:proveedor,
        fecha=:fecha,solicitud_id=:solicitud_id,servicio_id=:servicio_id,importe=:importe,entregado=:entregado,
        fecha_entrega=:fecha_entrega,observaciones=:observaciones,documento_url=:documento_url WHERE id=:id RETURNING *
    """), payload)
    row=result.fetchone()
    if not row: db.rollback(); raise HTTPException(status_code=404, detail="Albarán no encontrado")
    db.commit(); return _dict(row)


@router.get("/facturas")
def listar_facturas(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    facturas = _rows(db, "SELECT * FROM mensajeria_facturas ORDER BY fecha_emision DESC NULLS LAST, id DESC")
    for factura in facturas:
        factura["albaran_ids"] = [r["albaran_id"] for r in _rows(db, "SELECT albaran_id FROM mensajeria_factura_albaran WHERE factura_id=:id", {"id": factura["id"]})]
    return facturas


@router.post("/facturas")
def crear_factura(data: FacturaIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    albaran_ids = payload.pop("albaran_ids", [])
    try:
        result = db.execute(text("""
            INSERT INTO mensajeria_facturas (proveedor,numero,fecha_emision,fecha_vencimiento,base_imponible,tipo_impuesto,importe_impuesto,total,estado_revision,estado_pago,fecha_pago,observaciones,documento_url)
            VALUES (:proveedor,:numero,:fecha_emision,:fecha_vencimiento,:base_imponible,:tipo_impuesto,:importe_impuesto,:total,:estado_revision,:estado_pago,:fecha_pago,:observaciones,:documento_url)
            RETURNING *
        """), payload)
        factura = _dict(result.fetchone())
        for aid in albaran_ids:
            db.execute(text("INSERT INTO mensajeria_factura_albaran (factura_id,albaran_id) VALUES (:fid,:aid) ON CONFLICT DO NOTHING"), {"fid": factura["id"], "aid": aid})
        db.commit()
        factura["albaran_ids"] = albaran_ids
        return factura
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se pudo guardar la factura. Comprueba que proveedor y número no estén duplicados y que los albaranes existan.") from exc


@router.patch("/facturas/{factura_id}")
def actualizar_factura(factura_id: int, data: FacturaIn, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_tables(db)
    payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    albaran_ids = payload.pop("albaran_ids", [])
    payload["id"] = factura_id
    result = db.execute(text("""
        UPDATE mensajeria_facturas SET proveedor=:proveedor,numero=:numero,fecha_emision=:fecha_emision,
        fecha_vencimiento=:fecha_vencimiento,base_imponible=:base_imponible,tipo_impuesto=:tipo_impuesto,
        importe_impuesto=:importe_impuesto,total=:total,estado_revision=:estado_revision,estado_pago=:estado_pago,
        fecha_pago=:fecha_pago,observaciones=:observaciones,documento_url=:documento_url WHERE id=:id RETURNING *
    """), payload)
    row = result.fetchone()
    if not row: db.rollback(); raise HTTPException(status_code=404, detail="Factura no encontrada")
    db.execute(text("DELETE FROM mensajeria_factura_albaran WHERE factura_id=:id"), {"id": factura_id})
    for aid in albaran_ids:
        db.execute(text("INSERT INTO mensajeria_factura_albaran (factura_id,albaran_id) VALUES (:fid,:aid) ON CONFLICT DO NOTHING"), {"fid": factura_id, "aid": aid})
    db.commit()
    result = _dict(row); result["albaran_ids"] = albaran_ids; return result

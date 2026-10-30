from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.reparto import usuario_admin_expedientes
from backend.app.database import get_db

router = APIRouter(prefix="/tipos-impositivos", tags=["Catálogo de tipos impositivos"])


class TipoImpositivoPayload(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=160)
    categoria: str = Field(..., min_length=3, max_length=30)  # impuesto / retencion
    impuesto: str = Field(..., min_length=2, max_length=40)  # IVA, IGIC, IRPF, etc.
    porcentaje: Optional[Decimal] = None
    territorio: str = Field("España", max_length=80)
    descripcion: Optional[str] = Field(None, max_length=500)
    activo: bool = True

    @validator("porcentaje")
    def porcentaje_valido(cls, value):
        if value is not None and (value < 0 or value > 100):
            raise ValueError("El porcentaje debe estar entre 0 y 100.")
        return value

    @validator("categoria")
    def categoria_valida(cls, value):
        value = value.strip().lower()
        if value not in {"impuesto", "retencion"}:
            raise ValueError("La categoría debe ser impuesto o retencion.")
        return value

    class Config:
        orm_mode = True


def _ensure_table(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS public.tipos_impositivos (
            id BIGSERIAL PRIMARY KEY,
            nombre VARCHAR(160) NOT NULL,
            categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('impuesto', 'retencion')),
            impuesto VARCHAR(40) NOT NULL,
            porcentaje NUMERIC(6,3),
            territorio VARCHAR(80) NOT NULL DEFAULT 'España',
            descripcion VARCHAR(500),
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (categoria, impuesto, nombre, porcentaje, territorio)
        )
    """))
    # Valores iniciales orientativos: el tipo aplicable depende de la operación,
    # territorio, fecha de devengo y situación del contribuyente.
    defaults = [
        ("IVA general 21%", "impuesto", "IVA", 21, "Territorio común", "Tipo general de IVA"),
        ("IVA reducido 10%", "impuesto", "IVA", 10, "Territorio común", "Tipo reducido de IVA"),
        ("IVA superreducido 4%", "impuesto", "IVA", 4, "Territorio común", "Tipo superreducido de IVA"),
        ("IVA tipo cero 0%", "impuesto", "IVA", 0, "Territorio común", "Operaciones con tipo cero cuando legalmente proceda"),
        ("IVA exento", "impuesto", "IVA", None, "Territorio común", "Operación exenta; no equivale a tipo cero"),
        ("IVA no sujeto", "impuesto", "IVA", None, "Territorio común", "Operación no sujeta al IVA"),
        ("IGIC general 7%", "impuesto", "IGIC", 7, "Canarias", "Tipo general IGIC"),
        ("IGIC reducido 5%", "impuesto", "IGIC", 5, "Canarias", "Tipo reducido IGIC"),
        ("IGIC superreducido 3%", "impuesto", "IGIC", 3, "Canarias", "Tipo superreducido IGIC"),
        ("IGIC tipo cero 0%", "impuesto", "IGIC", 0, "Canarias", "Tipo cero cuando legalmente proceda"),
        ("IGIC tipo específico 1%", "impuesto", "IGIC", 1, "Canarias", "Tipo específico para operaciones previstas legalmente"),
        ("IGIC incrementado 9,5%", "impuesto", "IGIC", 9.5, "Canarias", "Tipo incrementado IGIC"),
        ("IGIC incrementado 15%", "impuesto", "IGIC", 15, "Canarias", "Tipo incrementado IGIC"),
        ("IGIC especial 20%", "impuesto", "IGIC", 20, "Canarias", "Tipo especial IGIC"),
        ("ITP según comunidad y operación", "impuesto", "ITP", None, "España · por comunidad autónoma", "No existe un porcentaje único estatal; depende de la comunidad autónoma y del hecho imponible."),
        ("AJD según comunidad y operación", "impuesto", "AJD", None, "España · por comunidad autónoma", "Tipo variable según comunidad autónoma y modalidad del acto/documento."),
        ("IPSI según operación", "impuesto", "IPSI", None, "Ceuta y Melilla", "Los tipos dependen de la operación y del territorio; verificar normativa aplicable."),
        ("Recargo de equivalencia 5,2%", "impuesto", "IVA", 5.2, "Territorio común", "Solo para operaciones sujetas al régimen de recargo de equivalencia."),
        ("Recargo de equivalencia 1,4%", "impuesto", "IVA", 1.4, "Territorio común", "Solo para operaciones sujetas al régimen de recargo de equivalencia."),
        ("Recargo de equivalencia 0,5%", "impuesto", "IVA", 0.5, "Territorio común", "Solo para operaciones sujetas al régimen de recargo de equivalencia."),
        ("IRPF profesionales general 15%", "retencion", "IRPF", 15, "España", "Retención profesional general, cuando proceda"),
        ("IRPF profesionales inicio actividad 7%", "retencion", "IRPF", 7, "España", "Tipo reducido para profesionales que cumplan los requisitos"),
        ("IRPF arrendamientos urbanos 19%", "retencion", "IRPF", 19, "España", "Retención general de arrendamientos urbanos, cuando proceda"),
        ("IRPF capital mobiliario 19%", "retencion", "IRPF", 19, "España", "Tipo general de determinados rendimientos del capital mobiliario"),
        ("IRPF actividades agrícolas/ganaderas 2%", "retencion", "IRPF", 2, "España", "Tipo aplicable a determinados rendimientos agrarios"),
        ("IRPF actividades ganaderas de engorde/avicultura 1%", "retencion", "IRPF", 1, "España", "Tipo aplicable a determinados supuestos agrarios"),
        ("Sin retención", "retencion", "IRPF", 0, "España", "No aplicar retención en esta operación"),
    ]
    total = db.execute(text("SELECT COUNT(*) FROM public.tipos_impositivos")).scalar() or 0
    if total == 0:
        for nombre, categoria, impuesto, porcentaje, territorio, descripcion in defaults:
            db.execute(text("""
                INSERT INTO public.tipos_impositivos
                    (nombre, categoria, impuesto, porcentaje, territorio, descripcion, activo)
                VALUES (:nombre, :categoria, :impuesto, :porcentaje, :territorio, :descripcion, TRUE)
            """), {"nombre": nombre, "categoria": categoria, "impuesto": impuesto,
                   "porcentaje": porcentaje, "territorio": territorio, "descripcion": descripcion})


def _admin(usuario):
    if not usuario_admin_expedientes(usuario):
        raise HTTPException(status_code=403, detail="Solo administración puede mantener el catálogo de tipos impositivos.")


def _row(row):
    data = dict(row)
    if data.get("porcentaje") is not None:
        data["porcentaje"] = float(data["porcentaje"])
    if data.get("creado_en") is not None:
        data["creado_en"] = data["creado_en"].isoformat()
    if data.get("actualizado_en") is not None:
        data["actualizado_en"] = data["actualizado_en"].isoformat()
    return data


@router.get("")
def listar_tipos_impositivos(activos: bool = True, categoria: Optional[str] = None,
                             db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _ensure_table(db)
    query = "SELECT * FROM public.tipos_impositivos WHERE (:activos = FALSE OR activo = TRUE)"
    params = {"activos": activos}
    if categoria:
        if categoria not in {"impuesto", "retencion"}:
            raise HTTPException(status_code=422, detail="Categoría no válida.")
        query += " AND categoria = :categoria"
        params["categoria"] = categoria
    query += " ORDER BY categoria, impuesto, porcentaje NULLS LAST, nombre"
    rows = db.execute(text(query), params).mappings().all()
    db.commit()
    return [_row(row) for row in rows]


@router.post("", status_code=201)
def crear_tipo_impositivo(payload: TipoImpositivoPayload, db: Session = Depends(get_db),
                           usuario=Depends(get_current_user)):
    _admin(usuario)
    _ensure_table(db)
    try:
        row = db.execute(text("""
            INSERT INTO public.tipos_impositivos
                (nombre, categoria, impuesto, porcentaje, territorio, descripcion, activo)
            VALUES (:nombre, :categoria, :impuesto, :porcentaje, :territorio, :descripcion, :activo)
            RETURNING *
        """), payload.dict()).mappings().one()
        db.commit()
        return _row(row)
    except Exception as exc:
        db.rollback()
        if "unique" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Ya existe un tipo impositivo igual en el catálogo.")
        raise HTTPException(status_code=500, detail="No se pudo crear el tipo impositivo.")


@router.put("/{tipo_id}")
def actualizar_tipo_impositivo(tipo_id: int, payload: TipoImpositivoPayload,
                                db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    _admin(usuario)
    _ensure_table(db)
    try:
        row = db.execute(text("""
            UPDATE public.tipos_impositivos
            SET nombre=:nombre, categoria=:categoria, impuesto=:impuesto,
                porcentaje=:porcentaje, territorio=:territorio, descripcion=:descripcion,
                activo=:activo, actualizado_en=CURRENT_TIMESTAMP
            WHERE id=:id
            RETURNING *
        """), {**payload.dict(), "id": tipo_id}).mappings().first()
        if row is None:
            db.rollback()
            raise HTTPException(status_code=404, detail="Tipo impositivo no encontrado.")
        db.commit()
        return _row(row)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo actualizar el tipo impositivo.") from exc


@router.delete("/{tipo_id}")
def desactivar_tipo_impositivo(tipo_id: int, db: Session = Depends(get_db),
                               usuario=Depends(get_current_user)):
    _admin(usuario)
    _ensure_table(db)
    row = db.execute(text("""
        UPDATE public.tipos_impositivos
        SET activo=FALSE, actualizado_en=CURRENT_TIMESTAMP
        WHERE id=:id AND activo=TRUE
        RETURNING id
    """), {"id": tipo_id}).first()
    if row is None:
        db.rollback()
        raise HTTPException(status_code=404, detail="Tipo impositivo no encontrado o ya desactivado.")
    db.commit()
    return {"ok": True, "id": tipo_id, "activo": False,
            "mensaje": "Tipo desactivado. Se conserva para no alterar documentos e históricos anteriores."}

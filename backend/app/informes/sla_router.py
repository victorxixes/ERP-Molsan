from __future__ import annotations

import unicodedata
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.reparto import ids_expedientes_visibles

router = APIRouter(prefix="/informes-sla", tags=["Informes SLA"], dependencies=[Depends(get_current_user)])

ACTIVIDADES = [
    ("documentacion-previa", "Documentación previa", None),
    ("sede-notarial", "Sede notarial", 5),
    ("sede-notarial-protocolo", "Sede notarial con protocolo", 2),
    ("gestion-economica", "Gestión económica", "global"),
    ("liquidacion-impuestos", "Liquidación de impuestos", 2),
    ("tramitacion-inscripcion", "Tramitación inscripción", 23),
    ("defectos-registrales", "Defectos registrales", 60),
    ("facturacion-cierre", "Cierre del expediente", 5),
]
ACTIVIDADES_VALIDAS = {x[0] for x in ACTIVIDADES}
EXCLUIDOS_GLOBAL = ("hipotecario", "credito stock", "crédito stock")


def normalizar(valor) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    return "".join(c for c in texto if not unicodedata.combining(c)).strip().lower()


def asegurar_tabla(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS public.expediente_sla_actividad (
            id BIGSERIAL PRIMARY KEY,
            id_expediente VARCHAR(100) NOT NULL,
            actividad_key VARCHAR(80) NOT NULL,
            fecha_inicio DATE NULL,
            fecha_fin DATE NULL,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (id_expediente, actividad_key)
        )
    """))
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_expediente_sla_actividad_expediente
        ON public.expediente_sla_actividad (id_expediente)
    """))
    db.commit()


def clasificar(exp):
    operacion = normalizar(getattr(exp, "tipo_operacion", None))
    producto = normalizar(getattr(exp, "producto_gtg", None))
    sin_provision = "sin provision" in operacion
    es_propia = producto in {"propia entidad", "vinculada propia entidad", "vinculado propia entidad"}
    if sin_provision:
        return {"grupo": "Sin provisión", "entidad": "Propia entidad", "sla_global": 40, "excluido_global": False}
    excluido = any(x in producto for x in EXCLUIDOS_GLOBAL)
    if es_propia:
        return {"grupo": "Con provisión", "entidad": "Propia entidad", "sla_global": 40, "excluido_global": excluido}
    return {"grupo": "Con provisión", "entidad": "Otra entidad", "sla_global": 70, "excluido_global": excluido}


def duracion(inicio, fin):
    if not inicio:
        return None
    final = fin or date.today()
    dias = (final - inicio).days
    return max(0, dias)


class FechasActividad(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


@router.get("/fechas/{id_expediente}/{actividad_key}")
def obtener_fechas_actividad(id_expediente: str, actividad_key: str, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    if actividad_key not in ACTIVIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Actividad SLA no válida.")
    asegurar_tabla(db)
    row = db.execute(text("""
        SELECT fecha_inicio, fecha_fin FROM public.expediente_sla_actividad
        WHERE id_expediente = :id AND actividad_key = :actividad
    """), {"id": id_expediente, "actividad": actividad_key}).mappings().first()
    return {
        "id_expediente": id_expediente,
        "actividad_key": actividad_key,
        "fecha_inicio": row["fecha_inicio"].isoformat() if row and row["fecha_inicio"] else None,
        "fecha_fin": row["fecha_fin"].isoformat() if row and row["fecha_fin"] else None,
    }


@router.put("/fechas/{id_expediente}/{actividad_key}")
def guardar_fechas_actividad(id_expediente: str, actividad_key: str, datos: FechasActividad, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    if actividad_key not in ACTIVIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Actividad SLA no válida.")
    if datos.fecha_inicio and datos.fecha_fin and datos.fecha_fin < datos.fecha_inicio:
        raise HTTPException(status_code=400, detail="Fin actividad no puede ser anterior a Inicio actividad.")
    existe = db.query(Expediente.id).filter(Expediente.id_expediente == id_expediente).first()
    if not existe:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    asegurar_tabla(db)
    db.execute(text("""
        INSERT INTO public.expediente_sla_actividad (id_expediente, actividad_key, fecha_inicio, fecha_fin, actualizado_en)
        VALUES (:id, :actividad, :inicio, :fin, CURRENT_TIMESTAMP)
        ON CONFLICT (id_expediente, actividad_key) DO UPDATE SET
            fecha_inicio = EXCLUDED.fecha_inicio,
            fecha_fin = EXCLUDED.fecha_fin,
            actualizado_en = CURRENT_TIMESTAMP
    """), {"id": id_expediente, "actividad": actividad_key, "inicio": datos.fecha_inicio, "fin": datos.fecha_fin})
    db.commit()
    return {"ok": True, "fecha_inicio": datos.fecha_inicio.isoformat() if datos.fecha_inicio else None, "fecha_fin": datos.fecha_fin.isoformat() if datos.fecha_fin else None}


@router.get("")
def informe_sla(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    asegurar_tabla(db)
    consulta = db.query(Expediente)
    ids_visibles = ids_expedientes_visibles(db, usuario)
    if ids_visibles is not None:
        consulta = consulta.filter(Expediente.id.in_(ids_visibles))
    expedientes = consulta.order_by(Expediente.id_expediente.asc()).all()
    fechas = db.execute(text("""
        SELECT id_expediente, actividad_key, fecha_inicio, fecha_fin
        FROM public.expediente_sla_actividad
    """)).mappings().all()
    por_fecha = {(r["id_expediente"], r["actividad_key"]): r for r in fechas}
    items = []
    for exp in expedientes:
        clasificacion = clasificar(exp)
        operacion = normalizar(getattr(exp, "tipo_operacion", None))
        if any(x in normalizar(getattr(exp, "producto_gtg", None)) for x in EXCLUIDOS_GLOBAL):
            clasificacion["excluido_global"] = True
        actividades = []
        for key, label, objetivo in ACTIVIDADES:
            row = por_fecha.get((str(exp.id_expediente), key))
            inicio = row["fecha_inicio"] if row else None
            fin = row["fecha_fin"] if row else None
            dias = duracion(inicio, fin)
            objetivo_real = clasificacion["sla_global"] if objetivo == "global" else objetivo
            estado = "Sin fecha de inicio"
            if inicio:
                estado = "En curso" if not fin else "Finalizada"
                if objetivo_real is not None and dias is not None:
                    estado = ("Fuera de plazo" if dias > objetivo_real else "Dentro de plazo") if fin else ("Fuera de plazo" if dias > objetivo_real else "En curso")
            actividades.append({
                "actividad_key": key, "actividad": label,
                "fecha_inicio": inicio.isoformat() if inicio else None,
                "fecha_fin": fin.isoformat() if fin else None,
                "dias": dias, "objetivo_dias": objetivo_real,
                "estado": estado,
            })
        inicio_globales = [date.fromisoformat(a["fecha_inicio"]) for a in actividades if a["fecha_inicio"]]
        fin_cierre = next((date.fromisoformat(a["fecha_fin"]) for a in actividades if a["actividad_key"] == "facturacion-cierre" and a["fecha_fin"]), None)
        inicio_global = min(inicio_globales) if inicio_globales else None
        dias_global = duracion(inicio_global, fin_cierre)
        objetivo_global = clasificacion["sla_global"]
        if clasificacion["excluido_global"]:
            estado_global = "Excluido"
            dias_global = None
        elif not inicio_global:
            estado_global = "Sin fecha de inicio"
        elif not fin_cierre:
            estado_global = "Fuera de plazo" if dias_global is not None and dias_global > objetivo_global else "En curso"
        else:
            estado_global = "Dentro de plazo" if dias_global is not None and dias_global <= objetivo_global else "Fuera de plazo"
        items.append({
            "id": exp.id, "id_expediente": exp.id_expediente,
            "titular": getattr(exp, "nombre_titular", None) or getattr(exp, "nombre_solicitante", None),
            "tipo_operacion": getattr(exp, "tipo_operacion", None),
            "producto_gtg": getattr(exp, "producto_gtg", None),
            "grupo": clasificacion["grupo"], "entidad": clasificacion["entidad"],
            "objetivo_global": objetivo_global, "dias_global": dias_global,
            "estado_global": estado_global, "excluido_global": clasificacion["excluido_global"],
            "actividades": actividades,
        })
    return {"actividades": [{"key": k, "label": l, "objetivo": o} for k,l,o in ACTIVIDADES], "items": items}

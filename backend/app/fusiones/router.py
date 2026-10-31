from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Session

from backend.app.database import Base, get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca

router = APIRouter(
    prefix="/fusiones",
    tags=["Fusiones"],
    dependencies=[Depends(get_current_user)],
)


class SolicitudFusion(Base):
    __tablename__ = "solicitudes_fusion"

    id = Column(Integer, primary_key=True, index=True)
    expediente_id = Column(Integer, ForeignKey("expedientes.id"), nullable=False, index=True)
    finca_id = Column(Integer, ForeignKey("expediente_fincas.id"), nullable=True, index=True)
    numero_expediente = Column(String(100), nullable=False)
    registro = Column(String(300), nullable=False)
    numero_entrada = Column(String(200), nullable=True)
    serie_numero_factura = Column(String(200), nullable=True)
    fecha_factura = Column(Date, nullable=True)
    nif_registrador = Column(String(50), nullable=True)
    importe = Column(Float, nullable=True)
    entidad_origen = Column(String(300), nullable=True)
    cambio_denominacion = Column(String(2), nullable=False, default="NO")
    recurrible = Column(String(2), nullable=False, default="SI")
    tipo_factura = Column(String(80), nullable=False)
    comentarios_observaciones = Column(Text, nullable=True)
    estado = Column(String(40), nullable=False, default="Pendiente")
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


class SolicitudFusionPayload(BaseModel):
    finca_id: Optional[int] = None
    numero_entrada: Optional[str] = Field(None, max_length=200)
    serie_numero_factura: Optional[str] = Field(None, max_length=200)
    fecha_factura: Optional[date] = None
    nif_registrador: Optional[str] = Field(None, max_length=50)
    importe: Optional[float] = None
    entidad_origen: Optional[str] = Field(None, max_length=300)
    cambio_denominacion: str = "NO"
    recurrible: str = "SI"
    tipo_factura: str
    comentarios_observaciones: Optional[str] = None


def _dict(s):
    return {
        "id": s.id,
        "expediente_id": s.expediente_id,
        "finca_id": s.finca_id,
        "numero_expediente": s.numero_expediente,
        "registro": s.registro,
        "numero_entrada": s.numero_entrada,
        "serie_numero_factura": s.serie_numero_factura,
        "fecha_factura": s.fecha_factura.isoformat() if s.fecha_factura else None,
        "nif_registrador": s.nif_registrador,
        "importe": s.importe,
        "entidad_origen": s.entidad_origen,
        "cambio_denominacion": s.cambio_denominacion,
        "recurrible": s.recurrible,
        "tipo_factura": s.tipo_factura,
        "comentarios_observaciones": s.comentarios_observaciones,
        "estado": s.estado,
        "creado_en": s.creado_en.isoformat() if s.creado_en else None,
    }


@router.post("/solicitudes")
def crear_solicitud_fusion(
    id_expediente: str,
    payload: SolicitudFusionPayload,
    db: Session = Depends(get_db),
):
    expediente = db.query(Expediente).filter(
        Expediente.id_expediente == str(id_expediente)
    ).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="No existe el expediente indicado.")

    finca = None
    if payload.finca_id is not None:
        finca = db.query(ExpedienteFinca).filter(
            ExpedienteFinca.id == payload.finca_id,
            ExpedienteFinca.expediente_id == expediente.id,
        ).first()
        if finca is None:
            raise HTTPException(status_code=404, detail="La finca seleccionada no pertenece a este expediente.")

    registro = (finca.registro if finca else "") or ""
    if not registro.strip():
        raise HTTPException(status_code=422, detail="El registro es obligatorio y debe constar en Fincas y registros.")
    if payload.cambio_denominacion not in ("SI", "NO"):
        raise HTTPException(status_code=422, detail="Cambio denominación debe ser SI o NO.")
    if payload.recurrible not in ("SI", "NO"):
        raise HTTPException(status_code=422, detail="Recurrible debe ser SI o NO.")
    if payload.tipo_factura not in ("Factura (con número y fecha)", "Pre-Factura (falta número)"):
        raise HTTPException(status_code=422, detail="Selecciona un tipo de factura válido.")
    if payload.tipo_factura == "Factura (con número y fecha)" and (
        not payload.serie_numero_factura or not payload.fecha_factura
    ):
        raise HTTPException(status_code=422, detail="Para una factura completa son obligatorios el número y la fecha.")

    solicitud = SolicitudFusion(
        expediente_id=expediente.id,
        finca_id=finca.id if finca else None,
        numero_expediente=expediente.id_expediente,
        registro=registro,
        numero_entrada=payload.numero_entrada,
        serie_numero_factura=payload.serie_numero_factura,
        fecha_factura=payload.fecha_factura,
        nif_registrador=payload.nif_registrador,
        importe=payload.importe,
        entidad_origen=(payload.entidad_origen or (finca.entidad_original if finca else None)),
        cambio_denominacion=payload.cambio_denominacion,
        recurrible=payload.recurrible,
        tipo_factura=payload.tipo_factura,
        comentarios_observaciones=payload.comentarios_observaciones,
        estado="Pendiente",
    )
    db.add(solicitud)
    try:
        db.commit()
        db.refresh(solicitud)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar la solicitud de fusión.") from exc
    return {"ok": True, "item": _dict(solicitud)}


@router.get("/solicitudes")
def listar_solicitudes_fusion(
    id_expediente: Optional[str] = None,
    db: Session = Depends(get_db),
):
    consulta = db.query(SolicitudFusion)
    if id_expediente:
        consulta = consulta.filter(SolicitudFusion.numero_expediente == str(id_expediente))
    items = consulta.order_by(SolicitudFusion.creado_en.desc(), SolicitudFusion.id.desc()).all()
    return {"items": [_dict(item) for item in items], "total": len(items)}

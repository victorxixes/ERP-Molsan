from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.expedientes.models import Cliente, Expediente
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.ctn.models import Notaria
from backend.app.tipos_expediente.models import TipoExpediente
from backend.app.tipos_expediente.router import asegurar_catalogo_inicial

router = APIRouter(prefix="/alta-expediente", tags=["Alta manual de expediente"])


class FacturacionInput(BaseModel):
    nombre: str = ""
    nif: str = ""
    direccion: str = ""
    codigo_postal: str = ""
    poblacion: str = ""
    provincia: str = ""
    telefono: str = ""
    email: str = ""


class FincaInput(BaseModel):
    finca: str = ""
    cru_idufir: str = ""
    registro: str = ""
    provincia: str = ""
    poblacion: str = ""
    seccion: str = ""
    inscripcion: str = ""
    cuantia: str = ""
    contrato: str = ""
    entidad_original: str = ""


class HipotecaInput(BaseModel):
    acreedor: str = ""
    numero: str = ""
    capital: Optional[float] = None
    contrato: str = ""
    observaciones: str = ""


class AltaExpedienteInput(BaseModel):
    tipo_expediente_id: int
    fecha_alta: Optional[date] = None
    titular: str = ""
    nif_titular: str = ""
    solicitante: str = ""
    nif_solicitante: str = ""
    contrato: str = ""
    numero_contrato: str = ""
    observaciones: str = ""
    notario_id: Optional[int] = None
    facturacion: FacturacionInput = Field(default_factory=FacturacionInput)
    fincas: list[FincaInput] = Field(default_factory=list)
    hipotecas: list[HipotecaInput] = Field(default_factory=list)


def preparar_esquema(db: Session) -> None:
    # Compatible con bases existentes: las nuevas columnas se añaden sin borrar datos.
    db.execute(text("ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS tipo_expediente_id INTEGER"))
    db.execute(text("ALTER TABLE expedientes ADD COLUMN IF NOT EXISTS numero_tipo_expediente INTEGER"))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS expediente_hipotecas (
            id SERIAL PRIMARY KEY,
            expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
            acreedor VARCHAR(300),
            numero VARCHAR(200),
            capital DOUBLE PRECISION,
            contrato VARCHAR(200),
            observaciones VARCHAR(1000)
        )
    """))


@router.get("/catalogos")
def catalogos_alta(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    asegurar_catalogo_inicial(db)
    tipos = db.query(TipoExpediente).filter(TipoExpediente.activo.is_(True)).order_by(TipoExpediente.id).all()
    notarios = db.query(Notaria).order_by(Notaria.apellidos.asc().nullslast(), Notaria.nombre.asc().nullslast()).all()
    return {
        "tipos": [{"id": t.id, "nombre": t.nombre, "grupo": t.grupo} for t in tipos],
        "notarios": [{
            "id": n.id,
            "nombre": " ".join(v for v in [n.nombre, n.apellidos] if v),
            "nif": n.nif or "",
            "poblacion": n.municipio or "",
            "provincia": n.provincia or "",
        } for n in notarios],
    }


@router.get("/siguiente-numero/{tipo_id}")
def siguiente_numero(tipo_id: int, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    preparar_esquema(db)
    tipo = db.query(TipoExpediente).filter(TipoExpediente.id == tipo_id, TipoExpediente.activo.is_(True)).first()
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de expediente no encontrado o inactivo.")
    ultimo = db.query(func.max(Expediente.numero_tipo_expediente)).filter(
        Expediente.tipo_expediente_id == tipo_id
    ).scalar() or 0
    db.commit()
    return {"tipo_expediente_id": tipo_id, "siguiente_numero": int(ultimo) + 1, "identificador_previo": f"ALTA-{tipo_id}-{int(ultimo) + 1:05d}"}


@router.post("", status_code=201)
def crear_alta_expediente(datos: AltaExpedienteInput, db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    try:
        preparar_esquema(db)
        tipo = db.query(TipoExpediente).filter(
            TipoExpediente.id == datos.tipo_expediente_id,
            TipoExpediente.activo.is_(True),
        ).first()
        if not tipo:
            raise HTTPException(status_code=400, detail="Selecciona un tipo de expediente activo.")

        # Serializa las altas del mismo tipo en PostgreSQL para evitar números duplicados.
        if db.get_bind().dialect.name == "postgresql":
            db.execute(text("SELECT pg_advisory_xact_lock(:clave)"), {"clave": 731208640 + datos.tipo_expediente_id})

        ultimo = db.query(func.max(Expediente.numero_tipo_expediente)).filter(
            Expediente.tipo_expediente_id == datos.tipo_expediente_id
        ).scalar() or 0
        numero = int(ultimo) + 1
        identificador = f"ALTA-{datos.tipo_expediente_id}-{numero:05d}"

        if db.query(Expediente.id).filter(Expediente.id_expediente == identificador).first():
            raise HTTPException(status_code=409, detail="El número generado ya existe. Actualiza el formulario e inténtalo de nuevo.")

        f = datos.facturacion
        cliente = Cliente(
            nombre_completo=datos.titular.strip() or f.nombre.strip() or None,
            dni=datos.nif_titular.strip() or None,
            nombre_facturacion=f.nombre.strip() or None,
            dni_facturacion=f.nif.strip() or None,
            direccion_facturacion=f.direccion.strip() or None,
            codigo_postal_facturacion=f.codigo_postal.strip() or None,
            poblacion_facturacion=f.poblacion.strip() or None,
            provincia_facturacion=f.provincia.strip() or None,
            telefono_facturacion=f.telefono.strip() or None,
            email_facturacion=f.email.strip() or None,
        )
        db.add(cliente)
        db.flush()

        notario = db.query(Notaria).filter(Notaria.id == datos.notario_id).first() if datos.notario_id else None
        expediente = Expediente(
            cliente_id=cliente.id,
            id_expediente=identificador,
            tipo_expediente_id=datos.tipo_expediente_id,
            numero_tipo_expediente=numero,
            fecha_alta=datos.fecha_alta or date.today(),
            estado_expediente="PVA",
            estado_actividad="Pendiente",
            actividad_actual="Documentación previa",
            nombre_titular=datos.titular.strip() or None,
            nif_titular=datos.nif_titular.strip() or None,
            nombre_solicitante=datos.solicitante.strip() or None,
            nif_solicitante=datos.nif_solicitante.strip() or None,
            contrato=datos.contrato.strip() or datos.numero_contrato.strip() or None,
            observaciones=datos.observaciones.strip() or None,
            facturacion_nombre=f.nombre.strip() or None,
            facturacion_dni_nif=f.nif.strip() or None,
            facturacion_direccion=f.direccion.strip() or None,
            facturacion_codigo_postal=f.codigo_postal.strip() or None,
            facturacion_poblacion=f.poblacion.strip() or None,
            facturacion_provincia=f.provincia.strip() or None,
            facturacion_telefono=f.telefono.strip() or None,
            facturacion_email=f.email.strip() or None,
            notario_id=notario.id if notario else None,
            nombre_notario=(" ".join(v for v in [notario.nombre, notario.apellidos] if v) if notario else None),
            nif_notario=(notario.nif if notario else None),
            poblacion=(notario.municipio if notario else None),
            provincia=(notario.provincia if notario else None),
        )
        db.add(expediente)
        db.flush()

        for finca in datos.fincas:
            if not any([finca.finca.strip(), finca.cru_idufir.strip(), finca.registro.strip()]):
                continue
            db.add(ExpedienteFinca(
                expediente_id=expediente.id,
                finca=finca.finca.strip() or None,
                cru_idufir=finca.cru_idufir.strip() or None,
                registro=finca.registro.strip() or None,
                provincia=finca.provincia.strip() or None,
                poblacion=finca.poblacion.strip() or None,
                seccion=finca.seccion.strip() or None,
                inscripcion=finca.inscripcion.strip() or None,
                cuantia=finca.cuantia.strip() or None,
                contrato=finca.contrato.strip() or None,
                entidad_original=finca.entidad_original.strip() or None,
            ))

        for hipoteca in datos.hipotecas:
            if not any([hipoteca.acreedor.strip(), hipoteca.numero.strip(), hipoteca.contrato.strip()]):
                continue
            db.execute(text("""
                INSERT INTO expediente_hipotecas (expediente_id, acreedor, numero, capital, contrato, observaciones)
                VALUES (:expediente_id, :acreedor, :numero, :capital, :contrato, :observaciones)
            """), {
                "expediente_id": expediente.id,
                "acreedor": hipoteca.acreedor.strip() or None,
                "numero": hipoteca.numero.strip() or None,
                "capital": hipoteca.capital,
                "contrato": hipoteca.contrato.strip() or None,
                "observaciones": hipoteca.observaciones.strip() or None,
            })

        db.commit()
        return {
            "ok": True,
            "id": expediente.id,
            "id_expediente": expediente.id_expediente,
            "numero_tipo_expediente": numero,
            "tipo_expediente": tipo.nombre,
            "mensaje": f"Expediente {identificador} creado correctamente.",
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo crear el expediente: {str(exc)[:350]}") from exc

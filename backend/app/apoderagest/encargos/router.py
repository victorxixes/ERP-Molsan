
"""Endpoints de encargos de ApoderaGest."""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual
from backend.app.apoderagest.encargos.service import listar_encargos
from backend.app.expedientes.models import Expediente
from backend.app.agenda.models import Cita
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado

router = APIRouter(
    prefix="/apoderagest/encargos",
    tags=["ApoderaGest - Encargos"],
)


@router.get("")
def obtener_encargos(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
    pendientes: bool = Query(True, description="Solo envíos pendientes de firma"),
):
    return listar_encargos(db, usuario, solo_pendientes=pendientes)



class FirmaEncargo(BaseModel):
    fecha_firma: date
    protocolo: str = Field(..., min_length=1, max_length=200)
    notario_otorgante: str = Field(..., min_length=1, max_length=300)
    tipo_firma: str = Field(..., min_length=1, max_length=30)


@router.post("/{id_expediente}/firmar", summary="Registrar firma real desde ApoderaGest")
def firmar_encargo(
    id_expediente: str,
    datos: FirmaEncargo,
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    """Guarda fecha de firma y protocolo en el mismo expediente de FichaExpediente."""
    # Solo se permite firmar expedientes asignados al apoderado autenticado.
    encargos_usuario = listar_encargos(db, usuario, solo_pendientes=False)
    encargo = next(
        (
            item for item in encargos_usuario
            if str(item.get("id_expediente") or "") == str(id_expediente)
        ),
        None,
    )
    if not encargo:
        raise HTTPException(
            status_code=403,
            detail="Este expediente no está asignado al apoderado autenticado.",
        )

    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    protocolo = datos.protocolo.strip()
    if not protocolo:
        raise HTTPException(status_code=422, detail="Indica el número de protocolo.")
    notario_otorgante = datos.notario_otorgante.strip()
    if not notario_otorgante:
        raise HTTPException(status_code=422, detail="Indica el notario otorgante.")
    tipo_firma = datos.tipo_firma.strip()
    if tipo_firma not in {"Videoconferencia", "Presencial"}:
        raise HTTPException(status_code=422, detail="El tipo de firma debe ser Videoconferencia o Presencial.")

    if datos.fecha_firma > datetime.now(ZoneInfo("Europe/Madrid")).date():
        raise HTTPException(status_code=422, detail="La fecha real de firma no puede ser futura.")

    notario = None
    nif_notario = str(getattr(expediente, "nif_notario", "") or "").strip()
    if nif_notario:
        notario = db.query(Notaria).filter(
            func.lower(func.trim(Notaria.nif)) == nif_notario.lower()
        ).first()
    if notario is None:
        nombre_objetivo = _normalizar_nombre(
            getattr(expediente, "nombre_notario", None) or getattr(expediente, "notario", None)
        )
        if nombre_objetivo:
            for candidato in db.query(Notaria).all():
                nombre_candidato = _normalizar_nombre(" ".join(filter(None, [
                    getattr(candidato, "nombre", None),
                    getattr(candidato, "apellidos", None),
                ])))
                if nombre_candidato == nombre_objetivo:
                    notario = candidato
                    break

    try:
        expediente.fecha_firma = datos.fecha_firma
        expediente.protocolo = protocolo
        expediente.notario_otorgante = notario_otorgante
        expediente.tipo_firma = tipo_firma

        # La cita pasa a la fecha en que la firma ocurrió realmente y queda
        # marcada como realizada. La fecha prevista original se conserva en
        # Expediente.fecha_prevista_firma para calcular la media hasta firma.
        cita = (
            db.query(Cita)
            .filter(
                Cita.expediente_id == expediente.id,
                func.lower(func.trim(func.coalesce(Cita.tipo_cita, ""))) == "firma notarial",
            )
            .order_by(Cita.id.desc())
            .first()
        )
        marca_realizada = (
            f"FIRMA REALIZADA | Fecha real: {datos.fecha_firma.isoformat()} "
            f"| Protocolo: {protocolo}"
        )
        if cita is None:
            apoderado_nombre = str(getattr(expediente, "apoderado", "") or "").strip()
            apoderado_id = getattr(notario, "apoderado_id", None)
            if apoderado_id is None and apoderado_nombre:
                nombre_apoderado_normalizado = _normalizar_nombre(apoderado_nombre)
                for empleado in db.query(Empleado).all():
                    nombre_empleado = _normalizar_nombre(" ".join(filter(None, [
                        getattr(empleado, "nombre", None),
                        getattr(empleado, "apellidos", None),
                    ])))
                    if nombre_empleado == nombre_apoderado_normalizado:
                        apoderado_id = empleado.id
                        break
            cita = Cita(
                expediente_id=expediente.id,
                fecha=datos.fecha_firma,
                hora_inicio=time(9, 0),
                hora_fin=time(10, 0),
                tipo_cita="Firma notarial",
                notario_id=getattr(notario, "id", None),
                tipo_firma=tipo_firma,
                apoderado=apoderado_nombre or None,
                apoderado_id=apoderado_id,
                observaciones=marca_realizada,
            )
            db.add(cita)
        else:
            cita.fecha = datos.fecha_firma
            cita.tipo_firma = tipo_firma
            observaciones_previas = str(cita.observaciones or "").strip()
            if "FIRMA REALIZADA" not in observaciones_previas.upper():
                cita.observaciones = " | ".join(
                    parte for parte in (observaciones_previas, marca_realizada) if parte
                )
            else:
                cita.observaciones = marca_realizada

        db.commit()
        db.refresh(expediente)
        db.refresh(cita)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo registrar la firma real y actualizar Agenda: {str(exc)[:250]}",
        )

    return {
        "ok": True,
        "id_expediente": expediente.id_expediente,
        "fecha_firma": expediente.fecha_firma.isoformat() if expediente.fecha_firma else None,
        "protocolo": expediente.protocolo,
        "notario_otorgante": expediente.notario_otorgante,
        "tipo_firma": expediente.tipo_firma,
        "cita_id": cita.id,
        "cita_realizada": True,
        "mensaje": "Firma real registrada y cita de Agenda marcada como realizada.",
    }


class AceptarEncargo(BaseModel):
    numero_solicitud_pnc: str = Field(..., min_length=1, max_length=200)
    fecha_solicitud_pnc: date
    fecha_prevista_firma: date
    hora_inicio: time
    hora_fin: time


def _normalizar_nombre(valor):
    import unicodedata
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    return "".join(c for c in texto if not unicodedata.combining(c)).strip().casefold()


@router.post("/{id_expediente}/aceptar", summary="Aceptar encargo y crear o actualizar la cita de firma")
def aceptar_encargo(
    id_expediente: str,
    datos: AceptarEncargo,
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    """Guarda en el expediente los mismos campos que usa Enviar a notario y sincroniza Agenda."""
    encargos_usuario = listar_encargos(db, usuario, solo_pendientes=False)
    encargo = next(
        (item for item in encargos_usuario if str(item.get("id_expediente") or "") == str(id_expediente)),
        None,
    )
    if not encargo:
        raise HTTPException(status_code=403, detail="Este expediente no está asignado al apoderado autenticado.")
    if encargo.get("bloqueado"):
        raise HTTPException(status_code=423, detail="El expediente está bloqueado y no se puede aceptar el encargo.")

    if datos.hora_fin <= datos.hora_inicio:
        raise HTTPException(status_code=422, detail="La hora de fin debe ser posterior a la hora de inicio.")

    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == str(id_expediente))
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    # Primero se identifica el notario por NIF; si falta, se compara el nombre completo.
    notario = None
    nif = str(getattr(expediente, "nif_notario", "") or "").strip()
    if nif:
        notario = db.query(Notaria).filter(func.lower(func.trim(Notaria.nif)) == nif.lower()).first()
    if notario is None:
        nombre_notario = _normalizar_nombre(
            getattr(expediente, "nombre_notario", None) or getattr(expediente, "notario", None)
        )
        if nombre_notario:
            for candidato in db.query(Notaria).all():
                nombre = _normalizar_nombre(" ".join(filter(None, [
                    getattr(candidato, "nombre", None),
                    getattr(candidato, "apellidos", None),
                ])))
                if nombre == nombre_notario:
                    notario = candidato
                    break
    if notario is None:
        raise HTTPException(
            status_code=409,
            detail="No se ha podido identificar el notario en el catálogo CTN por NIF o nombre. Revisa los datos del envío a notario.",
        )

    apoderado_nombre = str(getattr(expediente, "apoderado", "") or "").strip()
    apoderado_id = getattr(notario, "apoderado_id", None)
    if apoderado_id is None and apoderado_nombre:
        for empleado in db.query(Empleado).all():
            nombre_empleado = _normalizar_nombre(" ".join(filter(None, [
                getattr(empleado, "nombre", None),
                getattr(empleado, "apellidos", None),
            ])))
            if nombre_empleado == _normalizar_nombre(apoderado_nombre):
                apoderado_id = empleado.id
                break

    try:
        expediente.numero_solicitud_pnc = datos.numero_solicitud_pnc.strip()
        expediente.fecha_solicitud_pnc = datos.fecha_solicitud_pnc
        expediente.fecha_prevista_firma = datos.fecha_prevista_firma
        expediente.hora_prevista_firma = datos.hora_inicio
        expediente.hora_fin_prevista_firma = datos.hora_fin

        cita = (
            db.query(Cita)
            .filter(
                Cita.expediente_id == expediente.id,
                func.lower(func.trim(func.coalesce(Cita.tipo_cita, ""))) == "firma notarial",
            )
            .order_by(Cita.id.desc())
            .first()
        )
        observaciones = f"Firma prevista — Expediente {expediente.id_expediente}"
        if cita is None:
            cita = Cita(
                expediente_id=expediente.id,
                tipo_cita="Firma notarial",
            )
            db.add(cita)
        cita.fecha = datos.fecha_prevista_firma
        cita.hora_inicio = datos.hora_inicio
        cita.hora_fin = datos.hora_fin
        cita.notario_id = notario.id
        cita.tipo_firma = getattr(expediente, "tipo_firma", None) or getattr(notario, "vc", None)
        cita.apoderado = apoderado_nombre or getattr(notario, "apoderado", None)
        cita.apoderado_id = apoderado_id
        cita.observaciones = observaciones

        db.commit()
        db.refresh(expediente)
        db.refresh(cita)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo aceptar el encargo ni sincronizar Agenda: {str(exc)[:250]}")

    return {
        "ok": True,
        "id_expediente": expediente.id_expediente,
        "cita_id": cita.id,
        "fecha_prevista_firma": expediente.fecha_prevista_firma.isoformat() if expediente.fecha_prevista_firma else None,
        "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
        "hora_fin": cita.hora_fin.isoformat() if cita.hora_fin else None,
        "mensaje": "Encargo aceptado. Los datos quedan guardados en Ficha Expediente y la cita de firma está sincronizada con Agenda.",
    }


"""Endpoints de encargos de ApoderaGest."""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import obtener_usuario_actual, get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.apoderagest.encargos.service import listar_encargos
from backend.app.apoderagest.permissions import obtener_id_empleado
from backend.app.expedientes.models import Expediente
from backend.app.agenda.models import Cita
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado
from backend.app.expediente_observaciones.models import ExpedienteObservacion

router = APIRouter(
    prefix="/apoderagest/encargos",
    tags=["ApoderaGest - Encargos"],
)


class ReasignarEncargoAdmin(BaseModel):
    """Cambio explícito de asignación; requiere permisos administrativos."""
    id_expediente: str = Field(..., min_length=1, max_length=100)
    apoderado_empleado_id: int = Field(..., gt=0)


@router.post("/reparar-asignacion", summary="Corregir una asignación histórica de apoderado")
def reparar_asignacion_encargo(
    datos: ReasignarEncargoAdmin,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Actualiza únicamente el apoderado y su FK, sin volver a guardar el envío.

    Requiere permiso de edición de Expedientes o de Seguridad. Se utiliza para
    reparar asignaciones históricas y no altera fechas, documentos ni agenda.
    """
    autorizado = False
    for modulo in ("expedientes", "seguridad"):
        try:
            require_perm_modulo(usuario, modulo, "editar")
            autorizado = True
            break
        except HTTPException as exc:
            if exc.status_code != 403:
                raise
    if not autorizado:
        raise HTTPException(
            status_code=403,
            detail="Necesitas permiso de edición de Expedientes o Seguridad para reasignar encargos.",
        )

    id_expediente = datos.id_expediente.strip()
    expediente = (
        db.query(Expediente)
        .filter(Expediente.id_expediente == id_expediente)
        .with_for_update()
        .first()
    )
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    empleado = (
        db.query(Empleado)
        .filter(Empleado.id == datos.apoderado_empleado_id)
        .first()
    )
    if empleado is None or getattr(empleado, "activo", True) is False:
        raise HTTPException(status_code=422, detail="El empleado seleccionado no existe o está inactivo.")

    nombre_anterior = getattr(expediente, "apoderado", None)
    empleado_anterior_id = getattr(expediente, "apoderado_empleado_id", None)
    nombre_nuevo = " ".join(
        parte for parte in (
            str(getattr(empleado, "nombre", "") or "").strip(),
            str(getattr(empleado, "apellidos", "") or "").strip(),
        ) if parte
    )
    if not nombre_nuevo:
        raise HTTPException(status_code=422, detail="El empleado seleccionado no tiene nombre y apellidos.")

    try:
        expediente.apoderado = nombre_nuevo
        expediente.apoderado_empleado_id = empleado.id
        db.commit()
        db.refresh(expediente)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo corregir la asignación del expediente: {str(exc)[:200]}",
        )

    return {
        "ok": True,
        "id_expediente": expediente.id_expediente,
        "apoderado_anterior": nombre_anterior,
        "apoderado_empleado_id_anterior": empleado_anterior_id,
        "apoderado": expediente.apoderado,
        "apoderado_empleado_id": expediente.apoderado_empleado_id,
        "mensaje": "Asignación corregida. No se han modificado documentos, fechas ni citas de Agenda.",
    }


@router.get("")
def obtener_encargos(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
    pendientes: bool = Query(True, description="Solo envíos pendientes de firma"),
):
    return listar_encargos(db, usuario, solo_pendientes=pendientes)



class ComentarioGestorApoderagest(BaseModel):
    comentario: str = Field(..., min_length=1, max_length=2000)
    empleado_destinatario_id: int


@router.get("/gestores", summary="Listar gestores disponibles para comunicaciones de ApoderaGest")
def listar_gestores_apoderagest(
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    empleados = db.query(Empleado).filter(Empleado.activo.is_(True)).order_by(Empleado.apellidos.asc(), Empleado.nombre.asc()).all()
    return [{"id": empleado.id, "nombre": " ".join(filter(None, [empleado.nombre, empleado.apellidos]))} for empleado in empleados]


@router.post("/{id_expediente}/comentarios", summary="Enviar una observación al gestor desde ApoderaGest")
def crear_comentario_gestor_apoderagest(
    id_expediente: str,
    datos: ComentarioGestorApoderagest,
    db: Session = Depends(get_db),
    usuario=Depends(obtener_usuario_actual),
):
    asignados = listar_encargos(db, usuario, solo_pendientes=False)
    encargo = next((item for item in asignados if str(item.get("id_expediente") or "") == str(id_expediente)), None)
    if not encargo:
        raise HTTPException(status_code=403, detail="Este expediente no está asignado al apoderado autenticado.")
    expediente = db.query(Expediente).filter(Expediente.id_expediente == str(id_expediente)).first()
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    destinatario = db.query(Empleado).filter(Empleado.id == datos.empleado_destinatario_id, Empleado.activo.is_(True)).first()
    if not destinatario:
        raise HTTPException(status_code=404, detail="El gestor seleccionado no existe o está inactivo.")
    comentario = datos.comentario.strip()
    if not comentario:
        raise HTTPException(status_code=422, detail="Escribe la observación antes de enviarla.")
    observacion = ExpedienteObservacion(
        expediente_id=expediente.id,
        comentario=comentario,
        visibilidad="Gestor",
        empleado_destinatario_id=destinatario.id,
        autor_empleado_id=None,
        activo=True,
    )
    try:
        db.add(observacion)
        db.commit()
        db.refresh(observacion)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="No se pudo guardar la observación dirigida al gestor.")
    return {"ok": True, "id": observacion.id, "comentario": observacion.comentario, "empleado_destinatario_id": destinatario.id}


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
    # La firma puede corregirse desde ApoderaGest por el apoderado asignado.
    # Se actualizan los campos oficiales del expediente y la marca de Agenda
    # sin mover la cita de su fecha planificada.

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
        # La cita pertenece al empleado apoderado asignado al expediente,
        # no al apoderado asociado al registro CTN del notario.
        apoderado_id = (
            getattr(expediente, "apoderado_empleado_id", None)
            or obtener_id_empleado(usuario)
        )
        empleado_apoderado = (
            db.query(Empleado).filter(Empleado.id == apoderado_id).first()
            if apoderado_id is not None else None
        )
        apoderado_nombre = " ".join(filter(None, [
            str(getattr(empleado_apoderado, "nombre", "") or "").strip(),
            str(getattr(empleado_apoderado, "apellidos", "") or "").strip(),
        ])).strip() or str(getattr(expediente, "apoderado", "") or "").strip()

        if cita is None:
            # Si faltaba la cita, reconstruirla en la fecha prevista siempre
            # que exista. La fecha real se registra en el expediente y en la
            # observación; no desplazamos la cita del día que estaba planificada.
            cita = Cita(
                expediente_id=expediente.id,
                fecha=getattr(expediente, "fecha_prevista_firma", None) or datos.fecha_firma,
                hora_inicio=getattr(expediente, "hora_prevista_firma", None) or time(9, 0),
                hora_fin=getattr(expediente, "hora_fin_prevista_firma", None) or time(10, 0),
                tipo_cita="Firma notarial",
                notario_id=getattr(notario, "id", None),
                tipo_firma=tipo_firma,
                apoderado=apoderado_nombre or None,
                apoderado_id=apoderado_id,
                observaciones=marca_realizada,
            )
            db.add(cita)
        else:
            # Conservamos/restauramos la fecha planificada para que la cita
            # siga visible en el día reservado, incluso al reparar una firma
            # que antes desplazó la cita a la fecha real.
            cita.fecha = getattr(expediente, "fecha_prevista_firma", None) or cita.fecha
            cita.tipo_firma = tipo_firma
            cita.notario_id = getattr(notario, "id", None) or cita.notario_id
            cita.apoderado_id = apoderado_id or cita.apoderado_id
            cita.apoderado = apoderado_nombre or cita.apoderado
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
    fecha_envio: date
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

    # La asignación de Agenda debe apuntar al apoderado del expediente
    # (o al usuario autenticado, ya validado contra sus encargos), no al
    # apoderado genérico que pueda tener asociado el registro CTN.
    apoderado_id = (
        getattr(expediente, "apoderado_empleado_id", None)
        or obtener_id_empleado(usuario)
    )
    empleado_apoderado = (
        db.query(Empleado).filter(Empleado.id == apoderado_id).first()
        if apoderado_id is not None else None
    )
    apoderado_nombre = " ".join(filter(None, [
        str(getattr(empleado_apoderado, "nombre", "") or "").strip(),
        str(getattr(empleado_apoderado, "apellidos", "") or "").strip(),
    ])).strip() or str(getattr(expediente, "apoderado", "") or "").strip()

    try:
        if hasattr(expediente, "fecha_envio_notario"):
            expediente.fecha_envio_notario = datos.fecha_envio
        elif hasattr(expediente, "fecha_envio"):
            expediente.fecha_envio = datos.fecha_envio
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

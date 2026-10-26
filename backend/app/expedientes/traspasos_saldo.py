"""Control agrupado de traspasos de saldo entre expedientes relacionados.

La relación se identifica por VINCCANC. La operación no se ejecuta hasta que
el receptor tenga fecha de firma y protocolo; la actualización del importe es
confirmada expresamente por un gestor tras la verificación externa.
"""
import os
import smtplib
import unicodedata
from datetime import date, datetime
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.expedientes.reparto import ids_expedientes_visibles

router = APIRouter(prefix="/expedientes", tags=["Traspasos de saldo"])


def _normalizar(valor):
    texto = unicodedata.normalize("NFD", str(valor or ""))
    return "".join(c for c in texto if unicodedata.category(c) != "Mn").strip().lower()


def _es_cancelacion_con_provision(expediente):
    tipo = _normalizar(getattr(expediente, "tipo_operacion", ""))
    return "cancelacion con provision" in tipo


def _asegurar_tablas(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS public.expediente_traspasos_saldo (
            id SERIAL PRIMARY KEY,
            receptor_id INTEGER NOT NULL REFERENCES public.expedientes(id),
            receptor_numero VARCHAR(100) NOT NULL,
            estado VARCHAR(40) NOT NULL DEFAULT 'pendiente_verificacion',
            importe_receptor_anterior DOUBLE PRECISION NULL,
            importe_receptor_actualizado DOUBLE PRECISION NULL,
            email_destinatario VARCHAR(320) NULL,
            email_asunto VARCHAR(1000) NULL,
            email_cuerpo TEXT NULL,
            email_estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
            creado_por_id INTEGER NULL,
            creado_por VARCHAR(300) NULL,
            creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            verificado_por_id INTEGER NULL,
            verificado_por VARCHAR(300) NULL,
            verificado_en TIMESTAMP WITHOUT TIME ZONE NULL,
            email_enviado_en TIMESTAMP WITHOUT TIME ZONE NULL,
            cerrado_en TIMESTAMP WITHOUT TIME ZONE NULL,
            cancelado_en TIMESTAMP WITHOUT TIME ZONE NULL,
            motivo_cancelacion TEXT NULL
        )
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS public.expediente_traspasos_saldo_origenes (
            id SERIAL PRIMARY KEY,
            traspaso_id INTEGER NOT NULL REFERENCES public.expediente_traspasos_saldo(id),
            origen_id INTEGER NOT NULL REFERENCES public.expedientes(id),
            origen_numero VARCHAR(100) NOT NULL,
            saldo_disponible_referencia DOUBLE PRECISION NULL,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            UNIQUE (traspaso_id, origen_id)
        )
    """))
    db.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_traspaso_saldo_origen_activo
        ON public.expediente_traspasos_saldo_origenes (origen_id)
        WHERE activo = TRUE
    """))
    db.commit()


def _visible(db, usuario, expedientes):
    ids = ids_expedientes_visibles(db, usuario)
    if ids is None:
        return
    if any(exp.id not in ids for exp in expedientes):
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")


def _firma_protocolo_ok(expediente):
    faltan = []
    if not getattr(expediente, "fecha_firma", None):
        faltan.append("fecha de firma real")
    if not str(getattr(expediente, "protocolo", "") or "").strip():
        faltan.append("número de protocolo")
    return faltan


def _email_cliente(expediente):
    candidato = str(getattr(expediente, "facturacion_email", "") or "").strip()
    if candidato:
        return candidato
    cliente = getattr(expediente, "cliente", None)
    return str(
        getattr(cliente, "email_facturacion", None)
        or getattr(cliente, "email", None)
        or ""
    ).strip()


def _serializar_operacion(db, fila):
    origenes = db.execute(text("""
        SELECT o.origen_numero, o.saldo_disponible_referencia, o.activo,
               e.liquidado_sin_tramitar
        FROM public.expediente_traspasos_saldo_origenes o
        JOIN public.expedientes e ON e.id = o.origen_id
        WHERE o.traspaso_id = :id
        ORDER BY o.id
    """), {"id": fila["id"]}).mappings().all()
    return {
        "id": fila["id"],
        "receptor_numero": fila["receptor_numero"],
        "estado": fila["estado"],
        "importe_receptor_anterior": fila["importe_receptor_anterior"],
        "importe_receptor_actualizado": fila["importe_receptor_actualizado"],
        "email_destinatario": fila["email_destinatario"],
        "email_estado": fila["email_estado"],
        "creado_en": fila["creado_en"].isoformat() if fila["creado_en"] else None,
        "verificado_en": fila["verificado_en"].isoformat() if fila["verificado_en"] else None,
        "email_enviado_en": fila["email_enviado_en"].isoformat() if fila["email_enviado_en"] else None,
        "origenes": [
            {
                "numero": o["origen_numero"],
                "saldo_disponible_referencia": o["saldo_disponible_referencia"],
                "activo": o["activo"],
                "liquidado_sin_tramitar": bool(o["liquidado_sin_tramitar"]),
            } for o in origenes
        ],
    }


class CrearTraspaso(BaseModel):
    receptor_numero: str
    origenes_numeros: list[str] = Field(min_items=1)


class VerificarTraspaso(BaseModel):
    importe_receptor: float = Field(ge=0)
    destinatario: str = Field(min_length=3, max_length=320)
    asunto: str = Field(min_length=3, max_length=1000)
    cuerpo: str = Field(min_length=5)


class CancelarTraspaso(BaseModel):
    motivo: str = Field(min_length=3, max_length=1000)


@router.get("/{id_expediente}/traspasos-saldo/contexto")
def contexto_traspasos_saldo(
    id_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_tablas(db)
    actual = db.query(Expediente).filter(Expediente.id_expediente == id_expediente).first()
    if not actual:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")
    _visible(db, usuario, [actual])
    if not _es_cancelacion_con_provision(actual):
        return {"habilitado": False, "motivo": "Este control solo se aplica a Cancelación con provisión.", "expediente": None, "candidatos": [], "operaciones": []}

    vinculo = str(getattr(actual, "vinccanc", "") or "").strip()
    relacionados = []
    if vinculo:
        relacionados = (
            db.query(Expediente)
            .filter(Expediente.vinccanc == vinculo)
            .order_by(Expediente.id_expediente.asc())
            .all()
        )
    ids_visibles = ids_expedientes_visibles(db, usuario)
    if ids_visibles is not None:
        relacionados = [e for e in relacionados if e.id in ids_visibles]
    elif not relacionados:
        relacionados = [actual]

    candidatos = []
    for exp in relacionados:
        if not _es_cancelacion_con_provision(exp):
            continue
        activo = db.execute(text("""
            SELECT t.id, t.estado
            FROM public.expediente_traspasos_saldo_origenes o
            JOIN public.expediente_traspasos_saldo t ON t.id = o.traspaso_id
            WHERE o.origen_id = :id AND o.activo = TRUE
            ORDER BY t.id DESC LIMIT 1
        """), {"id": exp.id}).mappings().first()
        faltan = _firma_protocolo_ok(exp)
        candidatos.append({
            "numero": exp.id_expediente,
            "importe": exp.importe,
            "saldo_disponible": exp.saldo_disponible,
            "tipo_operacion": exp.tipo_operacion,
            "vinccanc": exp.vinccanc,
            "fecha_firma": exp.fecha_firma.isoformat() if exp.fecha_firma else None,
            "protocolo": exp.protocolo,
            "liquidado_sin_tramitar": bool(exp.liquidado_sin_tramitar),
            "bloqueado_por_traspaso": bool(activo),
            "traspaso_activo_id": activo["id"] if activo else None,
            "motivo_bloqueo_traspaso": f"Ya está incluido en el traspaso #{activo['id']} ({activo['estado']})." if activo else None,
            "faltan_requisitos_receptor": faltan,
            "email_cliente": _email_cliente(exp),
        })

    ids_rel = [e.id for e in relacionados] or [actual.id]
    operaciones_raw = db.execute(text("""
        SELECT DISTINCT t.*
        FROM public.expediente_traspasos_saldo t
        LEFT JOIN public.expediente_traspasos_saldo_origenes o ON o.traspaso_id = t.id
        WHERE t.receptor_id = ANY(:ids) OR o.origen_id = ANY(:ids)
        ORDER BY t.id DESC
        LIMIT 50
    """), {"ids": ids_rel}).mappings().all()
    return {
        "habilitado": True,
        "expediente": {
            "numero": actual.id_expediente,
            "vinccanc": vinculo,
            "tipo_operacion": actual.tipo_operacion,
            "importe": actual.importe,
            "saldo_disponible": actual.saldo_disponible,
            "fecha_firma": actual.fecha_firma.isoformat() if actual.fecha_firma else None,
            "protocolo": actual.protocolo,
            "email_cliente": _email_cliente(actual),
        },
        "candidatos": candidatos,
        "operaciones": [_serializar_operacion(db, dict(f)) for f in operaciones_raw],
    }


@router.post("/traspasos-saldo")
def crear_traspaso_saldo(
    datos: CrearTraspaso,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_tablas(db)
    numeros = list(dict.fromkeys([str(x).strip() for x in datos.origenes_numeros if str(x).strip()]))
    if not numeros:
        raise HTTPException(status_code=400, detail="Selecciona al menos un expediente de origen.")
    if datos.receptor_numero.strip() in numeros:
        raise HTTPException(status_code=400, detail="El expediente receptor no puede ser también un origen.")

    db.query(Expediente).filter(Expediente.id_expediente.in_([datos.receptor_numero.strip(), *numeros])).with_for_update().all()
    receptor = db.query(Expediente).filter(Expediente.id_expediente == datos.receptor_numero.strip()).first()
    origenes = db.query(Expediente).filter(Expediente.id_expediente.in_(numeros)).all()
    if not receptor or len(origenes) != len(numeros):
        raise HTTPException(status_code=404, detail="No se han encontrado todos los expedientes seleccionados.")
    _visible(db, usuario, [receptor, *origenes])
    if not _es_cancelacion_con_provision(receptor) or any(not _es_cancelacion_con_provision(e) for e in origenes):
        raise HTTPException(status_code=400, detail="Solo se permiten expedientes de Cancelación con provisión.")
    faltan = _firma_protocolo_ok(receptor)
    if faltan:
        raise HTTPException(status_code=409, detail="Traspaso bloqueado: al expediente receptor le falta " + " y ".join(faltan) + ".")
    vinculo = str(getattr(receptor, "vinccanc", "") or "").strip()
    if not vinculo or any(str(getattr(e, "vinccanc", "") or "").strip() != vinculo for e in origenes):
        raise HTTPException(status_code=400, detail="Los expedientes deben compartir el mismo código VincCanc (VINCCANC) para considerarse relacionados.")
    if any(e.liquidado_sin_tramitar for e in origenes):
        raise HTTPException(status_code=409, detail="Uno de los expedientes de origen ya está liquidado sin tramitar.")
    receptor_activo = db.execute(text("""
        SELECT id, estado FROM public.expediente_traspasos_saldo
        WHERE receptor_id=:rid AND estado IN ('pendiente_verificacion', 'pendiente_email')
        ORDER BY id DESC LIMIT 1
    """), {"rid": receptor.id}).mappings().first()
    if receptor_activo:
        raise HTTPException(status_code=409, detail="El expediente receptor ya tiene un traspaso agrupado pendiente (#" + str(receptor_activo["id"]) + "). Continúa esa operación en lugar de crear otra.")
    existente = db.execute(text("""
        SELECT o.origen_numero, t.id, t.estado
        FROM public.expediente_traspasos_saldo_origenes o
        JOIN public.expediente_traspasos_saldo t ON t.id = o.traspaso_id
        WHERE o.origen_id = ANY(:ids) AND o.activo = TRUE
        LIMIT 1
    """), {"ids": [e.id for e in origenes]}).mappings().first()
    if existente:
        raise HTTPException(status_code=409, detail=f"El expediente {existente['origen_numero']} ya está reservado en el traspaso #{existente['id']} ({existente['estado']}). Cancela o completa esa operación antes de reutilizarlo.")

    nombre = " ".join(filter(None, [str(getattr(usuario, "nombre", "") or "").strip(), str(getattr(usuario, "apellidos", "") or "").strip()]))
    creado = db.execute(text("""
        INSERT INTO public.expediente_traspasos_saldo
          (receptor_id, receptor_numero, estado, importe_receptor_anterior,
           email_destinatario, creado_por_id, creado_por)
        VALUES (:rid, :rnum, 'pendiente_verificacion', :importe, :email, :uid, :nombre)
        RETURNING id
    """), {
        "rid": receptor.id, "rnum": receptor.id_expediente, "importe": receptor.importe,
        "email": _email_cliente(receptor) or None, "uid": getattr(usuario, "id", None),
        "nombre": nombre or str(getattr(usuario, "usuario", "") or ""),
    }).scalar()
    for origen in origenes:
        db.execute(text("""
            INSERT INTO public.expediente_traspasos_saldo_origenes
              (traspaso_id, origen_id, origen_numero, saldo_disponible_referencia, activo)
            VALUES (:tid, :oid, :num, :saldo, TRUE)
        """), {"tid": creado, "oid": origen.id, "num": origen.id_expediente, "saldo": origen.saldo_disponible})
    db.commit()
    return {"ok": True, "id": creado, "estado": "pendiente_verificacion", "mensaje": "Traspaso creado. Falta verificar el importe en la base de datos externa."}


@router.post("/traspasos-saldo/{traspaso_id}/verificar")
def verificar_traspaso_saldo(
    traspaso_id: int,
    datos: VerificarTraspaso,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_tablas(db)
    fila = db.execute(text("SELECT * FROM public.expediente_traspasos_saldo WHERE id=:id FOR UPDATE"), {"id": traspaso_id}).mappings().first()
    if not fila:
        raise HTTPException(status_code=404, detail="Traspaso no encontrado.")
    if fila["estado"] != "pendiente_verificacion":
        raise HTTPException(status_code=409, detail="El traspaso ya no está pendiente de verificación.")
    receptor = db.query(Expediente).filter(Expediente.id == fila["receptor_id"]).with_for_update().first()
    if not receptor:
        raise HTTPException(status_code=404, detail="No se encuentra el expediente receptor.")
    _visible(db, usuario, [receptor])
    faltan = _firma_protocolo_ok(receptor)
    if faltan:
        raise HTTPException(status_code=409, detail="Traspaso bloqueado: al expediente receptor le falta " + " y ".join(faltan) + ".")
    if not _es_cancelacion_con_provision(receptor):
        raise HTTPException(status_code=409, detail="El receptor ya no cumple el tipo de operación requerido.")
    # La verificación externa es manual: el importe indicado por el gestor actualiza
    # exclusivamente el campo Importe del expediente receptor, nunca Saldo disponible.
    anterior = receptor.importe
    receptor.importe = float(datos.importe_receptor)
    nombre = " ".join(filter(None, [str(getattr(usuario, "nombre", "") or "").strip(), str(getattr(usuario, "apellidos", "") or "").strip()]))
    db.execute(text("""
        UPDATE public.expediente_traspasos_saldo
        SET estado='pendiente_email', importe_receptor_anterior=:anterior,
            importe_receptor_actualizado=:nuevo, email_destinatario=:destinatario,
            email_asunto=:asunto, email_cuerpo=:cuerpo,
            verificado_por_id=:uid, verificado_por=:nombre, verificado_en=:ahora
        WHERE id=:id
    """), {
        "anterior": anterior, "nuevo": float(datos.importe_receptor),
        "destinatario": datos.destinatario.strip(), "asunto": datos.asunto.strip(),
        "cuerpo": datos.cuerpo.strip(), "uid": getattr(usuario, "id", None),
        "nombre": nombre or str(getattr(usuario, "usuario", "") or ""),
        "ahora": datetime.utcnow(), "id": traspaso_id,
    })
    db.commit()
    return {"ok": True, "estado": "pendiente_email", "importe_anterior": anterior, "importe_actualizado": receptor.importe, "mensaje": "Importe del receptor actualizado manualmente y verificación registrada. Falta enviar el email al cliente."}


@router.post("/traspasos-saldo/{traspaso_id}/enviar-email")
def enviar_email_traspaso(
    traspaso_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_tablas(db)
    fila = db.execute(text("SELECT * FROM public.expediente_traspasos_saldo WHERE id=:id FOR UPDATE"), {"id": traspaso_id}).mappings().first()
    if not fila:
        raise HTTPException(status_code=404, detail="Traspaso no encontrado.")
    if fila["estado"] != "pendiente_email":
        raise HTTPException(status_code=409, detail="El traspaso no está pendiente de envío de email.")
    receptor = db.query(Expediente).filter(Expediente.id == fila["receptor_id"]).with_for_update().first()
    origenes_rows = db.execute(text("""
        SELECT o.origen_id, o.origen_numero FROM public.expediente_traspasos_saldo_origenes o
        WHERE o.traspaso_id=:id AND o.activo=TRUE
    """), {"id": traspaso_id}).mappings().all()
    origenes = db.query(Expediente).filter(Expediente.id.in_([r["origen_id"] for r in origenes_rows])).with_for_update().all()
    if not receptor or len(origenes) != len(origenes_rows):
        raise HTTPException(status_code=409, detail="Falta un expediente implicado en el traspaso.")
    _visible(db, usuario, [receptor, *origenes])
    faltan = _firma_protocolo_ok(receptor)
    if faltan:
        raise HTTPException(status_code=409, detail="Traspaso bloqueado: al expediente receptor le falta " + " y ".join(faltan) + ".")
    if not _es_cancelacion_con_provision(receptor) or any(not _es_cancelacion_con_provision(e) for e in origenes):
        raise HTTPException(status_code=409, detail="Algún expediente ya no cumple el tipo de operación requerido.")
    destino = str(fila["email_destinatario"] or "").strip()
    if "@" not in destino:
        raise HTTPException(status_code=400, detail="Introduce un email válido del cliente antes de enviar.")
    host = os.getenv("SMTP_HOST", "").strip()
    from_email = os.getenv("SMTP_FROM", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    if not host or not from_email:
        raise HTTPException(status_code=503, detail="No se puede enviar el email: faltan SMTP_HOST o SMTP_FROM en las variables de entorno del backend.")

    mensaje = EmailMessage()
    mensaje["Subject"] = fila["email_asunto"] or f"Actualización de saldo · expediente {receptor.id_expediente}"
    mensaje["From"] = from_email
    mensaje["To"] = destino
    remitente_usuario = str(getattr(usuario, "email_empresa", "") or getattr(usuario, "email_personal", "") or "").strip()
    if remitente_usuario and remitente_usuario.lower() != from_email.lower():
        mensaje["Reply-To"] = remitente_usuario
    mensaje.set_content(fila["email_cuerpo"] or f"Le informamos de la actualización del importe del expediente {receptor.id_expediente}.")
    try:
        with smtplib.SMTP(host, port, timeout=25) as servidor:
            servidor.ehlo()
            if os.getenv("SMTP_STARTTLS", "true").strip().lower() in {"1", "true", "yes", "si"}:
                servidor.starttls()
                servidor.ehlo()
            if smtp_user:
                servidor.login(smtp_user, smtp_password)
            servidor.send_message(mensaje)
    except Exception as error:
        db.execute(text("""
            UPDATE public.expediente_traspasos_saldo SET email_estado='error' WHERE id=:id
        """), {"id": traspaso_id})
        db.commit()
        raise HTTPException(status_code=502, detail=f"No se pudo enviar el email; el traspaso sigue pendiente de comunicación. Detalle: {str(error)[:300]}")

    ahora = datetime.utcnow()
    for origen in origenes:
        origen.liquidado_sin_tramitar = True
        origen.fecha_liquidacion_sin_tramitar = date.today()
    db.execute(text("""
        UPDATE public.expediente_traspasos_saldo
        SET estado='cerrado', email_estado='enviado', email_enviado_en=:ahora, cerrado_en=:ahora
        WHERE id=:id
    """), {"ahora": ahora, "id": traspaso_id})
    db.execute(text("""
        UPDATE public.expediente_traspasos_saldo_origenes
        SET activo=FALSE WHERE traspaso_id=:id
    """), {"id": traspaso_id})
    db.commit()
    return {"ok": True, "estado": "cerrado", "email_estado": "enviado", "mensaje": "Email enviado. Los expedientes de origen se han marcado como Liquidado sin tramitar."}


@router.post("/traspasos-saldo/{traspaso_id}/cancelar")
def cancelar_traspaso_saldo(
    traspaso_id: int,
    datos: CancelarTraspaso,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    _asegurar_tablas(db)
    fila = db.execute(text("SELECT * FROM public.expediente_traspasos_saldo WHERE id=:id FOR UPDATE"), {"id": traspaso_id}).mappings().first()
    if not fila:
        raise HTTPException(status_code=404, detail="Traspaso no encontrado.")
    if fila["estado"] not in {"pendiente_verificacion", "pendiente_email"}:
        raise HTTPException(status_code=409, detail="Solo se pueden cancelar operaciones pendientes.")
    receptor = db.query(Expediente).filter(Expediente.id == fila["receptor_id"]).first()
    origen_rows = db.execute(text("SELECT origen_id FROM public.expediente_traspasos_saldo_origenes WHERE traspaso_id=:id AND activo=TRUE"), {"id": traspaso_id}).mappings().all()
    origenes = db.query(Expediente).filter(Expediente.id.in_([r["origen_id"] for r in origen_rows])).all()
    _visible(db, usuario, [e for e in [receptor, *origenes] if e])
    if fila["estado"] == "pendiente_email" and receptor:
        # No se revierte silenciosamente un importe que ya fue guardado; la cancelación
        # de esta fase exige dejar el importe anterior restaurado de forma explícita.
        raise HTTPException(status_code=409, detail="El importe del receptor ya se actualizó. Restaura manualmente el importe anterior en su ficha antes de cancelar esta operación.")
    db.execute(text("""
        UPDATE public.expediente_traspasos_saldo SET estado='cancelado',
          cancelado_en=:ahora, motivo_cancelacion=:motivo WHERE id=:id
    """), {"ahora": datetime.utcnow(), "motivo": datos.motivo.strip(), "id": traspaso_id})
    db.execute(text("UPDATE public.expediente_traspasos_saldo_origenes SET activo=FALSE WHERE traspaso_id=:id"), {"id": traspaso_id})
    db.commit()
    return {"ok": True, "estado": "cancelado", "mensaje": "Traspaso cancelado; los expedientes de origen vuelven a estar disponibles."}

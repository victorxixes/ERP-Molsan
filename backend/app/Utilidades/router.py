import logging

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.expedientes.models import Expediente
from backend.app.tipos_expediente.models import TipoExpediente
from backend.app.tipos_expediente.router import asegurar_catalogo_inicial
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.expedientes.reparto import resolver_key_actividad
from backend.app.empleados.models import Empleado
from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.Utilidades.importadores.ctn_importer import importar_ctn_desde_excel
from backend.app.Utilidades.importadores.expedientes_importer import importar_excel_expedientes


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/utilidades",
    tags=["Utilidades"]
)


# ============================================================
# IMPORTAR CTN
# ============================================================

@router.post("/ctn/importar")
async def importar_ctn(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    contenido = await fichero.read()

    total = importar_ctn_desde_excel(
        db,
        contenido
    )

    return {
        "importados": total
    }


# ============================================================
# CREAR COLUMNA GESTORIA EN EXPEDIENTES
# ============================================================

@router.post("/add_columna_gestoria_expedientes")
def add_columna_gestoria_expedientes(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "seguridad", "editar")
    """
    Crea la columna gestoria en la tabla expedientes
    si todavía no existe.
    """

    try:

        db.execute(
            text("""
                ALTER TABLE expedientes
                ADD COLUMN IF NOT EXISTS gestoria VARCHAR(200)
            """)
        )

        db.commit()

        return {
            "ok": True,
            "mensaje": "Columna gestoria creada correctamente en expedientes."
        }

    except Exception as e:

        db.rollback()

        return {
            "ok": False,
            "error": "No se pudo crear la columna gestoria.",
            "detalle": str(e)
        }


# ============================================================
# ASIGNAR EXPEDIENTES A PROMOCIONES (CATÁLOGO TIPOS DE EXPEDIENTE)
# ============================================================

class AsignarPromocionRequest(BaseModel):
    numero_expediente: str
    tipo_expediente_id: Optional[int] = None


@router.get("/tipos-promocion")
def listar_tipos_para_promociones(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    asegurar_catalogo_inicial(db)
    tipos = (
        db.query(TipoExpediente)
        .filter(
            TipoExpediente.activo.is_(True),
            TipoExpediente.grupo == "Tipos de expediente",
        )
        .order_by(TipoExpediente.nombre.asc())
        .all()
    )
    return [{"id": tipo.id, "nombre": tipo.nombre} for tipo in tipos]


@router.get("/expediente-promocion")
def consultar_promocion_expediente(
    numero_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    asegurar_catalogo_inicial(db)
    numero = (numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica el número de expediente.")

    expediente = (
        db.query(Expediente)
        .filter(func.lower(Expediente.id_expediente) == numero.lower())
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail=f"No se ha encontrado el expediente {numero}.")

    tipo_id_promocion = getattr(expediente, "promocion_tipo_expediente_id", None)
    tipo = db.query(TipoExpediente).filter(TipoExpediente.id == tipo_id_promocion).first() if tipo_id_promocion else None
    return {
        "numero_expediente": expediente.id_expediente,
        "actividad_actual": expediente.actividad_actual,
        "promocion_tipo_expediente_id": tipo_id_promocion,
        "promocion": tipo.nombre if tipo else None,
        "titular": expediente.nombre_titular,
        "estado_expediente": expediente.estado_expediente,
    }


@router.post("/asignar-promocion")
def asignar_promocion_expediente(
    datos: AsignarPromocionRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    numero = (datos.numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica el número de expediente.")

    expediente = (
        db.query(Expediente)
        .filter(func.lower(Expediente.id_expediente) == numero.lower())
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail=f"No se ha encontrado el expediente {numero}.")

    tipo = None
    if datos.tipo_expediente_id is not None:
        tipo = (
            db.query(TipoExpediente)
            .filter(
                TipoExpediente.id == datos.tipo_expediente_id,
                TipoExpediente.activo.is_(True),
                TipoExpediente.grupo == "Tipos de expediente",
            )
            .first()
        )
        if not tipo:
            raise HTTPException(status_code=400, detail="El tipo seleccionado no existe o está inactivo en el catálogo Tipos de expediente.")

    expediente.promocion_tipo_expediente_id = tipo.id if tipo else None
    # La etiqueta se calcula desde el catálogo; no se almacena en el campo libre promocion.
    expediente.promocion = None
    db.add(expediente)
    db.commit()
    db.refresh(expediente)
    return {
        "ok": True,
        "mensaje": f"Promoción asignada a {expediente.id_expediente}." if tipo else f"Se ha retirado la promoción de {expediente.id_expediente}.",
        "numero_expediente": expediente.id_expediente,
        "promocion_tipo_expediente_id": expediente.promocion_tipo_expediente_id,
        "promocion": tipo.nombre if tipo else None,
    }


# ============================================================
# REASIGNACIÓN MANUAL DEL GESTOR DE UN EXPEDIENTE
# ============================================================

class ReasignarGestorRequest(BaseModel):
    numero_expediente: str
    gestor_id: int


def _nombre_empleado(empleado):
    return " ".join(
        parte for parte in (
            (getattr(empleado, "nombre", None) or "").strip(),
            (getattr(empleado, "apellidos", None) or "").strip(),
        ) if parte
    ).strip()


@router.get("/gestores-asignacion")
def listar_gestores_para_reasignacion(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    empleados = (
        db.query(Empleado)
        .filter(Empleado.activo.is_(True))
        .order_by(Empleado.apellidos.asc(), Empleado.nombre.asc())
        .all()
    )
    return [
        {"id": empleado.id, "nombre": _nombre_empleado(empleado), "usuario": empleado.usuario}
        for empleado in empleados
        if _nombre_empleado(empleado)
    ]


@router.get("/expediente-gestor")
def consultar_gestor_expediente(
    numero_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    numero = (numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica el número de expediente.")

    expediente = (
        db.query(Expediente)
        .filter(func.lower(Expediente.id_expediente) == numero.lower())
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail=f"No se ha encontrado el expediente {numero}.")

    gestor = db.query(Empleado).filter(Empleado.id == expediente.gestor_asignado_id).first() if expediente.gestor_asignado_id else None
    return {
        "numero_expediente": expediente.id_expediente,
        "actividad_actual": getattr(expediente, "actividad_actual", None),
        "gestor_id": expediente.gestor_asignado_id,
        "gestor_nombre": _nombre_empleado(gestor) if gestor else None,
    }


@router.post("/reasignar-gestor")
def reasignar_gestor_expediente(
    datos: ReasignarGestorRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    numero = (datos.numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica el número de expediente.")

    expediente = (
        db.query(Expediente)
        .filter(func.lower(Expediente.id_expediente) == numero.lower())
        .first()
    )
    if not expediente:
        raise HTTPException(status_code=404, detail=f"No se ha encontrado el expediente {numero}.")

    gestor_nuevo = (
        db.query(Empleado)
        .filter(Empleado.id == datos.gestor_id, Empleado.activo.is_(True))
        .first()
    )
    if not gestor_nuevo:
        raise HTTPException(status_code=404, detail="El gestor seleccionado no existe o está inactivo.")

    gestor_anterior_id = expediente.gestor_asignado_id
    gestor_anterior = db.query(Empleado).filter(Empleado.id == gestor_anterior_id).first() if gestor_anterior_id else None
    if gestor_anterior_id == gestor_nuevo.id:
        return {
            "ok": True,
            "sin_cambios": True,
            "mensaje": f"El expediente {expediente.id_expediente} ya está asignado a {_nombre_empleado(gestor_nuevo)}.",
            "numero_expediente": expediente.id_expediente,
            "gestor_id": gestor_nuevo.id,
            "gestor_nombre": _nombre_empleado(gestor_nuevo),
        }

    actividad = getattr(expediente, "actividad_actual", None) or "sin_actividad"
    actividad_key = resolver_key_actividad(actividad, getattr(expediente, "fecha_firma", None)) or str(actividad)[:120]
    try:
        # La tabla se crea aquí también, por si la migración de arranque aún no ha terminado.
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS expediente_gestor_historial (
                id BIGSERIAL PRIMARY KEY,
                expediente_id VARCHAR(100) NOT NULL,
                actividad VARCHAR(120) NOT NULL,
                gestor_id INTEGER NULL REFERENCES empleados(id) ON DELETE SET NULL,
                gestor_anterior_id INTEGER NULL REFERENCES empleados(id) ON DELETE SET NULL,
                motivo VARCHAR(80) NOT NULL DEFAULT 'reparto_automatico',
                fecha TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """))
        expediente.gestor_asignado_id = gestor_nuevo.id
        db.execute(text("""
            INSERT INTO expediente_gestor_historial
                (expediente_id, actividad, gestor_id, gestor_anterior_id, motivo, fecha)
            VALUES (:expediente_id, :actividad, :gestor_id, :gestor_anterior_id, 'reasignacion_manual_utilidades', CURRENT_TIMESTAMP)
        """), {
            "expediente_id": str(expediente.id_expediente),
            "actividad": actividad_key,
            "gestor_id": gestor_nuevo.id,
            "gestor_anterior_id": gestor_anterior_id,
        })
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Error al reasignar manualmente el gestor del expediente %s", numero)
        raise HTTPException(status_code=500, detail="No se pudo guardar la reasignación. No se han confirmado los cambios.")

    return {
        "ok": True,
        "mensaje": f"El expediente {expediente.id_expediente} se ha reasignado correctamente.",
        "numero_expediente": expediente.id_expediente,
        "actividad_actual": actividad,
        "gestor_anterior_id": gestor_anterior_id,
        "gestor_anterior_nombre": _nombre_empleado(gestor_anterior) if gestor_anterior else None,
        "gestor_id": gestor_nuevo.id,
        "gestor_nombre": _nombre_empleado(gestor_nuevo),
    }


# ============================================================
# CORRESPONDENCIA TIPIFICADA
# Plantillas reutilizables y contexto dinámico de expedientes.
# La tabla se crea de forma idempotente para no exigir acceso a Swagger.
# ============================================================

def _asegurar_tabla_correspondencia(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS correspondencia_plantillas (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(180) NOT NULL,
            categoria VARCHAR(120) NOT NULL DEFAULT 'General',
            asunto VARCHAR(500) NOT NULL DEFAULT '',
            destinatario VARCHAR(500) NOT NULL DEFAULT '',
            cc VARCHAR(500) NOT NULL DEFAULT '',
            cuerpo TEXT NOT NULL DEFAULT '',
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.execute(text("""
        INSERT INTO correspondencia_plantillas (nombre, categoria, asunto, destinatario, cuerpo, activo)
        SELECT :nombre, :categoria, :asunto, :destinatario, :cuerpo, TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM correspondencia_plantillas WHERE lower(nombre) = lower(:nombre)
        )
    """), {
        "nombre": "Envío de provisión de fondos",
        "categoria": "Provisión de fondos",
        "asunto": "Provisión de fondos estimativa – Cliente {{cliente.nombre}}, Oficina {{oficina.numero}}, Número de provisión {{provision.id}}",
        "destinatario": "{{oficina.email}}",
        "cuerpo": "Buenos días:\n\nAdjuntamos la provisión de fondos estimativa correspondiente a la operación, para su conocimiento y revisión.\n\nEl documento adjunto recoge el importe estimado de la provisión necesaria para la tramitación.\n\nQuedamos a su disposición para cualquier aclaración.\n\nMuchas gracias.\n\nUn saludo,",
    })

    db.execute(text("""
        UPDATE correspondencia_plantillas
        SET asunto = :asunto, actualizado_en = CURRENT_TIMESTAMP
        WHERE lower(nombre) = lower(:nombre)
          AND asunto = :asunto_anterior
    """), {
        "nombre": "Envío de provisión de fondos",
        "asunto": "Provisión de fondos estimativa – Cliente {{cliente.nombre}}, Oficina {{oficina.numero}}, Número de provisión {{provision.id}}",
        "asunto_anterior": "Provisión de fondos estimativa – {{cliente.nombre}}, {{oficina.numero}}, {{provision.id}}",
    })

    db.commit()


class PlantillaCorrespondenciaRequest(BaseModel):
    nombre: str
    categoria: str = "General"
    asunto: str = ""
    destinatario: str = ""
    cc: str = ""
    cuerpo: str = ""
    activo: bool = True


def _plantilla_dict(row):
    return {
        "id": row["id"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "asunto": row["asunto"],
        "destinatario": row["destinatario"],
        "cc": row["cc"],
        "cuerpo": row["cuerpo"],
        "activo": row["activo"],
        "creado_en": row["creado_en"].isoformat() if row.get("creado_en") else None,
        "actualizado_en": row["actualizado_en"].isoformat() if row.get("actualizado_en") else None,
    }


@router.get("/correspondencia/plantillas")
def listar_plantillas_correspondencia(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "ver")
    _asegurar_tabla_correspondencia(db)
    filas = db.execute(text("""
        SELECT id, nombre, categoria, asunto, destinatario, cc, cuerpo, activo, creado_en, actualizado_en
        FROM correspondencia_plantillas
        ORDER BY activo DESC, categoria ASC, nombre ASC
    """)).mappings().all()
    return [_plantilla_dict(fila) for fila in filas]


@router.post("/correspondencia/plantillas")
def crear_plantilla_correspondencia(
    datos: PlantillaCorrespondenciaRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    nombre = (datos.nombre or "").strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre de la plantilla es obligatorio.")
    _asegurar_tabla_correspondencia(db)
    try:
        fila = db.execute(text("""
            INSERT INTO correspondencia_plantillas
                (nombre, categoria, asunto, destinatario, cc, cuerpo, activo, actualizado_en)
            VALUES
                (:nombre, :categoria, :asunto, :destinatario, :cc, :cuerpo, :activo, CURRENT_TIMESTAMP)
            RETURNING id, nombre, categoria, asunto, destinatario, cc, cuerpo, activo, creado_en, actualizado_en
        """), {
            "nombre": nombre,
            "categoria": (datos.categoria or "General").strip() or "General",
            "asunto": datos.asunto or "",
            "destinatario": datos.destinatario or "",
            "cc": datos.cc or "",
            "cuerpo": datos.cuerpo or "",
            "activo": datos.activo,
        }).mappings().first()
        db.commit()
        return _plantilla_dict(fila)
    except Exception:
        db.rollback()
        logger.exception("Error creando plantilla de correspondencia")
        raise HTTPException(status_code=500, detail="No se pudo guardar la plantilla.")


@router.put("/correspondencia/plantillas/{plantilla_id}")
def actualizar_plantilla_correspondencia(
    plantilla_id: int,
    datos: PlantillaCorrespondenciaRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    if not (datos.nombre or "").strip():
        raise HTTPException(status_code=400, detail="El nombre de la plantilla es obligatorio.")
    _asegurar_tabla_correspondencia(db)
    try:
        fila = db.execute(text("""
            UPDATE correspondencia_plantillas
            SET nombre=:nombre, categoria=:categoria, asunto=:asunto,
                destinatario=:destinatario, cc=:cc, cuerpo=:cuerpo,
                activo=:activo, actualizado_en=CURRENT_TIMESTAMP
            WHERE id=:id
            RETURNING id, nombre, categoria, asunto, destinatario, cc, cuerpo, activo, creado_en, actualizado_en
        """), {
            "id": plantilla_id,
            "nombre": datos.nombre.strip(),
            "categoria": (datos.categoria or "General").strip() or "General",
            "asunto": datos.asunto or "",
            "destinatario": datos.destinatario or "",
            "cc": datos.cc or "",
            "cuerpo": datos.cuerpo or "",
            "activo": datos.activo,
        }).mappings().first()
        if not fila:
            db.rollback()
            raise HTTPException(status_code=404, detail="No se ha encontrado la plantilla.")
        db.commit()
        return _plantilla_dict(fila)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Error actualizando plantilla de correspondencia %s", plantilla_id)
        raise HTTPException(status_code=500, detail="No se pudo actualizar la plantilla.")


@router.delete("/correspondencia/plantillas/{plantilla_id}")
def eliminar_plantilla_correspondencia(
    plantilla_id: int,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    _asegurar_tabla_correspondencia(db)
    resultado = db.execute(
        text("DELETE FROM correspondencia_plantillas WHERE id=:id"),
        {"id": plantilla_id},
    )
    if resultado.rowcount == 0:
        db.rollback()
        raise HTTPException(status_code=404, detail="No se ha encontrado la plantilla.")
    db.commit()
    return {"ok": True, "id": plantilla_id}


@router.get("/correspondencia/campos")
def listar_campos_correspondencia(
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "ver")
    return [
        {"clave": "expediente.numero", "etiqueta": "Número de expediente", "categoria": "Expediente"},
        {"clave": "expediente.estado", "etiqueta": "Estado del expediente", "categoria": "Expediente"},
        {"clave": "expediente.actividad", "etiqueta": "Actividad actual", "categoria": "Expediente"},
        {"clave": "expediente.fecha_alta", "etiqueta": "Fecha de alta", "categoria": "Expediente"},
        {"clave": "expediente.fecha_firma", "etiqueta": "Fecha de firma", "categoria": "Expediente"},
        {"clave": "expediente.fecha_prevista_firma", "etiqueta": "Fecha prevista de firma", "categoria": "Firma"},
        {"clave": "expediente.hora_prevista_firma", "etiqueta": "Hora prevista de firma", "categoria": "Firma"},
        {"clave": "expediente.fecha_presentacion", "etiqueta": "Fecha de presentación", "categoria": "Registro"},
        {"clave": "expediente.fecha_vencimiento", "etiqueta": "Fecha de vencimiento", "categoria": "Registro"},
        {"clave": "expediente.fecha_presentacion_tributaria", "etiqueta": "Fecha de presentación tributaria", "categoria": "Liquidación"},
        {"clave": "expediente.fecha_inscripcion", "etiqueta": "Fecha de inscripción", "categoria": "Registro"},
        {"clave": "expediente.protocolo", "etiqueta": "Número de protocolo", "categoria": "Firma"},
        {"clave": "expediente.nombre_titular", "etiqueta": "Nombre del titular", "categoria": "Titular"},
        {"clave": "expediente.nif_titular", "etiqueta": "NIF del titular", "categoria": "Titular"},
        {"clave": "solicitante.nombre", "etiqueta": "Nombre del solicitante", "categoria": "Solicitante"},
        {"clave": "solicitante.nif", "etiqueta": "NIF del solicitante", "categoria": "Solicitante"},
        {"clave": "solicitante.email", "etiqueta": "Email del cliente", "categoria": "Solicitante"},
        {"clave": "solicitante.telefono", "etiqueta": "Teléfono del cliente", "categoria": "Solicitante"},
        {"clave": "solicitante.direccion", "etiqueta": "Dirección del cliente", "categoria": "Solicitante"},
        {"clave": "solicitante.poblacion", "etiqueta": "Población del cliente", "categoria": "Solicitante"},
        {"clave": "solicitante.provincia", "etiqueta": "Provincia del cliente", "categoria": "Solicitante"},
        {"clave": "notaria.nombre", "etiqueta": "Nombre del notario", "categoria": "Notaría"},
        {"clave": "notaria.poblacion", "etiqueta": "Población de la notaría", "categoria": "Notaría"},
        {"clave": "registro.finca", "etiqueta": "Número de finca", "categoria": "Registro"},
        {"clave": "registro.nombre", "etiqueta": "Registro de la propiedad", "categoria": "Registro"},
        {"clave": "provision.saldo_disponible", "etiqueta": "Saldo disponible", "categoria": "Provisión"},
        {"clave": "provision.saldo_real", "etiqueta": "Saldo real", "categoria": "Provisión"},
        {"clave": "expediente.observaciones", "etiqueta": "Observaciones", "categoria": "Expediente"},
        {"clave": "gestoria.nombre", "etiqueta": "Gestoría", "categoria": "Gestoría"},
    ]


@router.get("/correspondencia/expediente")
def contexto_expediente_correspondencia(
    numero_expediente: str,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "ver")
    numero = (numero_expediente or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Indica un número de expediente.")
    expediente = db.query(Expediente).filter(func.lower(Expediente.id_expediente) == numero.lower()).first()
    if not expediente:
        raise HTTPException(status_code=404, detail="No se ha encontrado el expediente " + numero + ".")
    cliente = expediente.cliente
    fincas_registros = (
        db.query(ExpedienteFinca)
        .filter(ExpedienteFinca.expediente_id == expediente.id)
        .order_by(ExpedienteFinca.id.asc())
        .all()
    )
    fincas_texto = ", ".join(
        str(item.finca).strip()
        for item in fincas_registros
        if getattr(item, "finca", None)
    )
    registros_texto = ", ".join(
        str(item.registro).strip()
        for item in fincas_registros
        if getattr(item, "registro", None)
    )

    def valor(objeto, atributo):
        dato = getattr(objeto, atributo, None) if objeto is not None else None
        if dato is None:
            return ""
        if hasattr(dato, "isoformat"):
            return dato.isoformat()
        return str(dato)

    contexto = {
        "expediente.numero": valor(expediente, "id_expediente"),
        "expediente.estado": valor(expediente, "estado_expediente"),
        "expediente.actividad": valor(expediente, "actividad_actual"),
        "expediente.fecha_alta": valor(expediente, "fecha_alta"),
        "expediente.fecha_firma": valor(expediente, "fecha_firma"),
        "expediente.fecha_prevista_firma": valor(expediente, "fecha_prevista_firma"),
        "expediente.hora_prevista_firma": valor(expediente, "hora_prevista_firma"),
        "expediente.fecha_presentacion": valor(expediente, "fecha_presentacion"),
        "expediente.fecha_vencimiento": valor(expediente, "fecha_vencimiento"),
        "expediente.fecha_presentacion_tributaria": valor(expediente, "fecha_presentacion_tributaria"),
        "expediente.fecha_inscripcion": valor(expediente, "fecha_inscripcion"),
        "expediente.protocolo": valor(expediente, "protocolo"),
        "expediente.nombre_titular": valor(expediente, "nombre_titular"),
        "expediente.nif_titular": valor(expediente, "nif_titular"),
        "solicitante.nombre": valor(expediente, "nombre_solicitante") or valor(cliente, "nombre_completo"),
        "solicitante.nif": valor(expediente, "nif_solicitante") or valor(cliente, "dni"),
        "solicitante.email": valor(cliente, "email"),
        "solicitante.telefono": valor(cliente, "telefono"),
        "solicitante.direccion": valor(cliente, "direccion"),
        "solicitante.poblacion": valor(cliente, "poblacion"),
        "solicitante.provincia": valor(cliente, "provincia"),
        "notaria.nombre": valor(expediente, "nombre_notario") or valor(expediente, "notario_otorgante") or valor(expediente, "notario"),
        "notaria.poblacion": valor(expediente, "poblacion"),
        "registro.finca": fincas_texto or valor(expediente, "finca"),
        "registro.nombre": registros_texto or valor(expediente, "registro_propiedad"),
        "provision.saldo_disponible": valor(expediente, "saldo_disponible"),
        "provision.saldo_real": valor(expediente, "saldo_real"),
        "expediente.observaciones": valor(expediente, "observaciones"),
        "gestoria.nombre": valor(expediente, "nombre_gestoria") or valor(expediente, "gestoria") or "Gestoría MOLSAN",
    }
    return {"numero_expediente": expediente.id_expediente, "contexto": contexto}


# ============================================================
# FIRMA CORPORATIVA Y PLANTILLA DE FACTURA DE HONORARIOS
# ============================================================

def _asegurar_configuracion_firma(db: Session):
    # La tabla antigua se mantiene para conservar el pie corporativo y poder
    # migrar una plantilla que se hubiese subido antes de separar ambos flujos.
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS correspondencia_configuracion (
            id INTEGER PRIMARY KEY,
            firma_pie TEXT NOT NULL DEFAULT '',
            factura_nombre VARCHAR(255),
            factura_tipo VARCHAR(160),
            factura_contenido BYTEA,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT correspondencia_configuracion_unica CHECK (id = 1)
        )
    """))
    db.execute(text("""
        INSERT INTO correspondencia_configuracion (id, firma_pie)
        VALUES (1, '') ON CONFLICT (id) DO NOTHING
    """))
    db.commit()


def _asegurar_plantilla_factura_concepto(db: Session):
    _asegurar_configuracion_firma(db)
    from backend.app.tipos_concepto_gastos.models import TipoConceptoGastos
    from backend.app.tipos_concepto_gastos.router import garantizar_catalogo_inicial

    garantizar_catalogo_inicial(db)
    # Resolver el concepto por su nombre canónico, no por un ID asumido:
    # las bases de datos existentes pueden tener otro orden de inserción.
    concepto = db.query(TipoConceptoGastos).filter(
        func.lower(func.trim(TipoConceptoGastos.nombre)) == "honorarios gestoría"
    ).order_by(TipoConceptoGastos.id.asc()).first()
    if not concepto:
        raise HTTPException(
            status_code=409,
            detail="No existe el concepto «honorarios gestoría» en Tipos de Concepto de Gastos. Créalo o corrige su nombre antes de continuar."
        )
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS plantilla_factura_concepto_gasto (
            concepto_gasto_id INTEGER PRIMARY KEY,
            nombre_archivo VARCHAR(255) NOT NULL,
            tipo_archivo VARCHAR(160) NOT NULL DEFAULT 'application/octet-stream',
            contenido BYTEA NOT NULL,
            actualizado_en TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    # Migración transparente de la plantilla subida en la pantalla antigua.
    db.execute(text("""
        INSERT INTO plantilla_factura_concepto_gasto
            (concepto_gasto_id, nombre_archivo, tipo_archivo, contenido)
        SELECT :concepto_id, factura_nombre, COALESCE(factura_tipo, 'application/octet-stream'), factura_contenido
        FROM correspondencia_configuracion
        WHERE id = 1 AND factura_contenido IS NOT NULL AND factura_nombre IS NOT NULL
        ON CONFLICT (concepto_gasto_id) DO NOTHING
    """), {"concepto_id": concepto.id})
    db.commit()
    return concepto


class FirmaCorrespondenciaRequest(BaseModel):
    firma_pie: str = ""


@router.get("/correspondencia/firma")
def obtener_firma_correspondencia(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "ver")
    _asegurar_configuracion_firma(db)
    fila = db.execute(text("""
        SELECT firma_pie, actualizado_en
        FROM correspondencia_configuracion WHERE id = 1
    """)).mappings().first()
    nombre_empleado = " ".join(filter(None, [
        (getattr(usuario, "nombre", "") or "").strip(),
        (getattr(usuario, "apellidos", "") or "").strip(),
    ]))
    departamento = ""
    cargo = ""
    if getattr(usuario, "departamento_id", None):
        departamento = db.execute(text("SELECT nombre FROM departamentos WHERE id = :id"), {"id": usuario.departamento_id}).scalar() or ""
    if getattr(usuario, "cargo_id", None):
        cargo = db.execute(text("SELECT nombre FROM cargos WHERE id = :id"), {"id": usuario.cargo_id}).scalar() or ""
    firma_personal = "\n".join(x for x in [
        nombre_empleado,
        " · ".join(x for x in [departamento, cargo] if x),
    ] if x)
    return {
        "firma_pie": fila["firma_pie"] or "",
        "firma_personal": firma_personal,
        "nombre_empleado": nombre_empleado,
        "departamento": departamento,
        "cargo": cargo,
        "actualizado_en": fila["actualizado_en"].isoformat() if fila.get("actualizado_en") else None,
    }


@router.put("/correspondencia/firma")
def guardar_firma_correspondencia(
    datos: FirmaCorrespondenciaRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    _asegurar_configuracion_firma(db)
    db.execute(text("""
        UPDATE correspondencia_configuracion
        SET firma_pie = :firma_pie, actualizado_en = CURRENT_TIMESTAMP
        WHERE id = 1
    """), {"firma_pie": (datos.firma_pie or "").strip()})
    db.commit()
    return {"ok": True, "firma_pie": (datos.firma_pie or "").strip()}


@router.post("/conceptos-gastos/6/plantilla-factura")
@router.post("/correspondencia/firma/factura", include_in_schema=False)
async def subir_plantilla_factura_honorarios(
    fichero: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "editar")
    nombre = (fichero.filename or "plantilla-factura.docx").replace("\\", "/").split("/")[-1].strip()
    extension = nombre.rsplit(".", 1)[-1].lower() if "." in nombre else ""
    if extension != "docx":
        raise HTTPException(status_code=400, detail="La plantilla oficial de factura debe ser un documento Word .docx para poder rellenarla conservando su formato y QR.")
    contenido = await fichero.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El archivo supera el límite de 10 MB.")
    concepto = _asegurar_plantilla_factura_concepto(db)
    db.execute(text("""
        INSERT INTO plantilla_factura_concepto_gasto
            (concepto_gasto_id, nombre_archivo, tipo_archivo, contenido, actualizado_en)
        VALUES (:concepto_id, :nombre, :tipo, :contenido, CURRENT_TIMESTAMP)
        ON CONFLICT (concepto_gasto_id) DO UPDATE SET
            nombre_archivo = EXCLUDED.nombre_archivo,
            tipo_archivo = EXCLUDED.tipo_archivo,
            contenido = EXCLUDED.contenido,
            actualizado_en = CURRENT_TIMESTAMP
    """), {"concepto_id": concepto.id, "nombre": nombre, "tipo": fichero.content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "contenido": contenido})
    db.commit()
    return {"ok": True, "concepto_gasto_id": concepto.id, "concepto_gasto": concepto.nombre, "factura_nombre": nombre, "factura_tipo": fichero.content_type or "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


@router.get("/conceptos-gastos/6/plantilla-factura/estado")
def estado_plantilla_factura_honorarios(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "ver")
    concepto = _asegurar_plantilla_factura_concepto(db)
    fila = db.execute(text("""
        SELECT nombre_archivo, tipo_archivo, actualizado_en
        FROM plantilla_factura_concepto_gasto WHERE concepto_gasto_id = :concepto_id
    """), {"concepto_id": concepto.id}).mappings().first()
    return {
        "concepto_gasto_id": concepto.id,
        "concepto_gasto": concepto.nombre,
        "plantilla_cargada": bool(fila),
        "factura_nombre": fila["nombre_archivo"] if fila else None,
        "factura_tipo": fila["tipo_archivo"] if fila else None,
        "actualizado_en": fila["actualizado_en"].isoformat() if fila and fila.get("actualizado_en") else None,
    }


@router.get("/conceptos-gastos/6/plantilla-factura")
@router.get("/correspondencia/firma/factura", include_in_schema=False)
def descargar_plantilla_factura_honorarios(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    require_perm_modulo(usuario, "utilidades", "ver")
    _asegurar_plantilla_factura_concepto(db)
    fila = db.execute(text("""
        SELECT nombre_archivo, tipo_archivo, contenido
        FROM plantilla_factura_concepto_gasto WHERE concepto_gasto_id = :concepto_id
    """), {"concepto_id": concepto.id}).mappings().first()
    if not fila or not fila["contenido"]:
        raise HTTPException(status_code=404, detail="El concepto «honorarios gestoría» todavía no tiene una plantilla Word cargada.")
    nombre = (fila["nombre_archivo"] or "plantilla-factura.docx").replace('"', "")
    return Response(
        content=bytes(fila["contenido"]),
        media_type=fila["tipo_archivo"] or "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )

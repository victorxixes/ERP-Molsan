import unicodedata
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.ctn.models import Notaria
from backend.app.database import get_db
from backend.app.empleados.models import Empleado
from backend.app.expedientes.fincasyregistros.models import ExpedienteFinca
from backend.app.expedientes.models import Expediente

router = APIRouter(
    prefix="/expedientes/auditoria-vinculaciones",
    tags=["Auditoría de vinculaciones de expedientes"],
)


def _normalizar(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or "").strip().casefold())
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return " ".join(texto.split())


def _normalizar_nif(valor: Any) -> str:
    return "".join(c for c in _normalizar(valor).upper() if c.isalnum())


def _nombre_notaria(notaria: Notaria) -> str:
    return _normalizar(" ".join(
        parte for parte in (getattr(notaria, "nombre", None), getattr(notaria, "apellidos", None))
        if parte
    ))


def _nombre_empleado(empleado: Empleado) -> set[str]:
    nombres = {
        _normalizar(" ".join(
            parte for parte in (getattr(empleado, "nombre", None), getattr(empleado, "apellidos", None))
            if parte
        )),
        _normalizar(getattr(empleado, "usuario", None)),
    }
    return {nombre for nombre in nombres if nombre}


def _autorizar(usuario):
    require_perm_modulo(usuario, "seguridad", "editar")


def _cargar_catalogos(db: Session):
    notarias = db.query(Notaria).all()
    empleados = db.query(Empleado).filter(Empleado.activo.is_(True)).all()
    return notarias, empleados


def _coincidencias_notaria(expediente: Expediente, notarias: list[Notaria]) -> list[Notaria]:
    nif = _normalizar_nif(getattr(expediente, "nif_notario", None))
    if nif:
        por_nif = [
            n for n in notarias
            if _normalizar_nif(getattr(n, "nif", None)) == nif
        ]
        if por_nif:
            return por_nif

    nombres = {
        _normalizar(getattr(expediente, campo, None))
        for campo in ("nombre_notario", "notario", "notario_otorgante")
    }
    nombres.discard("")
    if not nombres:
        return []
    return [n for n in notarias if _nombre_notaria(n) in nombres]


def _coincidencias_apoderado(expediente: Expediente, empleados: list[Empleado]) -> list[Empleado]:
    nombre = _normalizar(getattr(expediente, "apoderado", None))
    if not nombre:
        return []
    return [e for e in empleados if nombre in _nombre_empleado(e)]


def _datos_auditoria(db: Session, limite: int = 100) -> dict:
    expedientes = db.query(Expediente).order_by(Expediente.id.asc()).all()
    notarias, empleados = _cargar_catalogos(db)
    finca_ids = {
        expediente_id
        for (expediente_id,) in db.query(ExpedienteFinca.expediente_id).distinct().all()
        if expediente_id is not None
    }

    sin_notario = []
    sin_apoderado = []
    sin_relacion_finca = []
    discordancias = []
    candidatos_notario_unico = 0
    candidatos_apoderado_unico = 0
    notario_ambiguo = 0
    apoderado_ambiguo = 0

    for exp in expedientes:
        id_visible = getattr(exp, "id_expediente", None) or str(exp.id)
        candidatos_n = _coincidencias_notaria(exp, notarias) if not exp.notario_id else []
        candidatos_a = _coincidencias_apoderado(exp, empleados) if not exp.apoderado_empleado_id else []

        if not exp.notario_id and any(getattr(exp, c, None) for c in ("nif_notario", "nombre_notario", "notario", "notario_otorgante")):
            sin_notario.append({
                "expediente": id_visible,
                "nif_notario": getattr(exp, "nif_notario", None),
                "nombre_notario": getattr(exp, "nombre_notario", None) or getattr(exp, "notario", None),
                "coincidencias_catalogo": len(candidatos_n),
                "candidato_unico_id": candidatos_n[0].id if len(candidatos_n) == 1 else None,
            })
            if len(candidatos_n) == 1:
                candidatos_notario_unico += 1
            elif len(candidatos_n) > 1:
                notario_ambiguo += 1

        if not exp.apoderado_empleado_id and getattr(exp, "apoderado", None):
            sin_apoderado.append({
                "expediente": id_visible,
                "apoderado_texto": exp.apoderado,
                "coincidencias_catalogo": len(candidatos_a),
                "candidato_unico_id": candidatos_a[0].id if len(candidatos_a) == 1 else None,
            })
            if len(candidatos_a) == 1:
                candidatos_apoderado_unico += 1
            elif len(candidatos_a) > 1:
                apoderado_ambiguo += 1

        if getattr(exp, "finca", None) and exp.id not in finca_ids:
            sin_relacion_finca.append({
                "expediente": id_visible,
                "finca_texto": exp.finca,
                "motivo": "Hay finca en el campo general, pero no existe relación en expediente_fincas. No se crea automáticamente porque puede contener varias fincas o texto no estructurado.",
            })

        if exp.notario_id:
            notaria_actual = next((n for n in notarias if n.id == exp.notario_id), None)
            nif_exp = _normalizar_nif(getattr(exp, "nif_notario", None))
            nombre_exp = _normalizar(getattr(exp, "nombre_notario", None) or getattr(exp, "notario", None))
            if notaria_actual and (
                (nif_exp and _normalizar_nif(getattr(notaria_actual, "nif", None)) and nif_exp != _normalizar_nif(notaria_actual.nif))
                or (nombre_exp and _nombre_notaria(notaria_actual) and nombre_exp != _nombre_notaria(notaria_actual))
            ):
                discordancias.append({
                    "expediente": id_visible,
                    "tipo": "notario",
                    "notario_id": exp.notario_id,
                    "nombre_en_expediente": getattr(exp, "nombre_notario", None) or getattr(exp, "notario", None),
                    "nif_en_expediente": getattr(exp, "nif_notario", None),
                    "nombre_en_catalogo": " ".join(p for p in (notaria_actual.nombre, notaria_actual.apellidos) if p),
                    "nif_en_catalogo": notaria_actual.nif,
                })

        if exp.apoderado_empleado_id:
            empleado_actual = next((e for e in empleados if e.id == exp.apoderado_empleado_id), None)
            texto = _normalizar(getattr(exp, "apoderado", None))
            if empleado_actual and texto and texto not in _nombre_empleado(empleado_actual):
                discordancias.append({
                    "expediente": id_visible,
                    "tipo": "apoderado",
                    "apoderado_empleado_id": exp.apoderado_empleado_id,
                    "apoderado_en_expediente": exp.apoderado,
                    "apoderado_en_catalogo": " ".join(p for p in (empleado_actual.nombre, empleado_actual.apellidos) if p),
                })

    return {
        "ok": True,
        "modo": "solo_lectura",
        "total_expedientes": len(expedientes),
        "resumen": {
            "sin_vinculo_notario_con_datos": len(sin_notario),
            "sin_vinculo_apoderado_con_datos": len(sin_apoderado),
            "con_finca_textual_sin_relacion_registral": len(sin_relacion_finca),
            "discordancias_entre_texto_y_catalogo": len(discordancias),
            "vinculos_notario_con_coincidencia_unica_reparables": candidatos_notario_unico,
            "vinculos_apoderado_con_coincidencia_unica_reparables": candidatos_apoderado_unico,
            "coincidencias_notario_ambiguas_no_reparables_automaticamente": notario_ambiguo,
            "coincidencias_apoderado_ambiguas_no_reparables_automaticamente": apoderado_ambiguo,
        },
        "muestras": {
            "sin_vinculo_notario": sin_notario[:limite],
            "sin_vinculo_apoderado": sin_apoderado[:limite],
            "finca_sin_relacion_registral": sin_relacion_finca[:limite],
            "discordancias": discordancias[:limite],
        },
        "limite_muestras_por_categoria": limite,
        "nota": "Los campos de ApoderaGest y NotarGest se sirven desde el modelo Expediente central; esta auditoría revisa las relaciones persistidas y las discrepancias de texto frente a los catálogos.",
    }


@router.get("")
def auditar_vinculaciones(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Informe de solo lectura; requiere permiso administrativo de seguridad."""
    _autorizar(usuario)
    return _datos_auditoria(db)


@router.post("/reparar-vinculos-unicos")
def reparar_vinculos_unicos(
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Rellena únicamente relaciones vacías con una coincidencia de catálogo inequívoca."""
    _autorizar(usuario)
    notarias, empleados = _cargar_catalogos(db)
    expedientes = db.query(Expediente).order_by(Expediente.id.asc()).all()
    reparados_notario = []
    reparados_apoderado = []

    try:
        for exp in expedientes:
            if not exp.notario_id and any(getattr(exp, c, None) for c in ("nif_notario", "nombre_notario", "notario", "notario_otorgante")):
                coincidencias = _coincidencias_notaria(exp, notarias)
                if len(coincidencias) == 1:
                    exp.notario_id = coincidencias[0].id
                    reparados_notario.append(getattr(exp, "id_expediente", None) or str(exp.id))

            if not exp.apoderado_empleado_id and getattr(exp, "apoderado", None):
                coincidencias = _coincidencias_apoderado(exp, empleados)
                if len(coincidencias) == 1:
                    exp.apoderado_empleado_id = coincidencias[0].id
                    reparados_apoderado.append(getattr(exp, "id_expediente", None) or str(exp.id))

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "ok": True,
        "modo": "reparacion_segura",
        "vinculos_notario_creados": len(reparados_notario),
        "expedientes_notario": reparados_notario[:100],
        "vinculos_apoderado_creados": len(reparados_apoderado),
        "expedientes_apoderado": reparados_apoderado[:100],
        "sin_cambios": "No sobrescribe relaciones existentes. No resuelve coincidencias ambiguas. No crea relaciones de finca/registro a partir del texto libre.",
        "siguiente_paso": "Vuelve a ejecutar GET /api/expedientes/auditoria-vinculaciones para verificar el resultado.",
    }

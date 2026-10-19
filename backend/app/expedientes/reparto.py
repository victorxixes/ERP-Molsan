from sqlalchemy import text, or_
from sqlalchemy.orm import Session

from backend.app.empleados.models import Empleado
from backend.app.expedientes.models import Expediente


ACTIVIDADES = {
    "documentacion-previa": "Documentación previa",
    "sede-notarial": "Sede notarial",
    "sede-notarial-protocolo": "Sede notarial con protocolo",
    "liquidacion-impuestos": "Liquidación de impuestos",
    "tramitacion-inscripcion": "Tramitación inscripción",
    "defectos-registrales": "Defectos registrales",
    "facturacion-cierre": "Facturación y cierre",
}
PROVINCIAS_CCAA = {
    "barcelona": "cataluna", "girona": "cataluna", "gerona": "cataluna", "lleida": "cataluna", "lerida": "cataluna", "tarragona": "cataluna",
    "murcia": "region de murcia", "alicante": "comunitat valenciana", "alacant": "comunitat valenciana", "castellon": "comunitat valenciana", "castello": "comunitat valenciana", "valencia": "comunitat valenciana",
    "madrid": "comunidad de madrid", "sevilla": "andalucia", "malaga": "andalucia", "cadiz": "andalucia", "granada": "andalucia", "cordoba": "andalucia", "huelva": "andalucia", "jaen": "andalucia", "almeria": "andalucia",
    "zaragoza": "aragon", "huesca": "aragon", "teruel": "aragon", "oviedo": "asturias", "asturias": "asturias",
    "palma": "illes balears", "illes balears": "illes balears", "las palmas": "canarias", "santa cruz de tenerife": "canarias", "santander": "cantabria",
    "toledo": "castilla-la mancha", "albacete": "castilla-la mancha", "ciudad real": "castilla-la mancha", "cuenca": "castilla-la mancha", "guadalajara": "castilla-la mancha",
    "valladolid": "castilla y leon", "leon": "castilla y leon", "burgos": "castilla y leon", "salamanca": "castilla y leon", "segovia": "castilla y leon", "avila": "castilla y leon", "zamora": "castilla y leon", "palencia": "castilla y leon", "soria": "castilla y leon",
    "badajoz": "extremadura", "caceres": "extremadura", "a coruna": "galicia", "la coruna": "galicia", "lugo": "galicia", "ourense": "galicia", "orense": "galicia", "pontevedra": "galicia",
    "pamplona": "comunidad foral de navarra", "navarra": "comunidad foral de navarra", "bilbao": "pais vasco", "vizcaya": "pais vasco", "alava": "pais vasco", "guipuzcoa": "pais vasco", "donostia": "pais vasco",
    "logrono": "la rioja", "ceuta": "ceuta", "melilla": "melilla",
}


def normalizar(valor):
    import unicodedata
    return "".join(
        caracter for caracter in unicodedata.normalize("NFD", str(valor or "").strip().casefold())
        if unicodedata.category(caracter) != "Mn"
    )


def resolver_key_actividad(valor, fecha_firma=None):
    texto = normalizar(valor)
    for clave, etiqueta in ACTIVIDADES.items():
        if texto == normalizar(etiqueta) or texto == normalizar(clave):
            return clave
    if "sede notarial" in texto and (fecha_firma or "protocolo" in texto or "firma" in texto):
        return "sede-notarial-protocolo"
    if "sede notarial" in texto:
        return "sede-notarial"
    return None


def comunidad_expediente(expediente):
    provincia = normalizar(getattr(expediente, "provincia", None))
    return PROVINCIAS_CCAA.get(provincia, provincia)


def asignar_gestor_automaticamente(db: Session, expediente: Expediente, actividad_key: str, motivo: str = "reparto_automatico"):
    """Elige un gestor elegible para la actividad y equilibra la carga pendiente según porcentaje."""
    etiqueta = ACTIVIDADES.get(actividad_key)
    if not etiqueta:
        return None

    comunidad = comunidad_expediente(expediente)
    candidatos = []
    for empleado in db.query(Empleado).filter(Empleado.activo.is_(True)).all():
        reglas = getattr(empleado, "reparto_actividades_json", None) or []
        porcentaje = 0.0
        for regla in reglas:
            if not isinstance(regla, dict) or not regla.get("activa", True) or regla.get("actividad") != actividad_key:
                continue
            if regla.get("zona_territorial") and normalizar(regla.get("comunidad")) != comunidad:
                continue
            try:
                porcentaje += float(regla.get("porcentaje") or 0)
            except (TypeError, ValueError):
                continue
        if porcentaje <= 0:
            continue
        consulta = db.query(Expediente).filter(Expediente.gestor_asignado_id == empleado.id)
        if actividad_key == "sede-notarial-protocolo":
            consulta = consulta.filter(Expediente.actividad_actual.ilike("%Sede notarial%"), Expediente.fecha_firma.isnot(None))
        else:
            consulta = consulta.filter(Expediente.actividad_actual.ilike(etiqueta))
        pendientes = consulta.filter(or_(Expediente.estado_actividad.is_(None), Expediente.estado_actividad != "Cerrada")).count()
        candidatos.append((pendientes / porcentaje, pendientes, empleado.id))

    if not candidatos:
        anterior_id = getattr(expediente, "gestor_asignado_id", None)
        if anterior_id:
            expediente.gestor_asignado_id = None
            db.execute(text("""
                INSERT INTO expediente_gestor_historial
                    (expediente_id, actividad, gestor_id, gestor_anterior_id, motivo, fecha)
                VALUES (:expediente_id, :actividad, NULL, :anterior_id, 'sin_regla_reparto', CURRENT_TIMESTAMP)
            """), {"expediente_id": str(expediente.id_expediente), "actividad": actividad_key, "anterior_id": anterior_id})
        return None

    candidatos.sort(key=lambda item: (item[0], item[1], item[2]))
    gestor_id = candidatos[0][2]
    anterior_id = getattr(expediente, "gestor_asignado_id", None)
    expediente.gestor_asignado_id = gestor_id
    db.execute(text("""
        INSERT INTO expediente_gestor_historial
            (expediente_id, actividad, gestor_id, gestor_anterior_id, motivo, fecha)
        VALUES (:expediente_id, :actividad, :gestor_id, :anterior_id, :motivo, CURRENT_TIMESTAMP)
    """), {
        "expediente_id": str(expediente.id_expediente),
        "actividad": actividad_key,
        "gestor_id": gestor_id,
        "anterior_id": anterior_id,
        "motivo": motivo,
    })
    return gestor_id

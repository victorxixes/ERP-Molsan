from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import get_current_user
from backend.app.database import get_db
from backend.app.empleados.models import Empleado
from backend.app.maestros.models import Departamento
from backend.app.expedientes.models import Expediente


ACTIVIDADES = {
    "documentacion-previa": "Documentación previa",
    "sede-notarial": "Sede notarial",
    "sede-notarial-protocolo": "Sede notarial con protocolo",
    "gestion-economica": "Gestión económica",
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
    # Resolver los nombres de departamento una sola vez para comparar el
    # criterio de la ficha (nombre) con el departamento real del empleado.
    departamentos_por_id = {
        departamento.id: departamento.nombre
        for departamento in db.query(Departamento).all()
    }
    apoderado_expediente_id = getattr(expediente, "apoderado_empleado_id", None)
    for empleado in db.query(Empleado).filter(Empleado.activo.is_(True)).all():
        reglas = getattr(empleado, "reparto_actividades_json", None) or []
        porcentaje = 0.0
        for regla in reglas:
            if not isinstance(regla, dict) or not regla.get("activa", True) or regla.get("actividad") != actividad_key:
                continue

            # Departamento en la regla significa el departamento al que
            # pertenece el empleado candidato. Las reglas sin departamento
            # siguen siendo compatibles con la configuración anterior.
            departamento_regla = normalizar(regla.get("departamento"))
            if departamento_regla:
                departamento_empleado = normalizar(
                    departamentos_por_id.get(getattr(empleado, "departamento_id", None))
                )
                if departamento_empleado != departamento_regla:
                    continue

            # Un apoderado específico limita la regla a expedientes con ese
            # apoderado relacionado. Si no coincide, no aplica la regla.
            apoderado_regla_id = regla.get("apoderado_id")
            if apoderado_regla_id not in (None, "", 0, "0"):
                try:
                    apoderado_regla_id = int(apoderado_regla_id)
                except (TypeError, ValueError):
                    continue
                try:
                    apoderado_real_id = int(apoderado_expediente_id)
                except (TypeError, ValueError):
                    continue
                if apoderado_real_id != apoderado_regla_id:
                    continue

            if regla.get("zona_territorial"):
                zonas = regla.get("comunidades")
                if not isinstance(zonas, list):
                    zonas = [regla.get("comunidad")] if regla.get("comunidad") else []
                if comunidad not in {normalizar(zona) for zona in zonas if zona}:
                    continue
            oficina_expediente = str(getattr(expediente, "oficina_alta", None) or getattr(expediente, "oficina", None) or "").strip()
            codigo_oficina = normalizar(oficina_expediente)
            oficina_tipo = str(regla.get("oficina_tipo") or "").strip().casefold()
            es_cancela = codigo_oficina == "5316"
            if oficina_tipo == "cancela" and not es_cancela:
                continue
            if oficina_tipo == "oficina" and es_cancela:
                continue
            oficinas_regla = regla.get("oficinas")
            if not isinstance(oficinas_regla, list):
                oficinas_regla = [x.strip() for x in str(oficinas_regla or "").replace(";", ",").split(",") if x.strip()]
            if oficinas_regla and normalizar(oficina_expediente) not in {normalizar(x) for x in oficinas_regla}:
                continue
            producto_regla = normalizar(regla.get("producto_gtg"))
            if producto_regla and producto_regla != normalizar(getattr(expediente, "producto_gtg", None)):
                continue
            operacion_regla = normalizar(regla.get("tipo_operacion"))
            if operacion_regla and operacion_regla != normalizar(getattr(expediente, "tipo_operacion", None)):
                continue
            estados_regla = regla.get("estados_expediente")
            if not isinstance(estados_regla, list):
                estados_regla = [regla.get("estado_expediente")] if regla.get("estado_expediente") else []
            estados_regla_normalizados = {normalizar(estado) for estado in estados_regla if estado}
            if estados_regla_normalizados and normalizar(getattr(expediente, "estado_expediente", None)) not in estados_regla_normalizados:
                continue
            try:
                porcentaje += float(regla.get("porcentaje") or 0)
            except (TypeError, ValueError):
                continue
        if porcentaje <= 0:
            continue
        asignados = db.query(Expediente).filter(Expediente.gestor_asignado_id == empleado.id).all()
        pendientes = 0
        for item in asignados:
            if normalizar(getattr(item, "estado_actividad", None)) == "cerrada":
                continue
            actividad_item = normalizar(getattr(item, "actividad_actual", None))
            if actividad_key == "sede-notarial-protocolo":
                coincide = "sede notarial" in actividad_item and bool(getattr(item, "fecha_firma", None))
            elif actividad_key == "sede-notarial":
                coincide = "sede notarial" in actividad_item and not bool(getattr(item, "fecha_firma", None))
            else:
                coincide = actividad_item == normalizar(etiqueta)
            if coincide:
                pendientes += 1
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


def usuario_admin_expedientes(usuario):
    """Reconoce admin global por rol técnico 0, flags, cuenta/rol normalizado o permiso explícito de seguridad."""
    import unicodedata

    def norm(valor):
        texto = unicodedata.normalize("NFD", str(valor or "").strip().casefold())
        texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
        return " ".join(texto.replace("_", " ").replace("-", " ").split())

    if not usuario:
        return False

    rol = getattr(usuario, "rol", None)
    nombre_rol = norm(getattr(rol, "nombre", rol))
    usuario_nombre = norm(getattr(usuario, "usuario", ""))
    rol_id = getattr(usuario, "rol_id", getattr(rol, "id", None))
    rol_id_admin = (
        (isinstance(rol_id, int) and not isinstance(rol_id, bool) and rol_id == 0)
        or (isinstance(rol_id, str) and rol_id.strip() == "0")
    )

    if (
        getattr(usuario, "es_admin", False) is True
        or getattr(usuario, "is_admin", False) is True
        or rol_id_admin
        or usuario_nombre == "admin"
        or nombre_rol in {
            "admin", "administrador", "administradora", "superadmin",
            "super administrador", "super administradora", "superusuario",
            "super usuario", "superuser", "root", "administrador general",
        }
    ):
        return True

    for origen in (
        getattr(usuario, "permisos_modulo_dict", None) or {},
        getattr(rol, "permisos_modulo_dict", None) or {},
    ):
        if isinstance(origen, dict):
            for modulo in ("*", "expedientes.*", "seguridad"):
                acciones = origen.get(modulo) or []
                if isinstance(acciones, (list, tuple, set)) and (
                    "*" in acciones or "ver" in acciones or "editar" in acciones
                ):
                    if modulo in ("*", "expedientes.*") or (modulo == "seguridad" and "editar" in acciones):
                        return True
    return False


def expediente_cumple_reglas_empleado(db: Session, empleado: Empleado, expediente: Expediente, departamentos=None) -> bool:
    """True si al menos una regla activa del empleado cubre la actividad y los criterios del expediente."""
    reglas = getattr(empleado, "reparto_actividades_json", None) or []
    if not isinstance(reglas, list) or not reglas:
        return False

    if departamentos is None:
        departamentos = {d.id: d.nombre for d in db.query(Departamento).all()}
    actividad_actual = resolver_key_actividad(
        getattr(expediente, "actividad_actual", None),
        getattr(expediente, "fecha_firma", None),
    )
    if not actividad_actual:
        return False

    comunidad = comunidad_expediente(expediente)
    oficina = str(
        getattr(expediente, "oficina_alta", None)
        or getattr(expediente, "oficina", None)
        or ""
    ).strip()
    es_cancela = normalizar(oficina) == "5316"
    estado = normalizar(getattr(expediente, "estado_expediente", None))
    producto = normalizar(getattr(expediente, "producto_gtg", None))
    operacion = normalizar(getattr(expediente, "tipo_operacion", None))
    apoderado_expediente_id = getattr(expediente, "apoderado_empleado_id", None)

    for regla in reglas:
        if not isinstance(regla, dict) or not regla.get("activa", True):
            continue
        if str(regla.get("actividad") or "").strip() != actividad_actual:
            continue

        departamento_regla = normalizar(regla.get("departamento"))
        if departamento_regla:
            departamento_empleado = normalizar(
                departamentos.get(getattr(empleado, "departamento_id", None))
            )
            if departamento_empleado != departamento_regla:
                continue

        apoderado_regla_id = regla.get("apoderado_id")
        if apoderado_regla_id not in (None, "", 0, "0"):
            try:
                if int(apoderado_expediente_id) != int(apoderado_regla_id):
                    continue
            except (TypeError, ValueError):
                continue

        if regla.get("zona_territorial"):
            zonas = regla.get("comunidades")
            if not isinstance(zonas, list):
                zonas = [regla.get("comunidad")] if regla.get("comunidad") else []
            if comunidad not in {normalizar(z) for z in zonas if z}:
                continue

        oficina_tipo = str(regla.get("oficina_tipo") or "").strip().casefold()
        if oficina_tipo == "cancela" and not es_cancela:
            continue
        if oficina_tipo == "oficina" and es_cancela:
            continue
        oficinas_regla = regla.get("oficinas")
        if not isinstance(oficinas_regla, list):
            oficinas_regla = [
                x.strip() for x in str(oficinas_regla or "").replace(";", ",").split(",")
                if x.strip()
            ]
        if oficinas_regla and normalizar(oficina) not in {normalizar(x) for x in oficinas_regla}:
            continue

        producto_regla = normalizar(regla.get("producto_gtg"))
        if producto_regla and producto_regla != producto:
            continue
        operacion_regla = normalizar(regla.get("tipo_operacion"))
        if operacion_regla and operacion_regla != operacion:
            continue

        estados = regla.get("estados_expediente")
        if not isinstance(estados, list):
            estados = [regla.get("estado_expediente")] if regla.get("estado_expediente") else []
        estados = {normalizar(x) for x in estados if x}
        if estados and estado not in estados:
            continue

        try:
            if float(regla.get("porcentaje") or 0) <= 0:
                continue
        except (TypeError, ValueError):
            continue

        return True
    return False


def validar_acceso_candidatos_expediente(db: Session, usuario, candidatos) -> None:
    """Valida solo los expedientes solicitados, sin escanear toda la tabla en cada petición."""
    if usuario_admin_expedientes(usuario):
        return

    empleado = db.query(Empleado).filter(
        Empleado.id == getattr(usuario, "id", None)
    ).first()
    if empleado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    departamentos = {d.id: d.nombre for d in db.query(Departamento).all()}
    if any(
        not expediente_cumple_reglas_empleado(db, empleado, expediente, departamentos)
        for expediente in candidatos
    ):
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")


def validar_candidatos_visibles(candidatos, ids_visibles) -> None:
    """Rechaza si cualquiera de las referencias posibles apunta a un expediente oculto."""
    if ids_visibles is not None and any(
        expediente.id not in ids_visibles for expediente in candidatos
    ):
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")


def validar_visibilidad_expediente_request(
    request: Request,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    """Impide acceder por URL a expedientes fuera del ámbito de reparto del usuario."""
    ruta = str(request.url.path or "")
    if ruta.startswith("/api/notargest/") or ruta.startswith("/api/encargagest/"):
        return
    if "/provisiones-independientes" in ruta:
        return

    identificador = request.path_params.get("id_expediente")
    if identificador is None:
        identificador = request.path_params.get("expediente_id")
    if identificador is None:
        identificador = request.query_params.get("id_expediente")
    if identificador is None:
        identificador = request.query_params.get("expediente_id")
    if identificador is None:
        return

    candidatos = []
    expediente_por_referencia = db.query(Expediente).filter(
        Expediente.id_expediente == str(identificador)
    ).first()
    if expediente_por_referencia is not None:
        candidatos.append(expediente_por_referencia)

    try:
        id_interno = int(identificador)
    except (TypeError, ValueError):
        id_interno = None
    if id_interno is not None and id_interno > 0:
        expediente_por_id = db.query(Expediente).filter(
            Expediente.id == id_interno
        ).first()
        if expediente_por_id is not None and all(
            int(expediente_por_id.id) != int(item.id) for item in candidatos
        ):
            candidatos.append(expediente_por_id)

    # El endpoint específico conserva su 404 habitual cuando no existe el expediente.
    if not candidatos:
        return

    # Si un identificador numérico coincide con dos expedientes distintos,
    # ambos deben estar dentro del ámbito de reparto. Se comprueban solo esos
    # registros, no todos los expedientes de la base de datos.
    validar_acceso_candidatos_expediente(db, usuario, candidatos)


setattr(validar_visibilidad_expediente_request, "_molsan_visibilidad_guard", True)


def ids_expedientes_visibles(db: Session, usuario):
    """Devuelve None para administradores y una lista de IDs permitidos para usuarios normales."""
    if usuario_admin_expedientes(usuario):
        return None
    empleado = db.query(Empleado).filter(Empleado.id == getattr(usuario, "id", None)).first()
    if not empleado:
        return []
    expedientes = db.query(Expediente).all()
    departamentos = {d.id: d.nombre for d in db.query(Departamento).all()}
    return [
        expediente.id
        for expediente in expedientes
        if expediente_cumple_reglas_empleado(db, empleado, expediente, departamentos)
    ]

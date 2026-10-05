from datetime import date
import math

from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado


# =========================================================
# COORDENADAS DE MOLSAN
# =========================================================

MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740


# =========================================================
# DISTANCIA HAVERSINE
# =========================================================

def distancia_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """
    Calcula la distancia en kilómetros entre dos coordenadas
    utilizando la fórmula Haversine.
    """

    try:
        lat1 = float(lat1)
        lng1 = float(lng1)
        lat2 = float(lat2)
        lng2 = float(lng2)
    except (TypeError, ValueError):
        return 0.0

    R = 6371.0

    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )

    # Evita pequeños errores numéricos
    a = max(0.0, min(1.0, a))

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a),
    )

    return round(R * c, 2)


# =========================================================
# OBTENER COORDENADAS DE LA NOTARÍA
# =========================================================

def _coordenadas_notaria(notario: Notaria):
    """
    Obtiene las coordenadas de la notaría.

    Primero intenta:
        lat / lng

    Y como compatibilidad adicional:
        latitud / longitud

    Esto permite trabajar aunque el modelo/schema utilice
    nombres diferentes.
    """

    if notario is None:
        return None, None

    lat = getattr(notario, "lat", None)
    lng = getattr(notario, "lng", None)

    # Compatibilidad por si el modelo utiliza estos nombres
    if lat is None:
        lat = getattr(notario, "latitud", None)

    if lng is None:
        lng = getattr(notario, "longitud", None)

    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return None, None

    # Coordenadas inválidas
    if not math.isfinite(lat) or not math.isfinite(lng):
        return None, None

    # Fuera de rango
    if lat < -90 or lat > 90:
        return None, None

    if lng < -180 or lng > 180:
        return None, None

    return lat, lng


# =========================================================
# SABER SI UNA CITA ES VIDEOCONFERENCIA
# =========================================================

def _es_videoconferencia(
    cita: Cita,
    notario: Notaria | None = None,
) -> bool:
    """
    Determina si la cita es VC.

    Preferencia:
    1. VC del notario
    2. tipo_firma guardado en la cita
    """

    # -----------------------------------------------------
    # 1. DATOS DEL NOTARIO
    # -----------------------------------------------------

    if notario is not None:

        vc_val = str(
            getattr(notario, "vc", "") or ""
        ).strip().upper()

        if vc_val in {
            "SI",
            "VC",
            "VIDEOCONFERENCIA",
        }:
            return True

        if vc_val in {
            "NO",
            "PRESENCIAL",
        }:
            return False

    # -----------------------------------------------------
    # 2. TIPO DE FIRMA DE LA CITA
    # -----------------------------------------------------

    tipo_firma = str(
        getattr(cita, "tipo_firma", "") or ""
    ).strip().upper()

    if tipo_firma in {
        "SI",
        "VC",
        "VIDEOCONFERENCIA",
    }:
        return True

    return False


# =========================================================
# KM DE UNA CITA
# =========================================================

def km_de_cita(
    db: Session,
    cita: Cita,
) -> float:
    """
    Calcula los kilómetros de una cita presencial.

    VC:
        0 km

    Presencial:
        distancia Molsan -> Notaría

    Las coordenadas se obtienen directamente de la
    relación Cita.notario o, si no está cargada,
    mediante notario_id.
    """

    # =====================================================
    # OBTENER NOTARIO
    # =====================================================

    notario = getattr(
        cita,
        "notario",
        None,
    )

    if notario is None and cita.notario_id:

        notario = (
            db.query(Notaria)
            .filter(
                Notaria.id == cita.notario_id
            )
            .first()
        )

    # =====================================================
    # DETERMINAR VC / PRESENCIAL
    # =====================================================

    if _es_videoconferencia(
        cita,
        notario,
    ):
        return 0.0

    # =====================================================
    # UNA CITA PRESENCIAL NECESITA NOTARIO
    # =====================================================

    if notario is None:

        print(
            f"[KM] Cita {cita.id}: "
            f"presencial pero sin notario",
            flush=True,
        )

        return 0.0

    # =====================================================
    # COORDENADAS
    # =====================================================

    lat, lng = _coordenadas_notaria(
        notario
    )

    if lat is None or lng is None:

        print(
            f"[KM] Cita {cita.id}: "
            f"notaría {getattr(notario, 'id', None)} "
            f"sin coordenadas. "
            f"lat={getattr(notario, 'lat', None)} "
            f"lng={getattr(notario, 'lng', None)}",
            flush=True,
        )

        return 0.0

    # =====================================================
    # CALCULAR
    # =====================================================

    km = distancia_km(
        MOLSAN_LAT,
        MOLSAN_LNG,
        lat,
        lng,
    )

    print(
        f"[KM] Cita {cita.id} | "
        f"Notaría {getattr(notario, 'id', None)} | "
        f"lat={lat} | "
        f"lng={lng} | "
        f"KM={km}",
        flush=True,
    )

    return km


# =========================================================
# RANGO DEL MES
# =========================================================

def _rango_mes(
    año: int,
    mes: int,
) -> tuple[date, date]:

    inicio = date(
        año,
        mes,
        1,
    )

    if mes == 12:

        fin = date(
            año + 1,
            1,
            1,
        )

    else:

        fin = date(
            año,
            mes + 1,
            1,
        )

    return inicio, fin


# =========================================================
# TABLA MENSUAL
# =========================================================

def obtener_tabla(
    db: Session,
    mes: int,
    año: int,
):

    inicio, fin = _rango_mes(
        año,
        mes,
    )

    citas: list[Cita] = (
        db.query(Cita)
        .filter(
            Cita.fecha >= inicio
        )
        .filter(
            Cita.fecha < fin
        )
        .all()
    )

    tabla = {}

    # =====================================================
    # PROCESAR CITAS
    # =====================================================

    for cita in citas:

        # -------------------------------------------------
        # APODERADO
        # -------------------------------------------------

        if cita.apoderado_id:

            empleado = (
                db.query(Empleado)
                .filter(
                    Empleado.id
                    == cita.apoderado_id
                )
                .first()
            )

            if empleado:

                nombre = (
                    f"{empleado.nombre} "
                    f"{empleado.apellidos}"
                ).strip()

            else:

                nombre = (
                    cita.apoderado
                    or "Sin nombre"
                )

            apoderado_id = cita.apoderado_id

        else:

            nombre = (
                cita.apoderado
                or "Sin nombre"
            )

            apoderado_id = nombre

        # -------------------------------------------------
        # CREAR FILA
        # -------------------------------------------------

        if apoderado_id not in tabla:

            tabla[apoderado_id] = {
                "apoderado_id": apoderado_id,
                "nombre": nombre,
                "vc": 0,
                "presencial": 0,
                "km": 0.0,
            }

        # -------------------------------------------------
        # OBTENER NOTARIO
        # -------------------------------------------------

        notario = getattr(
            cita,
            "notario",
            None,
        )

        if notario is None and cita.notario_id:

            notario = (
                db.query(Notaria)
                .filter(
                    Notaria.id
                    == cita.notario_id
                )
                .first()
            )

        # -------------------------------------------------
        # VC / PRESENCIAL
        # -------------------------------------------------

        es_vc = _es_videoconferencia(
            cita,
            notario,
        )

        if es_vc:

            tabla[apoderado_id]["vc"] += 1

        else:

            tabla[
                apoderado_id
            ]["presencial"] += 1

        # -------------------------------------------------
        # KM
        # -------------------------------------------------

        km = km_de_cita(
            db,
            cita,
        )

        tabla[
            apoderado_id
        ]["km"] += km

    # =====================================================
    # REDONDEAR
    # =====================================================

    resultado = []

    for fila in tabla.values():

        fila["km"] = round(
            float(fila["km"]),
            2,
        )

        resultado.append(fila)

    return resultado


# =========================================================
# RANKING
# =========================================================

def obtener_ranking(
    db: Session,
    mes: int,
    año: int,
):

    tabla = obtener_tabla(
        db,
        mes,
        año,
    )

    tabla.sort(
        key=lambda x: x["km"],
        reverse=True,
    )

    return tabla


# =========================================================
# INFORME INDIVIDUAL
# =========================================================

def obtener_informe_individual(
    db: Session,
    apoderado_id: int,
    mes: int,
    año: int,
):

    inicio, fin = _rango_mes(
        año,
        mes,
    )

    citas: list[Cita] = (
        db.query(Cita)
        .filter(
            Cita.fecha >= inicio
        )
        .filter(
            Cita.fecha < fin
        )
        .filter(
            Cita.apoderado_id
            == apoderado_id
        )
        .all()
    )

    total_vc = 0
    total_presencial = 0
    total_km = 0.0

    dias = []

    # =====================================================
    # PROCESAR
    # =====================================================

    for cita in citas:

        notario = getattr(
            cita,
            "notario",
            None,
        )

        if notario is None and cita.notario_id:

            notario = (
                db.query(Notaria)
                .filter(
                    Notaria.id
                    == cita.notario_id
                )
                .first()
            )

        # -------------------------------------------------
        # TIPO
        # -------------------------------------------------

        es_vc = _es_videoconferencia(
            cita,
            notario,
        )

        if es_vc:

            total_vc += 1

        else:

            total_presencial += 1

        # -------------------------------------------------
        # KM
        # -------------------------------------------------

        total_km += km_de_cita(
            db,
            cita,
        )

        dias.append(
            cita.fecha
        )

    # =====================================================
    # TIEMPO MEDIO ENTRE CITAS
    # =====================================================

    tiempo_medio = 0.0

    if len(dias) >= 2:

        dias.sort()

        diferencias = [
            (
                dias[i]
                - dias[i - 1]
            ).days
            for i in range(
                1,
                len(dias),
            )
        ]

        tiempo_medio = (
            sum(diferencias)
            / len(diferencias)
        )

    # =====================================================
    # RESULTADO
    # =====================================================

    return {
        "total_vc": total_vc,
        "total_presencial": total_presencial,
        "km_totales": round(
            total_km,
            2,
        ),
        "tiempo_medio_dias": round(
            tiempo_medio,
            1,
        ),
    }

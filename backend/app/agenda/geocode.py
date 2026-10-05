import math


# ============================================================
# COORDENADAS DE MOLSAN
# ============================================================

MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740


# ============================================================
# DISTANCIA MOLSAN -> DESTINO
# ============================================================

def distancia_molsan(lat, lng):
    """
    Calcula la distancia aproximada en kilómetros
    desde Molsan hasta las coordenadas indicadas.

    Utiliza la fórmula de Haversine.

    Devuelve:
        float -> kilómetros redondeados a 2 decimales
        None  -> si no existen coordenadas válidas
    """

    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(lat) or not math.isfinite(lng):
        return None

    # ========================================================
    # RADIO MEDIO DE LA TIERRA
    # ========================================================

    R = 6371.0

    # ========================================================
    # CONVERSIÓN A RADIANES
    # ========================================================

    dlat = math.radians(
        lat - MOLSAN_LAT
    )

    dlng = math.radians(
        lng - MOLSAN_LNG
    )

    # ========================================================
    # HAVERSINE
    # ========================================================

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(
            math.radians(MOLSAN_LAT)
        )
        *
        math.cos(
            math.radians(lat)
        )
        *
        math.sin(dlng / 2) ** 2
    )

    # Protección frente a pequeños errores
    # numéricos que podrían dejar a ligeramente
    # fuera del rango [0, 1].

    a = max(
        0.0,
        min(1.0, a)
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    distancia = R * c

    return round(
        distancia,
        2
    )

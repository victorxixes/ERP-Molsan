import math


# ============================================================
# COORDENADAS MOLSAN
# ============================================================

MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740


# ============================================================
# DISTANCIA HAVERSINE
# ============================================================

def distancia_km(
    lat1,
    lon1,
    lat2,
    lon2,
):
    """
    Calcula la distancia en línea recta mediante Haversine.

    Devuelve siempre un float.

    Si alguna coordenada no es válida:
        0.0
    """

    try:

        lat1 = float(lat1)
        lon1 = float(lon1)
        lat2 = float(lat2)
        lon2 = float(lon2)

    except (
        TypeError,
        ValueError,
    ):

        return 0.0

    # --------------------------------------------------------
    # Comprobar valores finitos
    # --------------------------------------------------------

    if not all(
        math.isfinite(v)
        for v in (
            lat1,
            lon1,
            lat2,
            lon2,
        )
    ):
        return 0.0

    # --------------------------------------------------------
    # Comprobar rango válido
    # --------------------------------------------------------

    if not (
        -90 <= lat1 <= 90
        and
        -90 <= lat2 <= 90
        and
        -180 <= lon1 <= 180
        and
        -180 <= lon2 <= 180
    ):
        return 0.0

    # ========================================================
    # RADIO DE LA TIERRA
    # ========================================================

    R = 6371.0

    # ========================================================
    # RADIANES
    # ========================================================

    d_lat = math.radians(
        lat2 - lat1
    )

    d_lon = math.radians(
        lon2 - lon1
    )

    # ========================================================
    # HAVERSINE
    # ========================================================

    a = (
        math.sin(d_lat / 2) ** 2
        +
        math.cos(
            math.radians(lat1)
        )
        *
        math.cos(
            math.radians(lat2)
        )
        *
        math.sin(
            d_lon / 2
        ) ** 2
    )

    # Protección numérica

    a = max(
        0.0,
        min(
            1.0,
            a,
        ),
    )

    c = (
        2
        *
        math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a),
        )
    )

    return round(
        R * c,
        2,
    )


# ============================================================
# COMPATIBILIDAD
# ============================================================

def distancia_molsan(
    lat,
    lng,
):
    """
    Mantiene compatibilidad con código antiguo
    que utiliza distancia_molsan().
    """

    return distancia_km(
        MOLSAN_LAT,
        MOLSAN_LNG,
        lat,
        lng,
    )

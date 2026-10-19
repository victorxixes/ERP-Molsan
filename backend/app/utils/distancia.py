import math


# ============================================================
# PUNTO DE PARTIDA MOLSAN
# ============================================================
# Centro aproximado del código postal 08016, Barcelona.
# Se usa como origen fijo para que los kilómetros no dependan
# de la ubicación del usuario que consulta el ERP.
MOLSAN_CP = "08016"
MOLSAN_LAT = 41.436194
MOLSAN_LNG = 2.179865


# ============================================================
# DISTANCIA HAVERSINE
# ============================================================

def distancia_km(
    lat1,
    lon1,
    lat2,
    lon2,
) -> float:

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

    R = 6371.0

    dlat = math.radians(
        lat2 - lat1
    )

    dlon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(
            dlat / 2
        ) ** 2
        +
        math.cos(
            math.radians(lat1)
        )
        * math.cos(
            math.radians(lat2)
        )
        * math.sin(
            dlon / 2
        ) ** 2
    )

    a = max(
        0.0,
        min(
            1.0,
            a,
        ),
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(
            1 - a
        ),
    )

    return round(
        R * c,
        2,
    )

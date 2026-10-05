import math


# ============================================================
# MOLSAN
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
        *
        math.cos(
            math.radians(lat2)
        )
        *
        math.sin(
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

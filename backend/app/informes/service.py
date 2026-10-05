from datetime import date
from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado

from backend.app.utils.distancia import (
    distancia_km,
    MOLSAN_LAT,
    MOLSAN_LNG,
)


# ============================================================
# RANGO DEL MES
# ============================================================

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


# ============================================================
# ES VIDEOCONFERENCIA
# ============================================================

def _es_videoconferencia(
    cita: Cita,
    notario: Notaria | None = None,
) -> bool:

    # --------------------------------------------------------
    # Primero usamos el tipo guardado en la cita
    # --------------------------------------------------------

    tipo_firma = (
        getattr(
            cita,
            "tipo_firma",
            None,
        )
        or ""
    )

    tipo_firma = str(
        tipo_firma
    ).strip().lower()

    if tipo_firma.startswith(
        "video"
    ):

        return True

    # --------------------------------------------------------
    # Si no está claro, usamos VC del notario
    # --------------------------------------------------------

    if notario:

        vc = (
            getattr(
                notario,
                "vc",
                None,
            )
            or ""
        )

        vc = str(
            vc
        ).strip().upper()

        if vc in (
            "SI",
            "VC",
            "VIDEOCONFERENCIA",
        ):

            return True

    return False


# ============================================================
# KM DE UNA CITA
# ============================================================

def km_de_cita(
    db: Session,
    cita: Cita,
) -> float:

    # --------------------------------------------------------
    # Obtener notario
    # --------------------------------------------------------

    if not cita.notario_id:
        return 0.0

    notario = (
        db.query(
            Notaria
        )
        .filter(
            Notaria.id
            == cita.notario_id
        )
        .first()
    )

    if not notario:
        return 0.0

    # --------------------------------------------------------
    # VC = 0 KM
    # --------------------------------------------------------

    if _es_videoconferencia(
        cita,
        notario,
    ):

        return 0.0

    # --------------------------------------------------------
    # Coordenadas
    # --------------------------------------------------------

    lat = getattr(
        notario,
        "lat",
        None,
    )

    lng = getattr(
        notario,
        "lng",
        None,
    )

    if lat in (
        None,
        "",
    ):

        return 0.0

    if lng in (
        None,
        "",
    ):

        return 0.0

    # --------------------------------------------------------
    # Calcular
    # --------------------------------------------------------

    try:

        km = distancia_km(
            MOLSAN_LAT,
            MOLSAN_LNG,
            float(lat),
            float(lng),
        )

        return round(
            float(km),
            2,
        )

    except Exception as exc:

        print(
            "ERROR CALCULANDO KM "
            f"CITA {cita.id}: {exc}",
            flush=True,
        )

        return 0.0


# ============================================================
# TABLA
# ============================================================

def obtener_tabla(
    db: Session,
    mes: int,
    año: int,
):

    inicio, fin = _rango_mes(
        año,
        mes,
    )

    citas = (
        db.query(
            Cita
        )
        .filter(
            Cita.fecha >= inicio
        )
        .filter(
            Cita.fecha < fin
        )
        .order_by(
            Cita.fecha.asc(),
            Cita.hora_inicio.asc(),
        )
        .all()
    )

    tabla = {}

    for cita in citas:

        # ----------------------------------------------------
        # APODERADO
        # ----------------------------------------------------

        if cita.apoderado_id:

            empleado = (
                db.query(
                    Empleado
                )
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

            ap_id = cita.apoderado_id

        else:

            nombre = (
                cita.apoderado
                or "Sin nombre"
            )

            ap_id = nombre

        # ----------------------------------------------------
        # CREAR FILA
        # ----------------------------------------------------

        if ap_id not in tabla:

            tabla[ap_id] = {
                "apoderado_id": ap_id,
                "nombre": nombre,
                "vc": 0,
                "presencial": 0,
                "km": 0.0,
            }

        # ----------------------------------------------------
        # NOTARIO
        # ----------------------------------------------------

        notario = None

        if cita.notario_id:

            notario = (
                db.query(
                    Notaria
                )
                .filter(
                    Notaria.id
                    == cita.notario_id
                )
                .first()
            )

        # ----------------------------------------------------
        # VC / PRESENCIAL
        # ----------------------------------------------------

        if _es_videoconferencia(
            cita,
            notario,
        ):

            tabla[ap_id]["vc"] += 1

        else:

            tabla[ap_id]["presencial"] += 1

            tabla[ap_id]["km"] += (
                km_de_cita(
                    db,
                    cita,
                )
            )

    # --------------------------------------------------------
    # Redondeo final
    # --------------------------------------------------------

    for fila in tabla.values():

        fila["km"] = round(
            fila["km"],
            2,
        )

    return list(
        tabla.values()
    )


# ============================================================
# RANKING
# ============================================================

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


# ============================================================
# INFORME INDIVIDUAL
# ============================================================

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

    citas = (
        db.query(
            Cita
        )
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

    for cita in citas:

        notario = None

        if cita.notario_id:

            notario = (
                db.query(
                    Notaria
                )
                .filter(
                    Notaria.id
                    == cita.notario_id
                )
                .first()
            )

        if _es_videoconferencia(
            cita,
            notario,
        ):

            total_vc += 1

        else:

            total_presencial += 1

            total_km += (
                km_de_cita(
                    db,
                    cita,
                )
            )

        if cita.fecha:

            dias.append(
                cita.fecha
            )

    # --------------------------------------------------------
    # Tiempo medio entre citas
    # --------------------------------------------------------

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

        if diferencias:

            tiempo_medio = (
                sum(
                    diferencias
                )
                /
                len(
                    diferencias
                )
            )

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

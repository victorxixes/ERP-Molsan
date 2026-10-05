from sqlalchemy import cast, Date
from sqlalchemy.orm import Session
from datetime import date, timedelta, time
from calendar import monthrange

from backend.app.agenda.models import Cita
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado
from backend.app.agenda.geocode import distancia_molsan


# =========================================================
# CITA CON RELACIONES
# =========================================================

def cita_con_relaciones(
    db: Session,
    cita: Cita
):
    # ======================================================
    # NOTARIO
    # ======================================================

    notario = None

    if cita.notario_id:

        notario = (
            db.query(Notaria)
            .filter(
                Notaria.id == cita.notario_id
            )
            .first()
        )

    # ======================================================
    # APODERADO
    # ======================================================

    apoderado = None

    if cita.apoderado_id:

        apoderado = (
            db.query(Empleado)
            .filter(
                Empleado.id == cita.apoderado_id
            )
            .first()
        )

    # ======================================================
    # TIPO DE FIRMA
    # ======================================================

    if notario:

        vc_val = (
            notario.vc or ""
        ).strip().upper()

        tipo_firma = (
            "Videoconferencia"
            if vc_val in [
                "SI",
                "VC",
                "VIDEOCONFERENCIA",
            ]
            else "Presencial"
        )

    else:

        tipo_firma = (
            cita.tipo_firma
            or "Presencial"
        )

    # ======================================================
    # DISTANCIA MOLSAN -> NOTARÍA
    # ======================================================

    distancia_km = None

    if notario:

        lat = getattr(
            notario,
            "lat",
            None
        )

        lng = getattr(
            notario,
            "lng",
            None
        )

        distancia_km = distancia_molsan(
            lat,
            lng
        )

    # ======================================================
    # RESPUESTA
    # ======================================================

    return {

        "id": cita.id,

        "fecha": (
            cita.fecha.strftime("%Y-%m-%d")
            if cita.fecha
            else None
        ),

        "hora_inicio": (
            str(cita.hora_inicio)
            if cita.hora_inicio
            else None
        ),

        "hora_fin": (
            str(cita.hora_fin)
            if cita.hora_fin
            else None
        ),

        "tipo_cita": cita.tipo_cita,

        "tipo_firma": tipo_firma,

        "distancia_km": distancia_km,

        "vc": (
            notario.vc
            if notario
            else None
        ),

        "observaciones": (
            cita.observaciones
        ),

        # ==================================================
        # NOTARIO
        # ==================================================

        "notario_id": (
            cita.notario_id
        ),

        "notario_nombre": (
            f"{notario.nombre} "
            f"{notario.apellidos}"
            if notario
            else None
        ),

        "notario": {

            "id": notario.id,

            "codigo": getattr(
                notario,
                "codigo",
                None
            ),

            "nif": getattr(
                notario,
                "nif",
                None
            ),

            "nombre": notario.nombre,

            "apellidos": notario.apellidos,

            "telefono": notario.telefono,

            "provincia": notario.provincia,

            "municipio": notario.municipio,

            "cp": getattr(
                notario,
                "cp",
                None
            ),

            "direccion": getattr(
                notario,
                "direccion",
                None
            ),

            "vc": notario.vc,

            "apoderado": getattr(
                notario,
                "apoderado",
                None
            ),

            "observacion": getattr(
                notario,
                "observacion",
                None
            ),

            "lat": getattr(
                notario,
                "lat",
                None
            ),

            "lng": getattr(
                notario,
                "lng",
                None
            ),

            "distancia_km": distancia_km,

        } if notario else None,

        # ==================================================
        # APODERADO
        # ==================================================

        "apoderado_id": (
            cita.apoderado_id
        ),

        "apoderado_nombre": (

            f"{apoderado.nombre} "
            f"{apoderado.apellidos}"

            if apoderado

            else (
                cita.apoderado
                or ""
            )
        ),

        "apoderado": (
            cita.apoderado
        ),
    }


# =========================================================
# OBTENER CITA
# =========================================================

def obtener_cita(
    db: Session,
    cita_id: int
):

    cita = (
        db.query(Cita)
        .filter(
            Cita.id == cita_id
        )
        .first()
    )

    if not cita:
        return None

    return cita_con_relaciones(
        db,
        cita
    )


# =========================================================
# LISTAR CITAS POR DÍA
# =========================================================

def listar_citas_dia(
    db: Session,
    fecha: date
):

    citas = (
        db.query(Cita)

        .filter(
            cast(
                Cita.fecha,
                Date
            ) == fecha
        )

        .order_by(
            Cita.hora_inicio.asc()
        )

        .all()
    )

    return [
        cita_con_relaciones(
            db,
            c
        )
        for c in citas
    ]


# =========================================================
# LISTAR CITAS POR SEMANA
# =========================================================

def listar_citas_semana(
    db: Session,
    fecha: date
):

    inicio_semana = fecha

    fin_semana = (
        fecha
        + timedelta(days=6)
    )

    citas = (
        db.query(Cita)

        .filter(
            cast(
                Cita.fecha,
                Date
            ) >= inicio_semana
        )

        .filter(
            cast(
                Cita.fecha,
                Date
            ) <= fin_semana
        )

        .order_by(
            Cita.fecha.asc(),
            Cita.hora_inicio.asc()
        )

        .all()
    )

    return [
        cita_con_relaciones(
            db,
            c
        )
        for c in citas
    ]


# =========================================================
# LISTAR CITAS POR MES
# =========================================================

def listar_citas_mes(
    db: Session,
    year: int,
    month: int
):

    last_day = monthrange(
        year,
        month
    )[1]

    inicio = date(
        year,
        month,
        1
    )

    fin = date(
        year,
        month,
        last_day
    )

    citas = (
        db.query(Cita)

        .filter(
            cast(
                Cita.fecha,
                Date
            ) >= inicio
        )

        .filter(
            cast(
                Cita.fecha,
                Date
            ) <= fin
        )

        .order_by(
            Cita.fecha.asc(),
            Cita.hora_inicio.asc()
        )

        .all()
    )

    return [
        cita_con_relaciones(
            db,
            c
        )
        for c in citas
    ]


# =========================================================
# RELLENAR DESDE NOTARIO
# =========================================================

def _rellenar_desde_notario(
    db: Session,
    cita: Cita
):

    if not cita.notario_id:
        return

    notario = (
        db.query(Notaria)
        .filter(
            Notaria.id == cita.notario_id
        )
        .first()
    )

    if not notario:
        return

    # ======================================================
    # TIPO FIRMA DESDE VC
    # ======================================================

    vc_val = (
        notario.vc or ""
    ).strip().upper()

    cita.tipo_firma = (

        "Videoconferencia"

        if vc_val in [
            "SI",
            "VC",
            "VIDEOCONFERENCIA",
        ]

        else "Presencial"
    )

    # ======================================================
    # NO ASIGNAR APODERADO AUTOMÁTICAMENTE
    # ======================================================

    # El apoderado se mantiene independiente
    # de la notaría.

    # ======================================================
    # OBSERVACIONES
    # ======================================================

    if (
        not cita.observaciones
        and getattr(
            notario,
            "observacion",
            None
        )
    ):

        cita.observaciones = (
            notario.observacion
        )


# =========================================================
# CREAR CITA
# =========================================================

def crear_cita(
    db: Session,
    data
):

    cita = Cita(
        **data.dict()
    )

    _rellenar_desde_notario(
        db,
        cita
    )

    db.add(cita)

    db.commit()

    db.refresh(cita)

    return cita_con_relaciones(
        db,
        cita
    )


# =========================================================
# EDITAR CITA
# =========================================================

def editar_cita(
    db: Session,
    cita_id: int,
    data
):

    cita = (
        db.query(Cita)
        .filter(
            Cita.id == cita_id
        )
        .first()
    )

    if not cita:
        return None

    for key, value in (
        data.dict(
            exclude_unset=True
        ).items()
    ):

        setattr(
            cita,
            key,
            value
        )

    _rellenar_desde_notario(
        db,
        cita
    )

    db.commit()

    db.refresh(cita)

    return cita_con_relaciones(
        db,
        cita
    )


# =========================================================
# ELIMINAR CITA
# =========================================================

def eliminar_cita(
    db: Session,
    cita_id: int
):

    cita = (
        db.query(Cita)
        .filter(
            Cita.id == cita_id
        )
        .first()
    )

    if not cita:
        return None

    db.delete(cita)

    db.commit()

    return True


# =========================================================
# MOVER CITA
# =========================================================

def mover_cita(
    db: Session,
    cita_id: int,
    nueva_fecha: date,
    nueva_hora_inicio: time,
    nueva_hora_fin: time
):

    cita = (
        db.query(Cita)
        .filter(
            Cita.id == cita_id
        )
        .first()
    )

    if not cita:
        return None

    cita.fecha = nueva_fecha

    cita.hora_inicio = (
        nueva_hora_inicio
    )

    cita.hora_fin = (
        nueva_hora_fin
    )

    db.commit()

    db.refresh(cita)

    return cita_con_relaciones(
        db,
        cita
    )

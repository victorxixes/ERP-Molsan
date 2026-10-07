from datetime import date
from calendar import monthrange

from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.ctn.models import Notaria
from backend.app.empleados.models import Empleado
from backend.app.expedientes.models import Expediente

from backend.app.agenda.geocode import distancia_molsan


# ============================================================
# NORMALIZAR TIPO DE FIRMA
# ============================================================

def normalizar_tipo_firma(
    cita: Cita,
    notario=None,
):

    if notario is not None:

        vc = str(
            getattr(
                notario,
                "vc",
                "",
            )
            or ""
        ).strip().upper()

        if vc in {
            "SI",
            "VC",
            "VIDEOCONFERENCIA",
        }:

            return "Videoconferencia"

        if vc in {
            "NO",
            "PRESENCIAL",
        }:

            return "Presencial"

    tipo = str(
        getattr(
            cita,
            "tipo_firma",
            "",
        )
        or ""
    ).strip().upper()

    if tipo in {
        "SI",
        "VC",
        "VIDEOCONFERENCIA",
    }:

        return "Videoconferencia"

    return (
        getattr(
            cita,
            "tipo_firma",
            None,
        )
        or "Presencial"
    )


# ============================================================
# DISTANCIA
# ============================================================

def calcular_distancia_cita(
    db: Session,
    cita: Cita,
):

    notario = getattr(
        cita,
        "notario",
        None,
    )

    if (
        notario is None
        and cita.notario_id
    ):

        notario = (
            db.query(Notaria)
            .filter(
                Notaria.id
                == cita.notario_id
            )
            .first()
        )

    tipo_firma = normalizar_tipo_firma(
        cita,
        notario,
    )

    if tipo_firma == "Videoconferencia":

        return 0.0

    if notario is None:

        return 0.0

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

    if lat is None or lng is None:

        return 0.0

    try:

        return float(
            distancia_molsan(
                float(lat),
                float(lng),
            )
        )

    except Exception:

        return 0.0


# ============================================================
# SERIALIZAR CITA
# ============================================================

def cita_con_relaciones(
    db: Session,
    cita: Cita,
):

    notario = getattr(
        cita,
        "notario",
        None,
    )

    if (
        notario is None
        and cita.notario_id
    ):

        notario = (
            db.query(Notaria)
            .filter(
                Notaria.id
                == cita.notario_id
            )
            .first()
        )

    empleado = None

    if cita.apoderado_id:

        empleado = (
            db.query(Empleado)
            .filter(
                Empleado.id
                == cita.apoderado_id
            )
            .first()
        )

    expediente = None

    if getattr(
        cita,
        "expediente_id",
        None,
    ):

        expediente = (
            db.query(Expediente)
            .filter(
                Expediente.id
                == cita.expediente_id
            )
            .first()
        )

    tipo_firma = normalizar_tipo_firma(
        cita,
        notario,
    )

    distancia = calcular_distancia_cita(
        db,
        cita,
    )

    notario_nombre = ""

    if notario:

        notario_nombre = (
            f"{getattr(notario, 'nombre', '') or ''} "
            f"{getattr(notario, 'apellidos', '') or ''}"
        ).strip()

    apoderado_nombre = ""

    if empleado:

        apoderado_nombre = (
            f"{getattr(empleado, 'nombre', '') or ''} "
            f"{getattr(empleado, 'apellidos', '') or ''}"
        ).strip()

    elif cita.apoderado:

        apoderado_nombre = (
            cita.apoderado
        )

    return {

        "id":
            cita.id,

        "fecha":
            cita.fecha,

        "hora_inicio":
            cita.hora_inicio,

        "hora_fin":
            cita.hora_fin,

        "tipo_cita":
            cita.tipo_cita,

        "tipo_firma":
            tipo_firma,

        "distancia_km":
            distancia,

        "observaciones":
            cita.observaciones
            or "",

        "notario_id":
            cita.notario_id,

        "notario_nombre":
            notario_nombre,

        "notario":
            notario,

        "apoderado_id":
            cita.apoderado_id,

        "apoderado_nombre":
            apoderado_nombre,

        "apoderado":
            cita.apoderado,

        "expediente_id":
            getattr(
                cita,
                "expediente_id",
                None,
            ),

        "id_expediente":
            getattr(
                expediente,
                "id_expediente",
                None,
            ),
    }


# ============================================================
# OBTENER UNA CITA
# ============================================================

def obtener_cita(
    db: Session,
    cita_id: int,
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
        cita,
    )


# ============================================================
# DÍA
# ============================================================

def obtener_citas_dia(
    db: Session,
    fecha: date,
):

    citas = (
        db.query(Cita)
        .filter(
            Cita.fecha == fecha
        )
        .order_by(
            Cita.hora_inicio.asc()
        )
        .all()
    )

    return [
        cita_con_relaciones(
            db,
            cita,
        )
        for cita in citas
    ]


# ============================================================
# SEMANA
# ============================================================

def obtener_citas_semana(
    db: Session,
    fecha: date,
):

    inicio = (
        fecha
        - __import__(
            "datetime"
        ).timedelta(
            days=fecha.weekday()
        )
    )

    fin = (
        inicio
        + __import__(
            "datetime"
        ).timedelta(
            days=7
        )
    )

    citas = (
        db.query(Cita)
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

    return [
        cita_con_relaciones(
            db,
            cita,
        )
        for cita in citas
    ]


# ============================================================
# MES
# ============================================================

def obtener_citas_mes(
    db: Session,
    año: int,
    mes: int,
):

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

    citas = (
        db.query(Cita)
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

    return [
        cita_con_relaciones(
            db,
            cita,
        )
        for cita in citas
    ]


# ============================================================
# COMPLETAR DATOS DEL NOTARIO
# ============================================================

def _rellenar_desde_notario(
    db: Session,
    cita: Cita,
):

    if not cita.notario_id:

        return

    notario = (
        db.query(Notaria)
        .filter(
            Notaria.id
            == cita.notario_id
        )
        .first()
    )

    if notario:

        return

    cita.tipo_firma = (
        normalizar_tipo_firma(
            cita,
            notario,
        )
    )

    if not cita.observaciones:

        observacion = getattr(
            notario,
            "observacion",
            None,
        )

        if observacion:

            cita.observaciones = (
                observacion
            )


# ============================================================
# CREAR CITA
# ============================================================

def crear_cita(
    db: Session,
    data,
):

    datos = data.dict(
        exclude_none=True
    )

    cita = Cita(
        **datos
    )

    _rellenar_desde_notario(
        db,
        cita,
    )

    db.add(cita)

    db.commit()

    db.refresh(cita)

    return cita_con_relaciones(
        db,
        cita,
    )


# ============================================================
# EDITAR CITA
# ============================================================

def editar_cita(
    db: Session,
    cita_id: int,
    data,
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

    datos = data.dict(
        exclude_unset=True
    )

    for campo, valor in datos.items():

        setattr(
            cita,
            campo,
            valor,
        )

    _rellenar_desde_notario(
        db,
        cita,
    )

    db.commit()

    db.refresh(cita)

    return cita_con_relaciones(
        db,
        cita,
    )


# ============================================================
# ELIMINAR
# ============================================================

def eliminar_cita(
    db: Session,
    cita_id: int,
):

    cita = (
        db.query(Cita)
        .filter(
            Cita.id == cita_id
        )
        .first()
    )

    if not cita:

        return False

    db.delete(cita)

    db.commit()

    return True


# ============================================================
# MOVER CITA
# ============================================================

def mover_cita(
    db: Session,
    cita_id: int,
    fecha: date,
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

    cita.fecha = fecha

    db.commit()

    db.refresh(cita)

    return cita_con_relaciones(
        db,
        cita,
    )

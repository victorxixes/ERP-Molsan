import os
import time
import requests

from sqlalchemy.orm import Session

from backend.app.ctn.models import Notaria
from backend.app.ctn.normalizador import limpiar_direccion


# ============================================================
# CONFIGURACIÓN
# ============================================================

GOOGLE_GEOCODING_URL = (
    "https://maps.googleapis.com/maps/api/geocode/json"
)

PAUSA_ENTRE_PETICIONES = 0.10


# ============================================================
# API KEY
# ============================================================

def obtener_google_api_key():
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if not api_key:
        raise RuntimeError(
            "No existe la variable de entorno "
            "GOOGLE_MAPS_API_KEY"
        )

    return api_key


# ============================================================
# CONSTRUIR DIRECCIÓN
# ============================================================

def construir_direccion(notaria: Notaria) -> str:
    """
    Construye una dirección completa.

    NO devuelve 'España' si no existe una dirección real.
    """

    direccion = limpiar_direccion(
        getattr(notaria, "direccion", "") or ""
    )

    cp = str(
        getattr(notaria, "cp", "") or ""
    ).strip()

    municipio = limpiar_direccion(
        getattr(notaria, "municipio", "") or ""
    )

    provincia = limpiar_direccion(
        getattr(notaria, "provincia", "") or ""
    )

    # ========================================================
    # SI NO HAY NINGÚN DATO REAL
    # ========================================================

    if not direccion and not cp and not municipio and not provincia:
        return ""

    partes = []

    if direccion:
        partes.append(direccion)

    if cp:
        partes.append(cp)

    if municipio:
        partes.append(municipio)

    if provincia:
        partes.append(provincia)

    partes.append("España")

    return ", ".join(
        p.strip()
        for p in partes
        if p and p.strip()
    )


# ============================================================
# CONSTRUIR CONSULTAS ALTERNATIVAS
# ============================================================

def construir_consultas_geocode(notaria: Notaria):
    """
    Genera varias consultas posibles para Google.

    Primera opción:
        dirección + CP + municipio + provincia + España

    Segunda:
        dirección + municipio + provincia + España

    Tercera:
        dirección + municipio + España
    """

    direccion = limpiar_direccion(
        getattr(notaria, "direccion", "") or ""
    )

    cp = str(
        getattr(notaria, "cp", "") or ""
    ).strip()

    municipio = limpiar_direccion(
        getattr(notaria, "municipio", "") or ""
    )

    provincia = limpiar_direccion(
        getattr(notaria, "provincia", "") or ""
    )

    consultas = []

    # --------------------------------------------------------
    # CONSULTA 1
    # --------------------------------------------------------

    partes = [
        direccion,
        cp,
        municipio,
        provincia,
        "España",
    ]

    consulta = ", ".join(
        p for p in partes
        if p
    )

    if consulta:
        consultas.append(consulta)

    # --------------------------------------------------------
    # CONSULTA 2
    # --------------------------------------------------------

    partes = [
        direccion,
        municipio,
        provincia,
        "España",
    ]

    consulta = ", ".join(
        p for p in partes
        if p
    )

    if consulta and consulta not in consultas:
        consultas.append(consulta)

    # --------------------------------------------------------
    # CONSULTA 3
    # --------------------------------------------------------

    partes = [
        direccion,
        municipio,
        "España",
    ]

    consulta = ", ".join(
        p for p in partes
        if p
    )

    if consulta and consulta not in consultas:
        consultas.append(consulta)

    return consultas


# ============================================================
# GEOCODIFICAR
# ============================================================

def geocodificar_direccion(
    direccion: str,
    api_key: str,
):
    if not direccion:
        return None

    try:
        response = requests.get(
            GOOGLE_GEOCODING_URL,
            params={
                "address": direccion,
                "key": api_key,
                "region": "es",
                "language": "es",
            },
            timeout=15,
        )

    except requests.RequestException as e:

        print(
            f"[GEOCODE] ERROR HTTP: {e}",
            flush=True,
        )

        return None

    if response.status_code != 200:

        print(
            f"[GEOCODE] HTTP {response.status_code}: "
            f"{response.text[:500]}",
            flush=True,
        )

        return None

    try:
        data = response.json()

    except Exception as e:

        print(
            f"[GEOCODE] ERROR JSON: {e}",
            flush=True,
        )

        return None

    status = data.get("status")

    if status != "OK":

        print(
            f"[GEOCODE] SIN RESULTADO | "
            f"status={status} | "
            f"direccion={direccion}",
            flush=True,
        )

        return None

    resultados = data.get("results") or []

    if not resultados:
        return None

    resultado = resultados[0]

    geometry = (
        resultado
        .get("geometry", {})
        .get("location", {})
    )

    lat = geometry.get("lat")
    lng = geometry.get("lng")

    if lat is None or lng is None:
        return None

    try:
        lat = float(lat)
        lng = float(lng)

    except (TypeError, ValueError):
        return None

    return {
        "lat": lat,
        "lng": lng,
        "formatted_address": (
            resultado.get("formatted_address")
            or ""
        ),
    }


# ============================================================
# GEOCODIFICAR NOTARÍA
# ============================================================

def geocodificar_notaria(
    notaria: Notaria,
    api_key: str,
):
    """
    Geocodifica una notaría.

    Si ya tiene coordenadas, no consulta Google.
    """

    lat_actual = getattr(
        notaria,
        "lat",
        None,
    )

    lng_actual = getattr(
        notaria,
        "lng",
        None,
    )

    # ========================================================
    # YA TIENE COORDENADAS
    # ========================================================

    if lat_actual and lng_actual:

        try:
            return {
                "estado": "ya_con_coordenadas",
                "lat": float(lat_actual),
                "lng": float(lng_actual),
            }

        except (TypeError, ValueError):
            pass

    # ========================================================
    # CONSULTAS
    # ========================================================

    consultas = construir_consultas_geocode(
        notaria
    )

    # ========================================================
    # SIN DIRECCIÓN REAL
    # ========================================================

    if not consultas:

        return {
            "estado": "sin_direccion",
        }

    # ========================================================
    # PROBAR CONSULTAS
    # ========================================================

    for consulta in consultas:

        print(
            "[GEOCODE] BUSCANDO:",
            consulta,
            flush=True,
        )

        resultado = geocodificar_direccion(
            consulta,
            api_key,
        )

        if resultado:

            notaria.lat = str(
                resultado["lat"]
            )

            notaria.lng = str(
                resultado["lng"]
            )

            return {
                "estado": "actualizada",
                "lat": resultado["lat"],
                "lng": resultado["lng"],
                "direccion": consulta,
                "formatted_address": (
                    resultado["formatted_address"]
                ),
            }

        # pequeña pausa entre intentos
        time.sleep(
            PAUSA_ENTRE_PETICIONES
        )

    return {
        "estado": "sin_resultados",
        "direccion": consultas[0],
    }


# ============================================================
# MIGRACIÓN COMPLETA
# ============================================================

def agregar_coordenadas(db: Session):

    api_key = obtener_google_api_key()

    notarías = (
        db.query(Notaria)
        .order_by(Notaria.id.asc())
        .all()
    )

    total_notarias = len(notarías)

    actualizadas = 0
    ya_con_coordenadas = 0
    sin_direccion = 0
    sin_resultados = 0
    errores = 0

    print(
        "============================================================",
        flush=True,
    )

    print(
        "MIGRACIÓN COORDENADAS CTN - INICIO",
        flush=True,
    )

    print(
        f"TOTAL NOTARÍAS: {total_notarias}",
        flush=True,
    )

    print(
        "============================================================",
        flush=True,
    )

    for indice, notaria in enumerate(
        notarías,
        start=1,
    ):

        try:

            resultado = geocodificar_notaria(
                notaria,
                api_key,
            )

            estado = resultado.get(
                "estado"
            )

            if estado == "actualizada":

                actualizadas += 1

                print(
                    f"[{indice}/{total_notarias}] "
                    f"OK | "
                    f"id={notaria.id} | "
                    f"lat={notaria.lat} | "
                    f"lng={notaria.lng} | "
                    f"{resultado.get('formatted_address', '')}",
                    flush=True,
                )

                # Guardado por lotes
                if actualizadas % 25 == 0:

                    db.commit()

                    print(
                        f"[GEOCODE] COMMIT "
                        f"actualizadas={actualizadas}",
                        flush=True,
                    )

            elif estado == "ya_con_coordenadas":

                ya_con_coordenadas += 1

            elif estado == "sin_direccion":

                sin_direccion += 1

                print(
                    f"[{indice}/{total_notarias}] "
                    f"SIN DIRECCIÓN REAL | "
                    f"id={notaria.id}",
                    flush=True,
                )

            elif estado == "sin_resultados":

                sin_resultados += 1

                print(
                    f"[{indice}/{total_notarias}] "
                    f"SIN RESULTADO | "
                    f"id={notaria.id} | "
                    f"{resultado.get('direccion', '')}",
                    flush=True,
                )

            time.sleep(
                PAUSA_ENTRE_PETICIONES
            )

        except Exception as e:

            errores += 1

            print(
                f"[{indice}/{total_notarias}] "
                f"ERROR | "
                f"id={getattr(notaria, 'id', None)} | "
                f"{e}",
                flush=True,
            )

            db.rollback()

    # ========================================================
    # COMMIT FINAL
    # ========================================================

    print(
        "[GEOCODE] COMMIT FINAL...",
        flush=True,
    )

    db.commit()

    print(
        "============================================================",
        flush=True,
    )

    print(
        "MIGRACIÓN COORDENADAS CTN - FINALIZADA",
        flush=True,
    )

    print(
        f"TOTAL NOTARÍAS: {total_notarias}",
        flush=True,
    )

    print(
        f"ACTUALIZADAS: {actualizadas}",
        flush=True,
    )

    print(
        f"YA CON COORDENADAS: {ya_con_coordenadas}",
        flush=True,
    )

    print(
        f"SIN DIRECCIÓN: {sin_direccion}",
        flush=True,
    )

    print(
        f"SIN RESULTADOS: {sin_resultados}",
        flush=True,
    )

    print(
        f"ERRORES: {errores}",
        flush=True,
    )

    print(
        "============================================================",
        flush=True,
    )

    return {
        "total_notarias": total_notarias,
        "actualizadas": actualizadas,
        "ya_con_coordenadas": ya_con_coordenadas,
        "sin_direccion": sin_direccion,
        "sin_resultados": sin_resultados,
        "errores": errores,
    }

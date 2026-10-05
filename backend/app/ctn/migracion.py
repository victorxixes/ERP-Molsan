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

# Coordenadas de MOLSAN
MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740

# Pausa entre peticiones para evitar bombardear Google
PAUSA_ENTRE_PETICIONES = 0.10


# ============================================================
# API KEY GOOGLE
# ============================================================

def obtener_google_api_key():
    """
    Obtiene la API KEY desde las variables de entorno de Render.

    Debe existir:

        GOOGLE_MAPS_API_KEY

    No se guarda ninguna clave dentro del código.
    """

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
    Construye una dirección completa y limpia para Google.

    Ejemplo:

        Calle Mallorca 123, 08013, Barcelona, Barcelona, España
    """

    partes = []

    direccion = limpiar_direccion(
        getattr(notaria, "direccion", "") or ""
    )

    cp = str(
        getattr(notaria, "cp", "") or ""
    ).strip()

    municipio = str(
        getattr(notaria, "municipio", "") or ""
    ).strip()

    provincia = str(
        getattr(notaria, "provincia", "") or ""
    ).strip()

    if direccion:
        partes.append(direccion)

    if cp:
        partes.append(cp)

    if municipio:
        partes.append(municipio)

    if provincia:
        partes.append(provincia)

    partes.append("España")

    # Eliminar elementos vacíos
    partes = [
        str(p).strip()
        for p in partes
        if str(p).strip()
    ]

    return ", ".join(partes)


# ============================================================
# GEOCODIFICAR UNA DIRECCIÓN
# ============================================================

def geocodificar_direccion(
    direccion: str,
    api_key: str,
):
    """
    Envía una dirección a Google Geocoding.

    Devuelve:

        {
            "lat": ...,
            "lng": ...,
            "formatted_address": ...
        }

    o None si no existe resultado.
    """

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
            "[GEOCODE] HTTP "
            f"{response.status_code}: "
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
            "[GEOCODE] SIN RESULTADO | "
            f"status={status} | "
            f"direccion={direccion}",
            flush=True,
        )

        return None

    resultados = data.get("results") or []

    if not resultados:

        print(
            "[GEOCODE] SIN RESULTADOS | "
            f"direccion={direccion}",
            flush=True,
        )

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

        print(
            "[GEOCODE] RESULTADO SIN COORDENADAS | "
            f"direccion={direccion}",
            flush=True,
        )

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
# GEOCODIFICAR UNA NOTARÍA
# ============================================================

def geocodificar_notaria(
    notaria: Notaria,
    api_key: str,
):
    """
    Geocodifica una notaría.

    IMPORTANTE:
    Si ya tiene coordenadas NO vuelve a consultar Google.
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

    if lat_actual and lng_actual:

        return {
            "estado": "ya_con_coordenadas",
            "lat": float(lat_actual),
            "lng": float(lng_actual),
        }

    direccion = construir_direccion(
        notaria
    )

    if not direccion:

        return {
            "estado": "sin_direccion",
        }

    print(
        "[GEOCODE] BUSCANDO:",
        direccion,
        flush=True,
    )

    resultado = geocodificar_direccion(
        direccion,
        api_key,
    )

    if not resultado:

        return {
            "estado": "sin_resultados",
            "direccion": direccion,
        }

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
        "direccion": direccion,
        "formatted_address": (
            resultado["formatted_address"]
        ),
    }


# ============================================================
# MIGRACIÓN COMPLETA
# ============================================================

def agregar_coordenadas(db: Session):
    """
    Recorre todas las notarías y añade coordenadas.

    NO modifica las notarías que ya tienen lat/lng.
    """

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
                    f"lng={notaria.lng}",
                    flush=True,
                )

                # Guardamos periódicamente.
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
                    f"SIN DIRECCIÓN | "
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

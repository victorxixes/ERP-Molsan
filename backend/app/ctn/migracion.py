from __future__ import annotations

import os
import time
import unicodedata
from typing import Optional

import requests
from sqlalchemy.orm import Session

from backend.app.ctn.models import Notaria


# ============================================================
# CONFIGURACIÓN
# ============================================================

MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740

# Geocodificación mediante Google Geocoding API.
#
# En Render debe existir:
#
# GOOGLE_MAPS_API_KEY
#
GOOGLE_MAPS_API_KEY = os.getenv(
    "GOOGLE_MAPS_API_KEY"
)

GOOGLE_GEOCODE_URL = (
    "https://maps.googleapis.com/maps/api/geocode/json"
)

# Pausa entre peticiones para evitar bombardear el servicio.
GEOCODE_DELAY = 0.15

# Timeout de cada petición.
GEOCODE_TIMEOUT = 15


# ============================================================
# NORMALIZAR TEXTO
# ============================================================

def limpiar_texto(valor) -> str:
    """
    Limpia texto para construir una dirección de búsqueda.

    No elimina números porque en una dirección el número
    de la calle es imprescindible.
    """

    if valor is None:
        return ""

    texto = str(valor).strip()

    if not texto:
        return ""

    # Normalizar Unicode.
    texto = unicodedata.normalize(
        "NFKC",
        texto
    )

    # Espacios múltiples.
    texto = " ".join(
        texto.split()
    )

    return texto


# ============================================================
# CONSTRUIR DIRECCIÓN
# ============================================================

def construir_direccion(notaria: Notaria) -> str:
    """
    Construye una dirección completa y útil para geocodificación.

    IMPORTANTE:
    No utiliza únicamente direccion.

    Combina:

        direccion
        cp
        municipio
        provincia
        España
    """

    partes = []

    direccion = limpiar_texto(
        getattr(notaria, "direccion", None)
    )

    cp = limpiar_texto(
        getattr(notaria, "cp", None)
    )

    municipio = limpiar_texto(
        getattr(notaria, "municipio", None)
    )

    provincia = limpiar_texto(
        getattr(notaria, "provincia", None)
    )

    if direccion:
        partes.append(direccion)

    if cp:
        partes.append(cp)

    if municipio:
        partes.append(municipio)

    if provincia:
        partes.append(provincia)

    # España siempre al final.
    partes.append("España")

    return ", ".join(
        p for p in partes
        if p
    )


# ============================================================
# GEOCODIFICAR GOOGLE
# ============================================================

def geocodificar_google(
    direccion: str
) -> Optional[tuple[float, float]]:
    """
    Geocodifica una dirección usando Google Geocoding API.

    Devuelve:

        (lat, lng)

    o:

        None

    si no encuentra resultado.
    """

    if not GOOGLE_MAPS_API_KEY:
        raise RuntimeError(
            "No existe la variable de entorno "
            "GOOGLE_MAPS_API_KEY en Render."
        )

    direccion = limpiar_texto(
        direccion
    )

    if not direccion:
        return None

    try:

        response = requests.get(
            GOOGLE_GEOCODE_URL,
            params={
                "address": direccion,
                "key": GOOGLE_MAPS_API_KEY,
                "language": "es",
                "region": "es",
            },
            timeout=GEOCODE_TIMEOUT,
        )

        response.raise_for_status()

        data = response.json()

    except Exception as exc:

        print(
            f"ERROR GOOGLE GEOCODE | "
            f"direccion={direccion!r} | "
            f"error={exc}",
            flush=True,
        )

        return None

    status = data.get(
        "status"
    )

    if status != "OK":

        print(
            f"GOOGLE SIN RESULTADO | "
            f"status={status} | "
            f"direccion={direccion!r}",
            flush=True,
        )

        return None

    resultados = data.get(
        "results"
    ) or []

    if not resultados:
        return None

    location = (
        resultados[0]
        .get("geometry", {})
        .get("location", {})
    )

    lat = location.get(
        "lat"
    )

    lng = location.get(
        "lng"
    )

    if lat is None or lng is None:
        return None

    try:

        return (
            float(lat),
            float(lng),
        )

    except (
        TypeError,
        ValueError,
    ):

        return None


# ============================================================
# MIGRAR COORDENADAS
# ============================================================

def agregar_coordenadas(
    db: Session
) -> dict:
    """
    Añade coordenadas a las notarías que todavía no las tienen.

    NO modifica notarías que ya tienen lat/lng.

    Devuelve estadísticas completas.
    """

    notarías = (
        db.query(Notaria)
        .order_by(
            Notaria.id.asc()
        )
        .all()
    )

    total_notarias = len(
        notarías
    )

    actualizadas = 0
    ya_con_coordenadas = 0
    sin_direccion = 0
    sin_resultados = 0
    errores = 0

    print(
        "============================================",
        flush=True,
    )

    print(
        "CTN - MIGRACIÓN DE COORDENADAS",
        flush=True,
    )

    print(
        f"TOTAL NOTARÍAS: {total_notarias}",
        flush=True,
    )

    print(
        "============================================",
        flush=True,
    )

    for indice, notaria in enumerate(
        notarías,
        start=1,
    ):

        try:

            # ------------------------------------------------
            # YA TIENE COORDENADAS
            # ------------------------------------------------

            lat_actual = limpiar_texto(
                getattr(
                    notaria,
                    "lat",
                    None,
                )
            )

            lng_actual = limpiar_texto(
                getattr(
                    notaria,
                    "lng",
                    None,
                )
            )

            if lat_actual and lng_actual:

                ya_con_coordenadas += 1

                print(
                    f"[{indice}/{total_notarias}] "
                    f"NOTARIA {notaria.id} "
                    f"→ ya tiene coordenadas",
                    flush=True,
                )

                continue

            # ------------------------------------------------
            # CONSTRUIR DIRECCIÓN
            # ------------------------------------------------

            direccion_busqueda = (
                construir_direccion(
                    notaria
                )
            )

            # ------------------------------------------------
            # VALIDAR DIRECCIÓN
            # ------------------------------------------------

            # Como mínimo necesitamos algo más que "España".
            componentes = [
                limpiar_texto(
                    getattr(
                        notaria,
                        "direccion",
                        None,
                    )
                ),
                limpiar_texto(
                    getattr(
                        notaria,
                        "municipio",
                        None,
                    )
                ),
                limpiar_texto(
                    getattr(
                        notaria,
                        "provincia",
                        None,
                    )
                ),
            ]

            if not any(componentes):

                sin_direccion += 1

                print(
                    f"[{indice}/{total_notarias}] "
                    f"NOTARIA {notaria.id} "
                    f"→ SIN DIRECCIÓN",
                    flush=True,
                )

                continue

            # ------------------------------------------------
            # LOG REAL DE LA DIRECCIÓN
            # ------------------------------------------------

            print(
                f"[{indice}/{total_notarias}] "
                f"NOTARIA {notaria.id} "
                f"→ BUSCANDO: "
                f"{direccion_busqueda}",
                flush=True,
            )

            # ------------------------------------------------
            # GOOGLE
            # ------------------------------------------------

            coordenadas = (
                geocodificar_google(
                    direccion_busqueda
                )
            )

            if not coordenadas:

                sin_resultados += 1

                print(
                    f"[{indice}/{total_notarias}] "
                    f"NOTARIA {notaria.id} "
                    f"→ SIN RESULTADO",
                    flush=True,
                )

                time.sleep(
                    GEOCODE_DELAY
                )

                continue

            lat, lng = coordenadas

            # ------------------------------------------------
            # GUARDAR
            # ------------------------------------------------

            notaria.lat = str(
                lat
            )

            notaria.lng = str(
                lng
            )

            db.add(
                notaria
            )

            # Commit individual para no perder
            # todo el proceso si falla una petición.
            db.commit()

            actualizadas += 1

            print(
                f"[{indice}/{total_notarias}] "
                f"NOTARIA {notaria.id} "
                f"→ OK "
                f"lat={lat} "
                f"lng={lng}",
                flush=True,
            )

            # ------------------------------------------------
            # PAUSA
            # ------------------------------------------------

            time.sleep(
                GEOCODE_DELAY
            )

        except Exception as exc:

            errores += 1

            print(
                f"[{indice}/{total_notarias}] "
                f"ERROR NOTARIA "
                f"{getattr(notaria, 'id', '?')}: "
                f"{exc}",
                flush=True,
            )

            try:
                db.rollback()
            except Exception:
                pass

    # ========================================================
    # RESULTADO
    # ========================================================

    resultado = {
        "total_notarias": total_notarias,
        "actualizadas": actualizadas,
        "ya_con_coordenadas": ya_con_coordenadas,
        "sin_direccion": sin_direccion,
        "sin_resultados": sin_resultados,
        "errores": errores,
    }

    print(
        "============================================",
        flush=True,
    )

    print(
        "MIGRACIÓN COORDENADAS FINALIZADA",
        flush=True,
    )

    print(
        resultado,
        flush=True,
    )

    print(
        "============================================",
        flush=True,
    )

    return resultado

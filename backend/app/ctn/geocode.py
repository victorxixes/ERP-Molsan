import logging
import os
import time
from typing import Optional

import requests
from sqlalchemy.orm import Session

from backend.app.ctn.models import Notaria
from backend.app.ctn.normalizador import (
    limpiar_texto,
    limpiar_direccion,
)


logger = logging.getLogger(__name__)


# ============================================================
# GOOGLE MAPS
# ============================================================

GOOGLE_MAPS_API_KEY = os.getenv(
    "GOOGLE_MAPS_API_KEY"
)

GOOGLE_GEOCODE_URL = (
    "https://maps.googleapis.com/maps/api/geocode/json"
)


# ============================================================
# MOLSAN
# ============================================================

MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740


# ============================================================
# DELAY
# ============================================================

GEOCODE_DELAY = 0.20


# ============================================================
# CONSTRUIR DIRECCIONES POSIBLES
# ============================================================

def _build_address_variants(
    notaria: Notaria,
) -> list[str]:
    """
    Genera varias versiones de la dirección.

    Orden:

    1. Dirección completa
    2. Dirección + municipio + provincia
    3. Dirección + CP + municipio
    4. CP + municipio + provincia
    5. Municipio + provincia

    Se eliminan duplicados.
    """

    direccion = limpiar_direccion(
        getattr(
            notaria,
            "direccion",
            None,
        )
    )

    cp = limpiar_texto(
        getattr(
            notaria,
            "cp",
            None,
        )
    )

    municipio = limpiar_texto(
        getattr(
            notaria,
            "municipio",
            None,
        )
    )

    provincia = limpiar_texto(
        getattr(
            notaria,
            "provincia",
            None,
        )
    )

    variantes = []

    # --------------------------------------------------------
    # 1. Dirección + CP + municipio + provincia
    # --------------------------------------------------------

    partes = [
        direccion,
        cp,
        municipio,
        provincia,
        "España",
    ]

    completa = ", ".join(
        p for p in partes
        if p
    )

    if completa:
        variantes.append(
            completa
        )

    # --------------------------------------------------------
    # 2. Dirección + municipio + provincia
    # --------------------------------------------------------

    partes = [
        direccion,
        municipio,
        provincia,
        "España",
    ]

    variante = ", ".join(
        p for p in partes
        if p
    )

    if variante:
        variantes.append(
            variante
        )

    # --------------------------------------------------------
    # 3. Dirección + CP + municipio
    # --------------------------------------------------------

    partes = [
        direccion,
        cp,
        municipio,
        "España",
    ]

    variante = ", ".join(
        p for p in partes
        if p
    )

    if variante:
        variantes.append(
            variante
        )

    # --------------------------------------------------------
    # 4. CP + municipio + provincia
    # --------------------------------------------------------

    partes = [
        cp,
        municipio,
        provincia,
        "España",
    ]

    variante = ", ".join(
        p for p in partes
        if p
    )

    if variante:
        variantes.append(
            variante
        )

    # --------------------------------------------------------
    # 5. Municipio + provincia
    # --------------------------------------------------------

    partes = [
        municipio,
        provincia,
        "España",
    ]

    variante = ", ".join(
        p for p in partes
        if p
    )

    if variante:
        variantes.append(
            variante
        )

    # --------------------------------------------------------
    # Eliminar duplicados
    # --------------------------------------------------------

    resultado = []

    vistos = set()

    for variante in variantes:

        clave = variante.lower().strip()

        if not clave:
            continue

        if clave in vistos:
            continue

        vistos.add(
            clave
        )

        resultado.append(
            variante
        )

    return resultado


# ============================================================
# GOOGLE
# ============================================================

def _geocode_google(
    address: str,
) -> Optional[tuple[float, float]]:
    """
    Geocodifica una dirección mediante Google.

    Devuelve:

        (lat, lng)

    o:

        None
    """

    if not GOOGLE_MAPS_API_KEY:

        logger.error(
            "GOOGLE_MAPS_API_KEY no está configurada."
        )

        return None

    try:

        params = {
            "address": address,
            "key": GOOGLE_MAPS_API_KEY,
            "language": "es",
            "region": "es",
            "components": "country:ES",
        }

        logger.info(
            "GOOGLE GEOCODE REQUEST: %s",
            address,
        )

        response = requests.get(
            GOOGLE_GEOCODE_URL,
            params=params,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

    except requests.RequestException as exc:

        logger.error(
            "ERROR HTTP GOOGLE | %s | %s",
            address,
            exc,
        )

        return None

    except Exception as exc:

        logger.exception(
            "ERROR GOOGLE | %s | %s",
            address,
            exc,
        )

        return None

    status = data.get(
        "status"
    )

    # --------------------------------------------------------
    # OK
    # --------------------------------------------------------

    if status == "OK":

        results = (
            data.get("results")
            or []
        )

        if not results:

            logger.warning(
                "GOOGLE OK SIN RESULTADOS | %s",
                address,
            )

            return None

        result = results[0]

        geometry = (
            result.get(
                "geometry"
            )
            or {}
        )

        location = (
            geometry.get(
                "location"
            )
            or {}
        )

        lat = location.get(
            "lat"
        )

        lng = location.get(
            "lng"
        )

        if lat is None or lng is None:
            return None

        logger.info(
            "GOOGLE OK | "
            "address=%s | "
            "formatted=%s | "
            "type=%s | "
            "lat=%s | "
            "lng=%s",
            address,
            result.get(
                "formatted_address"
            ),
            geometry.get(
                "location_type"
            ),
            lat,
            lng,
        )

        return (
            float(lat),
            float(lng),
        )

    # --------------------------------------------------------
    # ZERO RESULTS
    # --------------------------------------------------------

    if status == "ZERO_RESULTS":

        logger.warning(
            "GOOGLE ZERO_RESULTS | %s",
            address,
        )

        return None

    # --------------------------------------------------------
    # REQUEST DENIED
    # --------------------------------------------------------

    if status == "REQUEST_DENIED":

        logger.error(
            "GOOGLE REQUEST_DENIED | %s | %s",
            address,
            data.get(
                "error_message"
            ),
        )

        return None

    # --------------------------------------------------------
    # OVER QUERY LIMIT
    # --------------------------------------------------------

    if status == "OVER_QUERY_LIMIT":

        logger.error(
            "GOOGLE OVER_QUERY_LIMIT",
        )

        return None

    # --------------------------------------------------------
    # OTROS
    # --------------------------------------------------------

    logger.error(
        "GOOGLE STATUS=%s | "
        "address=%s | "
        "message=%s",
        status,
        address,
        data.get(
            "error_message"
        ),
    )

    return None


# ============================================================
# GEOCODIFICAR UNA NOTARÍA
# ============================================================

def geocode_notaria(
    db: Session,
    notaria: Notaria,
) -> bool:

    # --------------------------------------------------------
    # Ya tiene coordenadas
    # --------------------------------------------------------

    if (
        limpiar_texto(
            getattr(
                notaria,
                "lat",
                None,
            )
        )
        and
        limpiar_texto(
            getattr(
                notaria,
                "lng",
                None,
            )
        )
    ):
        return False

    # --------------------------------------------------------
    # Variantes
    # --------------------------------------------------------

    variantes = _build_address_variants(
        notaria
    )

    if not variantes:

        logger.warning(
            "NOTARIA %s SIN DATOS PARA GEOCODIFICAR",
            notaria.id,
        )

        return False

    # --------------------------------------------------------
    # Probar variantes
    # --------------------------------------------------------

    for indice, address in enumerate(
        variantes,
        start=1,
    ):

        logger.info(
            "NOTARIA %s | "
            "INTENTO %s/%s | %s",
            notaria.id,
            indice,
            len(variantes),
            address,
        )

        coords = _geocode_google(
            address
        )

        if coords:

            lat, lng = coords

            try:

                notaria.lat = str(
                    lat
                )

                notaria.lng = str(
                    lng
                )

                db.add(
                    notaria
                )

                db.commit()

                db.refresh(
                    notaria
                )

                logger.info(
                    "NOTARIA %s ACTUALIZADA | "
                    "lat=%s lng=%s | "
                    "query=%s",
                    notaria.id,
                    lat,
                    lng,
                    address,
                )

                return True

            except Exception as exc:

                db.rollback()

                logger.error(
                    "ERROR GUARDANDO NOTARIA %s: %s",
                    notaria.id,
                    exc,
                )

                return False

        time.sleep(
            GEOCODE_DELAY
        )

    logger.warning(
        "NOTARIA %s SIN RESULTADOS | "
        "variantes=%s",
        notaria.id,
        variantes,
    )

    return False


# ============================================================
# TODAS LAS NOTARÍAS
# ============================================================

def geocode_todas_notarias(
    db: Session,
) -> dict:

    notarias = (
        db.query(
            Notaria
        )
        .order_by(
            Notaria.id.asc()
        )
        .all()
    )

    total = len(
        notarias
    )

    actualizadas = 0
    ya_con_coordenadas = 0
    sin_direccion = 0
    sin_resultados = 0
    errores = 0

    logger.info(
        "=============================================="
    )

    logger.info(
        "GEOCODIFICACIÓN CTN - INICIO"
    )

    logger.info(
        "TOTAL NOTARÍAS: %s",
        total,
    )

    logger.info(
        "=============================================="
    )

    for indice, notaria in enumerate(
        notarias,
        start=1,
    ):

        try:

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

            # ------------------------------------------------
            # YA TIENE COORDENADAS
            # ------------------------------------------------

            if (
                lat_actual
                and lng_actual
            ):

                ya_con_coordenadas += 1

                continue

            # ------------------------------------------------
            # VARIANTES
            # ------------------------------------------------

            variantes = _build_address_variants(
                notaria
            )

            if not variantes:

                sin_direccion += 1

                logger.warning(
                    "[%s/%s] "
                    "NOTARIA %s SIN DIRECCIÓN",
                    indice,
                    total,
                    notaria.id,
                )

                continue

            actualizada = False

            # ------------------------------------------------
            # PROBAR TODAS
            # ------------------------------------------------

            for intento, address in enumerate(
                variantes,
                start=1,
            ):

                logger.info(
                    "[%s/%s] "
                    "NOTARIA=%s "
                    "INTENTO=%s/%s "
                    "QUERY=%s",
                    indice,
                    total,
                    notaria.id,
                    intento,
                    len(variantes),
                    address,
                )

                coords = _geocode_google(
                    address
                )

                if coords:

                    lat, lng = coords

                    notaria.lat = str(
                        lat
                    )

                    notaria.lng = str(
                        lng
                    )

                    db.add(
                        notaria
                    )

                    db.commit()

                    actualizadas += 1

                    actualizada = True

                    logger.info(
                        "[%s/%s] "
                        "NOTARIA=%s "
                        "OK "
                        "lat=%s "
                        "lng=%s",
                        indice,
                        total,
                        notaria.id,
                        lat,
                        lng,
                    )

                    break

                time.sleep(
                    GEOCODE_DELAY
                )

            if not actualizada:

                sin_resultados += 1

                logger.warning(
                    "[%s/%s] "
                    "NOTARIA=%s "
                    "SIN RESULTADOS",
                    indice,
                    total,
                    notaria.id,
                )

        except Exception as exc:

            errores += 1

            logger.exception(
                "[%s/%s] "
                "ERROR NOTARIA=%s: %s",
                indice,
                total,
                notaria.id,
                exc,
            )

            try:
                db.rollback()
            except Exception:
                pass

    resultado = {
        "total_notarias": total,
        "actualizadas": actualizadas,
        "ya_con_coordenadas": ya_con_coordenadas,
        "sin_direccion": sin_direccion,
        "sin_resultados": sin_resultados,
        "errores": errores,
    }

    logger.info(
        "=============================================="
    )

    logger.info(
        "GEOCODIFICACIÓN CTN - FINALIZADA"
    )

    logger.info(
        "RESULTADO: %s",
        resultado,
    )

    logger.info(
        "=============================================="
    )

    return resultado

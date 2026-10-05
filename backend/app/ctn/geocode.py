import time
import logging
import os
from typing import Optional

import requests
from sqlalchemy.orm import Session

from backend.app.ctn.models import Notaria
from backend.app.ctn.normalizador import limpiar_direccion


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
# COORDENADAS MOLSAN
# ============================================================

MOLSAN_LAT = 41.424960
MOLSAN_LNG = 2.181740


# ============================================================
# CONSTRUIR DIRECCIÓN
# ============================================================

def _build_address(
    notaria: Notaria,
) -> Optional[str]:

    partes = []

    # --------------------------------------------------------
    # DIRECCIÓN
    # --------------------------------------------------------

    direccion = getattr(
        notaria,
        "direccion",
        None,
    )

    if direccion:

        direccion = str(
            direccion
        ).strip()

        if direccion:
            partes.append(
                direccion
            )

    # --------------------------------------------------------
    # CÓDIGO POSTAL
    # --------------------------------------------------------

    cp = getattr(
        notaria,
        "cp",
        None,
    )

    if cp:

        cp = str(
            cp
        ).strip()

        if cp:
            partes.append(
                cp
            )

    # --------------------------------------------------------
    # MUNICIPIO
    # --------------------------------------------------------

    municipio = getattr(
        notaria,
        "municipio",
        None,
    )

    if municipio:

        municipio = str(
            municipio
        ).strip()

        if municipio:
            partes.append(
                municipio
            )

    # --------------------------------------------------------
    # PROVINCIA
    # --------------------------------------------------------

    provincia = getattr(
        notaria,
        "provincia",
        None,
    )

    if provincia:

        provincia = str(
            provincia
        ).strip()

        if provincia:
            partes.append(
                provincia
            )

    # --------------------------------------------------------
    # ESPAÑA
    # --------------------------------------------------------

    partes.append(
        "España"
    )

    # --------------------------------------------------------
    # VALIDACIÓN
    # --------------------------------------------------------

    if len(partes) <= 1:
        return None

    return ", ".join(
        partes
    )


# ============================================================
# GEOCODIFICAR CON GOOGLE
# ============================================================

def _geocode_google(
    address: str,
) -> Optional[tuple[float, float]]:

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
        }

        logger.info(
            "GOOGLE GEOCODE: %s",
            address,
        )

        response = requests.get(
            GOOGLE_GEOCODE_URL,
            params=params,
            timeout=20,
        )

        if response.status_code != 200:

            logger.error(
                "Google Maps HTTP %s para: %s",
                response.status_code,
                address,
            )

            return None

        data = response.json()

        status = data.get(
            "status"
        )

        # ====================================================
        # OK
        # ====================================================

        if status == "OK":

            results = (
                data.get("results")
                or []
            )

            if not results:

                logger.warning(
                    "Google Maps OK pero sin resultados: %s",
                    address,
                )

                return None

            location = (
                results[0]
                .get("geometry", {})
                .get("location")
            )

            if not location:

                logger.warning(
                    "Google Maps sin location: %s",
                    address,
                )

                return None

            lat = location.get(
                "lat"
            )

            lng = location.get(
                "lng"
            )

            if lat is None or lng is None:
                return None

            logger.info(
                "GOOGLE OK: %s -> lat=%s lng=%s",
                address,
                lat,
                lng,
            )

            return (
                float(lat),
                float(lng),
            )

        # ====================================================
        # ZERO RESULTS
        # ====================================================

        if status == "ZERO_RESULTS":

            logger.warning(
                "Google Maps ZERO_RESULTS: %s",
                address,
            )

            return None

        # ====================================================
        # OTROS ESTADOS
        # ====================================================

        logger.error(
            "Google Maps status=%s para: %s",
            status,
            address,
        )

        return None

    except requests.RequestException as e:

        logger.error(
            "Error HTTP Google Maps '%s': %s",
            address,
            e,
        )

        return None

    except Exception as e:

        logger.exception(
            "Error geocodificando '%s': %s",
            address,
            e,
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
    # YA TIENE LAS DOS COORDENADAS
    # --------------------------------------------------------

    if (
        notaria.lat
        and notaria.lng
    ):
        return False

    # --------------------------------------------------------
    # CONSTRUIR DIRECCIÓN
    # --------------------------------------------------------

    raw_address = _build_address(
        notaria
    )

    if not raw_address:
        return False

    # --------------------------------------------------------
    # NORMALIZAR
    # --------------------------------------------------------

    address = limpiar_direccion(
        raw_address
    )

    if not address:
        return False

    logger.info(
        "DIRECCIÓN FINAL GOOGLE id=%s: %s",
        notaria.id,
        address,
    )

    # --------------------------------------------------------
    # GOOGLE
    # --------------------------------------------------------

    coords = _geocode_google(
        address
    )

    if not coords:
        return False

    lat, lng = coords

    # --------------------------------------------------------
    # GUARDAR
    # --------------------------------------------------------

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

        return True

    except Exception as e:

        db.rollback()

        logger.error(
            "Error guardando coordenadas "
            "id=%s: %s",
            notaria.id,
            e,
        )

        return False


# ============================================================
# GEOCODIFICAR TODAS
# ============================================================

def geocode_todas_notarias(
    db: Session,
) -> dict:

    notarias = (
        db.query(Notaria)
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

    logger.info(
        "=============================================="
    )

    logger.info(
        "GEOCODIFICACIÓN NOTARÍAS - INICIO"
    )

    logger.info(
        "TOTAL NOTARÍAS: %s",
        total,
    )

    logger.info(
        "=============================================="
    )

    # ========================================================
    # RECORRER
    # ========================================================

    for indice, notaria in enumerate(
        notarias,
        start=1,
    ):

        # ----------------------------------------------------
        # YA TIENE COORDENADAS
        # ----------------------------------------------------

        if (
            notaria.lat
            and notaria.lng
        ):

            ya_con_coordenadas += 1

            logger.info(
                "[%s/%s] YA TIENE COORDENADAS id=%s",
                indice,
                total,
                notaria.id,
            )

            continue

        # ----------------------------------------------------
        # DIRECCIÓN ORIGINAL
        # ----------------------------------------------------

        raw_address = _build_address(
            notaria
        )

        if not raw_address:

            sin_direccion += 1

            logger.warning(
                "[%s/%s] SIN DIRECCIÓN id=%s",
                indice,
                total,
                notaria.id,
            )

            continue

        # ----------------------------------------------------
        # NORMALIZAR
        # ----------------------------------------------------

        address = limpiar_direccion(
            raw_address
        )

        if not address:

            sin_direccion += 1

            logger.warning(
                "[%s/%s] DIRECCIÓN VACÍA id=%s",
                indice,
                total,
                notaria.id,
            )

            continue

        # ----------------------------------------------------
        # LOG COMPLETO
        # ----------------------------------------------------

        logger.info(
            "[%s/%s] ID=%s | DIRECCIÓN ORIGINAL=%s",
            indice,
            total,
            notaria.id,
            raw_address,
        )

        logger.info(
            "[%s/%s] ID=%s | DIRECCIÓN GOOGLE=%s",
            indice,
            total,
            notaria.id,
            address,
        )

        # ----------------------------------------------------
        # GOOGLE
        # ----------------------------------------------------

        coords = _geocode_google(
            address
        )

        if not coords:

            sin_resultados += 1

            continue

        lat, lng = coords

        # ----------------------------------------------------
        # GUARDAR
        # ----------------------------------------------------

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

            actualizadas += 1

            logger.info(
                "[%s/%s] ACTUALIZADA id=%s "
                "lat=%s lng=%s",
                indice,
                total,
                notaria.id,
                lat,
                lng,
            )

        except Exception as e:

            db.rollback()

            logger.error(
                "[%s/%s] ERROR GUARDANDO "
                "id=%s: %s",
                indice,
                total,
                notaria.id,
                e,
            )

        # ----------------------------------------------------
        # PAUSA
        # ----------------------------------------------------

        time.sleep(
            0.2
        )

    # ========================================================
    # RESULTADO
    # ========================================================

    resultado = {
        "total_notarias": total,
        "actualizadas": actualizadas,
        "ya_con_coordenadas": ya_con_coordenadas,
        "sin_direccion": sin_direccion,
        "sin_resultados": sin_resultados,
    }

    logger.info(
        "=============================================="
    )

    logger.info(
        "GEOCODIFICACIÓN NOTARÍAS - FINALIZADA"
    )

    logger.info(
        "RESULTADO: %s",
        resultado,
    )

    logger.info(
        "=============================================="
    )

    return resultado


# ============================================================
# MIGRACIÓN
# ============================================================

def migracion_agregar_coordenadas(
    db: Session,
) -> dict:

    return geocode_todas_notarias(
        db
    )

import os
import time
import requests

from sqlalchemy.orm import Session

from backend.app.ctn.models import Notaria
from backend.app.ctn.normalizador import (
    construir_direccion_busqueda,
)


# ============================================================
# CONFIGURACIÓN
# ============================================================

GOOGLE_GEOCODING_URL = (
    "https://maps.googleapis.com/maps/api/geocode/json"
)

# Pausa entre consultas para evitar bombardear Google.
PAUSA_ENTRE_CONSULTAS = 0.10


# ============================================================
# API KEY
# ============================================================

def obtener_google_api_key() -> str:
    """
    Obtiene la API key desde Render / variables de entorno.

    Variable esperada:

        GOOGLE_MAPS_API_KEY
    """

    api_key = os.getenv(
        "GOOGLE_MAPS_API_KEY"
    )

    if not api_key:
        raise RuntimeError(
            "No existe la variable de entorno "
            "GOOGLE_MAPS_API_KEY."
        )

    return api_key.strip()


# ============================================================
# GEOCODIFICAR UNA DIRECCIÓN
# ============================================================

def geocodificar_direccion(
    direccion: str,
    api_key: str,
):
    """
    Consulta Google Geocoding API.

    Devuelve:

        {
            "lat": ...,
            "lng": ...,
            "formatted_address": ...
        }

    o None si no encuentra resultados.
    """

    if not direccion:
        return None

    try:
        response = requests.get(
            GOOGLE_GEOCODING_URL,
            params={
                "address": direccion,
                "key": api_key,
                "language": "es",
                "region": "es",
            },
            timeout=15,
        )

        response.raise_for_status()

        data = response.json()

    except Exception as e:

        print(
            "ERROR GOOGLE GEOCODING:",
            direccion,
            "|",
            str(e),
            flush=True,
        )

        return None

    status = data.get(
        "status"
    )

    # --------------------------------------------------------
    # Google no encontró resultado
    # --------------------------------------------------------

    if status != "OK":

        print(
            f"GOOGLE SIN RESULTADO | "
            f"STATUS={status} | "
            f"DIRECCION={direccion}",
            flush=True,
        )

        return None

    resultados = data.get(
        "results",
        []
    )

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

    return {
        "lat": float(lat),
        "lng": float(lng),
        "formatted_address": (
            resultados[0].get(
                "formatted_address"
            )
        ),
    }


# ============================================================
# AGREGAR COORDENADAS
# ============================================================

def agregar_coordenadas(
    db: Session,
):
    """
    Geocodifica las notarías que todavía no tienen
    coordenadas.

    IMPORTANTE:

    - No toca las notarías que ya tienen lat/lng.
    - Construye correctamente la dirección.
    - Guarda lat/lng como texto porque el modelo actual
      utiliza String(50).
    """

    api_key = obtener_google_api_key()

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
        "==================================================",
        flush=True,
    )

    print(
        "MIGRACIÓN DE COORDENADAS CTN",
        flush=True,
    )

    print(
        f"TOTAL NOTARÍAS: {total_notarias}",
        flush=True,
    )

    print(
        "==================================================",
        flush=True,
    )

    for indice, notaria in enumerate(
        notarías,
        start=1,
    ):

        # ====================================================
        # YA TIENE COORDENADAS
        # ====================================================

        if (
            notaria.lat
            and notaria.lng
        ):

            ya_con_coordenadas += 1

            continue

        # ====================================================
        # CONSTRUIR DIRECCIÓN
        # ====================================================

        direccion_busqueda = (
            construir_direccion_busqueda(
                direccion=notaria.direccion,
                cp=notaria.cp,
                municipio=notaria.municipio,
                provincia=notaria.provincia,
            )
        )

        # ====================================================
        # COMPROBAR DIRECCIÓN REAL
        # ====================================================

        if not direccion_busqueda:

            sin_direccion += 1

            print(
                f"[{indice}/{total_notarias}] "
                f"ID={notaria.id} "
                f"SIN DIRECCIÓN",
                flush=True,
            )

            continue

        # ====================================================
        # LOG DE DEPURACIÓN
        # ====================================================

        print(
            f"[{indice}/{total_notarias}] "
            f"ID={notaria.id} "
            f"BUSCANDO: {direccion_busqueda}",
            flush=True,
        )

        # ====================================================
        # GOOGLE
        # ====================================================

        try:

            resultado = geocodificar_direccion(
                direccion_busqueda,
                api_key,
            )

        except Exception as e:

            errores += 1

            print(
                f"ERROR NOTARÍA ID={notaria.id}: {e}",
                flush=True,
            )

            continue

        # ====================================================
        # SIN RESULTADO
        # ====================================================

        if not resultado:

            sin_resultados += 1

            continue

        # ====================================================
        # GUARDAR COORDENADAS
        # ====================================================

        notaria.lat = str(
            resultado["lat"]
        )

        notaria.lng = str(
            resultado["lng"]
        )

        actualizadas += 1

        print(
            f"   ✓ COORDENADAS: "
            f"{resultado['lat']}, "
            f"{resultado['lng']}",
            flush=True,
        )

        print(
            f"   ✓ GOOGLE: "
            f"{resultado.get('formatted_address')}",
            flush=True,
        )

        # ====================================================
        # COMMIT INDIVIDUAL
        # ====================================================
        #
        # Esto evita perder todo el progreso si Google falla
        # en mitad de la migración.
        # ====================================================

        try:

            db.commit()

        except Exception as e:

            db.rollback()

            errores += 1

            print(
                f"ERROR GUARDANDO ID={notaria.id}: "
                f"{e}",
                flush=True,
            )

            continue

        # ====================================================
        # PAUSA
        # ====================================================

        time.sleep(
            PAUSA_ENTRE_CONSULTAS
        )

    # ========================================================
    # COMMIT FINAL
    # ========================================================

    try:

        db.commit()

    except Exception:

        db.rollback()

    # ========================================================
    # RESULTADO
    # ========================================================

    resultado_final = {
        "total_notarias": total_notarias,
        "actualizadas": actualizadas,
        "ya_con_coordenadas": ya_con_coordenadas,
        "sin_direccion": sin_direccion,
        "sin_resultados": sin_resultados,
        "errores": errores,
    }

    print(
        "==================================================",
        flush=True,
    )

    print(
        "MIGRACIÓN FINALIZADA",
        flush=True,
    )

    print(
        resultado_final,
        flush=True,
    )

    print(
        "==================================================",
        flush=True,
    )

    return resultado_final


# ============================================================
# ALIAS
# ============================================================

def migrar_coordenadas(
    db: Session,
):
    """
    Alias para mantener compatibilidad con cualquier
    router existente que utilice este nombre.
    """

    return agregar_coordenadas(
        db
    )

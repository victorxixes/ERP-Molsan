"""Indicadores del cuadro de mando de ApoderaGest."""

import os
import unicodedata
from datetime import date, datetime
from functools import lru_cache

import requests

from backend.app.apoderagest.encargos.service import listar_encargos
from backend.app.ctn.models import Notaria
from backend.app.ctn.geocode import geocode_notaria
from backend.app.utils.distancia import distancia_km


# Centro aproximado del código postal 08016 (Barcelona), utilizado únicamente
# si Google Geocoding no está configurado o no responde.
ORIGEN_CP = "08016"
ORIGEN_CP_COORDENADAS_FALLBACK = (41.4424, 2.1745)
GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def _fecha(valor):
    """Normaliza una fecha o fecha-hora."""
    if not valor:
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    try:
        return date.fromisoformat(str(valor)[:10])
    except (TypeError, ValueError):
        return None


def _normalizar(valor):
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return texto.strip().lower().replace(" ", "").replace("-", "").replace("_", "")


def _clasificar_firma(tipo_firma):
    """Devuelve VC, PRESENCIAL o SIN_CLASIFICAR."""
    valor = _normalizar(tipo_firma)
    if not valor:
        return "SIN_CLASIFICAR"
    if "videoconferencia" in valor or "videoconference" in valor or valor in {"vc", "video"}:
        return "VC"
    if "presencial" in valor or valor in {"p", "fisica"}:
        return "PRESENCIAL"
    return "SIN_CLASIFICAR"


@lru_cache(maxsize=1)
def _coordenadas_origen_08016():
    """Geocodifica una sola vez el CP de origen; usa un centro aproximado como respaldo."""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if api_key:
        try:
            respuesta = requests.get(
                GOOGLE_GEOCODE_URL,
                params={"address": f"{ORIGEN_CP}, Barcelona, España", "key": api_key},
                timeout=5,
            )
            respuesta.raise_for_status()
            resultados = respuesta.json().get("results") or []
            if resultados:
                localizacion = resultados[0]["geometry"]["location"]
                return float(localizacion["lat"]), float(localizacion["lng"])
        except Exception:
            # El dashboard no debe dejar de funcionar si falla el servicio externo.
            pass
    return ORIGEN_CP_COORDENADAS_FALLBACK


def _mapa_notarias(db):
    """Indexa las notarías CTN, incluidas las que todavía no tienen coordenadas."""
    por_nif = {}
    por_nombre = {}
    objetos_nif = {}
    objetos_nombre = {}
    for notaria in db.query(Notaria).all():
        nif = _normalizar(getattr(notaria, "nif", None))
        nombre = _normalizar(" ".join(filter(None, [
            getattr(notaria, "nombre", None),
            getattr(notaria, "apellidos", None),
        ])))
        if nif:
            objetos_nif[nif] = notaria
        if nombre:
            objetos_nombre[nombre] = notaria
        try:
            lat, lng = float(notaria.lat), float(notaria.lng)
        except (TypeError, ValueError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue
        if nif:
            por_nif[nif] = (lat, lng)
        if nombre:
            por_nombre[nombre] = (lat, lng)
    return por_nif, por_nombre, objetos_nif, objetos_nombre


def _coordenadas_de_encargo(encargo, por_nif, por_nombre, objetos_nif, objetos_nombre, geocodificadas):
    """Usa coordenadas CTN existentes y geocodifica la notaría si aún no las tiene."""
    nif = _normalizar(encargo.get("nif_notario"))
    nombre = _normalizar(encargo.get("nombre_notario") or encargo.get("notario"))
    coordenadas = por_nif.get(nif) if nif else None
    if coordenadas is None and nombre:
        coordenadas = por_nombre.get(nombre)
    if coordenadas:
        return coordenadas

    notaria = objetos_nif.get(nif) if nif else None
    if notaria is None and nombre:
        notaria = objetos_nombre.get(nombre)
    if notaria is None:
        return None

    clave = f"id:{notaria.id}"
    if clave not in geocodificadas:
        geocodificadas.add(clave)
        if os.getenv("GOOGLE_MAPS_API_KEY"):
            try:
                geocode_notaria(db, notaria)
            except Exception:
                # La falta de coordenadas no debe bloquear el dashboard.
                pass
    try:
        lat, lng = float(notaria.lat), float(notaria.lng)
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    if nif:
        por_nif[nif] = (lat, lng)
    if nombre:
        por_nombre[nombre] = (lat, lng)
    return lat, lng


def obtener_dashboard(db, usuario):
    """Calcula métricas a partir de firmas reales y de las coordenadas del catálogo CTN."""
    encargos = listar_encargos(db, usuario, solo_pendientes=False)
    firmados = [
        encargo for encargo in encargos
        if _fecha(encargo.get("fecha_firma")) is not None
        and str(encargo.get("protocolo") or "").strip()
    ]
    pendientes = sum(
        1 for encargo in encargos
        if not _fecha(encargo.get("fecha_firma")) or not str(encargo.get("protocolo") or "").strip()
    )

    # Media exacta solicitada: fecha prevista de firma -> fecha real de firma.
    duraciones = []
    for encargo in firmados:
        prevista = _fecha(encargo.get("fecha_prevista_firma"))
        real = _fecha(encargo.get("fecha_firma"))
        if prevista and real:
            duraciones.append((real - prevista).days)
    media_dias = round(sum(duraciones) / len(duraciones), 1) if duraciones else None

    firmas_presenciales = 0
    firmas_videoconferencia = 0
    origen_lat, origen_lng = _coordenadas_origen_08016()
    por_nif, por_nombre, objetos_nif, objetos_nombre = _mapa_notarias(db)
    geocodificadas = set()
    kilometros_presenciales = 0.0
    firmas_con_distancia = 0

    for encargo in firmados:
        modalidad = _clasificar_firma(encargo.get("tipo_firma"))
        if modalidad == "VC":
            firmas_videoconferencia += 1
            continue
        if modalidad != "PRESENCIAL":
            continue

        firmas_presenciales += 1
        coordenadas = _coordenadas_de_encargo(
            encargo, por_nif, por_nombre, objetos_nif, objetos_nombre, geocodificadas
        )
        if coordenadas:
            kilometros_presenciales += distancia_km(
                origen_lat, origen_lng, coordenadas[0], coordenadas[1]
            )
            firmas_con_distancia += 1

    return {
        "total_encargos": len(encargos),
        "firmados": len(firmados),
        "pendientes": pendientes,
        "media_dias_hasta_firma": media_dias,
        "firmas_presenciales": firmas_presenciales,
        "firmas_videoconferencia": firmas_videoconferencia,
        "kilometros_presenciales": round(kilometros_presenciales, 2) if firmas_con_distancia else None,
        "firmas_presenciales_con_distancia": firmas_con_distancia,
        "origen_kilometros": ORIGEN_CP,
        "tipo_distancia_kilometros": "distancia en línea recta de ida desde el CP 08016; suma por cada firma presencial registrada",
    }

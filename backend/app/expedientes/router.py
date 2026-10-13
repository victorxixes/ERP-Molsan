from datetime import date, datetime, time
from typing import Optional, List
import io
import json
import unicodedata

import openpyxl
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import or_, func, and_, text
from sqlalchemy.orm import Session

from backend.app.agenda.models import Cita
from backend.app.database import get_db
from backend.app.expedientes.models import (
    Expediente,
    ExpedienteDocumentoEscritura,
)
from backend.app.carpeta_digital.models import DocumentoCarpetaDigital


router = APIRouter(
    prefix="/expedientes",
    tags=["Expedientes"],
)


# ============================================================
# DOCUMENTACIÓN PREVIA: REQUISITOS
# ============================================================

DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA = [
    "Hoja de Encargo firmada",
    "Justificante de cancelación",
    "Nota simple registral",
]


def documentos_pendientes_documentacion_previa(
    db: Session,
    id_expediente: str,
) -> list[str]:
    """
    Comprueba las categorías obligatorias existentes en la
    carpeta digital del expediente.

    Se considera presente una categoría cuando existe al menos
    un registro documental asociado a ella.
    """
    encontrados = (
        db.query(DocumentoCarpetaDigital.categoria)
        .filter(
            DocumentoCarpetaDigital.expediente_id == str(id_expediente),
            DocumentoCarpetaDigital.categoria.in_(
                DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
            ),
        )
        .distinct()
        .all()
    )

    categorias_guardadas = {
        categoria
        for (categoria,) in encontrados
    }

    return [
        categoria
        for categoria in DOCUMENTOS_OBLIGATORIOS_DOCUMENTACION_PREVIA
        if categoria not in categorias_guardadas
    ]


def envio_notario_guardado(expediente: Expediente) -> bool:
    """
    Comprueba que el expediente contiene los datos básicos
    necesarios para considerar guardado el envío a notario.
    """
    return bool(
        expediente.fecha_envio_notario
        and expediente.fecha_solicitud_pnc
        and expediente.numero_solicitud_pnc
        and expediente.numero_solicitud_pnc.strip()
        and expediente.nombre_notario
        and expediente.nombre_notario.strip()
    )


# ============================================================
# MODELO DE DATOS: ENVÍO A NOTARIO
# ============================================================

class DocumentoEscrituraRequest(BaseModel):
    tipo_documento: str
    cuantia: Optional[float] = None


class EnvioANotarioRequest(BaseModel):
    escritura_firmada: bool = False

    fecha_envio: date
    fecha_solicitud_pnc: date
    numero_solicitud_pnc: str

    fecha_firma: Optional[date] = None
    protocolo: Optional[str] = None

    notario_id: Optional[int] = None
    nombre_notario: str
    nif_notario: Optional[str] = None
    notario: Optional[str] = None

    apoderado: Optional[str] = None

    tipo_firma: str
    tipo_documento: str
    documentos_escritura: Optional[List[DocumentoEscrituraRequest]] = None

    # Alias compatible con el modal frontend que envía "documentos".
    documentos: Optional[List[DocumentoEscrituraRequest]] = None
    cuantia: Optional[float] = None

    idioma_documento: Optional[str] = None
    formato_escritura: Optional[str] = None
    tipo_tramite: Optional[str] = None

    poblacion: Optional[str] = None
    provincia: Optional[str] = None

    fecha_prevista_firma: Optional[date] = None
    hora_prevista_firma: Optional[time] = time(9, 0)

    # DATOS DE FACTURACIÓN DEL EXPEDIENTE
    facturacion_nombre: Optional[str] = None
    facturacion_apellidos: Optional[str] = None
    facturacion_dni_nif: Optional[str] = None
    facturacion_direccion: Optional[str] = None
    facturacion_codigo_postal: Optional[str] = None
    facturacion_poblacion: Optional[str] = None
    facturacion_provincia: Optional[str] = None
    facturacion_telefono: Optional[str] = None
    facturacion_email: Optional[str] = None


# ============================================================
# ACTIVIDADES DEL EXPEDIENTE
# ============================================================

ACTIVIDADES_EXPEDIENTES = [
    {
        "key": "documentacion-previa",
        "label": "Documentación previa",
        "aliases": [
            "Documentación previa",
            "Documentacion previa",
        ],

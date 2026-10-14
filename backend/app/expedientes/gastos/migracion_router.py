"""
Migración incremental de columnas para expediente_gastos.

IMPORTANTE:
- No borra ni modifica los gastos existentes.
- Añade únicamente columnas opcionales.
- Para habilitar la ruta, configura en Render la variable:
  MIGRACION_GASTOS_TOKEN=<secreto-largo>
- Ejecuta POST /api/expedientes/gastos/migracion/aplicar enviando
  el header X-Migracion-Token con ese mismo valor.
- Retira la variable o elimina este router cuando la migración termine.
"""

import os
import secrets

from fastapi import APIRouter, Header, HTTPException
from sqlalchemy import text

from backend.app.database import engine


router = APIRouter(
    prefix="/expedientes/gastos/migracion",
    tags=["Migración de gastos"],
)

# Tipos compatibles con PostgreSQL. Todas las columnas nuevas admiten NULL.
COLUMNAS_GASTOS = {
    "nif_notario": "VARCHAR(50)",
    "nombre_notario": "VARCHAR(300)",
    "pagador": "VARCHAR(300)",
    "cuenta_bancaria": "VARCHAR(34)",
    "medio_pago": "VARCHAR(100)",
    "numero_factura": "VARCHAR(150)",
    "fecha_factura": "DATE",
    "importe_total_bruto": "NUMERIC(12, 2)",
    "base_exenta_impuestos": "NUMERIC(12, 2)",
    "base_sujeta_impuestos": "NUMERIC(12, 2)",
    "tramo_impuesto": "VARCHAR(50)",
    "tipo_impuesto": "VARCHAR(30)",
    "porcentaje_impuesto": "NUMERIC(5, 2)",
    "importe_impuesto": "NUMERIC(12, 2)",
    "base_exenta_retencion": "NUMERIC(12, 2)",
    "base_sujeta_retencion": "NUMERIC(12, 2)",
    "tipo_retencion": "VARCHAR(100)",
    "porcentaje_retencion": "NUMERIC(5, 2)",
    "importe_retencion": "NUMERIC(12, 2)",
    "importe_resultante": "NUMERIC(12, 2)",
    "documento_carpeta_id": "INTEGER",
    "estado_pago": "VARCHAR(50)",
}


@router.post("/aplicar")
def aplicar_migracion_gastos(
    x_migracion_token: str | None = Header(default=None, alias="X-Migracion-Token"),
):
    """
    Añade las columnas que falten. Es idempotente: puede repetirse sin
    recrear ni borrar columnas existentes.
    """
    token_configurado = os.getenv("MIGRACION_GASTOS_TOKEN")
    if not token_configurado:
        raise HTTPException(
            status_code=503,
            detail=(
                "Migración deshabilitada. Configura MIGRACION_GASTOS_TOKEN "
                "en las variables de entorno del servicio backend."
            ),
        )

    if not x_migracion_token or not secrets.compare_digest(
        x_migracion_token, token_configurado
    ):
        raise HTTPException(status_code=403, detail="Token de migración incorrecto.")

    columnas_creadas = []
    try:
        with engine.begin() as conexion:
            # Comprueba que la tabla exista antes de modificarla.
            tabla = conexion.execute(
                text("SELECT to_regclass('public.expediente_gastos')")
            ).scalar()

            if tabla is None:
                raise HTTPException(
                    status_code=404,
                    detail="No existe la tabla public.expediente_gastos.",
                )

            for nombre, tipo_sql in COLUMNAS_GASTOS.items():
                resultado = conexion.execute(
                    text(
                        f"ALTER TABLE public.expediente_gastos "
                        f"ADD COLUMN IF NOT EXISTS {nombre} {tipo_sql}"
                    )
                )
                columnas_creadas.append(nombre)

    except HTTPException:
        raise
    except Exception as error:
        # No devolvemos credenciales ni la cadena de conexión al cliente.
        raise HTTPException(
            status_code=500,
            detail=(
                "Falló la migración de gastos y se ha revertido la transacción. "
                f"Detalle: {type(error).__name__}: {error}"
            ),
        )

    return {
        "ok": True,
        "tabla": "public.expediente_gastos",
        "columnas_comprobadas": columnas_creadas,
        "mensaje": (
            "Migración aplicada. Las columnas son opcionales y no se han "
            "eliminado ni modificado los gastos existentes."
        ),
    }

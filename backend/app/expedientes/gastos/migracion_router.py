"""
Migración incremental de columnas de gastos, idempotente y protegida por JWT
y permiso administrativo. Solo añade columnas opcionales; no borra ni modifica filas.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.database import engine


logger = logging.getLogger(__name__)

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
    "estado_absis": "VARCHAR(100)",
    "estado_justificante": "VARCHAR(100)",
    "fecha_adjuntar_factura": "DATE",
    "imp_gasto": "NUMERIC(12, 2)",
    "imp_base_impuesto": "NUMERIC(12, 2)",
    "imp_base_retencion": "NUMERIC(12, 2)",
    "imp_impuesto": "NUMERIC(12, 2)",
    "fecha_estado": "DATE",
    "fecha_peticion": "DATE",
    "fecha_pago": "DATE",
}


@router.post("/aplicar")
def aplicar_migracion_gastos(usuario=Depends(get_current_user)):
    """
    Añade las columnas que falten. Es idempotente y requiere permiso
    administrativo de edición de seguridad además de una sesión JWT válida.
    """
    require_perm_modulo(usuario, "seguridad", "editar")

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
        # El detalle técnico queda en los logs, no en la respuesta HTTP.
        logger.exception("Error al aplicar la migración de gastos de expedientes")
        raise HTTPException(
            status_code=500,
            detail="Falló la migración de gastos y se ha revertido la transacción. Consulta los logs del backend.",
        ) from error

    return {
        "ok": True,
        "tabla": "public.expediente_gastos",
        "columnas_comprobadas": columnas_creadas,
        "mensaje": (
            "Migración aplicada. Las columnas son opcionales y no se han "
            "eliminado ni modificado los gastos existentes."
        ),
    }

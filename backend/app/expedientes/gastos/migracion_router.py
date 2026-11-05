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
    "numero_factura_absis": "VARCHAR(150)",
    "fecha_factura_absis": "DATE",
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
    "tipo_concepto_absis": "VARCHAR(100)",
    "origen_registro": "VARCHAR(30)",
    "estado_consolidacion": "VARCHAR(50)",
    "fecha_ultima_sincronizacion": "DATE",
}


@router.post("/aplicar")
def aplicar_migracion_gastos(usuario=Depends(get_current_user)):
    """
    Comprueba el esquema de gastos provisionado por Alembic.
    Requiere sesión JWT válida y permiso administrativo.
    """
    require_perm_modulo(usuario, "seguridad", "editar")

    columnas_requeridas = list(COLUMNAS_GASTOS)
    try:
        with engine.begin() as conexion:
            tabla = conexion.execute(
                text("SELECT to_regclass('public.expediente_gastos')")
            ).scalar()

            if tabla is None:
                raise HTTPException(
                    status_code=409,
                    detail="No existe public.expediente_gastos. Ejecuta las migraciones Alembic pendientes.",
                )

            existentes = conexion.execute(
                text(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'expediente_gastos'
                      AND column_name = ANY(:columnas)
                    """
                ),
                {"columnas": columnas_requeridas},
            ).scalars().all()

            faltantes = sorted(set(columnas_requeridas) - set(existentes))
            if faltantes:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "mensaje": "Faltan columnas de gastos. Ejecuta la migración Alembic correspondiente.",
                        "columnas": faltantes,
                    },
                )

    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Error al verificar el esquema de gastos de expedientes")
        raise HTTPException(
            status_code=500,
            detail="No se pudo verificar el esquema de gastos. Consulta los logs del backend.",
        ) from error

    return {
        "ok": True,
        "tabla": "public.expediente_gastos",
        "columnas_verificadas": len(columnas_requeridas),
        "mensaje": "El esquema de gastos está provisionado por Alembic; no se ejecutó DDL desde la aplicación.",
    }

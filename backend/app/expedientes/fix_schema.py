from sqlalchemy import text

from backend.app.database import engine


# ============================================================
# FIX SCHEMA - EXPEDIENTES
# ============================================================
#
# Este fichero actualiza la tabla "expedientes" si la base de
# datos existente no tiene alguna de las columnas que actualmente
# define el modelo Expediente.
#
# IMPORTANTE:
# - NO modifica ninguna tabla de Agenda.
# - NO elimina datos.
# - NO modifica columnas existentes.
# - Solamente crea columnas que no existan.
#
# Esto es necesario porque:
#
#     Base.metadata.create_all()
#
# NO añade automáticamente columnas nuevas a una tabla que ya
# existe en PostgreSQL.
#
# ============================================================


def fix_expedientes_schema():

    print(
        "============================================",
        flush=True,
    )

    print(
        "FIX SCHEMA - EXPEDIENTES",
        flush=True,
    )

    print(
        "============================================",
        flush=True,
    )

    # ========================================================
    # COLUMNAS QUE DEBEN EXISTIR
    # ========================================================

    columnas = {

        # ----------------------------------------------------
        # RELACIÓN CLIENTE
        # ----------------------------------------------------

        "cliente_id": "INTEGER",

        # ----------------------------------------------------
        # ESTADOS
        # ----------------------------------------------------

        "estado_expediente": "VARCHAR(200)",
        "estado_expediente_ancert": "VARCHAR(200)",

        # ----------------------------------------------------
        # FECHAS
        # ----------------------------------------------------

        "fecha_alta": "DATE",
        "fecha_firma": "DATE",
        "fecha_inscripcion": "DATE",
        "fecha_entregado_cliente": "DATE",
        "fecha_prevista_firma": "DATE",
        "fecha_vencimiento": "DATE",
        "fecha_sol_cgn": "DATE",
        "fecha_firma_prev_val": "DATE",
        "fecha_firma_prev_cli": "DATE",
        "fecha_inicio_actividad": "DATE",
        "fecha_fin_actividad": "DATE",

        # ----------------------------------------------------
        # TITULAR
        # ----------------------------------------------------

        "nombre_titular": "VARCHAR(300)",
        "nif_titular": "VARCHAR(50)",

        # ----------------------------------------------------
        # SOLICITANTE
        # ----------------------------------------------------

        "nombre_solicitante": "VARCHAR(300)",
        "nif_solicitante": "VARCHAR(50)",

        # ----------------------------------------------------
        # APODERADO
        # ----------------------------------------------------

        "apoderado": "VARCHAR(300)",

        # ----------------------------------------------------
        # NOTARIO
        # ----------------------------------------------------

        "nombre_notario": "VARCHAR(300)",
        "notario_otorgante": "VARCHAR(300)",
        "nif_notario": "VARCHAR(50)",
        "notario": "VARCHAR(300)",

        # ----------------------------------------------------
        # OFICINA
        # ----------------------------------------------------

        "oficina": "VARCHAR(200)",
        "dan": "VARCHAR(200)",
        "oficina_alta": "VARCHAR(200)",

        # ----------------------------------------------------
        # ECONÓMICOS
        # ----------------------------------------------------

        "capital": "DOUBLE PRECISION",
        "importe": "DOUBLE PRECISION",
        "saldo_real": "DOUBLE PRECISION",
        "saldo_disponible": "DOUBLE PRECISION",

        # ----------------------------------------------------
        # PROVISIÓN
        # ----------------------------------------------------

        "id_provision": "VARCHAR(100)",
        "tipo_provision": "VARCHAR(100)",

        # ----------------------------------------------------
        # OPERACIÓN
        # ----------------------------------------------------

        "contrato": "VARCHAR(200)",
        "num_solicitud_sia": "VARCHAR(200)",
        "tipo_operacion": "VARCHAR(300)",
        "subtipo_operacion": "VARCHAR(300)",
        "vinccanc": "VARCHAR(200)",
        "protocolo": "VARCHAR(200)",

        # ----------------------------------------------------
        # GTG / BANKIA
        # ----------------------------------------------------

        "origen_bankia": "VARCHAR(200)",
        "producto_gtg": "VARCHAR(300)",
        "dt": "VARCHAR(200)",

        # ----------------------------------------------------
        # ACTIVIDAD
        # ----------------------------------------------------

        "actividad_actual": "VARCHAR(300)",
        "estado_actividad": "VARCHAR(200)",

        # ----------------------------------------------------
        # GESTORÍA
        # ----------------------------------------------------

        "id_gestoria_tramite": "VARCHAR(100)",
        "nombre_gestoria": "VARCHAR(300)",
        "gestoria": "VARCHAR(300)",

        # ----------------------------------------------------
        # FINCA
        # ----------------------------------------------------

        "finca": "VARCHAR(200)",

        # ----------------------------------------------------
        # DEFECTOS
        # ----------------------------------------------------

        "tiene_defectos_abiertos": "VARCHAR(50)",
        "tipo_error": "VARCHAR(300)",
        "descripcion_error": "VARCHAR(1000)",
        "falta_defecto": "VARCHAR(1000)",
        "fcierre_defecto": "DATE",

        # ----------------------------------------------------
        # CGN
        # ----------------------------------------------------

        "id_expediente_cgn": "VARCHAR(200)",

        # ----------------------------------------------------
        # ACTA
        # ----------------------------------------------------

        "tipo_acta": "VARCHAR(200)",

        # ----------------------------------------------------
        # OTROS
        # ----------------------------------------------------

        "lucy": "VARCHAR(200)",
        "indicador_tt": "VARCHAR(200)",

        # ----------------------------------------------------
        # OBSERVACIONES
        # ----------------------------------------------------

        "observaciones": "VARCHAR(2000)",

        # ----------------------------------------------------
        # FACTURACIÓN
        # ----------------------------------------------------

        "facturacion_estado": "VARCHAR(200)",
        "facturacion_fecha": "DATE",

        # ----------------------------------------------------
        # REGISTRAL
        # ----------------------------------------------------

        "registral_estado": "VARCHAR(200)",
        "registral_fecha": "DATE",
    }

    # ========================================================
    # EJECUTAR CAMBIOS
    # ========================================================

    try:

        with engine.begin() as conn:

            # ------------------------------------------------
            # Comprobar que existe la tabla
            # ------------------------------------------------

            tabla_existe = conn.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = 'expedientes'
                    )
                    """
                )
            ).scalar()

            if not tabla_existe:

                print(
                    "FIX SCHEMA: la tabla expedientes todavía "
                    "no existe. No se realizan cambios.",
                    flush=True,
                )

                return

            # ------------------------------------------------
            # Obtener columnas existentes
            # ------------------------------------------------

            columnas_existentes = set(
                row[0]
                for row in conn.execute(
                    text(
                        """
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                        AND table_name = 'expedientes'
                        """
                    )
                ).fetchall()
            )

            # ------------------------------------------------
            # Crear columnas que falten
            # ------------------------------------------------

            creadas = 0

            for nombre_columna, tipo_columna in columnas.items():

                if nombre_columna in columnas_existentes:

                    continue

                sql = text(
                    f"""
                    ALTER TABLE expedientes
                    ADD COLUMN "{nombre_columna}" {tipo_columna}
                    """
                )

                conn.execute(sql)

                creadas += 1

                print(
                    f"FIX SCHEMA: creada columna "
                    f"expedientes.{nombre_columna} "
                    f"({tipo_columna})",
                    flush=True,
                )

            # ------------------------------------------------
            # Resultado
            # ------------------------------------------------

            if creadas == 0:

                print(
                    "FIX SCHEMA: la tabla expedientes ya "
                    "tiene todas las columnas necesarias.",
                    flush=True,
                )

            else:

                print(
                    f"FIX SCHEMA: se han creado "
                    f"{creadas} columnas.",
                    flush=True,
                )

    except Exception as e:

        print(
            f"FIX SCHEMA EXPEDIENTES - ERROR: {e}",
            flush=True,
        )

        raise

    print(
        "FIX SCHEMA - EXPEDIENTES - FINALIZADO",
        flush=True,
    )

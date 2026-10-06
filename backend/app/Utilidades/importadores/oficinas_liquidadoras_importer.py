import math
import unicodedata
from pathlib import Path
from typing import Any, Dict

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.oficinas_liquidadoras.models import OficinaLiquidadora


# ============================================================
# CONFIGURACIÓN
# ============================================================

COLUMNAS_REQUERIDAS = {
    "oficina_liquidadora",
}

COLUMNAS_MAPEO = {
    "oficina liquidadora": "oficina_liquidadora",
    "oficina_liquidadora": "oficina_liquidadora",

    "direccion": "direccion",

    "codigo postal": "codigo_postal",
    "codigo_postal": "codigo_postal",

    "poblacion": "poblacion",
    "poblacion ": "poblacion",

    "provincia": "provincia",
    "provincia ": "provincia",

    "telefono": "telefono",
    "teléfono": "telefono",

    "email": "email",
    "correo": "email",

    "horario": "horario",
}


# ============================================================
# UTILIDADES
# ============================================================

def normalizar_cabecera(valor: Any) -> str:
    """
    Normaliza una cabecera Excel:
    - elimina espacios extremos
    - pasa a minúsculas
    - elimina acentos
    - sustituye múltiples espacios
    """
    if valor is None:
        return ""

    texto = str(valor).strip().lower()

    texto = unicodedata.normalize(
        "NFD",
        texto,
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )

    texto = " ".join(texto.split())

    return texto


def limpiar_texto(valor: Any) -> str | None:
    """
    Convierte cualquier valor Excel a texto limpio.
    Devuelve None cuando está vacío.
    """
    if valor is None:
        return None

    try:
        if pd.isna(valor):
            return None
    except Exception:
        pass

    texto = str(valor).strip()

    if not texto:
        return None

    if texto.lower() in {"nan", "none", "null"}:
        return None

    return texto


def normalizar_nombre(valor: Any) -> str:
    """
    Clave utilizada para detectar duplicados.
    """
    texto = limpiar_texto(valor)

    if not texto:
        return ""

    texto = unicodedata.normalize(
        "NFD",
        texto,
    )

    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )

    texto = " ".join(texto.lower().split())

    return texto


def normalizar_codigo_postal(valor: Any) -> str | None:
    """
    Mantiene el código postal como texto.

    Casos contemplados:
    - 8038       -> 08038
    - 08038      -> 08038
    - 8038.0     -> 08038
    - vacío      -> None
    """
    valor_limpio = limpiar_texto(valor)

    if not valor_limpio:
        return None

    texto = valor_limpio.strip()

    if texto.endswith(".0"):
        texto = texto[:-2]

    texto = texto.replace(" ", "")

    if texto.isdigit():
        return texto.zfill(5)

    return texto


def resolver_columnas(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convierte las cabeceras reales del Excel
    a los nombres internos del sistema.
    """
    nuevas_columnas = {}

    for columna in df.columns:
        normalizada = normalizar_cabecera(columna)

        if normalizada in COLUMNAS_MAPEO:
            nuevas_columnas[columna] = COLUMNAS_MAPEO[normalizada]

    df = df.rename(columns=nuevas_columnas)

    return df


def fila_completamente_vacia(row: pd.Series) -> bool:
    for valor in row.tolist():
        if limpiar_texto(valor) is not None:
            return False

    return True


# ============================================================
# IMPORTADOR PRINCIPAL
# ============================================================

def importar_excel_oficinas_liquidadoras(
    fichero: str | Path,
    db: Session,
) -> Dict[str, Any]:
    """
    Importa un Excel de Oficinas Liquidadoras.

    Columnas esperadas:

    Oficina Liquidadora
    Dirección
    Código Postal
    Población
    Província
    Teléfono
    Email
    Horario
    """

    resultado = {
        "ok": False,
        "mensaje": "",
        "total_excel": 0,
        "procesados": 0,
        "creados": 0,
        "actualizados": 0,
        "sin_cambios": 0,
        "errores": 0,
        "omitidos": 0,
        "errores_detalle": [],
    }

    try:
        # ====================================================
        # LECTURA DEL EXCEL
        # ====================================================

        df = pd.read_excel(
            fichero,
            dtype=object,
        )

        resultado["total_excel"] = int(len(df))

        if df.empty:
            resultado["ok"] = True
            resultado["mensaje"] = (
                "El Excel no contiene filas de datos."
            )
            return resultado

        # ====================================================
        # NORMALIZAR CABECERAS
        # ====================================================

        df = resolver_columnas(df)

        columnas_disponibles = set(df.columns)

        faltantes = [
            columna
            for columna in COLUMNAS_REQUERIDAS
            if columna not in columnas_disponibles
        ]

        if faltantes:
            raise ValueError(
                "Faltan columnas obligatorias en el Excel: "
                + ", ".join(faltantes)
            )

        # ====================================================
        # CARGAR EXISTENTES
        # ====================================================

        existentes = (
            db.query(OficinaLiquidadora)
            .all()
        )

        existentes_por_nombre = {
            normalizar_nombre(
                oficina.oficina_liquidadora
            ): oficina
            for oficina in existentes
            if oficina.oficina_liquidadora
        }

        # ====================================================
        # CONTROL DE DUPLICADOS DEL PROPIO EXCEL
        # ====================================================

        procesados_excel = set()

        # ====================================================
        # PROCESAR FILAS
        # ====================================================

        for indice, row in df.iterrows():

            try:

                if fila_completamente_vacia(row):
                    resultado["omitidos"] += 1
                    continue

                oficina_nombre = limpiar_texto(
                    row.get("oficina_liquidadora")
                )

                if not oficina_nombre:
                    resultado["omitidos"] += 1
                    continue

                clave = normalizar_nombre(
                    oficina_nombre
                )

                # --------------------------------------------
                # DUPLICADO DENTRO DEL MISMO EXCEL
                # --------------------------------------------

                if clave in procesados_excel:
                    resultado["omitidos"] += 1
                    continue

                procesados_excel.add(clave)

                # --------------------------------------------
                # DATOS
                # --------------------------------------------

                direccion = limpiar_texto(
                    row.get("direccion")
                )

                codigo_postal = normalizar_codigo_postal(
                    row.get("codigo_postal")
                )

                poblacion = limpiar_texto(
                    row.get("poblacion")
                )

                provincia = limpiar_texto(
                    row.get("provincia")
                )

                telefono = limpiar_texto(
                    row.get("telefono")
                )

                email = limpiar_texto(
                    row.get("email")
                )

                horario = limpiar_texto(
                    row.get("horario")
                )

                # --------------------------------------------
                # EXISTENTE
                # --------------------------------------------

                oficina_existente = (
                    existentes_por_nombre.get(clave)
                )

                if oficina_existente:

                    cambios = False

                    valores_nuevos = {
                        "oficina_liquidadora": oficina_nombre,
                        "direccion": direccion,
                        "codigo_postal": codigo_postal,
                        "poblacion": poblacion,
                        "provincia": provincia,
                        "telefono": telefono,
                        "email": email,
                        "horario": horario,
                        "activo": True,
                    }

                    for campo, valor_nuevo in valores_nuevos.items():

                        valor_actual = getattr(
                            oficina_existente,
                            campo,
                            None,
                        )

                        if valor_actual != valor_nuevo:
                            setattr(
                                oficina_existente,
                                campo,
                                valor_nuevo,
                            )
                            cambios = True

                    if cambios:
                        resultado["actualizados"] += 1
                    else:
                        resultado["sin_cambios"] += 1

                # --------------------------------------------
                # NUEVO
                # --------------------------------------------

                else:

                    nueva_oficina = OficinaLiquidadora(
                        oficina_liquidadora=oficina_nombre,
                        direccion=direccion,
                        codigo_postal=codigo_postal,
                        poblacion=poblacion,
                        provincia=provincia,
                        telefono=telefono,
                        email=email,
                        horario=horario,
                        activo=True,
                    )

                    db.add(nueva_oficina)

                    existentes_por_nombre[
                        clave
                    ] = nueva_oficina

                    resultado["creados"] += 1

                resultado["procesados"] += 1

            except Exception as error_fila:

                resultado["errores"] += 1

                if len(resultado["errores_detalle"]) < 100:
                    resultado["errores_detalle"].append(
                        {
                            "fila": int(indice) + 2,
                            "error": str(error_fila),
                        }
                    )

        # ====================================================
        # GUARDAR
        # ====================================================

        db.commit()

        resultado["ok"] = True
        resultado["mensaje"] = (
            "Importación de Oficinas Liquidadoras "
            "completada correctamente."
        )

        return resultado

    except Exception as error:

        db.rollback()

        resultado["ok"] = False
        resultado["mensaje"] = (
            "Error durante la importación: "
            f"{str(error)}"
        )

        return resultado

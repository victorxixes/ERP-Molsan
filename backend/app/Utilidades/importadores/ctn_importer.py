import re
import unicodedata
from io import BytesIO

from openpyxl import load_workbook
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.ctn.models import Notaria


HEADER_MAP = {
    "codigo": "codigo",
    "nombre": "nombre",
    "apellidos": "apellidos",
    "nif": "nif",
    "telefono": "telefono",
    "departamento cancelaciones": "departamento_cancelaciones",
    "departamento copias": "departamento_copias",
    "otros departamentos": "otros_departamentos",
    "cp": "cp",
    "codigo postal": "cp",
    "provincia": "provincia",
    "municipio": "municipio",
    "direccion": "direccion",
    "vc": "vc",
    "videoconferencia": "vc",
    "apoderado": "apoderado",
    "apoderado s": "apoderado_s",
    "observacion": "observacion",
    "observaciones": "observacion",
    "lat": "lat",
    "latitud": "lat",
    "lng": "lng",
    "long": "lng",
    "longitud": "lng",
    "notarios asociados": "notarios_asociados",
    "notario asociado": "notarios_asociados",
    "asociados": "notarios_asociados",
}


def limpiar_texto(valor):
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        resultado = str(int(valor))
    else:
        resultado = str(valor).strip()
    return "" if resultado.casefold() == "none" else resultado


def normalizar_cabecera(valor):
    texto = unicodedata.normalize("NFKD", limpiar_texto(valor))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto.casefold()).strip()


def normalizar_codigo(valor):
    return limpiar_texto(valor).casefold()


def normalizar_vc(valor) -> str:
    """Guarda solo los dos valores canónicos que usa el catálogo CTN."""
    texto = limpiar_texto(valor).casefold().replace("í", "i")
    compacto = texto.replace(" ", "").replace("-", "").replace("_", "")
    if compacto in {"si", "s", "vc", "videoconferencia", "videoconference", "true", "1"}:
        return "VideoConferencia"
    if compacto in {"no", "n", "false", "0", "presencial"}:
        return "Presencial"
    return limpiar_texto(valor)


def separar_asociados(valor):
    return [
        codigo.strip()
        for codigo in re.split(r"[;,|\n]+", limpiar_texto(valor))
        if codigo.strip()
    ]


def importar_ctn_desde_excel(db: Session, contenido: bytes) -> dict:
    """Importa CTN por Código, sin borrar registros ni credenciales existentes.

    Valida el fichero completo antes de modificar datos. Actualiza únicamente
    campos CTN presentes y no vacíos, conserva IBAN/credenciales y mantiene
    asociaciones cuando el Excel no incluye una columna de asociados.
    """
    if not contenido:
        raise ValueError("El fichero Excel está vacío.")

    wb = None
    try:
        wb = load_workbook(BytesIO(contenido), read_only=True, data_only=True)
        ws = wb.active
        filas = ws.iter_rows(values_only=True)
        headers = None
        for fila in filas:
            if fila and any(normalizar_cabecera(celda) == "codigo" for celda in fila if celda is not None):
                headers = [normalizar_cabecera(celda) for celda in fila]
                break

        if headers is None:
            raise ValueError("No se encontraron cabeceras válidas: falta la columna 'Código'.")

        requeridas = {"codigo", "nombre", "apellidos"}
        faltan = requeridas.difference(set(headers))
        if faltan:
            raise ValueError("Faltan columnas obligatorias: " + ", ".join(sorted(faltan)))

        datos_importar = []
        codigos_vistos = set()
        incluye_asociaciones = "notarios_asociados" in headers

        for fila in filas:
            if not fila or all(celda is None for celda in fila):
                continue
            datos = {}
            for idx, header in enumerate(headers):
                campo = HEADER_MAP.get(header)
                if not campo:
                    continue
                valor = limpiar_texto(fila[idx] if idx < len(fila) else None)
                if campo == "notarios_asociados":
                    datos[campo] = separar_asociados(valor)
                else:
                    datos[campo] = valor

            codigo = datos.get("codigo", "").strip()
            if not codigo:
                continue
            clave = normalizar_codigo(codigo)
            if clave in codigos_vistos:
                raise ValueError(f"El Excel contiene el código CTN duplicado: {codigo}. No se ha modificado el catálogo.")
            codigos_vistos.add(clave)

            if datos.get("vc"):
                datos["vc"] = normalizar_vc(datos["vc"])
            datos_importar.append(datos)

        if not datos_importar:
            raise ValueError("El Excel no contiene notarías con código válido; no se han modificado datos.")

        wb.close()
        wb = None

        # Carga el catálogo actual una sola vez y detecta duplicados previos.
        existentes = db.query(Notaria).all()
        por_codigo = {}
        for notaria in existentes:
            clave = normalizar_codigo(notaria.codigo)
            if not clave:
                continue
            if clave in por_codigo:
                raise ValueError(
                    f"El catálogo actual contiene más de un notario con el código {notaria.codigo}. "
                    "Debe corregirse antes de importar."
                )
            por_codigo[clave] = notaria

        insertados = 0
        actualizados = 0
        for datos in datos_importar:
            codigo = datos["codigo"].strip()
            clave = normalizar_codigo(codigo)
            valores = {
                campo: (valor.strip() or None)
                for campo, valor in datos.items()
                if campo not in {"codigo", "notarios_asociados"}
            }
            notaria = por_codigo.get(clave)
            if notaria is None:
                notaria = Notaria(codigo=codigo, **valores)
                db.add(notaria)
                db.flush()
                por_codigo[clave] = notaria
                insertados += 1
            else:
                notaria.codigo = codigo
                # Los campos vacíos del Excel no borran datos ya existentes.
                for campo, valor in valores.items():
                    if valor is not None:
                        setattr(notaria, campo, valor)
                actualizados += 1

        db.flush()

        asociaciones_importadas = 0
        if incluye_asociaciones:
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS public.ctn_notarios_asociados (
                    notario_id INTEGER NOT NULL REFERENCES public.ctn_notarios(id) ON DELETE CASCADE,
                    asociado_id INTEGER NOT NULL REFERENCES public.ctn_notarios(id) ON DELETE CASCADE,
                    PRIMARY KEY (notario_id, asociado_id),
                    CHECK (notario_id <> asociado_id)
                )
            """))
            # Completa el mapa con todos los registros, incluidos los ya existentes.
            por_codigo = {
                normalizar_codigo(n.codigo): n
                for n in db.query(Notaria).all()
                if normalizar_codigo(n.codigo)
            }
            for datos in datos_importar:
                notaria = por_codigo[normalizar_codigo(datos["codigo"])]
                db.execute(
                    text("DELETE FROM public.ctn_notarios_asociados WHERE notario_id = :id"),
                    {"id": notaria.id},
                )
                for codigo_asociado in datos.get("notarios_asociados", []):
                    asociado = por_codigo.get(normalizar_codigo(codigo_asociado))
                    if asociado is None:
                        raise ValueError(
                            f"El código asociado {codigo_asociado} no existe en el catálogo CTN."
                        )
                    if asociado.id == notaria.id:
                        continue
                    resultado = db.execute(
                        text("""
                            INSERT INTO public.ctn_notarios_asociados (notario_id, asociado_id)
                            VALUES (:notario_id, :asociado_id)
                            ON CONFLICT DO NOTHING
                        """),
                        {"notario_id": notaria.id, "asociado_id": asociado.id},
                    )
                    asociaciones_importadas += max(resultado.rowcount or 0, 0)

        db.commit()
        return {
            "importados": len(datos_importar),
            "insertados": insertados,
            "actualizados": actualizados,
            "asociaciones_importadas": asociaciones_importadas,
            "asociaciones_actualizadas": incluye_asociaciones,
            "registros_ausentes_conservados": True,
        }

    except Exception:
        db.rollback()
        raise
    finally:
        if wb is not None:
            wb.close()

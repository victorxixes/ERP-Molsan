"""Carga idempotente del listado histórico solicitado para CaixaBank.

Conserva los nombres e identificadores existentes, evita duplicados por mayúsculas,
acentos, espacios y puntuación, crea únicamente los nombres ausentes y asigna
Entidad actual = CaixaBank, S.A. a todas las denominaciones del listado.
"""
import unicodedata

from sqlalchemy import text

from backend.app.database import engine


ENTIDADES_HISTORICAS_CAIXABANK = [
    "BANCA CÍVICA",
    "Banca Jover, S.A.",
    "BANCAJA",
    "BANCO DE EUROPA",
    "BANCO DE FOMENTO (Cesión de oficinas)",
    "Banco de la Pequeña y Mediana Empresa, S.A.",
    "BANCO DE LAS ISLAS CANARIAS",
    "BANCO DE MURCIA",
    "BANCO DE VALENCIA",
    "BANCO GRANADA JEREZ",
    "BANCO MARE NOSTRUM (BMN)",
    "BANCO ZARAGOZANO",
    "BANCOFAR",
    "BANCOFAR (Cesión de créditos)",
    "BANKIA",
    "BANZANO HIPOTECARIO",
    "BARCLAYS BANK SUCURSAL EN ESPAÑA",
    "BFA",
    "CAIXA D´ESTALVIS SAGRADA FAMILIA",
    "Caixa Estalvis Laietana",
    "CAIXA GIRONA",
    "CAIXA LAIETANA",
    "CAIXA PENEDÈS",
    "CAIXABANK",
    "CAIXALEASING Y FACTORING",
    "Caja Adherida de Sant Joan de les Abadesses",
    "Caja Adherida del Círculo Obrero de Banyoles",
    "CAJA ÁVILA",
    "Caja de Ahorros de La Rioja",
    "Caja de Ahorros de La Seo de Urgell",
    "Caja de Ahorros de Palamós",
    "Caja de Ahorros de Valencia, Castellón y Alicante",
    "Caja de Ahorros de Villarreal",
    "CAJA DE AHORROS MUNICIPAL DE BURGOS",
    "Caja de Ahorros Provincial de Ciudad Real",
    "CAJA DE AHORROS PROVINCIAL DE GUADALAJARA",
    "CAJA DE AHORROS PROVINCIAL SAN FERNANDO DE SEVILLA Y JEREZ",
    "Caja de Ahorros y Monte de Piedad de Alcalá de Henares",
    "Caja de Ahorros y Monte de Piedad de Alcira",
    "Caja de Ahorros y Monte de Piedad de Ampurdán",
    "Caja de Ahorros y Monte de Piedad de Ávila",
    "CAJA DE AHORROS Y MONTE DE PIEDAD DE BARCELONA",
    "Caja de Ahorros y Monte de Piedad de Ceuta",
    "Caja de Ahorros y Monte de Piedad de Játiva",
    "CAJA DE AHORROS Y MONTE DE PIEDAD DE LÉRIDA",
    "CAJA DE AHORROS Y MONTE DE PIEDAD DE NAVARRA",
    "Caja de Ahorros y Monte de Piedad de Segorbe",
    "Caja de Ahorros y Monte de Piedad de Segovia",
    "CAJA DE AHORROS Y MONTE DE PIEDAD MUNICIPAL DE PAMPLONA",
    "CAJA DE AHORROS Y PENSIONES DE BARCELONA",
    "Caja de Ahorros y Préstamos de Carlet",
    "Caja de Ahorros y Socorros y Monte de Piedad de Alberique",
    "Caja de Ahorros y Socorros y Monte de Piedad de Gandía",
    "Caja de Crédito de Granollers",
    "Caja de Crédito Industrial Cooperativo, Sociedad Cooperativa de Crédito Limitada",
    "Caja de Crédito Mediterránea, Cooperativa de Crédito",
    "Caja de Inversión, Sociedad Cooperativa de Crédito Limitada",
    "CAJA DE PENSIONES PARA LA VEJEZ Y DE AHORROS ¿CATALUÑA y BALEARES?",
    "Caja de Previsión Social del Reino de Valencia",
    "CAJA GENERAL DE AHORROS DE CANARIAS",
    "CAJA GRANADA",
    "CAJA INSULAR CANARIAS",
    "CAJA MADRID",
    "CAJA MURCIA",
    "CAJA RIOJA",
    "Caja Rural de Cantabria, Sdad. Coop. Cto. Ltda.",
    "CAJA RURAL DE TALAVERA",
    "Caja Rural Provincial de Barcelona, Sdad. Coop. Catalana Cto. Ltda.",
    "Caja Rural Provincial de Gerona, Sdad. Coop. Catalana Cto. Ltda.",
    "Caja Rural Provincial de Madrid, Sdad. Coop. Catalana Cto. Ltda.",
    "Caja Rural Provincial de Patencia, Sdad. Coop. de Cto. Agrario Ltda. de Reus",
    "CAJA SEGOVIA",
    "CAJASOL",
    "DEUTSCHE BANK (Cesión de operaciones financieras)",
    "HIPOTECAIXA",
    "ISBANC",
    "MICROBANK DE LA CAIXA - CRITERIA CAIXACORP",
    "MONTE DE PIEDAD Y CAJA DE AHORROS DE HUELVA Y SEVILLA",
    "MONTE DE PIEDAD Y CAJA DE AHORROS SAN FERNANDO DE HUELVA, JEREZ Y SEVILLA",
    "PROMINMO",
    "SA NOSTRA",
    "SERVIHABITAT",
    "Sindicato de Banqueros de Barcelona, S.A.",
]


def _normalizar_nombre(nombre):
    texto = unicodedata.normalize("NFKD", str(nombre or ""))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = texto.replace("’", "'").replace("´", "'").replace("`", "'")
    return "".join(c.casefold() for c in texto if c.isalnum())


def sincronizar_catalogo_historico_caixabank():
    """Sincroniza el listado sin borrar ni renombrar registros existentes."""
    with engine.begin() as conexion:
        filas = conexion.execute(text("""
            SELECT id, nombre, activo, entidad_actual_id
            FROM public.entidades_bancarias
            ORDER BY id
        """)).mappings().all()

        destinos = [
            fila for fila in filas
            if _normalizar_nombre(fila["nombre"]) == _normalizar_nombre("CaixaBank, S.A.")
            and fila["activo"] is True
        ]
        if not destinos:
            print(
                "[ENTIDADES HISTÓRICAS CAIXABANK] No se encontró CaixaBank, S.A. activa; "
                "no se modificó el catálogo.",
                flush=True,
            )
            return {"creadas": 0, "actualizadas": 0, "destino_encontrado": False}

        destino = next(
            (fila for fila in destinos if str(fila["nombre"]).strip().casefold() == "caixabank, s.a."),
            destinos[0],
        )
        destino_id = destino["id"]

        por_nombre = {}
        for fila in filas:
            por_nombre.setdefault(_normalizar_nombre(fila["nombre"]), []).append(fila)

        creadas = 0
        actualizadas = 0
        procesadas = set()

        for nombre in ENTIDADES_HISTORICAS_CAIXABANK:
            clave = _normalizar_nombre(nombre)
            if not clave or clave in procesadas:
                continue
            procesadas.add(clave)
            # "CAIXABANK" del listado identifica al sucesor actual; no reactivar
            # el alias antiguo inactivo ni crear una segunda entidad actual.
            if clave == _normalizar_nombre("CaixaBank"):
                continue
            existentes = por_nombre.get(clave, [])

            if not existentes:
                nuevo_id = conexion.execute(text("""
                    INSERT INTO public.entidades_bancarias
                        (codigo_europeo, lei, nombre, categoria, direccion, entidad_actual_id, activo)
                    VALUES (NULL, NULL, :nombre, 'Entidad de crédito', NULL, :destino_id, TRUE)
                    RETURNING id
                """), {"nombre": nombre, "destino_id": destino_id}).scalar_one()
                por_nombre[clave] = [{
                    "id": nuevo_id, "nombre": nombre, "activo": True,
                    "entidad_actual_id": destino_id,
                }]
                creadas += 1
                continue

            # Mantiene IDs/nombres existentes, reactiva las entradas del listado y
            # fuerza la relación pedida incluso si había una sucesión previa distinta.
            for existente in existentes:
                if existente["id"] == destino_id:
                    continue
                if (
                    existente["entidad_actual_id"] != destino_id
                    or existente["activo"] is not True
                ):
                    conexion.execute(text("""
                        UPDATE public.entidades_bancarias
                        SET entidad_actual_id = :destino_id, activo = TRUE
                        WHERE id = :id
                    """), {"destino_id": destino_id, "id": existente["id"]})
                    actualizadas += 1

        print(
            "[ENTIDADES HISTÓRICAS CAIXABANK] Sincronización terminada: "
            f"{len(procesadas)} nombres del listado, {creadas} altas nuevas, "
            f"{actualizadas} registros actualizados/reactivados; "
            f"Entidad actual ID={destino_id} ({destino['nombre']}).",
            flush=True,
        )
        return {
            "creadas": creadas,
            "actualizadas": actualizadas,
            "destino_encontrado": True,
            "entidad_actual_id": destino_id,
            "nombres_procesados": len(procesadas),
        }

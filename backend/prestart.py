"""Hook prestart seguro: no modifica ni recrea tablas automáticamente.

La versión anterior ejecutaba DROP TABLE agenda_citas CASCADE al ejecutarse,
con riesgo de pérdida de citas y de objetos relacionados. Las migraciones de
agenda deben ser idempotentes y revisadas; este hook queda como no-op seguro.
"""

def main() -> None:
    print(
        "PRESTART seguro: no se han modificado tablas. "
        "Ejecuta migraciones explícitas y revisadas para cambios de esquema.",
        flush=True,
    )


if __name__ == "__main__":
    main()

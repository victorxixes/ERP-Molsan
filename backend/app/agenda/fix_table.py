"""Script legacy desactivado: no ejecutar DROP TABLE sobre agenda en producción."""
def main():
    raise RuntimeError("backend.app.agenda.fix_table está desactivado por contener operaciones DDL destructivas; usa una migración revisada.")

if __name__ == "__main__":
    main()

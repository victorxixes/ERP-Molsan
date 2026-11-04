"""Audita y exporta el esquema ORM PostgreSQL sin conectarse a ninguna base de datos.

El import de main registra los modelos usados por todos los routers. Se emplean
credenciales ficticias solo para satisfacer la validación de configuración:
no se abre ninguna conexión y no se leen secretos del entorno del runner.
"""
from __future__ import annotations

import os
from pathlib import Path

os.environ["DATABASE_URL"] = "postgresql://schema_audit:unused@127.0.0.1/schema_audit"
os.environ["JWT_SECRET"] = "schema-audit-only-secret-not-used-for-signing-000000000000"
os.environ.setdefault("MOLSAN_STORAGE_ROOT", "/tmp/molsan-schema-audit")

from sqlalchemy import create_mock_engine
from sqlalchemy.schema import CreateIndex, CreateTable

# Importa la aplicación para registrar los modelos declarados tanto en
# backend/app/*/models.py como en routers que contienen modelos SQLAlchemy.
from backend.app.main import app  # noqa: F401
from backend.app.database import Base


def target_table_name(fk) -> str:
    return fk.target_fullname.rsplit(".", 1)[0]


def ordered_tables(tables):
    names = set(tables)
    dependencies = {}
    missing = []
    for name, table in tables.items():
        dependencies[name] = set()
        for fk in table.foreign_keys:
            target = target_table_name(fk)
            if target in names:
                dependencies[name].add(target)
            else:
                missing.append((name, fk.parent.name, fk.target_fullname))

    ordered = []
    temporary = set()
    permanent = set()

    def visit(name):
        if name in permanent:
            return
        if name in temporary:
            return
        temporary.add(name)
        for dependency in sorted(dependencies[name]):
            visit(dependency)
        temporary.remove(name)
        permanent.add(name)
        ordered.append(name)

    for name in sorted(names):
        visit(name)
    return ordered, missing


def main():
    tables = dict(Base.metadata.tables)
    ordered, missing = ordered_tables(tables)
    output = Path(os.getenv("MOLSAN_SCHEMA_AUDIT_OUTPUT", "schema-audit"))
    output.mkdir(parents=True, exist_ok=True)

    inventory = []
    for name in ordered:
        table = tables[name]
        fks = sorted(
            f"{fk.parent.name} -> {fk.target_fullname}"
            for fk in table.foreign_keys
        )
        inventory.append(
            f"{name}\tcolumns={len(table.columns)}\tindexes={len(table.indexes)}\tfks={len(fks)}"
        )

    (output / "orm-tables.txt").write_text(
        "ORM_TABLE_COUNT=" + str(len(tables)) + "\n"
        + "\n".join(inventory)
        + "\n\nMISSING_EXTERNAL_FK_TARGETS\n"
        + "\n".join(f"{table}.{column} -> {target}" for table, column, target in missing)
        + "\n",
        encoding="utf-8",
    )

    statements = []
    dialect_engine = create_mock_engine("postgresql://", lambda *args, **kwargs: None)
    dialect = dialect_engine.dialect
    for name in ordered:
        table = tables[name]
        valid_constraints = []
        for constraint in table.foreign_key_constraints:
            targets = {target_table_name(element) for element in constraint.elements}
            if targets.issubset(tables):
                valid_constraints.append(constraint)
        statements.append(
            str(CreateTable(table, include_foreign_key_constraints=valid_constraints).compile(dialect=dialect)).rstrip() + ";"
        )
        for index in sorted(table.indexes, key=lambda item: item.name or ""):
            statements.append(str(CreateIndex(index).compile(dialect=dialect)).rstrip() + ";")

    (output / "orm-schema.sql").write_text(
        "-- Generated from SQLAlchemy Base.metadata on the candidate branch.\n"
        "-- External FK targets are reported in orm-tables.txt and intentionally omitted here.\n\n"
        + "\n\n".join(statements)
        + "\n",
        encoding="utf-8",
    )

    print(f"ORM tables registered: {len(tables)}")
    print(f"External FK targets requiring manual migration work: {len(missing)}")
    for table, column, target in missing:
        print(f"EXTERNAL_FK {table}.{column} -> {target}")
    print(f"Generated: {output / 'orm-tables.txt'}")
    print(f"Generated: {output / 'orm-schema.sql'}")


if __name__ == "__main__":
    main()

"""Audita y exporta el esquema ORM PostgreSQL sin conectarse a ninguna base de datos.

El import de main registra los modelos usados por todos los routers. Se emplean
credenciales ficticias solo para satisfacer la validación de configuración:
no se abre ninguna conexión y no se leen secretos del entorno del runner.
"""
from __future__ import annotations

import ast
import os
import re
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPOSITORY_ROOT))

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
    # Acepta tanto "tabla.columna" como "public.tabla.columna".
    return fk.target_fullname.split(".")[-2] if "." in fk.target_fullname else fk.target_fullname


def ordered_tables(tables):
    key_by_table_name = {table.name: key for key, table in tables.items()}
    dependencies = {}
    missing = []
    for key, table in tables.items():
        dependencies[key] = set()
        for fk in table.foreign_keys:
            target_name = target_table_name(fk)
            target_key = key_by_table_name.get(target_name)
            if target_key is not None:
                dependencies[key].add(target_key)
            else:
                missing.append((key, fk.parent.name, fk.target_fullname))

    ordered = []
    temporary = set()
    permanent = set()

    def visit(key):
        if key in permanent:
            return
        if key in temporary:
            return
        temporary.add(key)
        for dependency in sorted(dependencies[key]):
            visit(dependency)
        temporary.remove(key)
        permanent.add(key)
        ordered.append(key)

    for key in sorted(tables):
        visit(key)
    return ordered, missing, key_by_table_name



def scan_raw_ddl(orm_table_names):
    """Extrae CREATE TABLE/INDEX estáticos y marca DDL dinámico."""
    source_root = Path("backend/app")
    statements_by_table = {}
    indexes_by_name = {}
    dynamic = []
    duplicates = []

    def extract_statements(sql, keyword):
        pattern = re.compile(keyword, re.IGNORECASE)
        for match in pattern.finditer(sql):
            end = sql.find(";", match.start())
            if end < 0:
                end = len(sql)
            statement = sql[match.start():end].strip()
            if statement and not statement.endswith(";"):
                statement += ";"
            yield statement

    def register_sql(sql, source):
        for statement in extract_statements(sql, r"\\bCREATE\\s+TABLE\\b"):
            table_match = re.search(
                r"\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:public\\.)?([A-Za-z_][A-Za-z0-9_]*)",
                statement,
                re.IGNORECASE,
            )
            if not table_match:
                continue
            table_name = table_match.group(1).lower()
            if table_name in orm_table_names:
                duplicates.append((table_name, source, "already defined in SQLAlchemy metadata"))
                continue
            entry = {"source": source, "sql": statement}
            previous = statements_by_table.get(table_name)
            if previous is None:
                statements_by_table[table_name] = entry
            elif re.sub(r"\\s+", " ", previous["sql"]).strip().lower() != re.sub(r"\\s+", " ", statement).strip().lower():
                duplicates.append((table_name, source, "different CREATE TABLE definition; manual reconciliation required"))
            else:
                duplicates.append((table_name, source, "duplicate identical definition"))

        for statement in extract_statements(sql, r"\\bCREATE\\s+(?:UNIQUE\\s+)?INDEX\\b"):
            index_match = re.search(
                r"\\bCREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s+ON\\s+(?:public\\.)?([A-Za-z_][A-Za-z0-9_]*)",
                statement,
                re.IGNORECASE,
            )
            if not index_match:
                continue
            index_name = index_match.group(1).lower()
            table_name = index_match.group(2).lower()
            entry = {"source": source, "sql": statement, "table": table_name}
            previous = indexes_by_name.get(index_name)
            if previous is None:
                indexes_by_name[index_name] = entry
            elif re.sub(r"\\s+", " ", previous["sql"]).strip().lower() != re.sub(r"\\s+", " ", statement).strip().lower():
                duplicates.append((index_name, source, "different CREATE INDEX definition; manual reconciliation required"))

    for source_path in sorted(source_root.rglob("*.py")):
        try:
            source_text = source_path.read_text(encoding="utf-8")
            tree = ast.parse(source_text)
        except (OSError, SyntaxError, UnicodeDecodeError):
            continue
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                if re.search(r"\\bCREATE\\s+(?:TABLE|(?:UNIQUE\\s+)?INDEX)\\b", node.value, re.IGNORECASE):
                    register_sql(node.value, f"{source_path}:{node.lineno}")
            elif isinstance(node, ast.JoinedStr):
                pieces = []
                for value in node.values:
                    if isinstance(value, ast.Constant) and isinstance(value.value, str):
                        pieces.append(value.value)
                    else:
                        pieces.append("{dynamic}")
                template = "".join(pieces)
                if re.search(r"\\bCREATE\\s+(?:TABLE|(?:UNIQUE\\s+)?INDEX)\\b", template, re.IGNORECASE):
                    dynamic.append(f"{source_path}:{node.lineno}: {template[:240]}")

    for source_path in sorted(source_root.rglob("*.sql")):
        try:
            register_sql(source_path.read_text(encoding="utf-8"), str(source_path))
        except (OSError, UnicodeDecodeError):
            continue

    names = set(statements_by_table)
    dependencies = {}
    for name, entry in statements_by_table.items():
        refs = re.findall(
            r"\\bREFERENCES\\s+(?:public\\.)?([A-Za-z_][A-Za-z0-9_]*)",
            entry["sql"],
            re.IGNORECASE,
        )
        dependencies[name] = {ref.lower() for ref in refs if ref.lower() in names and ref.lower() != name}

    ordered = []
    visiting = set()
    visited = set()

    def visit(name):
        if name in visited or name in visiting:
            return
        visiting.add(name)
        for dependency in sorted(dependencies.get(name, ())):
            visit(dependency)
        visiting.remove(name)
        visited.add(name)
        ordered.append(name)

    for name in sorted(names):
        visit(name)

    sql_parts = []
    inventory = []
    for name in ordered:
        entry = statements_by_table[name]
        statement = entry["sql"]
        idempotent = bool(re.search(r"CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS", statement, re.IGNORECASE))
        refs = sorted(dependencies.get(name, ()))
        inventory.append(
            f"{name}\\tsource={entry['source']}\\tidempotent={idempotent}\\tfk_dependencies={','.join(refs)}"
        )
        sql_parts.append(f"-- Source: {entry['source']}\\n{statement}")

    raw_indexes = {
        name: entry for name, entry in indexes_by_name.items()
        if entry["table"] in names
    }
    for name, entry in sorted(raw_indexes.items()):
        sql_parts.append(f"-- Source: {entry['source']}\\n{entry['sql']}")

    return sql_parts, inventory, dynamic, duplicates, raw_indexes



def main():
    tables = dict(Base.metadata.tables)
    ordered, missing, key_by_table_name = ordered_tables(tables)
    output = Path(os.getenv("MOLSAN_SCHEMA_AUDIT_OUTPUT", "schema-audit"))
    output.mkdir(parents=True, exist_ok=True)

    inventory = []
    for key in ordered:
        table = tables[key]
        fks = sorted(
            f"{fk.parent.name} -> {fk.target_fullname}"
            for fk in table.foreign_keys
        )
        inventory.append(
            f"{table.fullname}\tcolumns={len(table.columns)}\tindexes={len(table.indexes)}\tfks={len(fks)}"
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
    for key in ordered:
        table = tables[key]
        valid_constraints = []
        for constraint in table.foreign_key_constraints:
            targets = {target_table_name(element) for element in constraint.elements}
            if targets.issubset(key_by_table_name):
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

    orm_table_names = {table.name.lower() for table in tables.values()}
    raw_sql, raw_inventory, dynamic_ddl, duplicate_ddl, raw_indexes = scan_raw_ddl(orm_table_names)
    (output / "raw-ddl.sql").write_text(
        "-- Static auxiliary CREATE TABLE statements found in backend source.\n"
        "-- Review dynamic/duplicate definitions in raw-ddl-inventory.txt before applying.\n\n"
        + "\n\n".join(raw_sql)
        + "\n",
        encoding="utf-8",
    )
    (output / "raw-ddl-inventory.txt").write_text(
        "RAW_STATIC_TABLE_COUNT=" + str(len(raw_inventory)) + "\n"
        + "RAW_STATIC_INDEX_COUNT=" + str(len(raw_indexes)) + "\n"
        + "\n".join(raw_inventory)
        + "\n\nDYNAMIC_DDL_REQUIRES_MANUAL_REVIEW\n"
        + "\n".join(dynamic_ddl)
        + "\n\nDUPLICATE_OR_ORM_TABLE_DEFINITIONS\n"
        + "\n".join(f"{table}\t{source}\t{note}" for table, source, note in duplicate_ddl)
        + "\n",
        encoding="utf-8",
    )

    print(f"ORM tables registered: {len(tables)}")
    print(f"Auxiliary static SQL tables discovered: {len(raw_inventory)}")
    print(f"Auxiliary static SQL indexes discovered: {len(raw_indexes)}")
    print(f"Dynamic DDL statements requiring manual review: {len(dynamic_ddl)}")
    print(f"Duplicate/ORM DDL definitions: {len(duplicate_ddl)}")
    print(f"External FK targets requiring manual migration work: {len(missing)}")
    for table, column, target in missing:
        print(f"EXTERNAL_FK {table}.{column} -> {target}")
    print(f"Generated: {output / 'orm-tables.txt'}")
    print(f"Generated: {output / 'orm-schema.sql'}")


if __name__ == "__main__":
    main()

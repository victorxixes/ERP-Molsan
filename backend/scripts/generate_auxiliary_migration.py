"""Generate the reviewed auxiliary-schema Alembic revision from canonical DDL.

This script never connects to a database and never imports or copies application data.
It reuses the offline inventory to ensure there are no dynamic DDL statements,
conflicting table definitions, unresolved foreign keys, or unreconciled ALTERs.
"""
from __future__ import annotations

import re
import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIT_SCRIPT = ROOT / "backend" / "scripts" / "audit_supabase_schema.py"
OUTPUT = ROOT / "backend" / "migrations" / "versions" / "20261104_0003_auxiliary_schema.py"


def extract_table_columns(sql: str) -> set[str]:
    opening = sql.find("(")
    closing = sql.rfind(")")
    if opening < 0 or closing <= opening:
        raise RuntimeError("CREATE TABLE sin cuerpo reconocible")

    body = sql[opening + 1 : closing]
    parts = []
    current = []
    depth = 0
    quote = None
    i = 0
    while i < len(body):
        char = body[i]
        if quote:
            current.append(char)
            if char == quote:
                if i + 1 < len(body) and body[i + 1] == quote:
                    current.append(body[i + 1])
                    i += 1
                else:
                    quote = None
            elif char == "\\" and quote == "'":
                if i + 1 < len(body):
                    current.append(body[i + 1])
                    i += 1
        else:
            if char in ("'", '"'):
                quote = char
                current.append(char)
            elif char == "(":
                depth += 1
                current.append(char)
            elif char == ")":
                depth -= 1
                current.append(char)
            elif char == "," and depth == 0:
                parts.append("".join(current))
                current = []
            else:
                current.append(char)
        i += 1
    if current:
        parts.append("".join(current))

    columns = set()
    constraints = {"CONSTRAINT", "PRIMARY", "FOREIGN", "UNIQUE", "CHECK", "EXCLUDE"}
    for part in parts:
        match = re.match(r'\s*(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))\s+', part)
        if not match:
            continue
        name = (match.group(1) or match.group(2)).lower()
        if name.upper() not in constraints:
            columns.add(name)
    return columns


def main() -> None:
    if OUTPUT.exists():
        print(f"Auxiliary revision already exists: {OUTPUT.name}")
        return

    namespace = runpy.run_path(str(AUDIT_SCRIPT))
    Base = namespace["Base"]
    scan_raw_ddl = namespace["scan_raw_ddl"]

    tables = dict(Base.metadata.tables)
    orm_table_names = {table.name.lower() for table in tables.values()}
    orm_columns = {
        (table.name.lower(), column.name.lower())
        for table in tables.values()
        for column in table.columns
    }

    raw_sql, raw_inventory, dynamic_ddl, duplicates, raw_indexes, manual_review_ddl, raw_missing_fks, raw_orm_fks = scan_raw_ddl(orm_table_names)

    conflicts = [item for item in duplicates if "different CREATE TABLE definition" in item[2]]
    if dynamic_ddl:
        raise RuntimeError(f"Quedan {len(dynamic_ddl)} operaciones DDL dinámicas sin reconciliar.")
    if conflicts:
        raise RuntimeError(f"Quedan {len(conflicts)} definiciones de tabla conflictivas.")
    if raw_missing_fks:
        raise RuntimeError(f"Quedan {len(raw_missing_fks)} referencias FK sin destino.")

    auxiliary_names = {line.split("\t", 1)[0].lower() for line in raw_inventory}
    table_sql = {}
    index_sql = []
    for item in raw_sql:
        if not item.startswith("-- Source:"):
            continue
        statement = item.split("\n", 1)[1].strip()
        table_match = re.match(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)",
            statement,
            re.IGNORECASE,
        )
        if table_match:
            name = table_match.group(1).lower()
            if name in orm_table_names:
                raise RuntimeError(f"El inventario intenta crear una tabla ya gestionada por ORM: {name}")
            if name in table_sql:
                raise RuntimeError(f"Definición auxiliar repetida no reconciliada: {name}")
            table_sql[name] = statement
            continue
        if re.match(r"CREATE\s+(?:UNIQUE\s+)?INDEX\b", statement, re.IGNORECASE):
            index_sql.append(statement)

    if set(table_sql) != auxiliary_names:
        missing = sorted(auxiliary_names - set(table_sql))
        extra = sorted(set(table_sql) - auxiliary_names)
        raise RuntimeError(f"Inventario/DDL de tablas auxiliares no coincide. Faltan={missing}; extra={extra}")
    if len(table_sql) != 33:
        raise RuntimeError(f"Se esperaban 33 tablas auxiliares revisadas; se encontraron {len(table_sql)}.")
    if len(index_sql) != 7:
        raise RuntimeError(f"Se esperaban 7 índices auxiliares revisados; se encontraron {len(index_sql)}.")

    auxiliary_columns = {name: extract_table_columns(sql) for name, sql in table_sql.items()}
    resolved_alters = 0
    for entry in manual_review_ddl:
        statement = entry["sql"]
        add_column = re.search(
            r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+(?:COLUMN\s+)?(?!CONSTRAINT\b)(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)",
            statement,
            re.IGNORECASE,
        )
        if add_column:
            table, column = add_column.group(1).lower(), add_column.group(2).lower()
            if table in orm_table_names and (table, column) in orm_columns:
                resolved_alters += 1
                continue
            if table in auxiliary_names and column in auxiliary_columns.get(table, set()):
                resolved_alters += 1
                continue
            raise RuntimeError(
                f"ALTER ADD COLUMN no reconciliado: {table}.{column} ({entry['source']})"
            )

        drop_constraint = re.search(
            r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\s+DROP\s+CONSTRAINT",
            statement,
            re.IGNORECASE,
        )
        if drop_constraint:
            table = drop_constraint.group(1).lower()
            canonical = table_sql.get(table, "")
            normalized = re.sub(r"\s+", " ", canonical).lower()
            if table == "expediente_visibilidad_config" and "primary key (empleado_id, actividad_key, ambito)" in normalized:
                resolved_alters += 1
                continue
            raise RuntimeError(f"ALTER DROP CONSTRAINT no reconciliado: {table} ({entry['source']})")

        add_constraint = re.search(
            r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+CONSTRAINT\s+([A-Za-z_][A-Za-z0-9_]*)",
            statement,
            re.IGNORECASE,
        )
        if add_constraint:
            table, constraint_name = add_constraint.group(1).lower(), add_constraint.group(2)
            if table == "expediente_visibilidad_config":
                canonical = re.sub(r"\s+", " ", table_sql.get(table, "")).lower()
                if "primary key (empleado_id, actividad_key, ambito)" in canonical:
                    resolved_alters += 1
                    continue
            if table == "expediente_defectos":
                metadata_table = tables.get(table)
                matching = [
                    fk for fk in metadata_table.foreign_key_constraints
                    if fk.name == constraint_name
                    and any((element.ondelete or "").upper() == "SET NULL" for element in fk.elements)
                ] if metadata_table is not None else []
                if matching:
                    resolved_alters += 1
                    continue
            raise RuntimeError(f"ALTER ADD CONSTRAINT no reconciliado: {table}.{constraint_name}")

        nullable_change = re.search(
            r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)\s+ALTER\s+(?:COLUMN\s+)?([A-Za-z_][A-Za-z0-9_]*)\s+DROP\s+NOT\s+NULL",
            statement,
            re.IGNORECASE,
        )
        if nullable_change:
            table, column = nullable_change.group(1).lower(), nullable_change.group(2).lower()
            metadata_table = tables.get(table)
            if metadata_table is not None and column in metadata_table.c and metadata_table.c[column].nullable:
                resolved_alters += 1
                continue
            raise RuntimeError(f"ALTER nulabilidad no reconciliado: {table}.{column}")

        raise RuntimeError(f"ALTER estático no reconocido: {entry['source']}: {statement}")

    table_names = list(table_sql)
    lines = [
        '"""Create the canonical auxiliary tables and indexes."""',
        "from alembic import op",
        "",
        'revision = "20261104_0003"',
        'down_revision = "20261104_0002"',
        "branch_labels = None",
        "depends_on = None",
        "",
        "",
        "def upgrade():",
    ]
    for name in table_names:
        lines.append(f"    op.execute({table_sql[name]!r})")
    for statement in index_sql:
        lines.append(f"    op.execute({statement!r})")
    lines.extend(["", "", "def downgrade():"])
    for name in reversed(table_names):
        lines.append(f'    op.execute("DROP TABLE IF EXISTS public.{name} CASCADE")')
    lines.append("")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(
        f"Generated {OUTPUT.name}: {len(table_names)} auxiliary tables, "
        f"{len(index_sql)} indexes, {resolved_alters} static ALTERs reconciled, "
        f"{len(raw_orm_fks)} FK dependencies to ORM."
    )


if __name__ == "__main__":
    main()

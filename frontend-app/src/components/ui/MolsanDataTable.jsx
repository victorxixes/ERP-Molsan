import React, { useMemo, useState } from "react";
import { sortRows } from "../../utils/sortRows";

/**
 * Tabla corporativa MOLSAN.
 * Para conjuntos paginados o preordenados externamente, usar sortMode="external"
 * y onSortChange; nunca ordenar localmente una página como si fuera el conjunto completo.
 * columns: [{ key, header, accessor?, sortType?, render?, align?, sortable? }]
 */
export default function MolsanDataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  emptyText = "No hay registros para mostrar.",
  sortMode = "local",
  onSortChange,
  className = "",
  minWidth,
  initialSort = null,
}) {
  const [sort, setSort] = useState(() => initialSort || { key: null, direction: "asc" });
  const sortKeyOf = (column) => column.sortKey ?? column.key;

  const orderedRows = useMemo(() => {
    if (sortMode !== "local" || !sort.key) return rows;
    const column = columns.find((item) => sortKeyOf(item) === sort.key);
    return column ? sortRows(rows, column, sort.direction) : rows;
  }, [rows, columns, sort, sortMode]);

  const ordenar = (column) => {
    if (column.sortable === false) return;
    const sortKey = sortKeyOf(column);
    const next = sort.key !== sortKey
      ? { key: sortKey, direction: "asc" }
      : sort.direction === "asc"
        ? { key: sortKey, direction: "desc" }
        : { key: null, direction: null };
    setSort(next);
    if (sortMode !== "local") onSortChange?.(next, column);
  };

  return (
    <div className={`molsan-table-wrap molsan-data-table-wrap ${className}`.trim()}>
      <table className="molsan-table molsan-data-table" style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort.key === sortKeyOf(column);
              const sortable = column.sortable !== false;
              return (
                <th key={column.key} scope="col" aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}>
                  {sortable ? (
                    <button type="button" className="molsan-table-sort" onClick={() => ordenar(column)} aria-label={`Ordenar por ${column.header}`}>
                      <span>{column.header}</span>
                      <span className={`molsan-table-sort__indicator ${active ? "is-active" : ""}`} aria-hidden="true">{active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span>
                    </button>
                  ) : column.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {orderedRows.length ? orderedRows.map((row, index) => (
            <tr key={row?.[rowKey] ?? index}>
              {columns.map((column) => {
                const value = typeof column.accessor === "function" ? column.accessor(row) : row?.[column.accessor ?? column.key];
                return <td key={column.key} className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}>{column.render ? column.render(value, row, index) : (value ?? "—")}</td>;
              })}
            </tr>
          )) : (
            <tr><td colSpan={Math.max(columns.length, 1)} className="molsan-data-table__empty">{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

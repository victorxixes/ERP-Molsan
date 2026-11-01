import { useEffect, useMemo, useRef, useState } from "react";
import { sortRows } from "../../utils/sortRows";

const sortKeyOf = (column) => column.sortKey || column.key;

const valueOf = (row, column) => {
  if (typeof column.accessor === "function") return column.accessor(row);
  if (typeof column.accessor === "string") return row?.[column.accessor];
  return row?.[column.key];
};

/**
 * Tabla corporativa MOLSAN.
 * - Ordenación local de conjunto completo con ciclo ascendente/descendente/sin orden.
 * - Modo external/server para tablas paginadas por API: nunca ordena localmente una página.
 * - Búsqueda y paginación opcionales para conjuntos completos cargados en cliente.
 * - Ancho de columnas ajustable mediante el tirador de cabecera.
 */
export default function MolsanDataTable({
  columns = [],
  rows = [],
  rowKey = "id",
  emptyText = "No hay registros para mostrar.",
  minWidth = "760px",
  initialSort = null,
  sortMode = "local",
  onSortChange,
  pagination = false,
  pageSize: pageSizeInicial = 25,
  pageSizeOptions = [25, 50, 100],
  searchable = false,
  searchPlaceholder = "Buscar en la tabla…",
  className = "",
}) {
  const [sort, setSort] = useState(initialSort || { key: null, direction: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeInicial);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnWidths, setColumnWidths] = useState({});
  const resizeRef = useRef(null);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("es-ES");
    if (!searchable || !query || sortMode !== "local") return rows;
    return rows.filter((row) => columns.some((column) => {
      if (column.searchable === false) return false;
      const value = valueOf(row, column);
      return String(value ?? "").toLocaleLowerCase("es-ES").includes(query);
    }));
  }, [rows, columns, searchable, searchTerm, sortMode]);

  const orderedRows = useMemo(() => {
    if (!sort.key || sortMode !== "local") return filteredRows;
    const column = columns.find((item) => sortKeyOf(item) === sort.key) || { key: sort.key };
    return sortRows(filteredRows, column, sort.direction);
  }, [filteredRows, columns, sort, sortMode]);

  const paginationEnabled = pagination && sortMode === "local";
  const totalPages = Math.max(1, Math.ceil(orderedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = paginationEnabled
    ? orderedRows.slice((safePage - 1) * pageSize, safePage * pageSize)
    : orderedRows;
  const firstVisible = orderedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastVisible = paginationEnabled
    ? Math.min(safePage * pageSize, orderedRows.length)
    : orderedRows.length;

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  const handleSort = (column) => {
    if (column.sortable === false) return;
    const key = sortKeyOf(column);
    const next = sort.key !== key
      ? { key, direction: "asc" }
      : sort.direction === "asc"
        ? { key, direction: "desc" }
        : { key: null, direction: null };
    setSort(next);
    setPage(1);
    if (sortMode !== "local") onSortChange?.(next, column);
  };

  const beginResize = (event, key) => {
    event.preventDefault();
    event.stopPropagation();
    const header = event.currentTarget.parentElement;
    resizeRef.current = {
      key,
      startX: event.clientX,
      startWidth: header?.getBoundingClientRect?.().width || 140,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveResize = (event, key) => {
    const active = resizeRef.current;
    if (!active || active.key !== key) return;
    const width = Math.max(88, Math.round(active.startWidth + event.clientX - active.startX));
    setColumnWidths((current) => ({ ...current, [key]: width }));
  };

  const endResize = () => {
    resizeRef.current = null;
  };

  return (
    <div className={`molsan-data-table ${className}`}>
      {searchable && sortMode === "local" && (
        <div className="molsan-data-table__toolbar">
          <label className="molsan-data-table__search">
            <span className="sr-only">Buscar en la tabla</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>
        </div>
      )}
      <div className="molsan-table-wrap molsan-data-table__scroll">
        <table className="molsan-table" style={{ minWidth }}>
          <thead>
            <tr>
              {columns.map((column) => {
                const key = sortKeyOf(column);
                const active = sort.key === key;
                const width = columnWidths[key] || column.width;
                return (
                  <th
                    key={key}
                    className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                    style={{
                      width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
                      minWidth: column.minWidth ? (typeof column.minWidth === "number" ? `${column.minWidth}px` : column.minWidth) : undefined,
                    }}
                  >
                    <div className="molsan-data-table__heading">
                      {column.sortable === false ? (
                        <span>{column.header}</span>
                      ) : (
                        <button type="button" className="molsan-table-sort" onClick={() => handleSort(column)}>
                          <span>{column.header}</span>
                          <span className={`molsan-table-sort__indicator ${active ? "is-active" : ""}`} aria-hidden="true">
                            {active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </button>
                      )}
                      {column.resizable !== false && (
                        <span
                          className="molsan-data-table__resizer"
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Cambiar ancho de ${column.header}`}
                          onPointerDown={(event) => beginResize(event, key)}
                          onPointerMove={(event) => moveResize(event, key)}
                          onPointerUp={endResize}
                          onPointerCancel={endResize}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="molsan-data-table__empty">{emptyText}</td>
              </tr>
            ) : visibleRows.map((row, index) => (
              <tr key={typeof rowKey === "function" ? rowKey(row, index) : row?.[rowKey] ?? index}>
                {columns.map((column) => {
                  const value = valueOf(row, column);
                  return (
                    <td
                      key={column.key}
                      className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}
                    >
                      {column.render ? column.render(value, row, index) : (value ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginationEnabled && orderedRows.length > 0 && (
        <div className="molsan-data-table__pagination">
          <span className="molsan-data-table__count">Mostrando {firstVisible}–{lastVisible} de {orderedRows.length}</span>
          <label className="molsan-data-table__page-size">
            <span>Filas</span>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button type="button" className="molsan-btn molsan-btn--secondary molsan-btn--compact" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
          <span className="molsan-data-table__page-label">Página {safePage} de {totalPages}</span>
          <button type="button" className="molsan-btn molsan-btn--secondary molsan-btn--compact" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

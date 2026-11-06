export default function MolsanSortableTh({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = "",
}) {
  const active = sortConfig?.key === sortKey;
  const direction = active ? sortConfig.direction : null;

  return (
    <th
      className={className}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        data-sortable="true"
        onClick={() => onSort(sortKey)}
        className="inline-flex min-h-7 items-center gap-1 text-left"
      >
        <span>{label}</span>
        <span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

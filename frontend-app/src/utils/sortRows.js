/**
 * Ordenación común para tablas MOLSAN.
 * sortType admite: text, number, currency, percent, date, boolean.
 */
const collator = new Intl.Collator("es-ES", {
  numeric: true,
  sensitivity: "base",
});

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(/\s/g, "").replace(/€/g, "").replace(/%/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  const text = String(value).trim();
  const spanish = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parsed = spanish
    ? new Date(Number(spanish[3]), Number(spanish[2]) - 1, Number(spanish[1])).getTime()
    : Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareValues(a, b, type) {
  if (a == null || a === "") return b == null || b === "" ? 0 : 1;
  if (b == null || b === "") return -1;
  if (type === "number" || type === "currency" || type === "percent") {
    const na = numericValue(a);
    const nb = numericValue(b);
    if (na === null || nb === null) return na === nb ? 0 : na === null ? 1 : -1;
    return na - nb;
  }
  if (type === "date") {
    const da = dateValue(a);
    const db = dateValue(b);
    if (da === null || db === null) return da === db ? 0 : da === null ? 1 : -1;
    return da - db;
  }
  if (type === "boolean") return Number(Boolean(a)) - Number(Boolean(b));
  return collator.compare(String(a), String(b));
}

export function sortRows(rows, column, direction = "asc") {
  if (!Array.isArray(rows) || !column) return Array.isArray(rows) ? rows : [];
  const getValue = typeof column.accessor === "function"
    ? column.accessor
    : (row) => row?.[column.accessor ?? column.key];
  const multiplier = direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = getValue(left);
    const b = getValue(right);
    const emptyA = a === null || a === undefined || a === "";
    const emptyB = b === null || b === undefined || b === "";
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
    return compareValues(a, b, column.sortType || "text") * multiplier;
  });
}

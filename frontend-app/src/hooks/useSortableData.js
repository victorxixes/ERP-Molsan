import { useMemo, useState } from "react";

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

function leerValor(item, accessor) {
  if (typeof accessor === "function") return accessor(item);
  return String(accessor || "").split(".").reduce((valor, clave) => valor?.[clave], item);
}

function normalizar(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "boolean") return valor ? 1 : 0;

  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const fechaEs = texto.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (fechaEs) return new Date(Number(fechaEs[3]), Number(fechaEs[2]) - 1, Number(fechaEs[1])).getTime();

  const numero = texto.replace(/[€\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (/^-?\d+(?:\.\d+)?$/.test(numero)) {
    const n = Number(numero);
    if (Number.isFinite(n)) return n;
  }
  return texto;
}

function comparar(a, b) {
  const va = normalizar(a);
  const vb = normalizar(b);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  return collator.compare(String(va), String(vb));
}

/**
 * Ordenación local estable para listados cuyo conjunto visible ya está cargado.
 * No modifica el array original ni altera filtros o paginación del servidor.
 */
export default function useSortableData(data = []) {
  const [sortConfig, setSortConfig] = useState(null);

  const items = useMemo(() => {
    if (!Array.isArray(data) || !sortConfig) return Array.isArray(data) ? data : [];
    const direction = sortConfig.direction === "desc" ? -1 : 1;
    return data
      .map((item, index) => ({ item, index }))
      .sort((a, b) => comparar(
        leerValor(a.item, sortConfig.key),
        leerValor(b.item, sortConfig.key)
      ) * direction || a.index - b.index)
      .map(({ item }) => item);
  }, [data, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  return { items, sortConfig, requestSort };
}

/**
 * Campo de solo lectura compartido para resúmenes, fichas y paneles.
 * Los módulos proporcionan etiqueta y valor; la presentación pertenece
 * exclusivamente a este componente.
 */
export default function MolsanDetailField({
  label,
  value,
  emptyLabel = "—",
  className = "",
}) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div
      data-molsan-component="detail-field"
      className={`min-w-0 rounded-xl border border-[#D8E4EC] bg-[#F2F7FB] px-3 py-2.5 ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.045em] text-[#617789]">
        {label}
      </p>
      <p className="mt-1 min-w-0 break-words text-xs font-semibold leading-relaxed text-[#064675]">
        {isEmpty ? emptyLabel : typeof value === "string" || typeof value === "number" ? value : String(value)}
      </p>
    </div>
  );
}

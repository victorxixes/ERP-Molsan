import React from "react";

/** Botón compartido MOLSAN. Mantiene handlers, disabled y type del botón nativo. */
const ICONS = {
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  delete: <><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
};

export default function MolsanButton({
  children,
  variant = "secondary",
  icon,
  loading = false,
  className = "",
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      className={`molsan-btn molsan-btn--${variant} ${className}`.trim()}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="molsan-btn__spinner" aria-hidden="true" />
      ) : icon && ICONS[icon] ? (
        <svg className="molsan-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[icon]}</svg>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

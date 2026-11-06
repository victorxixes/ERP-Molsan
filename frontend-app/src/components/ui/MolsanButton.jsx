import React from "react";
import MolsanIcon from "./MolsanIcon";

/** Botón compartido MOLSAN. Mantiene handlers, disabled y type del botón nativo. */
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
      ) : icon ? (
        <MolsanIcon name={icon} size={16} bare className="molsan-btn__icon" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

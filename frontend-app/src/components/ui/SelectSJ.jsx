import { useEffect, useRef, useState } from "react";

import "../../css/ComponentesOperativosPremium.css";

export default function SelectSJ({
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar",
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);

  const opcionSeleccionada = options.find(
    (o) => String(o.value) === String(value)
  );

  // =========================================================
  // CERRAR AL HACER CLICK FUERA
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // =========================================================
  // CERRAR CON ESC
  // =========================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // =========================================================
  // CERRAR SI PASA A DISABLED
  // =========================================================

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  // =========================================================
  // SELECCIONAR
  // =========================================================

  const seleccionar = (option) => {
    if (disabled) return;

    onChange(option.value);
    setOpen(false);
  };

  return (
    <div
      ref={selectRef}
      className={`relative ${className}`}
    >
      {/* =====================================================
          BOTÓN PRINCIPAL
         ===================================================== */}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((actual) => !actual);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          w-full
          min-h-[42px]
          bg-white
          border border-slate-300
          rounded-xl
          px-3 py-2
          text-slate-700
          text-left
          font-medium
          flex
          justify-between
          items-center
          gap-3
          shadow-sm
          transition-all
          duration-200

          ${
            disabled
              ? "opacity-60 cursor-not-allowed bg-slate-100"
              : "hover:border-blue-400 hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          }
        `}
      >
        <span className="select-sj-premium truncate">
          {opcionSeleccionada?.label ?? placeholder}
        </span>

        <svg
          className={`
            w-4 h-4
            shrink-0
            text-slate-500
            transition-transform
            duration-200
            ${open ? "rotate-180" : ""}
          `}
          aria-hidden="true"
        >
          <use href="/icons/icons.svg#chevron-down" />
        </svg>
      </button>

      {/* =====================================================
          DESPLEGABLE
         ===================================================== */}

      {open && !disabled && (
        <div
          role="listbox"
          className="
            absolute
            left-0
            right-0
            mt-2
            z-[100]
            overflow-hidden
            bg-white
            border border-slate-200
            rounded-xl
            shadow-xl
            shadow-slate-900/10
            py-1
            max-h-64
            overflow-y-auto
            animate-fade-in
          "
        >
          {options.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400">
              No hay opciones disponibles
            </div>
          ) : (
            options.map((o) => {
              const seleccionada =
                String(o.value) === String(value);

              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={seleccionada}
                  onClick={() => seleccionar(o)}
                  className={`
                    w-full
                    text-left
                    px-3
                    py-2.5
                    text-sm
                    transition-colors
                    duration-150
                    flex
                    items-center
                    justify-between
                    gap-3
                    cursor-pointer

                    ${
                      seleccionada
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }
                  `}
                >
                  <span className="truncate">
                    {o.label}
                  </span>

                  {seleccionada && (
                    <svg
                      className="w-4 h-4 shrink-0 text-blue-600"
                      aria-hidden="true"
                    >
                      <use href="/icons/icons.svg#check" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

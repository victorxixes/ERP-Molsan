import { useEffect, useId, useRef, useState } from "react";


export default function SelectSJ({
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar",
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();

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
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => String(option.value) === String(value));
    const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  // El foco inicial solo se calcula al abrir; no debe saltar al botón
  // seleccionado en cada render si el catálogo llega como array nuevo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={selectRef}
      className={`relative select-sj ${className}`}
    >
      {/* =====================================================
          BOTÓN PRINCIPAL
         ===================================================== */}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((actual) => !actual);
        }}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            else {
              const selectedIndex = options.findIndex((option) => String(option.value) === String(value));
              const start = selectedIndex >= 0 ? selectedIndex : activeIndex;
              const next = event.key === "ArrowDown"
                ? Math.min(options.length - 1, start + 1)
                : Math.max(0, start - 1);
              setActiveIndex(next);
              optionRefs.current[next]?.focus();
            }
          }
        }}
        className={`w-full
 min-h-[42px]
 
 
 
 px-3 py-2
 
 
 
 flex
 justify-between
 items-center
 gap-3
 
 
 

 ${
 disabled
 ? ""
 : ""
 }`}
      >
        <span className="min-w-0 truncate">
          {opcionSeleccionada?.label ?? placeholder}
        </span>

        <svg
          className={`w-4 h-4
 shrink-0
 
 
 
 ${open ? "" : ""}`}
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
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className="absolute
 left-0
 right-0
 mt-2
 z-[100]
 overflow-hidden
 
 
 
 
 
 py-1
 max-h-64
 overflow-y-auto"
        >
          {options.length === 0 ? (
            <div className="px-3 py-3">
              No hay opciones disponibles
            </div>
          ) : (
            options.map((o, optionIndex) => {
              const seleccionada =
                String(o.value) === String(value);

              return (
                <button
                  key={o.value}
                  ref={(element) => { optionRefs.current[optionIndex] = element; }}
                  type="button"
                  role="option"
                  tabIndex={activeIndex === optionIndex ? 0 : -1}
                  aria-selected={seleccionada}
                  onKeyDown={(event) => {
                    const currentIndex = optionIndex;
                    let nextIndex = currentIndex;
                    if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, currentIndex + 1);
                    else if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
                    else if (event.key === "Home") nextIndex = 0;
                    else if (event.key === "End") nextIndex = options.length - 1;
                    else if (event.key === "Escape") {
                      event.preventDefault();
                      setOpen(false);
                      triggerRef.current?.focus();
                      return;
                    } else return;
                    event.preventDefault();
                    setActiveIndex(nextIndex);
                    optionRefs.current[nextIndex]?.focus();
                  }}
                  onClick={() => seleccionar(o)}
                  className={`w-full
 
 px-3
 py-2.5
 
 
 
 flex
 items-center
 justify-between
 gap-3
 

 ${
 seleccionada
 ? ""
 : ""
 }`}
                >
                  <span className="truncate">
                    {o.label}
                  </span>

                  {seleccionada && (
                    <svg
                      className="w-4 h-4 shrink-0"
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

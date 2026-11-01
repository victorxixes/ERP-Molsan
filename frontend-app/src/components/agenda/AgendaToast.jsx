import { useEffect } from "react";
import { useAgendaStore } from "../../store/agendaStore";


/**
 * AgendaToast
 *
 * Notificaciones flotantes de Agenda.
 * - Auto-limpieza del resaltado
 * - Cierre automático
 * - Sin useMemo innecesario
 */

export default function AgendaToast() {
  const notificaciones = useAgendaStore(
    (s) => s.notificaciones
  );

  const limpiarResaltada =
    useAgendaStore(
      (s) => s.limpiarResaltada
    );

  // ==========================================================
  // AUTO-LIMPIEZA DEL RESALTADO
  // ==========================================================

  useEffect(() => {
    if (
      !Array.isArray(notificaciones) ||
      notificaciones.length === 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      limpiarResaltada();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [
    notificaciones,
    limpiarResaltada,
  ]);

  if (
    !Array.isArray(notificaciones) ||
    notificaciones.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="agenda-toast 
 fixed
 bottom-6
 right-6
 z-[200]
 space-y-3
 pointer-events-none
 w-[min(380px,calc(100vw-2rem))]"
      aria-live="polite"
      aria-atomic="true"
    >
      {notificaciones.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto
 flex
 items-start
 gap-3
 px-4
 py-3"
                  >
          {/* ICONO */}

          <div
            className="flex
 items-center
 justify-center
 w-8
 h-8
 
 
 
 shrink-0"
          >
            <svg
              className="w-4 h-4"
              aria-hidden="true"
            >
              <use href="/icons/icons.svg#calendar" />
            </svg>
          </div>

          {/* MENSAJE */}

          <div className="flex-1 min-w-0">
            <div>
              Agenda
            </div>

            <div className="mt-0.5 break-words">
              {n.msg}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

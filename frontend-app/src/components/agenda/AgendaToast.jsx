import { useEffect } from "react";
import { useAgendaStore } from "../../store/agendaStore";


/**
 * AgendaToast — SJ-2026
 *
 * Notificaciones flotantes de Agenda.
 * - Glass UI
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
      className="agenda-toast-premium 
        fixed
        bottom-6
        right-6
        z-[200]
        space-y-3
        pointer-events-none
        w-[min(380px,calc(100vw-2rem))]
      "
      aria-live="polite"
      aria-atomic="true"
    >
      {notificaciones.map((n) => (
        <div
          key={n.id}
          className="
            pointer-events-auto
            flex
            items-start
            gap-3
            px-4
            py-3
            rounded-xl
            shadow-xl
            bg-white
            border
            border-slate-200
            text-slate-700
            text-sm
            animate-[fadeIn_0.3s_ease,slideUp_0.3s_ease]
          "
          style={{
            animationFillMode: "both",
          }}
        >
          {/* ICONO */}

          <div
            className="
              flex
              items-center
              justify-center
              w-8
              h-8
              rounded-lg
              bg-blue-50
              text-blue-600
              shrink-0
            "
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
            <div className="font-semibold text-slate-800">
              Agenda
            </div>

            <div className="text-xs text-slate-500 mt-0.5 break-words">
              {n.msg}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

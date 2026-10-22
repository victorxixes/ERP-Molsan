import { useMemo } from "react";
import { useNotificacionesStore } from "../../store/notificacionesStore";
import "../../css/ComponentesOperativosPremium.css";

/**
 * NotificacionesBadge — SJ‑2026 Premium
 * Indicador de notificaciones internas.
 * - Glass‑UI
 * - Badge animado
 * - Sin re‑renders innecesarios
 */

export default function NotificacionesBadge() {
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);

  // Evita recalcular en cada render
  const count = useMemo(() => notificaciones.length, [notificaciones]);

  return (
    <div className="relative inline-flex items-center notificaciones-badge-premium" aria-label={count > 0 ? `${count} notificaciones sin revisar` : "Sin notificaciones pendientes"}>
      {/* Icono */}
      <span aria-hidden="true" className="material-icons text-white/80 drop-shadow">
        notifications
      </span>

      {/* Badge */}
      {count > 0 && (
        <span
          className="
            absolute -top-1 -right-1 bg-red-600 text-white text-xs
            px-1.5 py-0.5 rounded-full shadow-lg backdrop-blur-md
            border border-white/20 animate-[fadeIn_0.3s_ease]
          "
          role="status"
          aria-label={`${count} notificaciones sin revisar`}
          style={{ animationFillMode: "both" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

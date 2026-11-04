import { useMemo } from "react";
import { useNotificacionesStore } from "../../store/notificacionesStore";

/**
 * NotificacionesBadge
 * Indicador de notificaciones internas.
 * - Badge animado
 * - Sin re‑renders innecesarios
 */

export default function NotificacionesBadge() {
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);

  // Evita recalcular en cada render
  const count = useMemo(() => notificaciones.length, [notificaciones]);

  return (
    <div className="relative inline-flex items-center" aria-label={count > 0 ? `${count} notificaciones` : "Sin notificaciones"}>
      {/* Icono */}
      <span aria-hidden="true" className="material-icons drop-shadow">
        notifications
      </span>

      {/* Badge */}
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 
 px-1.5 py-0.5"
          role="status"
          aria-label={`${count} notificaciones`}
          
        >
          {count}
        </span>
      )}
    </div>
  );
}

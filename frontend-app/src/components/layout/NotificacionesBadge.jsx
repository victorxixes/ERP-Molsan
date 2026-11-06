import MolsanIcon from "../ui/MolsanIcon";
import { useMemo } from "react";
import { useNotificacionesStore } from "../../store/notificacionesStore";

/** Indicador compacto de notificaciones con iconografía corporativa MOLSAN. */
export default function NotificacionesBadge() {
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);
  const count = useMemo(() => notificaciones.length, [notificaciones]);

  return (
    <span
      className="relative inline-flex items-center notificaciones-badge-premium"
      aria-label={count > 0 ? `${count} notificaciones` : "Sin notificaciones"}
    >
      <MolsanIcon name="bell" size={18} bare />
      {count > 0 ? (
        <span
          className="absolute -right-2 -top-2 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full border border-white bg-[#B42318] px-1 text-[10px] font-bold leading-none text-white"
          role="status"
          aria-label={`${count} notificaciones sin leer`}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </span>
  );
}

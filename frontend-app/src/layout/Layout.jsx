import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../store/authStore";
import EmpleadoPerfilModal from "../components/SidebarPerfilModal";
import { useNotificacionesWS } from "../hooks/useNotificacionesWS";
import NotificacionesToast from "../components/notificaciones/NotificacionesToast";
import ProvisionesLauncher from "../components/expedientes/ProvisionesLauncher";

/** Layout principal de ERP-Molsan. Mantiene perfil, navegación,
 * WebSockets de empleado/notificaciones y activa la herramienta
 * de Provisiones solo dentro de la ficha de un expediente. */
export default function Layout() {
  const empleado = useAuthStore((s) => s.empleado);
  const perfilModal = useAuthStore((s) => s.perfilModal);
  const setPerfilModal = useAuthStore((s) => s.setPerfilModal);

  useNotificacionesWS(empleado?.id);

  useEffect(() => {
    if (!empleado?.id) return undefined;
    const token = localStorage.getItem("token");
    const base = String(import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");
    if (!token || !base) return undefined;

    let ws;
    try {
      ws = new WebSocket(`${base}/ws/empleados/${encodeURIComponent(empleado.id)}?token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.warn("WS Empleados: no se pudo iniciar la conexión.", err);
      return undefined;
    }

    ws.onopen = () => console.log("WS Empleados conectado");
    ws.onclose = () => console.log("WS Empleados cerrado");
    ws.onerror = () => console.warn("WS Empleados: error de conexión.");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.tipo && data.tipo !== "heartbeat") console.debug("WS Empleados evento:", data.tipo);
      } catch {
        // Se ignoran mensajes que no estén serializados en JSON.
      }
    };

    return () => {
      try { ws.close(); } catch { /* La conexión puede haberse cerrado previamente. */ }
    };
  }, [empleado?.id]);

  return (
    <div className="min-h-screen bg-[var(--erp-bg)] text-[var(--erp-text)]">
      {perfilModal && <EmpleadoPerfilModal id={perfilModal} onClose={() => setPerfilModal(null)} />}
      <Sidebar />
      <NotificacionesToast />
      <ProvisionesLauncher />
      <main className="relative min-h-[calc(100vh-70px)]">
        <div className="w-full px-4 py-6 lg:px-6">
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

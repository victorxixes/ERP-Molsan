import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

import EmpleadoPerfilModal from "../components/SidebarPerfilModal";

import { useNotificacionesWS } from "../hooks/useNotificacionesWS";
import NotificacionesToast from "../components/notificaciones/NotificacionesToast";


/**
 * ============================================================
 * LAYOUT PRINCIPAL — ERP SJ-2026
 * ============================================================
 *
 * Navegación superior en una única línea.
 *
 * Mantiene:
 *
 * - WebSocket empleados
 * - WebSocket notificaciones
 * - Perfil
 * - Notificaciones realtime
 * - Toast de notificaciones
 * - Outlet de React Router
 *
 * La navegación superior se gestiona desde Sidebar.jsx.
 * ============================================================
 */

export default function Layout() {

  const empleado = useAuthStore(
    (s) => s.empleado
  );

  const perfilModal = useAuthStore(
    (s) => s.perfilModal
  );

  const setPerfilModal = useAuthStore(
    (s) => s.setPerfilModal
  );


  // ============================================================
  // NOTIFICACIONES REALTIME
  // ============================================================

  useNotificacionesWS(
    empleado?.id
  );


  // ============================================================
  // WEBSOCKET GLOBAL DE EMPLEADOS
  // ============================================================

  useEffect(() => {

    if (!empleado?.id) {
      return;
    }

    const token =
      localStorage.getItem("token");


    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/ws/empleados/${empleado.id}?token=${token}`
    );


    ws.onopen = () => {

      console.log(
        "WS Empleados conectado"
      );

    };


    ws.onclose = () => {

      console.log(
        "WS Empleados cerrado"
      );

    };


    ws.onmessage = (event) => {

      try {

        const data =
          JSON.parse(
            event.data
          );

        console.log(
          "WS Empleados mensaje:",
          data
        );

        /*
         * Aquí puedes actualizar
         * estado global si lo necesitas.
         */

      } catch (err) {

        console.warn(
          "WS Empleados error parseando mensaje:",
          err
        );

      }

    };


    return () => {

      try {

        ws.close();

      } catch {}

    };

  }, [empleado?.id]);


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div
      className="
        min-h-screen
        bg-[var(--erp-bg)]
        text-[var(--erp-text)]
      "
    >

      {/* ======================================================
          MODAL PERFIL
          ====================================================== */}

      {perfilModal && (

        <EmpleadoPerfilModal
          id={perfilModal}
          onClose={() =>
            setPerfilModal(null)
          }
        />

      )}


      {/* ======================================================
          NAVEGACIÓN SUPERIOR
          ====================================================== */}

      <Sidebar />


      {/* ======================================================
          POPUP REALTIME
          ====================================================== */}

      <NotificacionesToast />


      {/* ======================================================
          CONTENIDO PRINCIPAL
          ====================================================== */}

      <main
        className="
          min-h-[calc(100vh-70px)]
          relative
        "
      >

        <div
          className="
            w-full
            px-4
            lg:px-6
            py-6
          "
        >

      <div
  className="
    w-full
  "
>
  <Outlet />
</div>

        </div>

      </main>

    </div>

  );
}

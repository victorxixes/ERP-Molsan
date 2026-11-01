import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../store/authStore";
import EmpleadoPerfilModal from "../components/SidebarPerfilModal";
import { useNotificacionesWS } from "../hooks/useNotificacionesWS";
import NotificacionesToast from "../components/notificaciones/NotificacionesToast";
import "../css/CancelagestUnified.css";

/** Layout principal de ERP-Molsan. Mantiene perfil, navegación,
 * canal de notificaciones. */
export default function Layout() {
  const empleado = useAuthStore((s) => s.empleado);
  const perfilModal = useAuthStore((s) => s.perfilModal);
  const setPerfilModal = useAuthStore((s) => s.setPerfilModal);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [cabeceraSubpagina, setCabeceraSubpagina] = useState(null);

  const rutasPrincipales = new Set([
    "/", "/dashboard", "/expedientes", "/provisiones-fondos", "/agenda",
    "/empleados", "/fichajes", "/control-fichajes", "/ctn", "/intranet",
    "/mensajes", "/mensajeria", "/mensajeria-gestion", "/informes",
    "/fusiones", "/auditoria", "/catalogos", "/herramientas/utilidades",
    "/seguridad", "/logs", "/maestros", "/paneltecnico", "/apoderagest",
    "/cancelagest", "/notargest", "/encargagest",
  ]);
  const esSubpagina = !rutasPrincipales.has(pathname);

  // Las rutas dentro de Layout pertenecen al ERP operativo de CancelaGest.
  // Los portales independientes (ApoderaGest, NotarGest y EncargaGest) no usan este Layout.
  // Seguridad, auditoría y panel técnico conservan su presentación especializada.
  const rutaCancelaGest = !/^\/(paneltecnico|seguridad|auditoria)(\/|$)/i.test(pathname);

  useEffect(() => {
    setCabeceraSubpagina(null);
    if (!esSubpagina) return undefined;
    const contenedor = document.querySelector(".erp-main-inner");
    if (!contenedor) return undefined;
    const localizarCabecera = () => {
      const encontrada = contenedor.querySelector(".molsan-page-header");
      setCabeceraSubpagina(encontrada || null);
    };
    localizarCabecera();
    const observador = new MutationObserver(localizarCabecera);
    observador.observe(contenedor, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [pathname, esSubpagina]);

  const volverSubpagina = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    const partes = pathname.split("/").filter(Boolean);
    navigate(partes.length > 1 ? `/${partes.slice(0, -1).join("/")}` : "/dashboard");
  };

  useNotificacionesWS(empleado?.id);

  return (
    <div className="erp-app-shell min-h-screen bg-[var(--erp-bg)] text-[var(--erp-text)]">
      {perfilModal && <EmpleadoPerfilModal id={perfilModal} onClose={() => setPerfilModal(null)} />}
      <Sidebar />
      <NotificacionesToast />
      <main className="erp-main-content relative min-h-[calc(100vh-70px)]">
        <div className="erp-main-inner w-full px-4 py-6 lg:px-6">
          <div className={`w-full${rutaCancelaGest ? " cg-unified-workspace" : ""}`}>
            <Outlet />
      {cabeceraSubpagina ? createPortal(
        <button type="button" className="molsan-page-back-button" onClick={volverSubpagina} aria-label="Volver a la página anterior">
          <span aria-hidden="true">←</span> Volver
        </button>,
        cabeceraSubpagina
      ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

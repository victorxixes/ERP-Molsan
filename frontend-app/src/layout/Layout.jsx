import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../store/authStore";
import EmpleadoPerfilModal from "../components/SidebarPerfilModal";
import { useNotificacionesWS } from "../hooks/useNotificacionesWS";
import NotificacionesToast from "../components/notificaciones/NotificacionesToast";

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
    "/empleados", "/fichajes", "/control-fichajes", "/ctn", "/intranet", "/herramientas",
    "/mensajes", "/mensajeria", "/mensajeria-gestion", "/informes",
    "/fusiones", "/auditoria", "/catalogos", "/herramientas/utilidades",
    "/seguridad", "/logs", "/maestros", "/paneltecnico", "/apoderagest",
    "/cancelagest", "/notargest", "/encargagest",
  ]);
  const esSubpagina = !rutasPrincipales.has(pathname);
  const esSubpaginaCatalogosUtilidades = esSubpagina && /^\/(?:catalogos|herramientas\/utilidades)(?:\/|$)/i.test(pathname);

  // Las rutas dentro de Layout pertenecen al ERP operativo de CancelaGest.
  // Los portales independientes (ApoderaGest, NotarGest y EncargaGest) no usan este Layout.
  // Seguridad, auditoría y panel técnico conservan su presentación especializada.
  const rutaCancelaGest = !/^\/(paneltecnico|seguridad|auditoria)(\/|$)/i.test(pathname);

  // Aplica la cabecera Glass Luxe también a las páginas principales que aún
  // conservan un <header> heredado. Solo inspecciona cabeceras estructurales
  // de primer nivel; nunca modifica cabeceras de tarjetas ni diálogos.
  useLayoutEffect(() => {
    const contenedor = document.querySelector(".erp-route-content");
    if (!contenedor) return undefined;
    let observador = null;
    let finalizado = false;
    const aplicar = () => {
      if (finalizado) return true;
      if (contenedor.querySelector(".molsan-page-header")) return true;
      const encontrada = contenedor.querySelector([
        ":scope > header",
        ":scope > main > header",
        ":scope > div > header",
        ":scope > section > header",
        ":scope > div > main > header",
        ":scope > main > div > header",
        ".herramienta-operativa-premium > header",
        ".herramientas-subpagina-premium > header",
      ].join(", "));
      if (!encontrada || encontrada.closest('[role="dialog"], [aria-modal="true"], .molsan-modal, .ng-modal')) return false;
      encontrada.classList.add("molsan-page-header", "molsan-page-header--legacy");
      return true;
    };
    if (!aplicar()) {
      observador = new MutationObserver(() => {
        if (aplicar()) observador?.disconnect();
      });
      observador.observe(contenedor, { childList: true, subtree: true });
      aplicar();
    }
    return () => {
      finalizado = true;
      observador?.disconnect();
    };
  }, [pathname]);


  useLayoutEffect(() => {
    setCabeceraSubpagina(null);
    if (!esSubpagina) return undefined;
    const contenedor = document.querySelector(".erp-main-inner");
    if (!contenedor) return undefined;

    let observador = null;
    let finalizado = false;
    const localizarCabecera = () => {
      if (finalizado) return true;
      const encontrada = contenedor.querySelector(".molsan-page-header");
      if (!encontrada) return false;

      const esControlVolver = (elemento) => {
        if (elemento.closest('[role="dialog"], [aria-modal="true"], .molsan-modal, [data-modal]')) return false;
        const texto = (elemento.textContent || "").trim();
        const aria = elemento.getAttribute("aria-label") || "";
        return /\bvolver\b|regresar/i.test(texto) || /\bvolver\b|regresar/i.test(aria);
      };
      const controlesVolver = Array.from(
        contenedor.querySelectorAll("button:not([data-layout-back-button]), a")
      ).filter(esControlVolver);

      // Todos los controles heredados se sustituyen por el botón común.
      // Así el destino es siempre la página principal del módulo, aunque
      // el botón anterior tuviera un handler que regresara a otra vista.
      controlesVolver.forEach((elemento) => {
        elemento.classList.add("molsan-page-back-legacy-hidden");
      });
      setCabeceraSubpagina(encontrada.querySelector('.molsan-page-header__actions') || encontrada);
      return true;
    };

    if (!localizarCabecera()) {
      observador = new MutationObserver(() => {
        if (localizarCabecera()) observador?.disconnect();
      });
      observador.observe(contenedor, { childList: true, subtree: true });
      // Cierra la pequeña ventana entre la primera consulta y observe().
      localizarCabecera();
    }

    return () => {
      finalizado = true;
      observador?.disconnect();
    };
  }, [pathname, esSubpagina]);

  const volverSubpagina = () => {
    const rutaPrincipal = Array.from(rutasPrincipales)
      .filter((ruta) => ruta !== "/" && (pathname === ruta || pathname.startsWith(`${ruta}/`)))
      .sort((a, b) => b.length - a.length)[0];
    navigate(rutaPrincipal || "/dashboard");
  };

  useNotificacionesWS(empleado?.id);

  return (
    <div className="erp-app-shell min-h-screen">
      {perfilModal && <EmpleadoPerfilModal id={perfilModal} onClose={() => setPerfilModal(null)} />}
      <Sidebar />
      <NotificacionesToast />
      <main className="erp-main-content relative min-h-[calc(100vh-70px)]">
        <div className={`erp-main-inner w-full${esSubpaginaCatalogosUtilidades ? " molsan-tools-subpage" : ""}`}>
          <div className={`erp-route-content w-full${rutaCancelaGest ? " cg-unified-workspace" : ""}`}>
<Outlet />
      {cabeceraSubpagina ? createPortal(
        <button type="button" data-layout-back-button="true" className="molsan-page-back-button" onClick={volverSubpagina} aria-label="Volver a la página anterior">
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

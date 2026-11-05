import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../store/authStore";
import EmpleadoPerfilModal from "../components/SidebarPerfilModal";
import { useNotificacionesWS } from "../hooks/useNotificacionesWS";
import NotificacionesToast from "../components/notificaciones/NotificacionesToast";

const RUTAS_PADRE_EXACTAS = {
  "/herramientas/utilidades/correspondencia-tipificada": "/catalogos",
  "/herramientas/importador-absis/postfirma": "/herramientas/importador-absis",
  "/seguridad/auditoria": "/auditoria",
  "/expedientes-demo-glass-luxe": "/expedientes",
  "/apoderagest/liquidaciones": "/apoderagest",
};

const RUTAS_PADRE_PREFIJOS = [
  ["/catalogos/", "/catalogos"],
  ["/herramientas/utilidades/", "/herramientas/utilidades"],
  ["/herramientas/municipios", "/catalogos"],
  ["/herramientas/entidades-bancarias", "/catalogos"],
  ["/herramientas/registros-propiedad", "/catalogos"],
  ["/herramientas/oficinas-liquidadoras", "/catalogos"],
  ["/herramientas/honorarios-gestoria", "/catalogos"],
  ["/herramientas/acciones-expediente", "/catalogos"],
  ["/herramientas/tipos-carga-hipotecaria", "/catalogos"],
  ["/herramientas/tipos-concepto-gastos", "/catalogos"],
  ["/herramientas/tipos-expediente", "/catalogos"],
  ["/herramientas/", "/herramientas"],
  ["/agenda/", "/agenda"],
  ["/expedientes/", "/expedientes"],
  ["/ctn/", "/ctn"],
  ["/empleados/", "/empleados"],
  ["/informes/", "/informes"],
  ["/encargagest/", "/encargagest"],
  ["/paneltecnico/", "/paneltecnico"],
  ["/seguridad/", "/seguridad"],
];

function obtenerRutaPrincipal(pathname) {
  if (RUTAS_PADRE_EXACTAS[pathname]) return RUTAS_PADRE_EXACTAS[pathname];
  const coincidencia = RUTAS_PADRE_PREFIJOS.find(([prefijo]) => pathname.startsWith(prefijo));
  if (coincidencia) return coincidencia[1];
  const partes = pathname.split("/").filter(Boolean);
  return partes.length > 1 ? "/" + partes.slice(0, -1).join("/") : "/dashboard";
}

/** Layout principal de ERP-Molsan. Mantiene perfil, navegación,
 * canal de notificaciones. */
export default function Layout() {
  const empleado = useAuthStore((s) => s.empleado);
  const perfilModal = useAuthStore((s) => s.perfilModal);
  const setPerfilModal = useAuthStore((s) => s.setPerfilModal);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [cabeceraSubpagina, setCabeceraSubpagina] = useState(null);
  const [tieneVolverPropio, setTieneVolverPropio] = useState(false);

  const rutasPrincipales = new Set([
    "/", "/dashboard", "/expedientes", "/provisiones-fondos", "/agenda",
    "/empleados", "/fichajes", "/control-fichajes", "/ctn", "/intranet",
    "/mensajes", "/mensajeria", "/mensajeria-gestion", "/informes",
    "/fusiones", "/auditoria", "/catalogos", "/herramientas", "/herramientas/utilidades",
    "/seguridad", "/logs", "/maestros", "/paneltecnico", "/apoderagest",
    "/cancelagest", "/notargest", "/encargagest",
  ]);
  const esSubpagina = !rutasPrincipales.has(pathname);
  const esSubpaginaCatalogosUtilidades = esSubpagina && /^\/(?:catalogos|herramientas\/utilidades)(?:\/|$)/i.test(pathname);

  // Las rutas dentro de Layout pertenecen al ERP operativo de CancelaGest.
  // Los portales independientes (ApoderaGest, NotarGest y EncargaGest) no usan este Layout.
  // Seguridad, auditoría y panel técnico conservan su presentación especializada.
  const rutaCancelaGest = !/^\/(paneltecnico|seguridad|auditoria)(\/|$)/i.test(pathname);

  useLayoutEffect(() => {
    setCabeceraSubpagina(null);
    setTieneVolverPropio(false);
    if (!esSubpagina) return undefined;
    const contenedor = document.querySelector(".erp-main-inner");
    if (!contenedor) return undefined;

    let observador = null;
    let finalizado = false;
    const localizarCabecera = () => {
      if (finalizado) return true;
      const ruta = contenedor.querySelector(".erp-route-content");
      const encontrada = ruta?.querySelector(".molsan-page-header:not(.molsan-page-back-fallback)") ||
        ruta?.querySelector([
          ":scope > header",
          ":scope > main > header",
          ":scope > div > header",
          ":scope > section > header",
          ":scope > div > main > header",
          ":scope > main > div > header",
          ".herramienta-operativa-premium > header",
          ".herramientas-subpagina-premium > header",
        ].join(", "));
      if (!encontrada) return false;
      if (!encontrada.classList.contains("molsan-page-header")) {
        encontrada.classList.add("molsan-page-header", "molsan-page-header--legacy");
      }

      const botonesVolverExistentes = Array.from(
        encontrada.querySelectorAll("button:not([data-layout-back-button]), a")
      ).filter((elemento) => {
        const texto = (elemento.textContent || "").trim();
        const aria = elemento.getAttribute("aria-label") || "";
        return /\bvolver\b|regresar/i.test(texto) || /\bvolver\b|regresar/i.test(aria);
      });

      // Sustituye cualquier botón de vuelta heredado por uno único y común.
      // Así todas las subpáginas regresan a la raíz del módulo, no al historial.
      botonesVolverExistentes.forEach((elemento) => {
        elemento.classList.add("molsan-page-back-replaced");
      });
      setTieneVolverPropio(false);
      setCabeceraSubpagina(encontrada);

      // El observador solo espera al primer pintado de la cabecera diferida.
      // Se desconecta al encontrarla para no reubicar el portal con cada cambio
      // de datos, tabla o tarjeta dentro de la subpágina.
      finalizado = true;
      observador?.disconnect();
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
    // Volver siempre al módulo principal, nunca a la pantalla anterior del historial.
    navigate(obtenerRutaPrincipal(pathname), { replace: true });
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
            {esSubpagina && !cabeceraSubpagina && !tieneVolverPropio ? (
        <header className="molsan-page-header molsan-page-back-fallback">
          <button type="button" className="molsan-page-back-button" onClick={volverSubpagina} aria-label="Volver a la página anterior"><span aria-hidden="true">←</span> Volver</button>
        </header>
      ) : null}
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

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../store/authStore";
import EmpleadoPerfilModal from "../components/SidebarPerfilModal";
import { useNotificacionesWS } from "../hooks/useNotificacionesWS";
import NotificacionesToast from "../components/notificaciones/NotificacionesToast";

const RUTAS_PADRE_SUBPAGINA = [
  [/^\/catalogos\/provisiones-fondos$/, "/catalogos"],
  [/^\/catalogos\//, "/catalogos"],
  [/^\/herramientas\/utilidades\/correspondencia-tipificada$/, "/catalogos"],
  [/^\/herramientas\/utilidades\//, "/herramientas/utilidades"],
  [/^\/herramientas\/(?:municipios|entidades-bancarias|registros-propiedad|oficinas-liquidadoras|honorarios-gestoria|acciones-expediente|tipos-carga-hipotecaria|tipos-concepto-gastos|tipos-expediente)$/, "/catalogos"],
  [/^\/herramientas\/importador-absis\/postfirma$/, "/herramientas/importador-absis"],
  [/^\/herramientas\/(?:importar-ctn|importador-absis|importaciones-datos|mantenimiento-tecnico)$/, "/herramientas"],
  [/^\/agenda\/(?:dia|semana|mes)$/, "/agenda"],
  [/^\/expedientes\/[^/]+$/, "/expedientes"],
  [/^\/expedientes-demo-glass-luxe$/, "/expedientes"],
  [/^\/ctn\/(?:listado|[^/]+)$/, "/ctn"],
  [/^\/empleados\/(?:listado|[^/]+)(?:\/editar)?$/, "/empleados"],
  [/^\/informes\/[^/]+$/, "/informes"],
  [/^\/apoderagest\/liquidaciones$/, "/apoderagest"],
  [/^\/encargagest\/(?:ctn|agenda|mensajes|intranet)$/, "/encargagest"],
  [/^\/paneltecnico\//, "/paneltecnico"],
  [/^\/seguridad\/auditoria$/, "/auditoria"],
  [/^\/seguridad\//, "/seguridad"],
];

function obtenerRutaPrincipal(pathname) {
  const coincidencia = RUTAS_PADRE_SUBPAGINA.find(([patron]) => patron.test(pathname));
  if (coincidencia) return coincidencia[1];
  const partes = pathname.split("/").filter(Boolean);
  return partes.length > 1 ? \`/\${partes.slice(0, -1).join("/")}\` : "/dashboard";
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
      const encontrada = contenedor.querySelector(".molsan-page-header:not(.molsan-page-back-fallback)");
      if (!encontrada) return false;

      const botonVolverExistente = Array.from(
        encontrada.querySelectorAll("button:not([data-layout-back-button]), a")
      ).find((elemento) => {
        const texto = (elemento.textContent || "").trim();
        const aria = elemento.getAttribute("aria-label") || "";
        return /\bvolver\b|regresar/i.test(texto) || /\bvolver\b|regresar/i.test(aria);
      });

      if (botonVolverExistente) {
        botonVolverExistente.classList.add("molsan-page-back-button");
        setTieneVolverPropio(true);
        setCabeceraSubpagina(null);
      } else {
        setTieneVolverPropio(false);
        setCabeceraSubpagina(encontrada);
      }

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

import MODULOS_ERP from "../config/modulos";
import MolsanIcon from "./ui/MolsanIcon";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";

import { puedeVerModulo } from "../utils/permisos";

import { useAuthStore } from "../store/authStore";
import { useMensajesStore } from "../store/mensajesStore";
import {
  useNotificacionesStore,
} from "../store/notificacionesStore";

import Notificaciones from "../pages/notificaciones/Notificaciones.jsx";
import SidebarPerfilModal from "./SidebarPerfilModal";


import "../css/LayoutPortalesPremium.css";
/**
 * ============================================================
 * ICONOS DE NAVEGACIÓN
 *
 * Se utilizan SVG internos para no depender de:
 *
 * /icons/icons.svg#...
 *
 * Esto evita que determinados módulos aparezcan sin icono
 * cuando el sprite no contiene un identificador concreto.
 * ============================================================
 */

/**
 * ============================================================
 * ICONO DE NAVEGACIÓN
 * ============================================================
 */

const NavIcon = ({ name }) => (
  <MolsanIcon name={name} size={27} className="molsan-nav-icon-3d" />
);


/**
 * ============================================================
 * ICONO PERFIL
 * ============================================================
 */

const ProfileIcon = () => <MolsanIcon name="person" size={18} bare />;


/**
 * ============================================================
 * ICONO SALIR
 * ============================================================
 */

const LogoutIcon = () => <MolsanIcon name="logout" size={18} bare />;


/**
 * ============================================================
 * ICONO NOTIFICACIONES
 * ============================================================
 */

const BellIcon = () => <MolsanIcon name="bell" size={18} bare />;


/**
 * ============================================================
 * ICONO CHEVRON
 * ============================================================
 */

const ChevronIcon = ({ open }) => <MolsanIcon name="chevronDown" size={14} bare className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />;


/**
 * ============================================================
 * BOTÓN DE NAVEGACIÓN
 * ============================================================
 */

const TopNavItem = ({
  to,
  label,
  icon,
  badge = 0,
  onNavigate,
}) => (
  <NavLink
    to={to}
    onClick={onNavigate}
    className={({ isActive }) =>
      `
      flex
      items-center
      gap-2
      px-3
      py-2
      rounded-xl
      whitespace-nowrap
      text-sm
      font-medium
      transition-all
      duration-200
      border
      flex-shrink-0

      ${
        isActive
          ? `
            bg-[#EAF2F8]
            text-[#064675]
            border-[#B9D7E6]
            shadow-sm
          `
          : `
            bg-white
            text-[var(--erp-text)]
            border-[var(--erp-border)]
            hover:bg-[var(--erp-primary-soft)]
            hover:text-[var(--erp-primary)]
            hover:border-[var(--erp-primary)]
          `
      }
      `
    }
  >
    <NavIcon name={icon} />

    <span>{label}</span>

    {badge > 0 && (
      <span
        className="
          min-w-[19px]
          h-[19px]
          px-1
          flex
          items-center
          justify-center
          rounded-full
          bg-red-500
          text-white
          text-[10px]
          font-bold
        "
      >
        {badge}
      </span>
    )}
  </NavLink>
);


/**
 * ============================================================
 * SIDEBAR
 *
 * Visualmente funciona como navegación superior.
 * ============================================================
 */

export default function Sidebar({ brandName = "CancelaGest", navigationItems = null, activeNavigationItem = "", onNavigationItemClick = null, onNotificationsClick = null, notificationBadge = null, onProfileClick = null, onLogoutClick = null, headerActions = null } = {}) {

  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Los portales de notarios externos mantienen su navegación aislada del ERP interno.
  const esPortalNotarialExterno = /^\/(?:notargest|encargagest)(?:-notarios|-notario|\/notario)(?:\/|$)/i.test(pathname);

  const empleado = useAuthStore(
    (s) => s.empleado
  );

  const rolSidebar = String(
    empleado?.rol?.nombre ||
    empleado?.rol_nombre ||
    (typeof empleado?.rol === "string" ? empleado.rol : "")
  ).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").trim().toLowerCase().replace(/\s+/g, " ");
  const rolesAdminSidebar = new Set([
    "admin", "administrador", "administradora", "superadmin", "super admin",
    "superadministrador", "super administradora", "superuser", "super usuario",
    "superusuario", "administrador general",
  ]);
  const esAdminSidebar =
    empleado?.es_admin === true ||
    empleado?.is_admin === true ||
    Number(empleado?.rol_id ?? empleado?.rol?.id) === 0 ||
    String(empleado?.usuario || "").trim().toLowerCase() === "admin" ||
    rolesAdminSidebar.has(rolSidebar);
  const modulosVisiblesSidebar = [
    ...(Array.isArray(empleado?.modulos_visibles_list) ? empleado.modulos_visibles_list : []),
    ...(Array.isArray(empleado?.modulos_visibles) ? empleado.modulos_visibles : []),
  ].map((v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase());
  const tieneControlFichajesVisible = modulosVisiblesSidebar.includes("control-fichajes");

  const perfilModal = useAuthStore((s) => s.perfilModal);
  const setPerfilModal = useAuthStore((s) => s.setPerfilModal);

  const logout = useAuthStore(
    (s) => s.logout
  );

  const manejarCerrarSesion = () => {
    if (typeof onLogoutClick === "function") {
      onLogoutClick();
      return;
    }

    logout();
    navigate("/login", { replace: true });
  };

  const mensajesNoLeidos = useMensajesStore(
    (s) => s.noLeidosTotal || 0
  );

  const unreadCount = useNotificacionesStore(
    (s) => s.unreadCount || 0
  );

  const [masAbierto, setMasAbierto] =
    useState(false);

  const [notificacionesAbiertas, setNotificacionesAbiertas] =
    useState(false);

  const masRef = useRef(null);
  const masMenuRef = useRef(null);
  const [masPosicion, setMasPosicion] = useState(null);


  /**
   * ==========================================================
   * USUARIO SEGURO
   * ==========================================================
   */

  const safeUser = useMemo(
    () =>
      empleado || {
        nombre: "Usuario",
        foto: "/icons/user-default.png",
        id: 0,
      },
    [empleado]
  );


  /**
   * ==========================================================
   * CERRAR MENÚ MÁS AL HACER CLICK FUERA
   * ==========================================================
   */

  useEffect(() => {

    const handleClickOutside = (event) => {

      const clicEnAncla = masRef.current?.contains(event.target);
      const clicEnMenu = masMenuRef.current?.contains(event.target);
      if (!clicEnAncla && !clicEnMenu) {
        setMasAbierto(false);
      }

    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  /**
   * El menú "Más" se pinta en el body para que no quede recortado
   * por el scroll horizontal del navegador superior.
   */
  useEffect(() => {
    if (!masAbierto) return undefined;

    const actualizarPosicion = () => {
      const boton = masRef.current?.querySelector("button");
      if (!boton) return;

      const rect = boton.getBoundingClientRect();
      const ancho = Math.min(270, window.innerWidth - 24);
      const altoEstimado = Math.min(430, window.innerHeight - 24);
      const left = Math.max(12, Math.min(rect.right - ancho, window.innerWidth - ancho - 12));
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - altoEstimado - 12));

      setMasPosicion({ top, left, ancho });
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setMasAbierto(false);
    };

    actualizarPosicion();
    window.addEventListener("resize", actualizarPosicion);
    window.addEventListener("scroll", actualizarPosicion, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", actualizarPosicion);
      window.removeEventListener("scroll", actualizarPosicion, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [masAbierto]);


  /**
   * ==========================================================
   * ESC — CERRAR MODAL NOTIFICACIONES
   * ==========================================================
   */

  useEffect(() => {

    if (!notificacionesAbiertas) {
      return;
    }

    const handleKeyDown = (
      event
    ) => {

      if (
        event.key === "Escape"
      ) {
        setNotificacionesAbiertas(
          false
        );
      }

    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

    };

  }, [
    notificacionesAbiertas,
  ]);


  /**
   * ==========================================================
   * MÓDULOS PRINCIPALES
   *
   * IMPORTANTE:
   *
   * NOTIFICACIONES YA NO ES UN MÓDULO
   * DE NAVEGACIÓN.
   *
   * SE ABRE DESDE LA CAMPANA.
   * ==========================================================
   */

  const modulosPrincipales = [

    {
      key: "dashboard",
      to: "/dashboard",
      label: "Dashboard",
      icon: "home",
    },
    
    {
      key: "expedientes",
      to: "/expedientes",
      label: "Expedientes",
      icon: "folder",
    },

    {
      key: "agenda",
      to: "/agenda",
      label: "Agenda",
      icon: "calendar",
    },

    {
      key: "empleados",
      to: "/empleados",
      label: "Empleados",
      icon: "user-group",
    },

    {
      key: "ctn",
      to: "/ctn",
      label: "CTN",
      icon: "globe",
    },

    {
      key: "intranet",
      to: "/intranet",
      label: "Intranet",
      icon: "globe",
    },

    {
      key: "mensajes",
      to: "/mensajes",
      label: "Mensajes",
      icon: "chat",
      badge: mensajesNoLeidos,
    },

    {
      key: "fusiones",
      to: "/fusiones",
      label: "Fusiones",
      icon: "fusion",
    },

  ];


  /**
   * ==========================================================
   * MÓDULOS SECUNDARIOS
   * ==========================================================
   */

  const modulosSecundarios = [

    {
      key: "auditoria",
      to: "/auditoria",
      label: "Auditoría",
      icon: "chart",
    },

    {
      key: "mensajeria",
      to: "/mensajeria",
      label: "Mensajería Molsan",
      icon: "truck",
    },

    {
      key: "informes",
      to: "/informes",
      label: "Informes",
      icon: "chart",
    },

    {
      key: "provisiones-fondos",
      permiso: "expedientes",
      to: "/provisiones-fondos",
      label: "Provisiones",
      icon: "clipboard",
    },

    {
      key: "mantenimiento-tecnico",
      permiso: "utilidades",
      to: "/herramientas/mantenimiento-tecnico",
      label: "Mantenimiento técnico",
      icon: "settings",
    },

    {
      key: "seguridad",
      to: "/seguridad",
      label: "Seguridad",
      icon: "shield",
    },

    {
      key: "logs",
      to: "/logs",
      label: "Logs",
      icon: "clipboard",
    },

    {
      key: "maestros",
      to: "/maestros",
      label: "Maestros",
      icon: "database",
    },

    {
      key: "panel-tecnico",
      to: "/paneltecnico",
      label: "Panel técnico",
      icon: "settings",
    },

    {
      key: "apoderagest",
      to: "/apoderagest",
      label: "ApoderaGest",
      icon: "activity",
    },

    {
      key: "cancelagest",
      to: "/cancelagest",
      label: "CancelaGest",
      icon: "folder",
    },

    {
      key: "notargest",
      to: "/notargest",
      label: "NotarGest",
      icon: "globe",
    },

    {
      key: "encargagest",
      to: "/encargagest",
      label: "EncargaGest",
      icon: "clipboard",
    },

  ];


  /**
   * El catálogo central es la fuente de verdad para etiquetas, rutas e iconos.
   * Se conservan los metadatos locales (p. ej. permiso alternativo y contador)
   * solo para excepciones operativas que no forman parte del catálogo general.
   */
  const aplicarCatalogoCentral = (items) => items.map((item) => {
    const central = MODULOS_ERP.find((modulo) => modulo.key === item.key && modulo.route);
    if (!central) return item;
    return {
      ...item,
      to: central.route,
      label: central.label,
      icon: ({
        "user-group": "user-group",
        "file-check": "folder",
        briefcase: "activity",
        landmark: "globe",
        "clipboard-list": "clipboard",
        clock: "clock",
        settings: "settings",
      })[central.icon] || central.icon,
    };
  });

  const navegacionPrincipalCatalogo = aplicarCatalogoCentral(modulosPrincipales);
  const navegacionSecundariaCatalogo = aplicarCatalogoCentral(modulosSecundarios);

  /**
   * ==========================================================
   * FILTRADO POR PERMISOS
   * ==========================================================
   */

  const visiblesPrincipales = useMemo(
    () =>
      navegacionPrincipalCatalogo.filter((modulo) => {
        if (esAdminSidebar && modulo.key === "fichajes") return false;
        if (modulo.key === "control-fichajes" && !tieneControlFichajesVisible) return false;
        return puedeVerModulo(modulo.permiso || modulo.key);
      }),
    [
      empleado,
      mensajesNoLeidos,
    ]
  );


  const visiblesSecundarios = useMemo(
    () =>
      navegacionSecundariaCatalogo.filter((modulo) => {
        if (esAdminSidebar && modulo.key === "fichajes") return false;
        if (modulo.key === "control-fichajes" && !tieneControlFichajesVisible) return false;
        return puedeVerModulo(modulo.permiso || modulo.key);
      }),
    [
      empleado,
    ]
  );

  const normalizarModulo = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");

  // Accesos directos que deben permanecer visibles en cada módulo.
  // El filtrado de visiblesSecundarios conserva los permisos del empleado.
  const modulosFijados = useMemo(() => {
    const accesosPorMarca = {
      cancelagest: ["provisiones-fondos"],
      apoderagest: ["cancelagest"],
    };
    const claves = accesosPorMarca[normalizarModulo(brandName)] || [];
    if (!claves.length) return [];

    const clavesFijadas = new Set(claves);
    return visiblesSecundarios.filter((modulo) => clavesFijadas.has(modulo.key));
  }, [visiblesSecundarios, brandName]);

  // No repetir en «Más» accesos que ya estén en la barra ni los fijados.
  const modulosMas = useMemo(() => {
    const elementosEnBarra = Array.isArray(navigationItems) ? navigationItems : [];
    const clavesFijadas = new Set(modulosFijados.map((modulo) => modulo.key));

    return visiblesSecundarios.filter((modulo) => {
      if (normalizarModulo(modulo.label) === normalizarModulo(brandName)) return false;
      if (clavesFijadas.has(modulo.key)) return false;

      const rutaModulo = normalizarModulo(modulo.to || modulo.route).replace(/\/$/, "");
      return !elementosEnBarra.some((item) =>
        normalizarModulo(item?.key) === normalizarModulo(modulo.key) ||
        normalizarModulo(item?.label) === normalizarModulo(modulo.label) ||
        normalizarModulo(item?.to || item?.route).replace(/\/$/, "") === rutaModulo
      );
    });
  }, [visiblesSecundarios, navigationItems, brandName, modulosFijados]);

  // Deduplicar accesos fijados contra todas las fuentes de navegación.
  // Antes se renderizaban por separado y una misma ruta podía aparecer dos veces.
  const modulosFijadosUnicos = useMemo(() => {
    const yaPintados = [
      ...(Array.isArray(navigationItems) ? navigationItems : []),
      ...visiblesPrincipales,
    ];
    const claves = new Set(yaPintados.flatMap((item) => [
      normalizarModulo(item?.key),
      normalizarModulo(item?.label),
      normalizarModulo(item?.to || item?.route),
    ]).filter(Boolean));
    return modulosFijados.filter((item) => ![
      normalizarModulo(item?.key),
      normalizarModulo(item?.label),
      normalizarModulo(item?.to || item?.route),
    ].some((clave) => clave && claves.has(clave)));
  }, [navigationItems, visiblesPrincipales, modulosFijados]);

  // Separamos las aplicaciones propias de espacios de trabajo de los módulos técnicos.
  const CLAVES_ESPACIOS_TRABAJO = new Set([
    "apoderagest", "cancelagest", "notargest", "encargagest",
    "mensajeria-gestion", "notargestweb", "encargagestweb", "control-fichajes",
  ]);

  // Accesos frecuentes junto a Utilidades; no forman parte del desplegable de espacios.
  const accesosDirectosUtilidades = [
    { key: "fichajes", to: "/fichajes", label: "Fichajes", icon: "clock", directRoute: true },
    { key: "mensajeria", to: "/mensajeria", label: "Mensajería", icon: "truck", directRoute: true },
  ].filter((item) => !(esAdminSidebar && item.key === "fichajes") && puedeVerModulo(item.key));
  const crearListaDropdown = (tipo) => {
    if (esPortalNotarialExterno) return [];
    // Utilidades y Catálogos deben vivir exclusivamente en el desplegable Técnicos,
    // aunque el layout que invoca Sidebar todavía los incluya en navigationItems.
    const navigationItemsSinTecnicos = (Array.isArray(navigationItems) ? navigationItems : []).filter((item) => {
      const clave = normalizarModulo(item?.key);
      const etiqueta = normalizarModulo(item?.label);
      const ruta = String(item?.to || item?.route || "").replace(/\/$/, "").toLocaleLowerCase("es");
      if (esAdminSidebar && (clave === "fichajes" || ruta === "/fichajes")) return false;
      if ((clave === "control-fichajes" || ruta === "/control-fichajes") && !tieneControlFichajesVisible) return false;
      return !["utilidades", "catalogos"].includes(clave) &&
        !["utilidades", "catalogos"].includes(etiqueta) &&
        !["/herramientas/utilidades", "/catalogos"].includes(ruta);
    });
    const visibles = [
      ...navigationItemsSinTecnicos,
      ...visiblesPrincipales.filter((item) => !["utilidades", "catalogos"].includes(normalizarModulo(item?.key))),
      ...modulosFijadosUnicos,
      ...accesosDirectosUtilidades,
    ];
    const rutaNormalizada = (ruta) => String(ruta || "").split("?")[0].replace(/\/$/, "").toLocaleLowerCase("es");
    const rutasVisibles = new Set(visibles.map((item) => rutaNormalizada(item?.to || item?.route)).filter(Boolean));
    const clavesVisibles = new Set(visibles.flatMap((item) => [
      normalizarModulo(item?.key), normalizarModulo(item?.label),
    ]).filter(Boolean));
    const rutaActual = rutaNormalizada(pathname);
    return MODULOS_ERP.filter((modulo) => {
      if (!modulo.route || modulo.key === "notificaciones" || !puedeVerModulo(modulo.permiso || modulo.key)) return false;
      const esEspacio = CLAVES_ESPACIOS_TRABAJO.has(modulo.key);
      // Fichajes es un acceso directo junto a Utilidades; solo su gestión administrativa va en Espacios de trabajo.
      if (modulo.key === "fichajes" || modulo.key === "mensajeria") return false;
      if (tipo === "espacios" ? !esEspacio : esEspacio) return false;
      const ruta = rutaNormalizada(modulo.route);
      if (rutaActual === ruta || rutaActual.startsWith(`${ruta}/`)) return false;
      // No repetir en los desplegables módulos que ya aparecen en el sidebar.
      if (rutasVisibles.has(ruta) || clavesVisibles.has(normalizarModulo(modulo.key)) ||
          clavesVisibles.has(normalizarModulo(modulo.label))) return false;
      return true;
    }).map((modulo) => ({
      key: modulo.key, to: modulo.route, label: modulo.label,
      // Los iconos del catálogo central se renderizan directamente.
      // Solo traducimos los dos nombres heredados que aún no tienen dibujo propio.
      icon: ({
        package: "truck",
        wrench: "settings",
      })[modulo.icon] || modulo.icon,
    })).filter((modulo, index, lista) => lista.findIndex((otro) => otro.key === modulo.key) === index);
  };

  const espaciosTrabajoDropdown = useMemo(
    () => crearListaDropdown("espacios"),
    [empleado, esPortalNotarialExterno, navigationItems, visiblesPrincipales, modulosFijadosUnicos, pathname]
  );
  const modulosTecnicosDropdown = useMemo(
    () => crearListaDropdown("tecnicos"),
    [empleado, esPortalNotarialExterno, navigationItems, visiblesPrincipales, modulosFijadosUnicos, pathname]
  );
  const [menuSidebarAbierto, setMenuSidebarAbierto] = useState(null);
  const [menuSidebarPosicion, setMenuSidebarPosicion] = useState(null);
  const menuSidebarBotonesRef = useRef({});
  const menuSidebarMenuRef = useRef(null);

  useEffect(() => {
    const cerrarFuera = (event) => {
      if (!menuSidebarBotonesRef.current[menuSidebarAbierto]?.contains(event.target) &&
          !menuSidebarMenuRef.current?.contains(event.target)) setMenuSidebarAbierto(null);
    };
    document.addEventListener("mousedown", cerrarFuera);
    return () => document.removeEventListener("mousedown", cerrarFuera);
  }, [menuSidebarAbierto]);

  useEffect(() => {
    if (!menuSidebarAbierto) {
      setMenuSidebarPosicion(null);
      return undefined;
    }
    const actualizarPosicion = () => {
      const boton = menuSidebarBotonesRef.current[menuSidebarAbierto]?.querySelector("button");
      if (!boton) return;
      const rect = boton.getBoundingClientRect();
      const ancho = Math.min(260, window.innerWidth - 24);
      const alto = Math.min(380, window.innerHeight - 24);
      setMenuSidebarPosicion({
        top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - alto - 12)),
        left: Math.max(12, Math.min(rect.right - ancho, window.innerWidth - ancho - 12)),
        ancho,
      });
    };
    const cerrarConEscape = (event) => { if (event.key === "Escape") setMenuSidebarAbierto(null); };
    actualizarPosicion();
    window.addEventListener("resize", actualizarPosicion);
    window.addEventListener("scroll", actualizarPosicion, true);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("resize", actualizarPosicion);
      window.removeEventListener("scroll", actualizarPosicion, true);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [menuSidebarAbierto]);

  const menuSidebarItems = menuSidebarAbierto === "espacios" ? espaciosTrabajoDropdown : modulosTecnicosDropdown;
  const crearBotonesDropdown = () => ([
    ...(espaciosTrabajoDropdown.length ? [{ key: "espacios-trabajo", label: "Espacios", icon: "folder", menu: "espacios" }] : []),
    ...(modulosTecnicosDropdown.length ? [{ key: "modulos-tecnicos", label: "Técnicos", icon: "settings", menu: "tecnicos" }] : []),
  ]);

  const navigationItemsConModulos = useMemo(() => {
    if (!Array.isArray(navigationItems)) return null;
    const clavesNavegacion = new Set();
    const sinDuplicados = navigationItems.filter((item) => {
      if (item?.key === "modulos" || item?.key === "notificaciones" || ["utilidades", "catalogos"].includes(normalizarModulo(item?.key)) || ["/herramientas/utilidades", "/catalogos"].includes(String(item?.to || item?.route || "").replace(/\/$/, "").toLocaleLowerCase("es")) || ["utilidades", "catalogos", "notificaciones"].includes(normalizarModulo(item?.label)) || ["modulos", "espacios", "espacios de trabajo", "tecnicos", "modulos mas tecnicos"].includes(normalizarModulo(item?.label))) return false;
      const identificadores = [normalizarModulo(item?.key), normalizarModulo(item?.label), normalizarModulo(item?.to || item?.route)].filter(Boolean);
      if (identificadores.some((clave) => clavesNavegacion.has(clave))) return false;
      identificadores.forEach((clave) => clavesNavegacion.add(clave));
      return true;
    });
    const directos = accesosDirectosUtilidades.filter((item) => {
      const ruta = item.to.replace(/\/$/, "").toLocaleLowerCase("es");
      return !sinDuplicados.some((existente) =>
        normalizarModulo(existente?.key) === normalizarModulo(item.key) ||
        String(existente?.to || existente?.route || "").replace(/\/$/, "").toLocaleLowerCase("es") === ruta
      );
    });
    const indiceUtilidades = sinDuplicados.findIndex((item) =>
      normalizarModulo(item?.key) === "utilidades" || normalizarModulo(item?.label) === "utilidades"
    );
    sinDuplicados.splice(indiceUtilidades >= 0 ? indiceUtilidades + 1 : sinDuplicados.length, 0, ...directos);
    sinDuplicados.push(...crearBotonesDropdown());
    return sinDuplicados;
  }, [navigationItems, espaciosTrabajoDropdown, modulosTecnicosDropdown, empleado]);

  const mostrarBotonMas = modulosMas.length > 0 &&
    !["apoderagest", "notargest", "encargagest"].includes(normalizarModulo(brandName));


  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (

    <>

      <header
        className="
          mol-sidebar-premium
          w-full
          bg-[var(--erp-surface)]
          border-b
          border-[var(--erp-border)]
          shadow-sm
          relative
          z-50
        "
      >

        <div
          className={`
            w-full
            max-w-none
            mx-auto
            px-3
            lg:px-4
            py-2
            flex
            items-center
            gap-3
            min-w-0
            ${headerActions ? "flex-wrap" : ""}
          `}
        >

          {/* ====================================================
              MARCA
              ==================================================== */}

          <div
            className="
              flex
              items-center
              gap-3
              flex-shrink-0
            "
          >

            <div
              className="
                w-9
                h-9
                rounded-xl
                bg-white
                flex
                items-center
                justify-center
                overflow-hidden
                flex-shrink-0
              "
            >

              <img
                src="/img/logo.jpg"
                alt={brandName}
                className="
                  w-full
                  h-full
                  object-contain
                "
              />

            </div>


            <div className="hidden lg:block">

              <div
                className="
                  text-sm
                  font-bold
                  text-[var(--erp-text)]
                  leading-tight
                "
              >
                {brandName}
              </div>

              <div
                className="
                  text-[11px]
                  text-[var(--erp-text-soft)]
                  leading-tight
                "
              >
                Gestión empresarial
              </div>

            </div>

          </div>


          {/* ====================================================
              NAVEGACIÓN
              ==================================================== */}

          <nav
            className={`
              flex
              items-center
              gap-1.5
              flex-1
              min-w-0
              ${navigationItems ? "flex-nowrap overflow-x-auto overflow-y-visible" : "overflow-x-auto overflow-y-visible"}
              ${headerActions && Array.isArray(navigationItems) && navigationItems.length === 0 ? "hidden" : ""}
              pb-0.5
            `}
          >

            {/* ==================================================
                MÓDULOS PRINCIPALES
                ================================================== */}

            {navigationItemsConModulos
              ? navigationItemsConModulos.map((item) => {
                  const esMenu = item.menu === "espacios" || item.menu === "tecnicos";
                  const abierto = esMenu && menuSidebarAbierto === item.menu;
                  return (
                    <div key={item.key} className="relative flex-shrink-0" ref={(elemento) => { if (esMenu) menuSidebarBotonesRef.current[item.menu] = elemento; }}>
                      <button type="button"
                        onClick={() => {
                          if (esMenu) setMenuSidebarAbierto((actual) => actual === item.menu ? null : item.menu);
                          else if (item.directRoute) navigate(item.to);
                          else onNavigationItemClick?.(item.label);
                        }}
                        aria-haspopup={esMenu ? "menu" : undefined} aria-expanded={esMenu ? abierto : undefined}
                        aria-current={activeNavigationItem === item.label ? "page" : undefined}
                        className={`flex items-center gap-1.5 whitespace-nowrap font-medium transition-all duration-200 border flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[12px] ${(item.directRoute && pathname.replace(/\/$/, "") === item.to) || activeNavigationItem === item.label ? "bg-[#EAF2F8] text-[#064675] border-[#B9D7E6] shadow-sm" : abierto ? "bg-transparent text-[var(--erp-text)] border-[var(--erp-primary)]" : "bg-white text-[var(--erp-text)] border-[var(--erp-border)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)] hover:border-[var(--erp-primary)]"} ${item.attention ? "ng-boton-firmas-urgentes ng-urgencias-activas" : ""}`}>
                        <NavIcon name={item.icon} /><span>{item.label}</span>
                        {esMenu && <ChevronIcon open={abierto} />}
                        {(item.badge > 0 || (item.label === "Mensajes" && mensajesNoLeidos > 0)) ? <span className={item.label === "Mensajes" ? "min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold" : "min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] text-[10px] font-bold"}>{item.label === "Mensajes" ? mensajesNoLeidos : item.badge}</span> : null}
                      </button>
                      {abierto && menuSidebarPosicion && createPortal(
                        <div ref={menuSidebarMenuRef} role="menu" style={{ position: "fixed", top: menuSidebarPosicion.top, left: menuSidebarPosicion.left, width: menuSidebarPosicion.ancho, zIndex: 9999 }} className="max-h-[min(70vh,380px)] overflow-y-auto rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2 shadow-2xl">
                          {menuSidebarItems.map((modulo) => <NavLink key={modulo.key} to={modulo.to} onClick={() => setMenuSidebarAbierto(null)} role="menuitem" className={({ isActive }) => `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? "bg-[#EAF2F8] text-[#064675] border border-[#B9D7E6]" : "text-[var(--erp-text)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)]"}`}><NavIcon name={modulo.icon} /><span>{modulo.label}</span></NavLink>)}
                        </div>, document.body
                      )}
                    </div>
                  );
                })
              : visiblesPrincipales.map((modulo) => <TopNavItem key={modulo.key} to={modulo.to} label={modulo.label} icon={modulo.icon} badge={modulo.badge || 0} />)}

            {!navigationItemsConModulos && modulosFijadosUnicos.map((modulo) => <TopNavItem key={modulo.key} to={modulo.to} label={modulo.label} icon={modulo.icon} badge={modulo.badge || 0} />)}
            {!navigationItemsConModulos && accesosDirectosUtilidades
              .filter((item) => ![...visiblesPrincipales, ...modulosFijadosUnicos].some((visible) => visible.key === item.key || visible.to === item.to))
              .map((item) => <TopNavItem key={item.key} to={item.to} label={item.label} icon={item.icon} />)}

            {!navigationItems && crearBotonesDropdown().map((item) => {
              const items = item.menu === "espacios" ? espaciosTrabajoDropdown : modulosTecnicosDropdown;
              const abierto = menuSidebarAbierto === item.menu;
              return <div key={item.key} className="relative flex-shrink-0" ref={(elemento) => { menuSidebarBotonesRef.current[item.menu] = elemento; }}>
                <button type="button" onClick={() => setMenuSidebarAbierto((actual) => actual === item.menu ? null : item.menu)} aria-haspopup="menu" aria-expanded={abierto}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-all duration-200 border ${abierto ? "bg-transparent text-[var(--erp-text)] border-[var(--erp-primary)]" : "bg-white text-[var(--erp-text)] border-[var(--erp-border)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)] hover:border-[var(--erp-primary)]"}`}>
                  <NavIcon name={item.icon} /><span>{item.label}</span><ChevronIcon open={abierto} />
                </button>
                {abierto && menuSidebarPosicion && createPortal(<div ref={menuSidebarMenuRef} role="menu" style={{ position: "fixed", top: menuSidebarPosicion.top, left: menuSidebarPosicion.left, width: menuSidebarPosicion.ancho, zIndex: 9999 }} className="max-h-[min(70vh,380px)] overflow-y-auto rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2 shadow-2xl">
                  {items.map((modulo) => <NavLink key={modulo.key} to={modulo.to} onClick={() => setMenuSidebarAbierto(null)} role="menuitem" className={({ isActive }) => `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? "bg-[var(--erp-primary)] text-white" : "text-[var(--erp-text)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)]"}`}><NavIcon name={modulo.icon} /><span>{modulo.label}</span></NavLink>)}
                </div>, document.body)}
              </div>;
            })}


          </nav>


          {/* ====================================================
              ACCIONES DERECHA
              ==================================================== */}

          <div
            className="
              flex
              items-center
              gap-1.5
              flex-shrink-0
              pl-2
              border-l
              border-[var(--erp-border)]
            "
          >

            {headerActions ? (
              <div className="molsan-sidebar-header-actions flex items-center gap-2 pr-2">
                {headerActions}
              </div>
            ) : null}

            {/* ==================================================
                CAMPANA — ABRIR NOTIFICACIONES
                ================================================== */}

            <button
              type="button"
              title="Notificaciones"
              aria-label="Abrir notificaciones"
              aria-haspopup="dialog"
              aria-expanded={
                notificacionesAbiertas
              }
              onClick={() => {
                if (onNotificationsClick) onNotificationsClick();
                else setNotificacionesAbiertas(true);
              }}
              className="
                relative
                w-9
                h-9
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-white
                text-[var(--erp-text)]
                flex
                items-center
                justify-center
                hover:bg-[var(--erp-primary-soft)]
                hover:text-[var(--erp-primary)]
                hover:border-[var(--erp-primary)]
                transition
                active:scale-[0.96]
              "
            >

              <BellIcon />

              {(notificationBadge ?? unreadCount) > 0 && (

                <span
                  className="
                    absolute
                    -top-1
                    -right-1
                    min-w-[17px]
                    h-[17px]
                    px-1
                    rounded-full
                    bg-red-500
                    text-white
                    text-[9px]
                    font-bold
                    flex
                    items-center
                    justify-center
                    border-2
                    border-[var(--erp-surface)]
                  "
                >
                  {notificationBadge ?? unreadCount}
                </span>

              )}

            </button>


            {/* ==================================================
                PERFIL
                ================================================== */}

            <button
              type="button"
              onClick={() => {
                if (onProfileClick) onProfileClick();
                else setPerfilModal(safeUser.id);
              }}
              title="Mi perfil"
              className="
                w-9
                h-9
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-white
                text-[var(--erp-text)]
                flex
                items-center
                justify-center
                hover:bg-[var(--erp-primary-soft)]
                hover:text-[var(--erp-primary)]
                hover:border-[var(--erp-primary)]
                transition
                active:scale-[0.96]
              "
            >

              <ProfileIcon />

            </button>


            {/* ==================================================
                CERRAR SESIÓN
                ================================================== */}

            <button
              type="button"
              onClick={manejarCerrarSesion}
              title="Cerrar sesión"
              className="
                w-9
                h-9
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-white
                text-red-500
                flex
                items-center
                justify-center
                hover:bg-red-50
                hover:border-red-200
                transition
                active:scale-[0.96]
              "
            >

              <LogoutIcon />

            </button>

          </div>

        </div>

      </header>




      {/* ========================================================
          MODAL NOTIFICACIONES
      ======================================================== */}

      {perfilModal && !onProfileClick && (
        <SidebarPerfilModal
          id={perfilModal}
          onClose={() => setPerfilModal(null)}
        />
      )}

      {notificacionesAbiertas && !onNotificationsClick && (

        <div
          className="
            fixed
            inset-0
            z-[1000]
            flex
            items-start
            justify-center
            px-4
            pt-20
            sm:pt-24
            bg-slate-950/35
            backdrop-blur-[2px]
          "
          role="dialog"
          aria-modal="true"
          aria-label="Notificaciones"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setNotificacionesAbiertas(
                false
              );
            }

          }}
        >

          <div
            className="
              relative
              w-full
              max-w-[900px]
              max-h-[calc(100vh-120px)]
              overflow-hidden
              rounded-3xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface)]
              shadow-2xl
              animate-fade-in
            "
          >

            {/* ==================================================
                CABECERA MODAL
                ================================================== */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                px-5
                py-4
                border-b
                border-[var(--erp-border)]
                bg-[var(--erp-surface)]
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                  min-w-0
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    rounded-xl
                    bg-[var(--erp-primary-soft)]
                    text-[var(--erp-primary)]
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                >

                  <BellIcon />

                </div>

                <div
                  className="
                    min-w-0
                  "
                >

                  <div
                    className="
                      text-base
                      font-semibold
                      text-[var(--erp-text)]
                      truncate
                    "
                  >
                    Notificaciones
                  </div>

                  <div
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Avisos y actividad del sistema
                  </div>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setNotificacionesAbiertas(
                    false
                  )
                }
                aria-label="Cerrar notificaciones"
                title="Cerrar"
                className="
                  w-9
                  h-9
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-white
                  text-[var(--erp-text-soft)]
                  flex
                  items-center
                  justify-center
                  hover:bg-[var(--erp-primary-soft)]
                  hover:text-[var(--erp-primary)]
                  hover:border-[var(--erp-primary)]
                  transition
                  flex-shrink-0
                "
              >

                <MolsanIcon name="x" size={16} bare />

              </button>

            </div>


            {/* ==================================================
                CONTENIDO
                ================================================== */}

            <div
              className="
                overflow-y-auto
                max-h-[calc(100vh-195px)]
                p-4
                sm:p-5
              "
            >

              <Notificaciones />

            </div>

          </div>

        </div>

      )}

    </>

  );
}

import MODULOS_ERP from "../config/modulos";
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

const iconos = {

  folder: (
    <>
      <path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"
      />
      <path d="M3 8h18" />
    </>
  ),

  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </>
  ),

  calendar: (
    <>
      <rect
        x="3"
        y="4.5"
        width="18"
        height="17"
        rx="2"
      />
      <path d="M16 2.5v4" />
      <path d="M8 2.5v4" />
      <path d="M3 9h18" />
      <path d="M8 13h.01" />
      <path d="M12 13h.01" />
      <path d="M16 13h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </>
  ),

  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),

  "user-group": (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M18 14c1.8.8 3 2.4 3 4.5" />
    </>
  ),

  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.4 4 5.5 4 9s-1.5 6.6-4 9" />
      <path d="M12 3c-2.5-2.4-4-5.5-4 9s1.5 6.6 4 9" />
    </>
  ),

  chat: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H11l-4.5 4v-4.2A2.5 2.5 0 0 1 4 12.5z" />
      <path d="M8 8h8" />
      <path d="M8 11h5" />
    </>
  ),

  cog: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.6V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1z" />
    </>
  ),

  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),

  chart: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <rect
        x="7"
        y="11"
        width="2.5"
        height="5"
        rx=".5"
      />
      <rect
        x="11"
        y="8"
        width="2.5"
        height="8"
        rx=".5"
      />
      <rect
        x="15"
        y="5"
        width="2.5"
        height="11"
        rx=".5"
      />
    </>
  ),

  shield: (
    <>
      <path d="M12 3 20 6v5.5c0 4.8-3.2 8.3-8 9.5-4.8-1.2-8-4.7-8-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),

  clipboard: (
    <>
      <rect
        x="5"
        y="4"
        width="14"
        height="17"
        rx="2"
      />
      <path d="M9 4V3h6v1" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),

  truck: (
    <>
      <path d="M3 6h11v11H3z" />
      <path d="M14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="1.7" />
      <circle cx="18" cy="19" r="1.7" />
    </>
  ),

  database: (
    <>
      <ellipse
        cx="12"
        cy="5"
        rx="7"
        ry="3"
      />
      <path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />
    </>
  ),

  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2.1-1.2L14 3h-4l-.4 2.7a7 7 0 0 0-2.1 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2.1 1.2L10 21h4l.4-2.7a7 7 0 0 0 2.1-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
    </>
  ),

  activity: (
    <>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </>
  ),

  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18M10 12v2h4v-2" />
    </>
  ),

  "file-check": (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="m8 15 2 2 5-5" />
    </>
  ),

  landmark: (
    <>
      <path d="m3 8 9-5 9 5H3Z" />
      <path d="M4 10v9M9 10v9M15 10v9M20 10v9M2 21h20M3 8h18" />
    </>
  ),

  "clipboard-list": (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h4" />
    </>
  ),

  newspaper: (
    <>
      <path d="M4 5h14v15H4z" />
      <path d="M18 8h2v12H6" />
      <path d="M7 9h8M7 13h8M7 17h4" />
    </>
  ),

};


/**
 * ============================================================
 * ICONO DE NAVEGACIÓN
 * ============================================================
 */

const NavIcon = ({ name }) => {

  const contenido =
    iconos[name] ||
    iconos.activity;

  return (
    <span className="molsan-nav-icon-3d" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {contenido}
      </svg>
    </span>
  );
};


/**
 * ============================================================
 * ICONO PERFIL
 * ============================================================
 */

const ProfileIcon = () => (
  <svg
    className="w-[18px] h-[18px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);


/**
 * ============================================================
 * ICONO SALIR
 * ============================================================
 */

const LogoutIcon = () => (
  <svg
    className="w-[18px] h-[18px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);


/**
 * ============================================================
 * ICONO NOTIFICACIONES
 * ============================================================
 */

const BellIcon = () => (
  <svg
    className="w-[18px] h-[18px]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
);


/**
 * ============================================================
 * ICONO CHEVRON
 * ============================================================
 */

const ChevronIcon = ({ open }) => (
  <svg
    className={`
      w-3.5
      h-3.5
      transition-transform
      duration-200
      ${open ? "rotate-180" : ""}
    `}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6-6-6" />
  </svg>
);


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
            bg-[var(--erp-primary)]
            text-white
            border-[var(--erp-primary)]
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
  const esPortalNotarialExterno = /^\/(?:notargest|encargagest)-notarios(?:\/|$)/i.test(pathname);

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
                        className={`flex items-center gap-1.5 whitespace-nowrap font-medium transition-all duration-200 border flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[12px] ${(item.directRoute && pathname.replace(/\/$/, "") === item.to) || activeNavigationItem === item.label ? "bg-[var(--erp-primary)] text-white border-[var(--erp-primary)] shadow-sm" : abierto ? "bg-transparent text-[var(--erp-text)] border-[var(--erp-primary)]" : "bg-white text-[var(--erp-text)] border-[var(--erp-border)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)] hover:border-[var(--erp-primary)]"} ${item.attention ? "ng-boton-firmas-urgentes ng-urgencias-activas" : ""}`}>
                        <NavIcon name={item.icon} /><span>{item.label}</span>
                        {esMenu && <ChevronIcon open={abierto} />}
                        {(item.badge > 0 || (item.label === "Mensajes" && mensajesNoLeidos > 0)) ? <span className={item.label === "Mensajes" ? "min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold" : "min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] text-[10px] font-bold"}>{item.label === "Mensajes" ? mensajesNoLeidos : item.badge}</span> : null}
                      </button>
                      {abierto && menuSidebarPosicion && createPortal(
                        <div ref={menuSidebarMenuRef} role="menu" style={{ position: "fixed", top: menuSidebarPosicion.top, left: menuSidebarPosicion.left, width: menuSidebarPosicion.ancho, zIndex: 9999 }} className="max-h-[min(70vh,380px)] overflow-y-auto rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2 shadow-2xl">
                          {menuSidebarItems.map((modulo) => <NavLink key={modulo.key} to={modulo.to} onClick={() => setMenuSidebarAbierto(null)} role="menuitem" className={({ isActive }) => `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? "bg-[var(--erp-primary)] text-white" : "text-[var(--erp-text)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)]"}`}><NavIcon name={modulo.icon} /><span>{modulo.label}</span></NavLink>)}
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

                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>

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

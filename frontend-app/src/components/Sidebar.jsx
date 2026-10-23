import MODULOS_ERP from "../config/modulos";
import { NavLink, useNavigate } from "react-router-dom";
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
    <svg
      className="
        w-4
        h-4
        flex-shrink-0
      "
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {contenido}
    </svg>
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

  const empleado = useAuthStore(
    (s) => s.empleado
  );

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

    {
      key: "catalogos",
      to: "/catalogos",
      label: "Catálogos",
      icon: "database",
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
      key: "informes",
      to: "/informes",
      label: "Informes",
      icon: "chart",
    },

    {
      key: "utilidades",
      to: "/herramientas/utilidades",
      label: "Utilidades",
      icon: "cog",
    },

    {
      key: "provisiones-fondos",
      permiso: "expedientes",
      to: "/provisiones-fondos",
      label: "Provisiones de fondos",
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
   * ==========================================================
   * FILTRADO POR PERMISOS
   * ==========================================================
   */

  const visiblesPrincipales = useMemo(
    () =>
      modulosPrincipales.filter(
        (modulo) =>
          puedeVerModulo(
            modulo.permiso || modulo.key
          )
      ),
    [
      empleado,
      mensajesNoLeidos,
    ]
  );


  const visiblesSecundarios = useMemo(
    () =>
      modulosSecundarios.filter(
        (modulo) =>
          puedeVerModulo(modulo.permiso || modulo.key)
      ),
    [
      empleado,
    ]
  );

  const normalizarModulo = (valor) => String(valor || "").trim().toLocaleLowerCase("es");

  // Accesos directos que deben permanecer visibles en cada módulo.
  // El filtrado de visiblesSecundarios conserva los permisos del empleado.
  const modulosFijados = useMemo(() => {
    const accesosPorMarca = {
      cancelagest: ["utilidades", "provisiones-fondos"],
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

      return !elementosEnBarra.some((item) =>
        item?.key === modulo.key ||
        normalizarModulo(item?.label) === normalizarModulo(modulo.label)
      );
    });
  }, [visiblesSecundarios, navigationItems, brandName, modulosFijados]);

  // El desplegable «Módulos» replica las aplicaciones de Espacio de trabajo.
  // Esa página se guía por los módulos visibles asignados a la ficha del empleado,
  // por lo que usamos exactamente las mismas fuentes y no todos los accesos internos.
  const modulosDropdown = useMemo(() => {
    const normalizarClave = (valor) => String(valor || "").trim().toLocaleLowerCase("es");
    const clavesVisibles = [
      ...(Array.isArray(empleado?.modulos_visibles_list) ? empleado.modulos_visibles_list : []),
      ...(Array.isArray(empleado?.modulos_visibles) ? empleado.modulos_visibles : []),
    ].map(normalizarClave);

    const clavesWorkspace = new Set([
      "apoderagest",
      "cancelagest",
      "notargest",
      "encargagest",
      "fichajes",
    ]);

    const items = MODULOS_ERP
      .filter((modulo) =>
        clavesWorkspace.has(normalizarClave(modulo.key)) &&
        Boolean(modulo.route) &&
        clavesVisibles.includes(normalizarClave(modulo.key))
      )
      .map((modulo) => ({
        key: modulo.key,
        to: modulo.route,
        label: modulo.label,
        icon: modulo.icon,
      }));

    const rol = normalizarClave(empleado?.rol?.nombre || empleado?.rol_nombre || empleado?.nombre_rol);
    const usuarioAdmin = normalizarClave(empleado?.usuario) === "admin";
    const esAdmin = usuarioAdmin || ["admin", "administrador", "administradora", "superadmin", "superusuario", "gestor", "manager"].some((r) => rol.includes(r));
    if (esAdmin && clavesVisibles.includes("fichajes")) {
      items.push({
        key: "control-fichajes",
        to: "/control-fichajes",
        label: "Control de Fichajes",
        icon: "clock",
      });
    }
    return items;
  }, [empleado]);

  const [modulosDropdownAbierto, setModulosDropdownAbierto] = useState(false);
  const modulosDropdownRef = useRef(null);
  const modulosDropdownMenuRef = useRef(null);
  const [modulosDropdownPosicion, setModulosDropdownPosicion] = useState(null);

  useEffect(() => {
    const cerrarFuera = (event) => {
      const dentroDelBoton = modulosDropdownRef.current?.contains(event.target);
      const dentroDelMenu = modulosDropdownMenuRef.current?.contains(event.target);
      if (!dentroDelBoton && !dentroDelMenu) {
        setModulosDropdownAbierto(false);
      }
    };
    document.addEventListener("mousedown", cerrarFuera);
    return () => document.removeEventListener("mousedown", cerrarFuera);
  }, []);

  // El desplegable se renderiza en document.body para que el scroll
  // horizontal de la navegación no lo recorte ni lo deje dentro de la barra.
  useEffect(() => {
    if (!modulosDropdownAbierto) {
      setModulosDropdownPosicion(null);
      return undefined;
    }

    const actualizarPosicion = () => {
      const boton = modulosDropdownRef.current?.querySelector("button");
      if (!boton) return;
      const rect = boton.getBoundingClientRect();
      const ancho = Math.min(240, window.innerWidth - 24);
      const altoEstimado = Math.min(380, window.innerHeight - 24);
      const left = Math.max(12, Math.min(rect.right - ancho, window.innerWidth - ancho - 12));
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - altoEstimado - 12));
      setModulosDropdownPosicion({ top, left, ancho });
    };

    const cerrarConEscape = (event) => {
      if (event.key === "Escape") setModulosDropdownAbierto(false);
    };

    actualizarPosicion();
    window.addEventListener("resize", actualizarPosicion);
    window.addEventListener("scroll", actualizarPosicion, true);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("resize", actualizarPosicion);
      window.removeEventListener("scroll", actualizarPosicion, true);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [modulosDropdownAbierto]);

  // En barras de navegación específicas también agrupamos Fichajes bajo «Módulos»
  // para evitar que aparezca como botón independiente.
  const navigationItemsConModulos = useMemo(() => {
    if (!Array.isArray(navigationItems)) return null;
    const sinFichajes = navigationItems.filter((item) =>
      item?.key !== "fichajes" &&
      normalizarModulo(item?.label) !== "fichajes"
    );
    const yaTieneModulos = sinFichajes.some((item) =>
      item?.key === "modulos" ||
      normalizarModulo(item?.label) === "modulos"
    );
    if (modulosDropdown.length > 0 && !yaTieneModulos) {
      sinFichajes.push({ key: "modulos", label: "Módulos", icon: "database" });
    }
    return sinFichajes;
  }, [navigationItems, modulosDropdown]);

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
              ? navigationItemsConModulos.map((item) => (
                  <div
                    key={item.key}
                    className="relative flex-shrink-0"
                    ref={item.key === "modulos" || normalizarModulo(item.label) === "módulos" || normalizarModulo(item.label) === "modulos" ? modulosDropdownRef : undefined}
                  >
                  <button
                    type="button"
                    onClick={() => {
                      if (item.key === "modulos" || normalizarModulo(item.label) === "módulos" || normalizarModulo(item.label) === "modulos") {
                        setModulosDropdownAbierto((abierto) => !abierto);
                        return;
                      }
                      onNavigationItemClick?.(item.label);
                    }}
                    aria-haspopup={(item.key === "modulos" || normalizarModulo(item.label) === "módulos" || normalizarModulo(item.label) === "modulos") ? "menu" : undefined}
                    aria-expanded={(item.key === "modulos" || normalizarModulo(item.label) === "módulos" || normalizarModulo(item.label) === "modulos") ? modulosDropdownAbierto : undefined}
                    aria-current={activeNavigationItem === item.label ? "page" : undefined}
                    className={`
                      flex items-center gap-1.5 whitespace-nowrap font-medium transition-all duration-200 border flex-shrink-0
                      ${brandName === "NotarGest" ? "px-3 py-2 rounded-full text-[12px]" : "px-2.5 py-1.5 rounded-lg text-[12px]"}
                      ${activeNavigationItem === item.label
                        ? "bg-[var(--erp-primary)] text-white border-[var(--erp-primary)] shadow-sm"
                        : "bg-white text-[var(--erp-text)] border-[var(--erp-border)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)] hover:border-[var(--erp-primary)]"}
                      ${item.attention ? " ng-boton-firmas-urgentes ng-urgencias-activas" : ""}
                    `}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                    {(item.badge > 0 || (item.label === "Mensajes" && mensajesNoLeidos > 0)) ? (
                      <span className={item.label === "Mensajes" ? "min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold" : "min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] text-[10px] font-bold"}>
                        {item.label === "Mensajes" ? mensajesNoLeidos : item.badge}
                      </span>
                    ) : null}
                  </button>
                  {(item.key === "modulos" || normalizarModulo(item.label) === "módulos" || normalizarModulo(item.label) === "modulos") && modulosDropdownAbierto && modulosDropdownPosicion && createPortal(
                    <div
                      ref={modulosDropdownMenuRef}
                      role="menu"
                      style={{
                        position: "fixed",
                        top: modulosDropdownPosicion.top,
                        left: modulosDropdownPosicion.left,
                        width: modulosDropdownPosicion.ancho,
                        zIndex: 9999,
                      }}
                      className="max-h-[min(70vh,380px)] overflow-y-auto rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2 shadow-2xl"
                    >
                      {modulosDropdown.map((modulo) => (
                        <NavLink
                          key={modulo.key}
                          to={modulo.to}
                          onClick={() => setModulosDropdownAbierto(false)}
                          role="menuitem"
                          className={({ isActive }) => `
                            flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition
                            ${isActive
                              ? "bg-[var(--erp-primary)] text-white"
                              : "text-[var(--erp-text)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)]"}
                          `}
                        >
                          <NavIcon name={modulo.icon} />
                          <span>{modulo.label}</span>
                        </NavLink>
                      ))}
                    </div>,
                    document.body
                  )}
                  </div>
                ))
              : visiblesPrincipales.map((modulo) => (
                  <TopNavItem
                    key={modulo.key}
                    to={modulo.to}
                    label={modulo.label}
                    icon={modulo.icon}
                    badge={modulo.badge || 0}
                  />
                ))}

            {modulosFijados.map((modulo) => (
              <TopNavItem
                key={modulo.key}
                to={modulo.to}
                label={modulo.label}
                icon={modulo.icon}
                badge={modulo.badge || 0}
              />
            ))}

            {modulosDropdown.length > 0 && !navigationItems && (
              <>
                <div className="relative flex-shrink-0" ref={modulosDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setModulosDropdownAbierto((abierto) => !abierto)}
                    aria-haspopup="menu"
                    aria-expanded={modulosDropdownAbierto}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap text-sm font-medium
                      transition-all duration-200 border
                      ${modulosDropdownAbierto || modulosDropdown.some((m) => window.location.pathname.startsWith(m.to))
                        ? "bg-[var(--erp-primary-soft)] text-[var(--erp-primary)] border-[var(--erp-primary)]"
                        : "bg-white text-[var(--erp-text)] border-[var(--erp-border)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)] hover:border-[var(--erp-primary)]"}
                    `}
                  >
                    <NavIcon name="folder" />
                    <span>Módulos</span>
                    <ChevronIcon open={modulosDropdownAbierto} />
                  </button>
                </div>
                {modulosDropdownAbierto && modulosDropdownPosicion && createPortal(
                  <div
                    ref={modulosDropdownMenuRef}
                    role="menu"
                    style={{
                      position: "fixed",
                      top: modulosDropdownPosicion.top,
                      left: modulosDropdownPosicion.left,
                      width: Math.max(205, modulosDropdownPosicion.ancho),
                      zIndex: 9999,
                    }}
                    className="max-h-[min(70vh,380px)] overflow-y-auto rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2 shadow-2xl"
                  >
                    {modulosDropdown.map((modulo) => (
                      <NavLink
                        key={modulo.key}
                        to={modulo.to}
                        onClick={() => setModulosDropdownAbierto(false)}
                        role="menuitem"
                        className={({ isActive }) => `
                          flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition
                          ${isActive
                            ? "bg-[var(--erp-primary)] text-white"
                            : "text-[var(--erp-text)] hover:bg-[var(--erp-primary-soft)] hover:text-[var(--erp-primary)]"}
                        `}
                      >
                        <NavIcon name={modulo.icon} />
                        <span>{modulo.label}</span>
                      </NavLink>
                    ))}
                  </div>,
                  document.body
                )}
              </>
            )}

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

import { NavLink } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";

import { puedeVerModulo } from "../utils/permisos";

import { useAuthStore } from "../store/authStore";
import { useMensajesStore } from "../store/mensajesStore";
import { useNotificacionesStore } from "../store/notificacionesStore";


/**
 * ============================================================
 * ICONO DE NAVEGACIÓN
 * ============================================================
 */

const NavIcon = ({ name }) => (
  <svg
    className="w-4 h-4 flex-shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <use href={`/icons/icons.svg#${name}`} />
  </svg>
);


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
    className={`w-3.5 h-3.5 transition-transform duration-200 ${
      open ? "rotate-180" : ""
    }`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
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
 * SEPARADOR
 * ============================================================
 */

const NavSeparator = () => (
  <div
    className="
      h-7
      w-px
      bg-[var(--erp-border)]
      flex-shrink-0
      mx-0.5
    "
  />
);


/**
 * ============================================================
 * SIDEBAR
 *
 * Aunque el nombre del fichero sigue siendo Sidebar.jsx,
 * visualmente funciona como navegación superior.
 * ============================================================
 */

export default function Sidebar() {

  const empleado = useAuthStore((s) => s.empleado);
  const logout = useAuthStore((s) => s.logout);

  const mensajesNoLeidos = useMensajesStore(
    (s) => s.noLeidosTotal || 0
  );

  const unreadCount = useNotificacionesStore(
    (s) => s.unreadCount || 0
  );

  const [masAbierto, setMasAbierto] = useState(false);

  const masRef = useRef(null);


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
   * CERRAR MÁS AL HACER CLICK FUERA
   * ==========================================================
   */

  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        masRef.current &&
        !masRef.current.contains(event.target)
      ) {
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
   * ==========================================================
   * MÓDULOS PRINCIPALES
   * ==========================================================
   */

  const modulosPrincipales = [

    {
      key: "expedientes",
      to: "/expedientes",
      label: "Expedientes",
      icon: "folder",
    },

    {
      key: "dashboard",
      to: "/dashboard",
      label: "Dashboard",
      icon: "home",
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
      key: "utilidades",
      to: "/herramientas/utilidades",
      label: "Utilidades",
      icon: "cog",
    },

    {
      key: "notificaciones",
      to: "/notificaciones",
      label: "Notificaciones",
      icon: "bell",
      badge: unreadCount,
    },

  ];


  /**
   * ==========================================================
   * MÓDULOS SECUNDARIOS
   *
   * SEGURIDAD Y AUDITORÍA SON MÓDULOS INDEPENDIENTES.
   *
   * Seguridad:
   *   /seguridad
   *
   * Auditoría:
   *   /auditoria
   *
   * Cada uno utiliza su propia clave de permisos.
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
      to: "/PanelTecnico",
      label: "Panel técnico",
      icon: "settings",
    },

    {
      key: "realtime",
      to: "/MonitorRealtime",
      label: "Realtime",
      icon: "activity",
    },

  ];


  /**
   * ==========================================================
   * FILTRAR POR PERMISOS
   * ==========================================================
   */

  const visiblesPrincipales = useMemo(
    () =>
      modulosPrincipales.filter((modulo) =>
        puedeVerModulo(modulo.key)
      ),
    [empleado]
  );


  const visiblesSecundarios = useMemo(
    () =>
      modulosSecundarios.filter((modulo) =>
        puedeVerModulo(modulo.key)
      ),
    [empleado, mensajesNoLeidos, unreadCount]
  );


  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <header
      className="
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
        className="
          max-w-[1800px]
          mx-auto
          px-4
          lg:px-6
          py-2
          flex
          items-center
          gap-4
          min-w-0
        "
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
              alt="CancelaGest"
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
              CancelaGest
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
          className="
            flex
            items-center
            gap-1.5
            flex-1
            min-w-0
            overflow-visible
            pb-0.5
          "
        >

          {/* ==================================================
              MÓDULOS PRINCIPALES
              ================================================== */}

          {visiblesPrincipales.map((modulo) => (

            <TopNavItem
              key={modulo.key}
              to={modulo.to}
              label={modulo.label}
              icon={modulo.icon}
              badge={modulo.badge || 0}
            />

          ))}


          {/* ==================================================
              MÁS
              ================================================== */}

          {visiblesSecundarios.length > 0 && (

            <div
              ref={masRef}
              className="
                relative
                flex-shrink-0
              "
            >

              <button
                type="button"
                onClick={() =>
                  setMasAbierto((valor) => !valor)
                }
                aria-expanded={masAbierto}
                aria-haspopup="menu"
                className="
                  flex
                  items-center
                  gap-2
                  px-3
                  py-2
                  rounded-xl
                  whitespace-nowrap
                  text-sm
                  font-medium
                  border
                  border-[var(--erp-border)]
                  bg-white
                  text-[var(--erp-text)]
                  hover:bg-[var(--erp-primary-soft)]
                  hover:text-[var(--erp-primary)]
                  hover:border-[var(--erp-primary)]
                  transition-all
                  duration-200
                  shadow-sm
                "
              >

                <span>Más</span>

                <ChevronIcon
                  open={masAbierto}
                />

              </button>


              {/* ==================================================
                  DROPDOWN
                  ================================================== */}

              {masAbierto && (

                <div
                  role="menu"
                  className="
                    absolute
                    top-[calc(100%+8px)]
                    right-0
                    w-[250px]
                    p-2
                    rounded-2xl
                    bg-white
                    border
                    border-[var(--erp-border)]
                    shadow-xl
                    z-[100]
                  "
                >

                  <div
                    className="
                      px-3
                      pt-2
                      pb-2
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Más módulos
                  </div>


                  <div
                    className="
                      grid
                      gap-1
                    "
                  >

                    {visiblesSecundarios.map((modulo) => (

                      <NavLink
                        key={modulo.key}
                        to={modulo.to}
                        role="menuitem"
                        onClick={() =>
                          setMasAbierto(false)
                        }
                        className={({ isActive }) =>
                          `
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          rounded-xl
                          text-sm
                          font-medium
                          transition-all
                          duration-150

                          ${
                            isActive
                              ? `
                                bg-[var(--erp-primary)]
                                text-white
                              `
                              : `
                                text-[var(--erp-text)]
                                hover:bg-[var(--erp-primary-soft)]
                                hover:text-[var(--erp-primary)]
                              `
                          }
                          `
                        }
                      >

                        <NavIcon
                          name={modulo.icon}
                        />

                        <span className="flex-1">
                          {modulo.label}
                        </span>


                        {modulo.badge > 0 && (

                          <span
                            className="
                              min-w-[19px]
                              h-[19px]
                              px-1
                              rounded-full
                              bg-red-500
                              text-white
                              text-[10px]
                              font-bold
                              flex
                              items-center
                              justify-center
                            "
                          >
                            {modulo.badge}
                          </span>

                        )}

                      </NavLink>

                    ))}

                  </div>

                </div>

              )}

            </div>

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

          {/* NOTIFICACIONES */}

          <button
            type="button"
            title="Notificaciones"
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

            {unreadCount > 0 && (

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
                {unreadCount}
              </span>

            )}

          </button>


          {/* PERFIL */}

          <button
            type="button"
            onClick={() =>
              useAuthStore
                .getState()
                .setPerfilModal(safeUser.id)
            }
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


          {/* CERRAR SESIÓN */}

          <button
            type="button"
            onClick={logout}
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
  );
}

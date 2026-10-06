import { NavLink } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";

import { puedeVerModulo } from "../utils/permisos";

import { useAuthStore } from "../store/authStore";
import { useMensajesStore } from "../store/mensajesStore";
import { useNotificacionesStore } from "../store/notificacionesStore";


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
      <path d="M12 3c-2.5 2.4-4 5.5-4 9s1.5 6.6 4 9" />
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
      <rect x="7" y="11" width="2.5" height="5" rx=".5" />
      <rect x="11" y="8" width="2.5" height="8" rx=".5" />
      <rect x="15" y="5" width="2.5" height="11" rx=".5" />
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
 * SIDEBAR
 *
 * Visualmente funciona como navegación superior.
 * ============================================================
 */

export default function Sidebar() {

  const empleado = useAuthStore(
    (s) => s.empleado
  );

  const logout = useAuthStore(
    (s) => s.logout
  );

  const mensajesNoLeidos = useMensajesStore(
    (s) => s.noLeidosTotal || 0
  );

  const unreadCount = useNotificacionesStore(
    (s) => s.unreadCount || 0
  );

  const [masAbierto, setMasAbierto] =
    useState(false);

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
   * CERRAR MENÚ MÁS AL HACER CLICK FUERA
   * ==========================================================
   */

  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        masRef.current &&
        !masRef.current.contains(
          event.target
        )
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
      key: "fusiones",
      to: "/fusiones",
      label: "Fusiones",
      icon: "fusion",
      badge: unreadCount,
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
   * IMPORTANTE:
   *
   * /auditoria
   * /seguridad
   * /logs
   * /maestros
   * /paneltecnico
   *
   * son las rutas reales definidas en App.jsx.
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
      key: "utilidades",
      to: "/herramientas/utilidades",
      label: "Utilidades",
      icon: "cog",
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
            modulo.key
          )
      ),
    [
      empleado,
      mensajesNoLeidos,
      unreadCount,
    ]
  );


  const visiblesSecundarios = useMemo(
    () =>
      modulosSecundarios.filter(
        (modulo) =>
          puedeVerModulo(
            modulo.key
          )
      ),
    [empleado]
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

          {visiblesPrincipales.map(
            (modulo) => (

              <TopNavItem
                key={modulo.key}
                to={modulo.to}
                label={modulo.label}
                icon={modulo.icon}
                badge={
                  modulo.badge || 0
                }
              />

            )
          )}


          {/* ==================================================
              MÁS
              ================================================== */}

          {visiblesSecundarios.length >
            0 && (

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
                  setMasAbierto(
                    (valor) =>
                      !valor
                  )
                }
                aria-expanded={
                  masAbierto
                }
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

                    {visiblesSecundarios.map(
                      (modulo) => (

                        <NavLink
                          key={modulo.key}
                          to={modulo.to}
                          role="menuitem"
                          onClick={() =>
                            setMasAbierto(
                              false
                            )
                          }
                          className={({
                            isActive,
                          }) =>
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
                            name={
                              modulo.icon
                            }
                          />

                          <span
                            className="
                              flex-1
                            "
                          >
                            {
                              modulo.label
                            }
                          </span>


                          {modulo.badge >
                            0 && (

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
                              {
                                modulo.badge
                              }
                            </span>

                          )}

                        </NavLink>

                      )
                    )}

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
                .setPerfilModal(
                  safeUser.id
                )
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

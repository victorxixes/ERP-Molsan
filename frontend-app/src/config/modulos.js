// ============================================================
// MOLSAN ERP — CATÁLOGO CENTRAL DE MÓDULOS
// ============================================================
//
// ESTE ARCHIVO ES LA ÚNICA FUENTE FRONTEND
// PARA LOS MÓDULOS DEL ERP.
//
// No contiene permisos.
// No contiene lógica de autenticación.
// No modifica el backend.
//
// key   = clave utilizada por permisos / empleado
// label = nombre visible
// route = ruta React
// icon  = icono utilizado por Sidebar
// ============================================================

const MODULOS_ERP = [
  {
    key: "expedientes",
    label: "Expedientes",
    route: "/expedientes",
    icon: "folder",
  },

  {
    key: "provisiones-fondos",
    label: "Provisiones",
    route: "/provisiones-fondos",
    icon: "receipt",
  },

  {
    key: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    icon: "home",
  },

  {
    key: "agenda",
    label: "Agenda",
    route: "/agenda",
    icon: "calendar",
  },

  {
    key: "empleados",
    label: "Empleados",
    route: "/empleados",
    icon: "users",
  },

  {
    key: "fichajes",
    label: "Fichajes",
    route: "/fichajes",
    icon: "clock",
  },

  {
    key: "control-fichajes",
    label: "Control de Fichajes",
    route: "/control-fichajes",
    permiso: "control-fichajes",
    icon: "timer",
  },

  {
    key: "ctn",
    label: "CTN",
    route: "/ctn",
    icon: "globe",
  },

  {
    key: "intranet",
    label: "Intranet",
    route: "/intranet",
    icon: "newspaper",
  },

  // Permiso granular para la gestión de noticias de la intranet.
  // route:null evita crear una segunda entrada de navegación.
  {
    key: "noticias",
    label: "Noticias",
    route: null,
    icon: "newspaper",
  },

  {
    key: "mensajes",
    label: "Mensajes",
    route: "/mensajes",
    icon: "chat",
  },

  {
    key: "mensajeria",
    label: "Mensajería",
    route: "/mensajeria",
    icon: "truck",
  },

  {
    key: "mensajeria-gestion",
    label: "Mensajería Gestión",
    route: "/mensajeria-gestion",
    icon: "mail",
  },

  {
    key: "informes",
    label: "Informes",
    route: "/informes",
    icon: "chart",
  },

  {
    key: "fusiones",
    label: "Fusiones",
    route: "/fusiones",
    icon: "merge",
  },

  {
    key: "auditoria",
    label: "Auditoría",
    route: "/auditoria",
    icon: "chart",
  },

  {
    key: "catalogos",
    label: "Catálogos",
    route: "/catalogos",
    icon: "database",
  },

  {
    key: "herramientas",
    label: "Herramientas",
    route: null,
    icon: "wrench",
  },

  {
    key: "utilidades",
    label: "Utilidades",
    route: "/herramientas/utilidades",
    icon: "cog",
  },

  {
    key: "seguridad",
    label: "Seguridad",
    route: "/seguridad",
    icon: "lock",
  },

  {
    key: "logs",
    label: "Logs",
    route: "/logs",
    icon: "clipboard",
  },

  {
    key: "maestros",
    label: "Maestros",
    route: "/maestros",
    icon: "book",
  },

  {
    key: "panel-tecnico",
    label: "Panel técnico",
    route: "/paneltecnico",
    icon: "settings",
  },

  {
    key: "realtime",
    label: "Realtime",
    route: null,
    icon: "activity",
  },

  {
    key: "notarios",
    label: "Notarios",
    route: null,
    icon: "database",
  },

  {
    key: "documentos",
    label: "Documentos",
    route: null,
    icon: "folder",
  },

    {
    key: "apoderagest",
    label: "ApoderaGest",
    route: "/apoderagest",
    icon: "briefcase",
  },
  {
    key: "cancelagest",
    label: "CancelaGest",
    route: "/dashboard",
    icon: "file-check",
  },
  {
    key: "notargest",
    label: "NotarGest",
    route: "/notargest",
    icon: "landmark",
  },
  {
    key: "encargagest",
    label: "EncargaGest",
    route: "/encargagest",
    icon: "clipboard-list",
  },
  {
    key: "notargestweb",
    label: "NotarGest Notarios",
    route: "/notargest-notarios",
    permiso: "notargest",
    icon: "building",
  },
  {
    key: "encargagestweb",
    label: "EncargaGest Notarios",
    route: "/encargagest-notarios",
    permiso: "encargagest",
    icon: "archive",
  },
];

export default MODULOS_ERP;

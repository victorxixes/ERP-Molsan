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
    icon: "user-group",
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
    icon: "globe",
  },

  {
    key: "mensajes",
    label: "Mensajes",
    route: "/mensajes",
    icon: "chat",
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
    icon: "activity",
  },

  {
    key: "notificaciones",
    label: "Notificaciones",
    route: "/notificaciones",
    icon: "bell",
  },

  {
    key: "auditoria",
    label: "Auditoría",
    route: "/auditoria",
    icon: "chart",
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
    icon: "shield",
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
    icon: "database",
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
];

export default MODULOS_ERP;

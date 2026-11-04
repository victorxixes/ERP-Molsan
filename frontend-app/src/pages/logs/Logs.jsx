import { useCallback, useEffect } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

import { useLogs } from "../../hooks/useLogs";

import TablaLogs from "../../components/logs/TablaLogs";


/**
 * ============================================================
 * LOGS
 * ============================================================
 *
 * Monitorización de:
 *
 * - Eventos del sistema
 * - Actividad técnica
 * - Seguridad
 * - Errores
 * - Avisos
 * - Autenticación
 * - Importaciones
 * - Exportaciones
 *
 * ============================================================
 */

export default function Logs() {

  const {
    logs,
    cargarLogs,
    loading,
    error,
  } = useLogs();


  /* ==========================================================
     CARGAR LOGS
  ========================================================== */

  const cargar = useCallback(() => {

    cargarLogs({});

  }, [cargarLogs]);


  useEffect(() => {

    cargar();

  }, [cargar]);


  /* ==========================================================
     COLUMNAS
  ========================================================== */

  const columnas = [

    {
      campo: "id",
      titulo: "ID",
    },

    {
      campo: "evento",
      titulo: "Evento",
      esEvento: true,
    },

    {
      campo: "detalle",
      titulo: "Detalle",
    },

    {
      campo: "ip",
      titulo: "IP",
    },

    {
      campo: "fecha",
      titulo: "Fecha",
      esFecha: true,
    },

  ];


  /* ==========================================================
     ICONOS DE EVENTOS
  ========================================================== */

  const iconosTipo = {

    /* --------------------------------------------------------
       AUTENTICACIÓN
    -------------------------------------------------------- */

    login: "🔑",
    LOGIN: "🔑",

    login_success: "🔓",
    LOGIN_SUCCESS: "🔓",

    login_error: "⛔",
    LOGIN_ERROR: "⛔",

    logout: "🚪",
    LOGOUT: "🚪",


    /* --------------------------------------------------------
       SEGURIDAD
    -------------------------------------------------------- */

    security: "🔐",
    SECURITY: "🔐",

    security_error: "🛡️",
    SECURITY_ERROR: "🛡️",

    permission_denied: "🚫",
    PERMISSION_DENIED: "🚫",


    /* --------------------------------------------------------
       ERRORES
    -------------------------------------------------------- */

    error: "⛔",
    ERROR: "⛔",

    exception: "💥",
    EXCEPTION: "💥",


    /* --------------------------------------------------------
       AVISOS
    -------------------------------------------------------- */

    warning: "⚠️",
    WARNING: "⚠️",


    /* --------------------------------------------------------
       INFORMACIÓN
    -------------------------------------------------------- */

    info: "ℹ️",
    INFO: "ℹ️",


    /* --------------------------------------------------------
       OPERACIONES
    -------------------------------------------------------- */

    create: "➕",
    CREATE: "➕",

    update: "✏️",
    UPDATE: "✏️",

    delete: "🗑️",
    DELETE: "🗑️",


    /* --------------------------------------------------------
       IMPORTACIONES / EXPORTACIONES
    -------------------------------------------------------- */

    import: "📥",
    IMPORT: "📥",

    import_success: "📥",
    IMPORT_SUCCESS: "📥",

    import_error: "⛔",
    IMPORT_ERROR: "⛔",

    export: "📤",
    EXPORT: "📤",

    export_success: "📤",
    EXPORT_SUCCESS: "📤",

    export_error: "⛔",
    EXPORT_ERROR: "⛔",


    /* --------------------------------------------------------
       DEFAULT
    -------------------------------------------------------- */

    default: "📋",

  };


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div className="erp-page min-w-0 space-y-6">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="LG" title="Logs del sistema" description="Monitorización avanzada de eventos, seguridad y actividad del ERP." />
   {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (

        <div
          className="px-4
 py-3"
          role="alert"
        >
          {error}
        </div>

      )}


      {/* =====================================================
          CONTENIDO
      ===================================================== */}

      {loading ? (

        <div
          className="flex
 items-center
 justify-center
 
 
 
 
 
 
 p-10"
        >

          <div
            className="flex
 items-center
 gap-3"
          >

            <span
              className="h-5
 w-5"
            />

            Cargando logs…

          </div>

        </div>

      ) : (

        <TablaLogs
          datos={logs || []}
          columnas={columnas}
          pageSize={50}
          titulo="Listado de logs"
          descripcion="Registros generales del sistema, ordenados por fecha y evento."
          enableSearch={true}
          enableDateFilter={true}
          enableExport={true}
          exportFilename="logs_sistema"
          iconosEvento={iconosTipo}
        />

      )}

    </div>

  );

}

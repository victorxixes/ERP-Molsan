import { useCallback, useEffect } from "react";

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

    <div
      className="logs-premium-page
 relative
 min-h-full
 space-y-6
 min-w-0"
    >

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <section
        className="relative
 overflow-hidden
 
 
 
 
 
 
 p-6
 sm:p-7"
      >

        {/* Línea superior */}

        <div
          className="absolute
 top-0
 left-0
 right-0
 h-px"
        />


        {/* Decoración */}

        <div
          className="absolute
 -top-20
 -right-20
 w-48
 h-48
 
 
 
 pointer-events-none"
        />


        <div
          className="relative
 z-10"
        >

          <div
            className="flex
 items-center
 gap-3"
          >

            <div
              className="flex
 items-center
 justify-center
 w-11
 h-11"
            >

              <span
               
                aria-hidden="true"
              >
                📋
              </span>

            </div>


            <div>

              <h1
               
              >
                Logs del sistema
              </h1>


              <p
                className="mt-1"
              >
                Monitorización avanzada de eventos,
                seguridad y actividad del ERP.
              </p>

            </div>

          </div>

        </div>

      </section>


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

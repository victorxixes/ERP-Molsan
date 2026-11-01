import { useCallback, useEffect } from "react";
import "./Logs.css";

import { useLogs } from "../../hooks/useLogs";

import TablaLogs from "../../components/logs/TablaLogs";


/**
 * ============================================================
 * LOGS — MOLSAN ERP SAAS PREMIUM 2027
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
      className="
        logs-premium-page
        relative
        min-h-full
        space-y-6
        text-slate-800
        animate-fadeIn
      "
    >

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <section
        className="molsan-page-header"
      >

        <div
          className="
            relative
            z-10
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="molsan-page-header__mark"
            >

              <span
                className="text-xl"
                aria-hidden="true"
              >
                📋
              </span>

            </div>


            <div>

              <h1
                className="
                  text-2xl
                  sm:text-3xl
                  font-bold
                  tracking-tight
                  text-slate-800
                "
              >
                Logs del sistema
              </h1>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
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
          className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700
          "
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
          className="
            flex
            items-center
            justify-center
            rounded-[24px]
            border
            border-white/80
            bg-white/75
            backdrop-blur-xl
            shadow-[0_15px_45px_rgba(15,23,42,0.06)]
            p-10
          "
        >

          <div
            className="
              flex
              items-center
              gap-3
              text-sm
              font-medium
              text-slate-500
            "
          >

            <span
              className="
                h-5
                w-5
                rounded-full
                border-2
                border-slate-200
                border-t-blue-500
                animate-spin
              "
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

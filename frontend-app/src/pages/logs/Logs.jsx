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

    login: "key",
    LOGIN: "key",

    login_success: "lock",
    LOGIN_SUCCESS: "lock",

    login_error: "alert",
    LOGIN_ERROR: "alert",

    logout: "door",
    LOGOUT: "door",


    /* --------------------------------------------------------
       SEGURIDAD
    -------------------------------------------------------- */

    security: "lock",
    SECURITY: "lock",

    security_error: "shield",
    SECURITY_ERROR: "shield",

    permission_denied: "alert",
    PERMISSION_DENIED: "alert",


    /* --------------------------------------------------------
       ERRORES
    -------------------------------------------------------- */

    error: "alert",
    ERROR: "alert",

    exception: "alert",
    EXCEPTION: "alert",


    /* --------------------------------------------------------
       AVISOS
    -------------------------------------------------------- */

    warning: "alert",
    WARNING: "alert",


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

    delete: "trash",
    DELETE: "trash",


    /* --------------------------------------------------------
       IMPORTACIONES / EXPORTACIONES
    -------------------------------------------------------- */

    import: "download",
    IMPORT: "download",

    import_success: "download",
    IMPORT_SUCCESS: "download",

    import_error: "alert",
    IMPORT_ERROR: "alert",

    export: "upload",
    EXPORT: "upload",

    export_success: "upload",
    EXPORT_SUCCESS: "upload",

    export_error: "alert",
    EXPORT_ERROR: "alert",


    /* --------------------------------------------------------
       DEFAULT
    -------------------------------------------------------- */

    default: "clipboard",

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

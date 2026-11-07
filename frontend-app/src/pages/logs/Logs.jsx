import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useCallback, useEffect } from "react";
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

    logout: "logout",
    LOGOUT: "logout",


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

    info: "help",
    INFO: "help",


    /* --------------------------------------------------------
       OPERACIONES
    -------------------------------------------------------- */

    create: "plus",
    CREATE: "plus",

    update: "pen",
    UPDATE: "pen",

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

    default: "clipboardList",

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
        text-[var(--molsan-text)]
        
      "
    >

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader
        mark="LG"
        title="Logs del sistema"
        description="Monitorización avanzada de eventos, seguridad y actividad del ERP."
      />

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
              text-[var(--molsan-text-secondary)]
            "
          >

            <span
              className="
                h-5
                w-5
                rounded-full
                border-2
                border-[var(--molsan-border)]
                border-t-[var(--molsan-primary)]
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

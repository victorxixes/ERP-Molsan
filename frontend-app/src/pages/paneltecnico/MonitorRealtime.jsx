import { useEffect, useRef, useState, useMemo } from "react";
import { buildRealtimeWsUrl } from "../../api/monitorRealtime";

/**
 * ============================================================
 * MONITOR REALTIME — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * - WebSocket realtime
 * - Reconexión automática
 * - Estado de conexión visible
 * - KPIs premium
 * - Integrado con variables --erp-*
 *
 * IMPORTANTE:
 * El backend actual permite suscribirse por:
 *
 * - usuario_id
 * - rol
 * - modulo
 * - grupo
 *
 * Este monitor muestra actualmente los datos de ESTA conexión.
 * El backend todavía no proporciona un contador global real
 * de todas las conexiones activas.
 * ============================================================
 */

export default function MonitorRealtime() {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(false);

  const [conectado, setConectado] = useState(false);

  const [stats, setStats] = useState({
    mensajes: 0,
    ultimaActividad: null,
  });

  // ============================================================
  // CONEXIÓN WEBSOCKET
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;

    let cerradoManualmente = false;

    // ----------------------------------------------------------
    // PROGRAMAR RECONEXIÓN
    // ----------------------------------------------------------

    const programarReconexión = () => {
      if (
        !mountedRef.current ||
        cerradoManualmente
      ) {
        return;
      }

      if (reconnectTimerRef.current) {
        return;
      }

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;

        conectar();
      }, 5000);
    };

    // ----------------------------------------------------------
    // CONECTAR
    // ----------------------------------------------------------

    const conectar = () => {
      if (
        !mountedRef.current ||
        cerradoManualmente
      ) {
        return;
      }

      // --------------------------------------------------------
      // CERRAR CONEXIÓN ANTERIOR
      // --------------------------------------------------------

      try {
        if (wsRef.current) {
          wsRef.current.close();
        }
      } catch {
        // Ignorar
      }

      // --------------------------------------------------------
      // CONSTRUIR URL
      // --------------------------------------------------------

      let url;

      try {
        url = buildRealtimeWsUrl({
          modulo: "panel-tecnico",
          grupo: "monitor-realtime",
          rol: "admin",
        });
      } catch (error) {
        console.error(
          "MonitorRealtime: no se pudo construir la URL WebSocket:",
          error
        );

        setConectado(false);

        programarReconexión();

        return;
      }

      console.log(
        "MonitorRealtime: conectando WebSocket:",
        url
      );

      // --------------------------------------------------------
      // CREAR WEBSOCKET
      // --------------------------------------------------------

      let ws;

      try {
        ws = new WebSocket(url);
      } catch (error) {
        console.error(
          "MonitorRealtime: error creando WebSocket:",
          error
        );

        setConectado(false);

        programarReconexión();

        return;
      }

      wsRef.current = ws;

      // ========================================================
      // OPEN
      // ========================================================

      ws.onopen = () => {
        if (
          !mountedRef.current ||
          cerradoManualmente
        ) {
          return;
        }

        console.log(
          "MonitorRealtime: WebSocket conectado"
        );

        setConectado(true);

        setStats((prev) => ({
          ...prev,
          ultimaActividad:
            new Date().toISOString(),
        }));
      };

      // ========================================================
      // MESSAGE
      // ========================================================

      ws.onmessage = (event) => {
        if (
          !mountedRef.current ||
          cerradoManualmente
        ) {
          return;
        }

        let mensaje;

        try {
          mensaje = JSON.parse(event.data);
        } catch {
          mensaje = event.data;
        }

        console.log(
          "MonitorRealtime: evento recibido:",
          mensaje
        );

        setStats((prev) => ({
          ...prev,
          mensajes: prev.mensajes + 1,
          ultimaActividad:
            new Date().toISOString(),
        }));
      };

      // ========================================================
      // ERROR
      // ========================================================

      ws.onerror = (error) => {
        if (
          !mountedRef.current ||
          cerradoManualmente
        ) {
          return;
        }

        console.error(
          "MonitorRealtime: error WebSocket:",
          error
        );

        setConectado(false);
      };

      // ========================================================
      // CLOSE
      // ========================================================

      ws.onclose = (event) => {
        if (
          !mountedRef.current ||
          cerradoManualmente
        ) {
          return;
        }

        console.warn(
          "MonitorRealtime: WebSocket cerrado.",
          {
            code: event.code,
            reason: event.reason,
          }
        );

        setConectado(false);

        setStats((prev) => ({
          ...prev,
          ultimaActividad:
            new Date().toISOString(),
        }));

        programarReconexión();
      };
    };

    // ==========================================================
    // INICIAR
    // ==========================================================

    conectar();

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      cerradoManualmente = true;
      mountedRef.current = false;

      // --------------------------------------------------------
      // CANCELAR RECONEXIÓN
      // --------------------------------------------------------

      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current = null;
      }

      // --------------------------------------------------------
      // CERRAR SOCKET
      // --------------------------------------------------------

      try {
        if (wsRef.current) {
          wsRef.current.close();
        }
      } catch {
        // Ignorar
      }

      wsRef.current = null;
    };
  }, []);

  // ============================================================
  // CONEXIÓN ACTUAL
  // ============================================================

  const resumen = useMemo(
    () => (conectado ? 1 : 0),
    [conectado]
  );

  // ============================================================
  // FECHA ÚLTIMA ACTIVIDAD
  // ============================================================

  const ultimaActividad = useMemo(() => {
    if (!stats.ultimaActividad) {
      return "—";
    }

    try {
      return new Date(
        stats.ultimaActividad
      ).toLocaleTimeString("es-ES");
    } catch {
      return "—";
    }
  }, [stats.ultimaActividad]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section
      className="
        rounded-2xl
        border
        border-[var(--erp-border)]
        bg-[var(--erp-surface)]
        shadow-sm
        overflow-hidden
        animate-fade-in
      "
    >

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="
          px-6
          py-5
          border-b
          border-[var(--erp-border)]
          bg-[var(--erp-surface-soft)]
        "
      >

        <div
          className="
            flex
            flex-col
            md:flex-row
            md:items-center
            md:justify-between
            gap-4
          "
        >

          {/* TÍTULO */}

          <div className="flex items-center gap-3">

            <div
              className="
                w-11
                h-11
                rounded-xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
                border
                border-[var(--erp-border)]
              "
            >
              <svg
                className="w-5 h-5"
                aria-hidden="true"
              >
                <use href="/icons/icons.svg#activity" />
              </svg>
            </div>

            <div>

              <h2
                className="
                  text-lg
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                Monitor Realtime
              </h2>

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                "
              >
                Conexión WebSocket del sistema
              </p>

            </div>

          </div>

          {/* ESTADO */}

          <div
            className={`
              inline-flex
              items-center
              gap-2
              px-3
              py-2
              rounded-xl
              border
              text-xs
              font-semibold
              w-fit

              ${
                conectado
                  ? `
                    bg-emerald-50
                    text-emerald-700
                    border-emerald-200
                  `
                  : `
                    bg-red-50
                    text-red-700
                    border-red-200
                  `
              }
            `}
          >

            <span
              className={`
                w-2
                h-2
                rounded-full

                ${
                  conectado
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-red-500"
                }
              `}
            />

            {conectado
              ? "WebSocket conectado"
              : "WebSocket desconectado"}

          </div>

        </div>

      </div>

      {/* ======================================================
          KPIs
          ====================================================== */}

      <div className="p-6">

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            xl:grid-cols-3
            gap-4
          "
        >

          {/* CONEXIÓN */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
              hover:shadow-sm
              transition
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                mb-4
              "
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-[var(--erp-text-soft)]
                "
              >
                Conexión de esta vista
              </span>

              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-primary)]
                "
                aria-hidden="true"
              >
                <use href="/icons/icons.svg#activity" />
              </svg>

            </div>

            <div
              className="
                text-3xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              {resumen}
            </div>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              {conectado
                ? "Conexión activa"
                : "Sin conexión"}
            </p>

          </div>

          {/* MENSAJES */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
              hover:shadow-sm
              transition
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                mb-4
              "
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-[var(--erp-text-soft)]
                "
              >
                Mensajes recibidos
              </span>

              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-primary)]
                "
                aria-hidden="true"
              >
                <use href="/icons/icons.svg#activity" />
              </svg>

            </div>

            <div
              className="
                text-3xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              {stats.mensajes}
            </div>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              Eventos recibidos por esta conexión
            </p>

          </div>

          {/* ÚLTIMA ACTIVIDAD */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
              hover:shadow-sm
              transition
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                mb-4
              "
            >

              <span
                className="
                  text-sm
                  font-medium
                  text-[var(--erp-text-soft)]
                "
              >
                Última actividad
              </span>

              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-primary)]
                "
                aria-hidden="true"
              >
                <use href="/icons/icons.svg#clock" />
              </svg>

            </div>

            <div
              className="
                text-xl
                font-bold
                text-[var(--erp-text)]
                truncate
              "
            >
              {ultimaActividad}
            </div>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              Último evento recibido
            </p>

          </div>

        </div>

        {/* ====================================================
            SUSCRIPCIÓN
            ==================================================== */}

        <div
          className="
            mt-5
            rounded-2xl
            border
            border-[var(--erp-border)]
            bg-[var(--erp-surface-soft)]
            p-5
          "
        >

          <div
            className="
              flex
              flex-col
              md:flex-row
              md:items-center
              md:justify-between
              gap-4
            "
          >

            <div>

              <h3
                className="
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                Suscripción realtime
              </h3>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                Esta vista escucha eventos del canal técnico
                del sistema.
              </p>

            </div>

            <div
              className="
                flex
                flex-wrap
                gap-2
              "
            >

              <span
                className="
                  inline-flex
                  items-center
                  px-3
                  py-1.5
                  rounded-lg
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  text-xs
                  font-medium
                  text-[var(--erp-primary)]
                "
              >
                módulo: panel-tecnico
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  px-3
                  py-1.5
                  rounded-lg
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  text-xs
                  font-medium
                  text-[var(--erp-primary)]
                "
              >
                grupo: monitor-realtime
              </span>

              <span
                className="
                  inline-flex
                  items-center
                  px-3
                  py-1.5
                  rounded-lg
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  text-xs
                  font-medium
                  text-[var(--erp-primary)]
                "
              >
                rol: admin
              </span>

            </div>

          </div>

        </div>

        {/* ====================================================
            ENDPOINT
            ==================================================== */}

        <div
          className="
            mt-5
            px-4
            py-3
            rounded-xl
            bg-[var(--erp-surface-soft)]
            border
            border-[var(--erp-border)]
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-2
          "
        >

          <span
            className="
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            Endpoint WebSocket
          </span>

          <code
            className="
              text-xs
              font-mono
              text-[var(--erp-primary)]
            "
          >
            /ws/realtime/
          </code>

        </div>

      </div>

    </section>
  );
}

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { buildRealtimeWsUrl } from "../../api/monitorRealtime";

/**
 * ============================================================
 * MONITOR REALTIME — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * Monitor técnico del WebSocket realtime.
 *
 * - Conexión WebSocket /ws/realtime/
 * - Parámetros:
 *      modulo=panel-tecnico
 *      grupo=monitor-realtime
 *      rol=admin
 *
 * - Reconexión automática
 * - Limpieza al desmontar
 * - Contador de conexiones
 * - Contador de mensajes
 * - Última actividad
 * - Estado visual de conexión
 * - Diseño compatible con MonitorSistema
 * ============================================================
 */

export default function MonitorRealtime() {

  // ============================================================
  // REFERENCIAS
  // ============================================================

  const wsRef = useRef(null);

  const reconnectTimerRef = useRef(null);

  const reconnectAttemptsRef = useRef(0);

  const mountedRef = useRef(false);

  // Evita crear más de una conexión simultánea.
  const connectingRef = useRef(false);

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================

  const modulo = "panel-tecnico";

  const grupo = "monitor-realtime";

  const rol = "admin";

  const MAX_RECONNECT_ATTEMPTS = 10;

  const RECONNECT_BASE_DELAY = 2000;

  const RECONNECT_MAX_DELAY = 30000;

  // ============================================================
  // ESTADO
  // ============================================================

  const [estado, setEstado] =
    useState("desconectado");

  const [mensajesRecibidos, setMensajesRecibidos] =
    useState(0);

  const [ultimaActividad, setUltimaActividad] =
    useState(null);

  const [conexiones, setConexiones] =
    useState(0);

  // ============================================================
  // FORMATEAR HORA
  // ============================================================

  const formatearHora = useCallback(
    (fecha) => {

      if (!fecha) {
        return "—";
      }

      try {

        return new Date(fecha).toLocaleTimeString(
          "es-ES",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        );

      } catch {

        return "—";

      }

    },
    []
  );

  // ============================================================
  // CANCELAR RECONEXIÓN
  // ============================================================

  const cancelarReconexión = useCallback(() => {

    if (reconnectTimerRef.current) {

      clearTimeout(
        reconnectTimerRef.current
      );

      reconnectTimerRef.current = null;

    }

  }, []);

  // ============================================================
  // CERRAR SOCKET ACTUAL
  // ============================================================

  const cerrarSocket = useCallback(() => {

    const ws = wsRef.current;

    if (!ws) {
      return;
    }

    try {

      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;

      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {

        ws.close();

      }

    } catch (error) {

      console.warn(
        "MonitorRealtime: error cerrando WebSocket:",
        error
      );

    }

    wsRef.current = null;

    connectingRef.current = false;

  }, []);

  // ============================================================
  // PROGRAMAR RECONEXIÓN
  // ============================================================

  const programarReconexión = useCallback(() => {

    if (!mountedRef.current) {
      return;
    }

    if (reconnectTimerRef.current) {
      return;
    }

    if (
      reconnectAttemptsRef.current >=
      MAX_RECONNECT_ATTEMPTS
    ) {

      console.warn(
        "MonitorRealtime: máximo de intentos de reconexión alcanzado."
      );

      setEstado("desconectado");

      return;

    }

    const intento =
      reconnectAttemptsRef.current;

    const delay = Math.min(
      RECONNECT_BASE_DELAY *
        Math.pow(2, intento),
      RECONNECT_MAX_DELAY
    );

    reconnectAttemptsRef.current =
      intento + 1;

    reconnectTimerRef.current =
      setTimeout(() => {

        reconnectTimerRef.current = null;

        if (!mountedRef.current) {
          return;
        }

        conectarWebSocket();

      }, delay);

  }, []);

  // ============================================================
  // CONECTAR WEBSOCKET
  // ============================================================

  const conectarWebSocket = useCallback(() => {

    if (!mountedRef.current) {
      return;
    }

    // ----------------------------------------------------------
    // EVITAR CONEXIONES DUPLICADAS
    // ----------------------------------------------------------

    if (connectingRef.current) {
      return;
    }

    const socketActual =
      wsRef.current;

    if (
      socketActual &&
      (
        socketActual.readyState ===
          WebSocket.OPEN ||
        socketActual.readyState ===
          WebSocket.CONNECTING
      )
    ) {

      return;

    }

    // ----------------------------------------------------------
    // PREPARAR ESTADO
    // ----------------------------------------------------------

    connectingRef.current = true;

    setEstado("conectando");

    // ----------------------------------------------------------
    // GENERAR URL
    // ----------------------------------------------------------

    let wsUrl;

    try {

      wsUrl = buildRealtimeWsUrl({
        modulo,
        grupo,
        rol,
      });

    } catch (error) {

      console.error(
        "MonitorRealtime: error generando URL WebSocket:",
        error
      );

      connectingRef.current = false;

      setEstado("desconectado");

      programarReconexión();

      return;

    }

    console.log(
      "MonitorRealtime: conectando WebSocket:",
      wsUrl
    );

    // ----------------------------------------------------------
    // CREAR WEBSOCKET
    // ----------------------------------------------------------

    let ws;

    try {

      ws = new WebSocket(wsUrl);

    } catch (error) {

      console.error(
        "MonitorRealtime: no se pudo crear WebSocket:",
        error
      );

      connectingRef.current = false;

      setEstado("desconectado");

      programarReconexión();

      return;

    }

    wsRef.current = ws;

    // ==========================================================
    // OPEN
    // ==========================================================

    ws.onopen = () => {

      if (!mountedRef.current) {
        return;
      }

      connectingRef.current = false;

      reconnectAttemptsRef.current = 0;

      setEstado("conectado");

      setConexiones(
        (valor) => valor + 1
      );

      setUltimaActividad(
        new Date()
      );

      console.log(
        "MonitorRealtime: WebSocket conectado"
      );

    };

    // ==========================================================
    // MESSAGE
    // ==========================================================

    ws.onmessage = (event) => {

      if (!mountedRef.current) {
        return;
      }

      setMensajesRecibidos(
        (valor) => valor + 1
      );

      setUltimaActividad(
        new Date()
      );

    };

    // ==========================================================
    // ERROR
    // ==========================================================

    ws.onerror = (event) => {

      if (!mountedRef.current) {
        return;
      }

      /*
       * No hacemos console.error aquí.
       *
       * El navegador ya muestra automáticamente el error
       * WebSocket en DevTools y evitamos duplicar mensajes
       * de error innecesarios.
       */

      console.warn(
        "MonitorRealtime: error de comunicación WebSocket."
      );

      setEstado("desconectado");

    };

    // ==========================================================
    // CLOSE
    // ==========================================================

    ws.onclose = () => {

      connectingRef.current = false;

      if (!mountedRef.current) {
        return;
      }

      setEstado("desconectado");

      console.warn(
        "MonitorRealtime: WebSocket cerrado."
      );

      programarReconexión();

    };

  }, [
    grupo,
    modulo,
    rol,
    programarReconexión,
  ]);

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================

  useEffect(() => {

    mountedRef.current = true;

    conectarWebSocket();

    return () => {

      mountedRef.current = false;

      cancelarReconexión();

      cerrarSocket();

    };

  }, [
    conectarWebSocket,
    cancelarReconexión,
    cerrarSocket,
  ]);

  // ============================================================
  // ESTADO VISUAL
  // ============================================================

  const estadoConfig = {

    conectado: {
      texto: "WebSocket conectado",
      punto: "bg-emerald-500",
      fondo:
        "bg-emerald-50",
      borde:
        "border-emerald-200",
      textoClase:
        "text-emerald-700",
    },

    conectando: {
      texto: "Conectando WebSocket...",
      punto: "bg-amber-500 animate-pulse",
      fondo:
        "bg-amber-50",
      borde:
        "border-amber-200",
      textoClase:
        "text-amber-700",
    },

    desconectado: {
      texto: "WebSocket desconectado",
      punto: "bg-red-500",
      fondo:
        "bg-red-50",
      borde:
        "border-red-200",
      textoClase:
        "text-red-700",
    },

  };

  const estadoActual =
    estadoConfig[estado] ||
    estadoConfig.desconectado;

  // ============================================================
  // RENDER
  // ============================================================

  return (

    <section
      className="
        bg-[var(--erp-surface)]
        border
        border-[var(--erp-border)]
        rounded-2xl
        shadow-sm
        overflow-hidden
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
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-4
        "
      >

        <div>

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                w-11
                h-11
                rounded-2xl
                bg-[var(--erp-primary-soft)]
                border
                border-[var(--erp-border)]
                flex
                items-center
                justify-center
                text-[var(--erp-primary)]
              "
            >

              <svg
                className="w-5 h-5"
                aria-hidden="true"
              >

                <use
                  href="/icons/icons.svg#activity"
                />

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
                  mt-0.5
                "
              >
                Conexión WebSocket del sistema
              </p>

            </div>

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
            font-medium
            ${estadoActual.fondo}
            ${estadoActual.borde}
            ${estadoActual.textoClase}
          `}
        >

          <span
            className={`
              w-2
              h-2
              rounded-full
              ${estadoActual.punto}
            `}
          />

          {estadoActual.texto}

        </div>

      </div>


      {/* ======================================================
          CONTENIDO
          ====================================================== */}

      <div className="p-5 sm:p-6">

        {/* ====================================================
            KPIS
            ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-4
          "
        >

          {/* CONEXIONES */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-4
            "
          >

            <div
              className="
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
              "
            >
              Conexión de esta vista
            </div>

            <div
              className="
                mt-2
                text-3xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              {conexiones}
            </div>

            <div
              className="
                mt-1
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              {estado === "conectado"
                ? "Conexión activa"
                : "Sin conexión activa"}
            </div>

          </div>


          {/* MENSAJES */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-4
            "
          >

            <div
              className="
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
              "
            >
              Mensajes recibidos
            </div>

            <div
              className="
                mt-2
                text-3xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              {mensajesRecibidos}
            </div>

            <div
              className="
                mt-1
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Eventos recibidos por esta conexión
            </div>

          </div>


          {/* ACTIVIDAD */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-4
            "
          >

            <div
              className="
                text-xs
                font-medium
                text-[var(--erp-text-soft)]
              "
            >
              Última actividad
            </div>

            <div
              className="
                mt-2
                text-2xl
                font-bold
                text-[var(--erp-text)]
              "
            >
              {formatearHora(
                ultimaActividad
              )}
            </div>

            <div
              className="
                mt-1
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              Último evento recibido
            </div>

          </div>

        </div>


        {/* ====================================================
            SUSCRIPCIÓN
            ==================================================== */}

        <div
          className="
            mt-4
            rounded-2xl
            border
            border-[var(--erp-border)]
            bg-[var(--erp-surface-soft)]
            p-4
          "
        >

          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:items-center
              sm:justify-between
              gap-3
            "
          >

            <div>

              <div
                className="
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                Suscripción realtime
              </div>

              <div
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                Esta vista escucha eventos del canal técnico del sistema.
              </div>

            </div>


            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >

              <span
                className="
                  inline-flex
                  items-center
                  px-2.5
                  py-1
                  rounded-lg
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  text-xs
                  text-[var(--erp-primary)]
                  font-medium
                "
              >
                módulo: {modulo}
              </span>


              <span
                className="
                  inline-flex
                  items-center
                  px-2.5
                  py-1
                  rounded-lg
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  text-xs
                  text-[var(--erp-primary)]
                  font-medium
                "
              >
                grupo: {grupo}
              </span>


              <span
                className="
                  inline-flex
                  items-center
                  px-2.5
                  py-1
                  rounded-lg
                  bg-[var(--erp-primary-soft)]
                  border
                  border-[var(--erp-border)]
                  text-xs
                  text-[var(--erp-primary)]
                  font-medium
                "
              >
                rol: {rol}
              </span>

            </div>

          </div>

        </div>


        {/* ====================================================
            ENDPOINT
            ==================================================== */}

        <div
          className="
            mt-4
            rounded-2xl
            border
            border-[var(--erp-border)]
            bg-[var(--erp-surface-soft)]
            px-4
            py-3
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

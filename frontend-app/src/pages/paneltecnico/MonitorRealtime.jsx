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
 * - Diseño responsive
 *
 * IMPORTANTE:
 * El backend actual todavía no envía estadísticas globales
 * de todas las conexiones.
 *
 * Por ahora este componente monitoriza correctamente:
 * - la conexión WebSocket de esta vista
 * - estado conectado/desconectado
 * - tiempo de conexión
 * - mensajes recibidos
 *
 * El contador global real se implementará cuando el backend
 * empiece a emitir eventos de conexión/desconexión.
 * ============================================================
 */

export default function MonitorRealtime() {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [conectado, setConectado] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    mensajes: 0,
    ultimaActividad: null,
    porRol: {},
    porModulo: {},
    porGrupo: {},
  });

  // ============================================================
  // CONEXIÓN WEBSOCKET
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;

    if (!baseUrl) {
      console.warn(
        "MonitorRealtime: VITE_API_URL no está configurada."
      );

      return () => {
        mountedRef.current = false;
      };
    }

    let cerradoManualmente = false;

    const conectar = () => {
      if (!mountedRef.current || cerradoManualmente) {
        return;
      }

      // --------------------------------------------------------
      // LIMPIAR CONEXIÓN ANTERIOR
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

const url = buildRealtimeWsUrl({
  modulo: "panel-tecnico",
  grupo: "monitor-realtime",
  rol: "admin",
});

      console.log(
        "MonitorRealtime: conectando WebSocket:",
        url
      );

      let ws;

      try {
        ws = new WebSocket(url);
      } catch (error) {
        console.error(
          "MonitorRealtime: error creando WebSocket:",
          error
        );

        programarReconexión();
        return;
      }

      wsRef.current = ws;

      // ========================================================
      // OPEN
      // ========================================================

      ws.onopen = () => {
        if (!mountedRef.current || cerradoManualmente) {
          return;
        }

        console.log(
          "MonitorRealtime: WebSocket conectado"
        );

        setConectado(true);

        setStats((prev) => ({
          ...prev,

          total: 1,

          ultimaActividad: new Date().toISOString(),

          porModulo: {
            ...prev.porModulo,

            "panel-tecnico":
              (prev.porModulo["panel-tecnico"] || 0) + 1,
          },

          porGrupo: {
            ...prev.porGrupo,

            "monitor-realtime":
              (prev.porGrupo["monitor-realtime"] || 0) + 1,
          },

          porRol: {
            ...prev.porRol,

            admin:
              (prev.porRol.admin || 0) + 1,
          },
        }));
      };

      // ========================================================
      // MESSAGE
      // ========================================================

      ws.onmessage = (event) => {
        if (!mountedRef.current || cerradoManualmente) {
          return;
        }

        let mensaje = null;

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
        if (!mountedRef.current || cerradoManualmente) {
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
        if (!mountedRef.current || cerradoManualmente) {
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
          total: 0,
          ultimaActividad:
            new Date().toISOString(),
        }));

        programarReconexión();
      };
    };

    // ==========================================================
    // RECONEXIÓN
    // ==========================================================

    function programarReconexión() {
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
    }

    conectar();

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      cerradoManualmente = true;
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(
          reconnectTimerRef.current
        );

        reconnectTimerRef.current = null;
      }

      try {
        if (wsRef.current) {
          wsRef.current.close();
        }
      } catch {
        // Ignorar
      }

      wsRef.current = null;
    };
  }, [baseUrl]);

  // ============================================================
  // RESUMEN
  // ============================================================

  const resumen = useMemo(
    () => stats.total,
    [stats.total]
  );

  // ============================================================
  // ROL PRINCIPAL
  // ============================================================

  const rolPrincipal = useMemo(() => {
    const entradas = Object.entries(
      stats.porRol
    );

    if (!entradas.length) {
      return {
        nombre: "—",
        cantidad: 0,
      };
    }

    const [nombre, cantidad] = entradas[0];

    return {
      nombre,
      cantidad,
    };
  }, [stats.porRol]);

  // ============================================================
  // MÓDULO PRINCIPAL
  // ============================================================

  const moduloPrincipal = useMemo(() => {
    const entradas = Object.entries(
      stats.porModulo
    );

    if (!entradas.length) {
      return {
        nombre: "—",
        cantidad: 0,
      };
    }

    const [nombre, cantidad] = entradas[0];

    return {
      nombre,
      cantidad,
    };
  }, [stats.porModulo]);

  // ============================================================
  // GRUPO PRINCIPAL
  // ============================================================

  const grupoPrincipal = useMemo(() => {
    const entradas = Object.entries(
      stats.porGrupo
    );

    if (!entradas.length) {
      return {
        nombre: "—",
        cantidad: 0,
      };
    }

    const [nombre, cantidad] = entradas[0];

    return {
      nombre,
      cantidad,
    };
  }, [stats.porGrupo]);

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
                Conexiones WebSocket del sistema
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
            xl:grid-cols-4
            gap-4
          "
        >

          {/* TOTAL */}

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
              Estado actual
            </p>

          </div>


          {/* ROL */}

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
                Rol conectado
              </span>

              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-primary)]
                "
              >
                <use href="/icons/icons.svg#user" />
              </svg>

            </div>

            <div
              className="
                text-xl
                font-bold
                text-[var(--erp-text)]
                truncate
              "
              title={rolPrincipal.nombre}
            >
              {rolPrincipal.nombre}
            </div>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              {rolPrincipal.cantidad} conexión(es)
            </p>

          </div>


          {/* MÓDULO */}

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
                Módulo
              </span>

              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-primary)]
                "
              >
                <use href="/icons/icons.svg#folder" />
              </svg>

            </div>

            <div
              className="
                text-xl
                font-bold
                text-[var(--erp-text)]
                truncate
              "
              title={moduloPrincipal.nombre}
            >
              {moduloPrincipal.nombre}
            </div>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              {moduloPrincipal.cantidad} conexión(es)
            </p>

          </div>


          {/* GRUPO */}

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
                Grupo
              </span>

              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-primary)]
                "
              >
                <use href="/icons/icons.svg#users" />
              </svg>

            </div>

            <div
              className="
                text-xl
                font-bold
                text-[var(--erp-text)]
                truncate
              "
              title={grupoPrincipal.nombre}
            >
              {grupoPrincipal.nombre}
            </div>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              {grupoPrincipal.cantidad} conexión(es)
            </p>

          </div>

        </div>


        {/* ====================================================
            ACTIVIDAD WEBSOCKET
            ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            gap-4
            mt-5
          "
        >

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <h3
                  className="
                    text-sm
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Mensajes recibidos
                </h3>

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

              <span
                className="
                  text-2xl
                  font-bold
                  text-[var(--erp-primary)]
                "
              >
                {stats.mensajes}
              </span>

            </div>

          </div>


          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <h3
                  className="
                    text-sm
                    font-semibold
                    text-[var(--erp-text)]
                  "
                >
                  Última actividad
                </h3>

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

              <span
                className="
                  text-sm
                  font-semibold
                  text-[var(--erp-text)]
                "
              >
                {ultimaActividad}
              </span>

            </div>

          </div>

        </div>


        {/* ====================================================
            DETALLE
            ==================================================== */}

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-3
            gap-4
            mt-5
          "
        >

          {/* POR ROL */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
            "
          >

            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
                mb-4
              "
            >
              Conexiones por rol
            </h3>

            <div className="space-y-2">

              {Object.entries(stats.porRol).length === 0 ? (

                <p
                  className="
                    text-sm
                    text-[var(--erp-text-soft)]
                  "
                >
                  Sin datos disponibles
                </p>

              ) : (

                Object.entries(stats.porRol).map(
                  ([rol, count]) => (

                    <div
                      key={rol}
                      className="
                        flex
                        items-center
                        justify-between
                        py-2
                        px-3
                        rounded-xl
                        bg-[var(--erp-surface)]
                        border
                        border-[var(--erp-border)]
                      "
                    >

                      <span
                        className="
                          text-sm
                          text-[var(--erp-text)]
                        "
                      >
                        {rol}
                      </span>

                      <span
                        className="
                          text-sm
                          font-semibold
                          text-[var(--erp-primary)]
                        "
                      >
                        {count}
                      </span>

                    </div>

                  )
                )

              )}

            </div>

          </div>


          {/* POR MÓDULO */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
            "
          >

            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
                mb-4
              "
            >
              Conexiones por módulo
            </h3>

            <div className="space-y-2">

              {Object.entries(stats.porModulo).length === 0 ? (

                <p
                  className="
                    text-sm
                    text-[var(--erp-text-soft)]
                  "
                >
                  Sin datos disponibles
                </p>

              ) : (

                Object.entries(stats.porModulo).map(
                  ([modulo, count]) => (

                    <div
                      key={modulo}
                      className="
                        flex
                        items-center
                        justify-between
                        py-2
                        px-3
                        rounded-xl
                        bg-[var(--erp-surface)]
                        border
                        border-[var(--erp-border)]
                      "
                    >

                      <span
                        className="
                          text-sm
                          text-[var(--erp-text)]
                        "
                      >
                        {modulo}
                      </span>

                      <span
                        className="
                          text-sm
                          font-semibold
                          text-[var(--erp-primary)]
                        "
                      >
                        {count}
                      </span>

                    </div>

                  )
                )

              )}

            </div>

          </div>


          {/* POR GRUPO */}

          <div
            className="
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              p-5
            "
          >

            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
                mb-4
              "
            >
              Conexiones por grupo
            </h3>

            <div className="space-y-2">

              {Object.entries(stats.porGrupo).length === 0 ? (

                <p
                  className="
                    text-sm
                    text-[var(--erp-text-soft)]
                  "
                >
                  Sin datos disponibles
                </p>

              ) : (

                Object.entries(stats.porGrupo).map(
                  ([grupo, count]) => (

                    <div
                      key={grupo}
                      className="
                        flex
                        items-center
                        justify-between
                        py-2
                        px-3
                        rounded-xl
                        bg-[var(--erp-surface)]
                        border
                        border-[var(--erp-border)]
                      "
                    >

                      <span
                        className="
                          text-sm
                          text-[var(--erp-text)]
                        "
                      >
                        {grupo}
                      </span>

                      <span
                        className="
                          text-sm
                          font-semibold
                          text-[var(--erp-primary)]
                        "
                      >
                        {count}
                      </span>

                    </div>

                  )
                )

              )}

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

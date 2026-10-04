import { useEffect, useRef, useState, useMemo } from "react";
import { buildRealtimeWsUrl } from "../../api/monitorRealtime";

/**
 * ============================================================
 * MONITOR REALTIME — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * - WebSocket realtime
 * - Estado de conexión visible
 * - KPIs premium
 * - Integrado con variables --erp-*
 * - Diseño responsive
 * ============================================================
 */

export default function MonitorRealtime() {

  const wsRef = useRef(null);

  const [conectado, setConectado] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    porRol: {},
    porModulo: {},
    porGrupo: {},
    porUsuario: {},
  });


  // ============================================================
  // WEBSOCKET
  // ============================================================

  useEffect(() => {

    let ws = null;

    try {

      const url = buildRealtimeWsUrl({
        modulo: "panel-tecnico",
        grupo: "monitor-realtime",
        rol: "admin",
      });

      console.log(
        "MONITOR REALTIME: conectando a:",
        url
      );

      ws = new WebSocket(url);

      wsRef.current = ws;


      // --------------------------------------------------------
      // CONECTADO
      // --------------------------------------------------------

      ws.onopen = () => {

        console.log(
          "MONITOR REALTIME: WebSocket conectado"
        );

        setConectado(true);

        setStats((prev) => ({

          ...prev,

          total: prev.total + 1,

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


      // --------------------------------------------------------
      // MENSAJES
      // --------------------------------------------------------

      ws.onmessage = (event) => {

        console.log(
          "MONITOR REALTIME: evento recibido:",
          event.data
        );

      };


      // --------------------------------------------------------
      // ERROR
      // --------------------------------------------------------

      ws.onerror = (error) => {

        console.error(
          "MONITOR REALTIME: error WebSocket:",
          error
        );

        setConectado(false);

      };


      // --------------------------------------------------------
      // CERRADO
      // --------------------------------------------------------

      ws.onclose = (event) => {

        console.log(
          "MONITOR REALTIME: WebSocket cerrado:",
          event.code,
          event.reason
        );

        setConectado(false);

        setStats((prev) => ({

          ...prev,

          total: Math.max(
            prev.total - 1,
            0
          ),

        }));

      };

    } catch (error) {

      console.error(
        "MONITOR REALTIME: no se pudo crear WebSocket:",
        error
      );

      setConectado(false);

    }


    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {

      if (ws) {

        try {

          ws.close();

        } catch {
          // Ignorar error de cierre
        }

      }

      wsRef.current = null;

    };

  }, []);


  // ============================================================
  // RESUMEN
  // ============================================================

  const resumen = useMemo(
    () => stats.total,
    [stats.total]
  );


  const rolPrincipal = useMemo(() => {

    const entradas =
      Object.entries(stats.porRol);

    if (!entradas.length) {

      return {
        nombre: "—",
        cantidad: 0,
      };

    }

    const [nombre, cantidad] =
      entradas[0];

    return {
      nombre,
      cantidad,
    };

  }, [stats.porRol]);


  const moduloPrincipal = useMemo(() => {

    const entradas =
      Object.entries(stats.porModulo);

    if (!entradas.length) {

      return {
        nombre: "—",
        cantidad: 0,
      };

    }

    const [nombre, cantidad] =
      entradas[0];

    return {
      nombre,
      cantidad,
    };

  }, [stats.porModulo]);


  const grupoPrincipal = useMemo(() => {

    const entradas =
      Object.entries(stats.porGrupo);

    if (!entradas.length) {

      return {
        nombre: "—",
        cantidad: 0,
      };

    }

    const [nombre, cantidad] =
      entradas[0];

    return {
      nombre,
      cantidad,
    };

  }, [stats.porGrupo]);


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
                Conexiones activas
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
              Esta vista
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

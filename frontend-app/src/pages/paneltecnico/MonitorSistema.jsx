import { useEffect, useState, useCallback, useMemo } from "react";
import MonitorRealtime from "./MonitorRealtime";
import {
  listarTablas,
  describirTabla,
  obtenerContenidoTabla,
} from "../../api/monitorRealtime";

/**
 * ============================================================
 * MONITOR SISTEMA — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * - Diagnóstico BD
 * - Monitor WebSocket realtime
 * - Glass UI
 * - Selector de tablas premium
 * - Tablas técnicas mejoradas
 * - Estados vacíos
 * - Render optimizado
 * ============================================================
 */

export default function MonitorSistema() {
  const [tablas, setTablas] = useState([]);
  const [tablaSeleccionada, setTablaSeleccionada] = useState(null);
  const [columnas, setColumnas] = useState([]);
  const [contenido, setContenido] = useState([]);

  const [cargandoTablas, setCargandoTablas] = useState(false);
  const [cargandoTabla, setCargandoTabla] = useState(false);
  const [errorTablas, setErrorTablas] = useState(null);
  const [errorTabla, setErrorTabla] = useState(null);

  // ============================================================
  // CARGAR LISTADO DE TABLAS
  // ============================================================

  useEffect(() => {
    const cargarTablas = async () => {
      setCargandoTablas(true);
      setErrorTablas(null);

      try {
        const res = await listarTablas();

        setTablas(
          Array.isArray(res.data?.tablas)
            ? res.data.tablas
            : []
        );
      } catch (error) {
        console.error("Error cargando tablas:", error);
        setErrorTablas(
          "No se ha podido cargar el listado de tablas."
        );
        setTablas([]);
      } finally {
        setCargandoTablas(false);
      }
    };

    cargarTablas();
  }, []);

  // ============================================================
  // CARGAR COLUMNAS + CONTENIDO
  // ============================================================

  const cargarTabla = useCallback(async (tabla) => {
    if (!tabla) return;

    setTablaSeleccionada(tabla);
    setColumnas([]);
    setContenido([]);
    setErrorTabla(null);
    setCargandoTabla(true);

    try {
      const [cols, cont] = await Promise.all([
        describirTabla(tabla),
        obtenerContenidoTabla(tabla),
      ]);

      setColumnas(
        Array.isArray(cols.data?.columnas)
          ? cols.data.columnas
          : []
      );

      setContenido(
        Array.isArray(cont.data?.filas)
          ? cont.data.filas
          : []
      );
    } catch (error) {
      console.error(
        `Error cargando tabla ${tabla}:`,
        error
      );

      setErrorTabla(
        `No se ha podido cargar la información de la tabla "${tabla}".`
      );

      setColumnas([]);
      setContenido([]);
    } finally {
      setCargandoTabla(false);
    }
  }, []);

  const columnasMemo = useMemo(
    () => columnas,
    [columnas]
  );

  const contenidoMemo = useMemo(
    () => contenido,
    [contenido]
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="
          flex
          flex-col
          md:flex-row
          md:items-center
          md:justify-between
          gap-3
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
                border-[var(--erp-primary)]
                flex
                items-center
                justify-center
                text-[var(--erp-primary)]
                shadow-sm
              "
            >
              <svg className="w-5 h-5" aria-hidden="true">
                <use href="/icons/icons.svg#monitor" />
              </svg>
            </div>

            <div>
              <h1
                className="
                  text-2xl
                  font-bold
                  text-[var(--erp-text)]
                  drop-shadow-sm
                "
              >
                Monitor del Sistema
              </h1>

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                  mt-0.5
                "
              >
                Supervisión técnica, WebSocket y diagnóstico de base de datos
              </p>
            </div>
          </div>
        </div>

        <div
          className="
            inline-flex
            items-center
            gap-2
            px-3
            py-2
            rounded-xl
            bg-[var(--erp-surface)]
            border
            border-[var(--erp-border)]
            text-xs
            text-[var(--erp-text-soft)]
            shadow-sm
          "
        >
          <span
            className="
              w-2
              h-2
              rounded-full
              bg-emerald-500
              animate-pulse
            "
          />

          Sistema operativo
        </div>
      </div>

      {/* ======================================================
          MONITOR REALTIME
          ====================================================== */}

<MonitorRealtime baseUrl={import.meta.env.VITE_API_URL} />
      {/* ======================================================
          DIAGNÓSTICO BD
          ====================================================== */}

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

        {/* CABECERA SECCIÓN */}

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
            gap-3
          "
        >
          <div>
            <h2
              className="
                text-lg
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Diagnóstico de base de datos
            </h2>

            <p
              className="
                text-sm
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              Consulta la estructura y el contenido de las tablas del sistema.
            </p>
          </div>

          <div
            className="
              px-3
              py-2
              rounded-xl
              bg-[var(--erp-surface-soft)]
              border
              border-[var(--erp-border)]
              text-xs
              font-medium
              text-[var(--erp-text-soft)]
            "
          >
            {tablas.length}{" "}
            {tablas.length === 1 ? "tabla" : "tablas"}
          </div>
        </div>

        {/* CONTENIDO */}

        <div className="p-6">

          <div
            className="
              grid
              grid-cols-1
              xl:grid-cols-[280px_minmax(0,1fr)]
              gap-6
            "
          >

            {/* ==================================================
                LISTADO DE TABLAS
                ================================================== */}

            <aside
              className="
                rounded-2xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface-soft)]
                overflow-hidden
              "
            >

              <div
                className="
                  px-4
                  py-3
                  border-b
                  border-[var(--erp-border)]
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-2
                  "
                >
                  <h3
                    className="
                      text-sm
                      font-semibold
                      text-[var(--erp-text)]
                    "
                  >
                    Tablas
                  </h3>

                  <span
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                    "
                  >
                    BD
                  </span>
                </div>
              </div>

              <div className="p-2 max-h-[560px] overflow-y-auto scrollbar-thin">

                {cargandoTablas && (
                  <div
                    className="
                      px-3
                      py-8
                      text-center
                      text-sm
                      text-[var(--erp-text-soft)]
                    "
                  >
                    <div
                      className="
                        mx-auto
                        mb-3
                        w-6
                        h-6
                        rounded-full
                        border-2
                        border-[var(--erp-border)]
                        border-t-[var(--erp-primary)]
                        animate-spin
                      "
                    />

                    Cargando tablas...
                  </div>
                )}

                {!cargandoTablas && errorTablas && (
                  <div
                    className="
                      m-2
                      p-3
                      rounded-xl
                      bg-red-50
                      border
                      border-red-200
                      text-red-700
                      text-xs
                    "
                  >
                    {errorTablas}
                  </div>
                )}

                {!cargandoTablas &&
                  !errorTablas &&
                  tablas.length === 0 && (
                    <div
                      className="
                        px-3
                        py-8
                        text-center
                        text-sm
                        text-[var(--erp-text-soft)]
                      "
                    >
                      No hay tablas disponibles.
                    </div>
                  )}

                {!cargandoTablas &&
                  !errorTablas &&
                  tablas.map((tabla) => {
                    const activa =
                      tablaSeleccionada === tabla;

                    return (
                      <button
                        key={tabla}
                        type="button"
                        onClick={() => cargarTabla(tabla)}
                        className={`
                          w-full
                          flex
                          items-center
                          gap-3
                          px-3
                          py-2.5
                          mb-1
                          rounded-xl
                          text-left
                          text-sm
                          transition-all
                          duration-200
                          border
                          ${
                            activa
                              ? `
                                bg-[var(--erp-primary)]
                                border-[var(--erp-primary)]
                                text-white
                                shadow-sm
                              `
                              : `
                                bg-transparent
                                border-transparent
                                text-[var(--erp-text)]
                                hover:bg-[var(--erp-primary-soft)]
                                hover:border-[var(--erp-border)]
                              `
                          }
                        `}
                      >
                        <svg
                          className={`
                            w-4
                            h-4
                            flex-shrink-0
                            ${
                              activa
                                ? "text-white"
                                : "text-[var(--erp-primary)]"
                            }
                          `}
                          aria-hidden="true"
                        >
                          <use href="/icons/icons.svg#database" />
                        </svg>

                        <span className="truncate">
                          {tabla}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </aside>

            {/* ==================================================
                DETALLE DE TABLA
                ================================================== */}

            <div className="min-w-0">

              {!tablaSeleccionada && (
                <div
                  className="
                    min-h-[420px]
                    rounded-2xl
                    border
                    border-dashed
                    border-[var(--erp-border)]
                    bg-[var(--erp-surface-soft)]
                    flex
                    flex-col
                    items-center
                    justify-center
                    text-center
                    px-6
                  "
                >
                  <div
                    className="
                      w-14
                      h-14
                      rounded-2xl
                      bg-[var(--erp-primary-soft)]
                      border
                      border-[var(--erp-border)]
                      flex
                      items-center
                      justify-center
                      text-[var(--erp-primary)]
                      mb-4
                    "
                  >
                    <svg className="w-6 h-6" aria-hidden="true">
                      <use href="/icons/icons.svg#database" />
                    </svg>
                  </div>

                  <h3
                    className="
                      text-lg
                      font-semibold
                      text-[var(--erp-text)]
                    "
                  >
                    Selecciona una tabla
                  </h3>

                  <p
                    className="
                      text-sm
                      text-[var(--erp-text-soft)]
                      max-w-md
                      mt-2
                    "
                  >
                    Selecciona una tabla de la izquierda para consultar
                    sus columnas y sus registros.
                  </p>
                </div>
              )}

              {tablaSeleccionada && (
                <div className="space-y-5">

                  {/* CABECERA TABLA */}

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
                          flex
                          items-center
                          gap-2
                        "
                      >
                        <svg
                          className="
                            w-5
                            h-5
                            text-[var(--erp-primary)]
                          "
                          aria-hidden="true"
                        >
                          <use href="/icons/icons.svg#database" />
                        </svg>

                        <h3
                          className="
                            text-lg
                            font-semibold
                            text-[var(--erp-text)]
                          "
                        >
                          {tablaSeleccionada}
                        </h3>
                      </div>

                      <p
                        className="
                          text-xs
                          text-[var(--erp-text-soft)]
                          mt-1
                        "
                      >
                        Estructura y registros de la tabla seleccionada
                      </p>
                    </div>

                    {cargandoTabla && (
                      <div
                        className="
                          inline-flex
                          items-center
                          gap-2
                          px-3
                          py-2
                          rounded-xl
                          bg-[var(--erp-primary-soft)]
                          border
                          border-[var(--erp-border)]
                          text-xs
                          text-[var(--erp-primary)]
                        "
                      >
                        <span
                          className="
                            w-3
                            h-3
                            rounded-full
                            border-2
                            border-[var(--erp-primary)]
                            border-t-transparent
                            animate-spin
                          "
                        />

                        Cargando...
                      </div>
                    )}
                  </div>

                  {/* ERROR */}

                  {errorTabla && (
                    <div
                      className="
                        p-4
                        rounded-xl
                        bg-red-50
                        border
                        border-red-200
                        text-red-700
                        text-sm
                      "
                    >
                      {errorTabla}
                    </div>
                  )}

                  {/* ==================================================
                      COLUMNAS
                      ================================================== */}

                  {!errorTabla && (
                    <section
                      className="
                        rounded-2xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface-soft)]
                        overflow-hidden
                      "
                    >

                      <div
                        className="
                          px-4
                          py-3
                          border-b
                          border-[var(--erp-border)]
                          flex
                          items-center
                          justify-between
                        "
                      >
                        <div>
                          <h4
                            className="
                              text-sm
                              font-semibold
                              text-[var(--erp-text)]
                            "
                          >
                            Estructura
                          </h4>

                          <p
                            className="
                              text-xs
                              text-[var(--erp-text-soft)]
                              mt-0.5
                            "
                          >
                            Columnas disponibles
                          </p>
                        </div>

                        <span
                          className="
                            px-2.5
                            py-1
                            rounded-lg
                            bg-white
                            border
                            border-[var(--erp-border)]
                            text-xs
                            text-[var(--erp-text-soft)]
                          "
                        >
                          {columnasMemo.length} columnas
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">

                          <thead>
                            <tr
                              className="
                                bg-white
                                border-b
                                border-[var(--erp-border)]
                              "
                            >
                              <th
                                className="
                                  py-3
                                  px-4
                                  text-left
                                  text-xs
                                  font-semibold
                                  uppercase
                                  tracking-wide
                                  text-[var(--erp-text-soft)]
                                "
                              >
                                Columna
                              </th>

                              <th
                                className="
                                  py-3
                                  px-4
                                  text-left
                                  text-xs
                                  font-semibold
                                  uppercase
                                  tracking-wide
                                  text-[var(--erp-text-soft)]
                                "
                              >
                                Tipo
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {columnasMemo.length === 0 ? (
                              <tr>
                                <td
                                  colSpan="2"
                                  className="
                                    py-8
                                    text-center
                                    text-sm
                                    text-[var(--erp-text-soft)]
                                  "
                                >
                                  No se ha encontrado información
                                  sobre las columnas.
                                </td>
                              </tr>
                            ) : (
                              columnasMemo.map((c, i) => (
                                <tr
                                  key={i}
                                  className="
                                    border-b
                                    border-[var(--erp-border)]
                                    last:border-b-0
                                    hover:bg-white
                                    transition
                                  "
                                >
                                  <td
                                    className="
                                      py-2.5
                                      px-4
                                      font-medium
                                      text-[var(--erp-text)]
                                    "
                                  >
                                    {c.columna}
                                  </td>

                                  <td
                                    className="
                                      py-2.5
                                      px-4
                                      text-[var(--erp-text-soft)]
                                    "
                                  >
                                    <span
                                      className="
                                        inline-flex
                                        px-2
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
                                      {c.tipo}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>

                        </table>
                      </div>
                    </section>
                  )}

                  {/* ==================================================
                      CONTENIDO
                      ================================================== */}

                  {!errorTabla && (
                    <section
                      className="
                        rounded-2xl
                        border
                        border-[var(--erp-border)]
                        bg-[var(--erp-surface-soft)]
                        overflow-hidden
                      "
                    >

                      <div
                        className="
                          px-4
                          py-3
                          border-b
                          border-[var(--erp-border)]
                          flex
                          items-center
                          justify-between
                          gap-3
                        "
                      >
                        <div>
                          <h4
                            className="
                              text-sm
                              font-semibold
                              text-[var(--erp-text)]
                            "
                          >
                            Contenido
                          </h4>

                          <p
                            className="
                              text-xs
                              text-[var(--erp-text-soft)]
                              mt-0.5
                            "
                          >
                            Registros disponibles
                          </p>
                        </div>

                        <span
                          className="
                            px-2.5
                            py-1
                            rounded-lg
                            bg-white
                            border
                            border-[var(--erp-border)]
                            text-xs
                            text-[var(--erp-text-soft)]
                          "
                        >
                          {contenidoMemo.length} registros
                        </span>
                      </div>

                      <div
                        className="
                          overflow-auto
                          max-h-[480px]
                          scrollbar-thin
                        "
                      >
                        <table className="w-full text-sm">

                          <thead
                            className="
                              sticky
                              top-0
                              z-10
                            "
                          >
                            <tr
                              className="
                                bg-[var(--erp-surface)]
                                border-b
                                border-[var(--erp-border)]
                              "
                            >
                              {columnasMemo.map((c, i) => (
                                <th
                                  key={i}
                                  className="
                                    py-3
                                    px-4
                                    text-left
                                    whitespace-nowrap
                                    text-xs
                                    font-semibold
                                    uppercase
                                    tracking-wide
                                    text-[var(--erp-text-soft)]
                                  "
                                >
                                  {c.columna}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>

                            {contenidoMemo.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={
                                    Math.max(
                                      columnasMemo.length,
                                      1
                                    )
                                  }
                                  className="
                                    py-10
                                    text-center
                                    text-sm
                                    text-[var(--erp-text-soft)]
                                  "
                                >
                                  Esta tabla no contiene registros
                                  para mostrar.
                                </td>
                              </tr>
                            ) : (
                              contenidoMemo.map((fila, i) => (
                                <tr
                                  key={i}
                                  className="
                                    border-b
                                    border-[var(--erp-border)]
                                    last:border-b-0
                                    hover:bg-white
                                    transition
                                  "
                                >
                                  {columnasMemo.map((c, j) => (
                                    <td
                                      key={j}
                                      className="
                                        py-2.5
                                        px-4
                                        whitespace-nowrap
                                        text-[var(--erp-text)]
                                        max-w-[320px]
                                        truncate
                                      "
                                      title={
                                        fila[c.columna] !== null &&
                                        fila[c.columna] !== undefined
                                          ? String(
                                              fila[c.columna]
                                            )
                                          : ""
                                      }
                                    >
                                      {fila[c.columna] === null ||
                                      fila[c.columna] === undefined
                                        ? (
                                          <span
                                            className="
                                              text-[var(--erp-text-soft)]
                                              italic
                                            "
                                          >
                                            —
                                          </span>
                                        )
                                        : String(
                                            fila[c.columna]
                                          )}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}

                          </tbody>

                        </table>
                      </div>
                    </section>
                  )}

                </div>
              )}

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

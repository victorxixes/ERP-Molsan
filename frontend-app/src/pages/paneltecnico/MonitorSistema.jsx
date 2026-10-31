import { useEffect, useState, useCallback, useMemo } from "react";
import MonitorRealtime from "./MonitorRealtime";
import "./PanelTecnicoSubmodulos.css";
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



  // ============================================================
  // ESTADO
  // ============================================================

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

        // La API devuelve objetos { table_name, table_type }.
        // El selector usa nombres de tabla como cadenas para evitar
        // que React intente renderizar el objeto completo como hijo.
        const listado = Array.isArray(res.data?.tablas)
          ? res.data.tablas
          : [];
        setTablas(
          listado
            .map((item) =>
              typeof item === "string"
                ? item
                : item && typeof item.table_name === "string"
                  ? item.table_name
                  : ""
            )
            .filter(Boolean)
        );

      } catch (error) {

        console.error(
          "Error cargando tablas:",
          error
        );

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

  const cargarTabla = useCallback(
    async (tabla) => {

      if (!tabla) {
        return;
      }

      setTablaSeleccionada(tabla);
      setColumnas([]);
      setContenido([]);
      setErrorTabla(null);
      setCargandoTabla(true);

      try {

        const [cols, cont] =
          await Promise.all([
            describirTabla(tabla),
            obtenerContenidoTabla(tabla),
          ]);

        setColumnas(
          Array.isArray(
            cols.data?.columnas
          )
            ? cols.data.columnas
            : []
        );

        setContenido(
          Array.isArray(
            cont.data?.filas
          )
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

    },
    []
  );

  // ============================================================
  // MEMOS
  // ============================================================

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
    <div className="monitor-sistema-premium panel-tecnico-submodulo-premium min-w-0 p-4 sm:p-6 space-y-6">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="flex
 flex-col
 md:flex-row
 md:items-center
 md:justify-between
 gap-3"
      >

        <div>

          <div
            className="flex
 items-center
 gap-3"
          >

            <div
              className="w-11
 h-11
 
 
 
 
 flex
 items-center
 justify-center"
            >
              <svg
                className="w-5 h-5"
                aria-hidden="true"
              >
                <use href="/icons/icons.svg#monitor" />
              </svg>
            </div>

            <div>

              <h1
                className="drop-shadow-sm"
              >
                Monitor del Sistema
              </h1>

              <p
                className="mt-0.5"
              >
                Supervisión técnica, WebSocket y diagnóstico de base de datos
              </p>

            </div>

          </div>

        </div>


        <div
          className="inline-flex
 items-center
 gap-2
 px-3
 py-2"
        >

          <span
            className="w-2
 h-2"
          />

          Sistema operativo

        </div>

      </div>


      {/* ======================================================
          MONITOR REALTIME
          ====================================================== */}

   <MonitorRealtime />


      {/* ======================================================
          DIAGNÓSTICO BD
          ====================================================== */}

      <section
        className="overflow-hidden"
      >

        {/* CABECERA SECCIÓN */}

        <div
          className="px-6
 py-5
 
 
 flex
 flex-col
 md:flex-row
 md:items-center
 md:justify-between
 gap-3"
        >

          <div>

            <h2
              className=""
            >
              Diagnóstico de base de datos
            </h2>

            <p
              className="mt-1"
            >
              Consulta la estructura y el contenido de las tablas del sistema.
            </p>

          </div>


          <div
            className="px-3
 py-2"
          >
            {tablas.length}{" "}
            {tablas.length === 1
              ? "tabla"
              : "tablas"}
          </div>

        </div>


        {/* CONTENIDO */}

        <div className="p-6">

          <div
            className="grid
 grid-cols-1
 xl:grid-cols-[280px_minmax(0,1fr)]
 gap-6"
          >

            {/* ==================================================
                LISTADO DE TABLAS
                ================================================== */}

            <aside
              className="overflow-hidden"
            >

              <div
                className="px-4
 py-3"
              >

                <div
                  className="flex
 items-center
 justify-between
 gap-2"
                >

                  <h3
                    className=""
                  >
                    Tablas
                  </h3>

                  <span
                    className=""
                  >
                    BD
                  </span>

                </div>

              </div>


              <div
                className="p-2
 max-h-[560px]
 overflow-y-auto
 scrollbar-thin"
              >

                {cargandoTablas && (

                  <div
                    className="px-3
 py-8"
                  >

                    <div
                      className="mx-auto
 mb-3
 w-6
 h-6"
                    />

                    Cargando tablas...

                  </div>

                )}


                {!cargandoTablas &&
                  errorTablas && (

                    <div
                      className="m-2
 p-3"
                    >
                      {errorTablas}
                    </div>

                  )}


                {!cargandoTablas &&
                  !errorTablas &&
                  tablas.length === 0 && (

                    <div
                      className="px-3
 py-8"
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
                        onClick={() =>
                          cargarTabla(tabla)
                        }
                        className={`w-full
 flex
 items-center
 gap-3
 px-3
 py-2.5
 mb-1
 
 
 
 
 
 

 ${
 activa
 ?`
                                bg-[var(--erp-primary)]
                                border-[var(--erp-primary)]
                                text-white
                                shadow-sm
                              `:`
                                bg-transparent
                                border-transparent
                                text-[var(--erp-text)]
                                hover:bg-[var(--erp-primary-soft)]
                                hover:border-[var(--erp-border)]
                              `}`}
                      >

                        <svg
                          className={`w-4
 h-4
 flex-shrink-0

 ${
 activa
 ? ""
 : ""
 }`}
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
                  className="min-h-[420px]
 
 
 
 
 
 flex
 flex-col
 items-center
 justify-center
 
 px-6"
                >

                  <div
                    className="w-14
 h-14
 
 
 
 
 flex
 items-center
 justify-center
 
 mb-4"
                  >

                    <svg
                      className="w-6 h-6"
                      aria-hidden="true"
                    >
                      <use href="/icons/icons.svg#database" />
                    </svg>

                  </div>

                  <h3
                    className=""
                  >
                    Selecciona una tabla
                  </h3>

                  <p
                    className="max-w-md
 mt-2"
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
                    className="flex
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-3"
                  >

                    <div>

                      <div
                        className="flex
 items-center
 gap-2"
                      >

                        <svg
                          className="w-5
 h-5"
                          aria-hidden="true"
                        >
                          <use href="/icons/icons.svg#database" />
                        </svg>

                        <h3
                          className=""
                        >
                          {tablaSeleccionada}
                        </h3>

                      </div>

                      <p
                        className="mt-1"
                      >
                        Estructura y registros de la tabla seleccionada
                      </p>

                    </div>


                    {cargandoTabla && (

                      <div
                        className="inline-flex
 items-center
 gap-2
 px-3
 py-2"
                      >

                        <span
                          className="w-3
 h-3"
                        />

                        Cargando...

                      </div>

                    )}

                  </div>


                  {/* ERROR */}

                  {errorTabla && (

                    <div
                      className="p-4"
                    >
                      {errorTabla}
                    </div>

                  )}


                  {/* ==================================================
                      COLUMNAS
                      ================================================== */}

                  {!errorTabla && (

                    <section
                      className="overflow-hidden"
                    >

                      <div
                        className="px-4
 py-3
 
 
 flex
 items-center
 justify-between"
                      >

                        <div>

                          <h4
                            className=""
                          >
                            Estructura
                          </h4>

                          <p
                            className="mt-0.5"
                          >
                            Columnas disponibles
                          </p>

                        </div>


                        <span
                          className="px-2.5
 py-1"
                        >
                          {columnasMemo.length} columnas
                        </span>

                      </div>


                      <div className="overflow-x-auto">

                        <table className="w-full">

                          <thead>

                            <tr
                              className=""
                            >

                              <th
                                className="py-3
 px-4
 
 
 
 uppercase"
                              >
                                Columna
                              </th>

                              <th
                                className="py-3
 px-4
 
 
 
 uppercase"
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
                                  className="py-8"
                                >
                                  No se ha encontrado información
                                  sobre las columnas.
                                </td>

                              </tr>

                            ) : (

                              columnasMemo.map(
                                (c, i) => (

                                  <tr
                                    key={i}
                                    className=""
                                  >

                                    <td
                                      className="py-2.5
 px-4"
                                    >
                                      {c.columna}
                                    </td>

                                    <td
                                      className="py-2.5
 px-4"
                                    >

                                      <span
                                        className="inline-flex
 px-2
 py-1"
                                      >
                                        {c.tipo}
                                      </span>

                                    </td>

                                  </tr>

                                )
                              )

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
                      className="overflow-hidden"
                    >

                      <div
                        className="px-4
 py-3
 
 
 flex
 items-center
 justify-between
 gap-3"
                      >

                        <div>

                          <h4
                            className=""
                          >
                            Contenido
                          </h4>

                          <p
                            className="mt-0.5"
                          >
                            Registros disponibles
                          </p>

                        </div>


                        <span
                          className="px-2.5
 py-1"
                        >
                          {contenidoMemo.length} registros
                        </span>

                      </div>


                      <div
                        className="overflow-auto
 max-h-[480px]
 scrollbar-thin"
                      >

                        <table className="w-full">

                          <thead
                            className="sticky
 top-0
 z-10"
                          >

                            <tr
                              className=""
                            >

                              {columnasMemo.map(
                                (c, i) => (

                                  <th
                                    key={i}
                                    className="py-3
 px-4
 
 whitespace-nowrap
 
 
 uppercase"
                                  >
                                    {c.columna}
                                  </th>

                                )
                              )}

                            </tr>

                          </thead>


                          <tbody>

                            {contenidoMemo.length === 0 ? (

                              <tr>

                                <td
                                  colSpan={Math.max(
                                    columnasMemo.length,
                                    1
                                  )}
                                  className="py-10"
                                >
                                  Esta tabla no contiene registros
                                  para mostrar.
                                </td>

                              </tr>

                            ) : (

                              contenidoMemo.map(
                                (fila, i) => (

                                  <tr
                                    key={i}
                                    className=""
                                  >

                                    {columnasMemo.map(
                                      (c, j) => {

                                        const valor =
                                          fila[c.columna];

                                        return (

                                          <td
                                            key={j}
                                            className="py-2.5
 px-4
 whitespace-nowrap
 
 max-w-[320px]
 truncate"
                                            title={
                                              valor !== null &&
                                              valor !== undefined
                                                ? String(valor)
                                                : ""
                                            }
                                          >

                                            {valor === null ||
                                            valor === undefined ? (

                                              <span
                                                className=""
                                              >
                                                —
                                              </span>

                                            ) : (

                                              String(valor)

                                            )}

                                          </td>

                                        );

                                      }
                                    )}

                                  </tr>

                                )
                              )

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

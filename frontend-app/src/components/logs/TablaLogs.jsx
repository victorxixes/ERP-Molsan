import { useMemo, useCallback, useState } from "react";

/**
 * TABLA LOGS
 *
 * - Búsqueda
 * - Filtro por fecha
 * - Ordenación
 * - Paginación
 * - Exportación
 * - Iconos por tipo de evento
 * - Responsive
 */

export default function TablaLogs({
  datos = [],
  columnas = [],
  pageSize = 20,
  titulo = "Logs",
  descripcion = "",
  enableSearch = true,
  enableDateFilter = true,
  enableExport = true,
  exportFilename = "logs_sistema",
  iconosEvento = {},
}) {
  const [pagina, setPagina] = useState(0);

  const [busqueda, setBusqueda] = useState("");

  const [filtroFecha, setFiltroFecha] = useState("");

  const [orden, setOrden] = useState({
    campo: columnas[0]?.campo || "fecha",
    asc: false,
  });


  // =========================================================
  // ORDENACIÓN
  // =========================================================

  const ordenar = useCallback((campo) => {
    setOrden((prev) => ({
      campo,
      asc:
        prev.campo === campo
          ? !prev.asc
          : true,
    }));

    setPagina(0);
  }, []);


  // =========================================================
  // DATOS SEGUROS
  // =========================================================

  const datosSeguros = useMemo(() => {
    if (!Array.isArray(datos)) {
      return [];
    }

    return datos.filter(
      (d) =>
        d &&
        typeof d === "object"
    );
  }, [datos]);


  // =========================================================
  // FILTRADO
  // =========================================================

  const datosFiltrados = useMemo(() => {
    const texto = busqueda
      .toLowerCase()
      .trim();

    return datosSeguros.filter((d) => {
      const coincideBusqueda =
        !enableSearch ||
        !texto
          ? true
          : columnas.some((col) => {
              const v = d[col.campo];

              return (
                v != null &&
                String(v)
                  .toLowerCase()
                  .includes(texto)
              );
            });

      const coincideFecha =
        !enableDateFilter
          ? true
          : (() => {
              const colFecha =
                columnas.find(
                  (c) => c.esFecha
                );

              if (!colFecha) {
                return true;
              }

              const v =
                d[colFecha.campo];

              if (v == null) {
                return false;
              }

              if (!filtroFecha) {
                return true;
              }

              try {
                const fecha =
                  new Date(v);

                if (
                  Number.isNaN(
                    fecha.getTime()
                  )
                ) {
                  return String(v).startsWith(
                    filtroFecha
                  );
                }

                const fechaLocal =
                  `${fecha.getFullYear()}-${String(
                    fecha.getMonth() + 1
                  ).padStart(2, "0")}-${String(
                    fecha.getDate()
                  ).padStart(2, "0")}`;

                return (
                  fechaLocal ===
                  filtroFecha
                );
              } catch {
                return String(v).startsWith(
                  filtroFecha
                );
              }
            })();

      return (
        coincideBusqueda &&
        coincideFecha
      );
    });
  }, [
    datosSeguros,
    busqueda,
    filtroFecha,
    columnas,
    enableSearch,
    enableDateFilter,
  ]);


  // =========================================================
  // ORDENAR DATOS
  // =========================================================

  const datosOrdenados = useMemo(() => {
    const {
      campo,
      asc,
    } = orden;

    const dir = asc ? 1 : -1;

    return [...datosFiltrados].sort(
      (a, b) => {
        const va = a[campo];
        const vb = b[campo];

        if (
          va == null &&
          vb == null
        ) {
          return 0;
        }

        if (va == null) {
          return 1 * dir;
        }

        if (vb == null) {
          return -1 * dir;
        }

        if (
          campo
            .toLowerCase()
            .includes("fecha")
        ) {
          const da =
            new Date(va);

          const db =
            new Date(vb);

          const timeA =
            da.getTime();

          const timeB =
            db.getTime();

          if (
            !Number.isNaN(timeA) &&
            !Number.isNaN(timeB)
          ) {
            return (
              (timeA - timeB) *
              dir
            );
          }
        }

        return String(va).localeCompare(
          String(vb),
          "es",
          {
            numeric: true,
            sensitivity: "base",
          }
        ) * dir;
      }
    );
  }, [
    datosFiltrados,
    orden,
  ]);


  // =========================================================
  // PAGINACIÓN
  // =========================================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      datosOrdenados.length /
        pageSize
    )
  );

  const datosPaginados = useMemo(() => {
    return datosOrdenados.slice(
      pagina * pageSize,
      pagina * pageSize +
        pageSize
    );
  }, [
    datosOrdenados,
    pagina,
    pageSize,
  ]);


  // =========================================================
  // EXPORTAR
  // =========================================================

  const descargarExcel =
    useCallback(() => {
      if (!enableExport) {
        return;
      }

      const encabezados =
        columnas.map(
          (c) => c.titulo
        );

      const filas =
        datosOrdenados.map(
          (d) =>
            columnas.map(
              (c) => {
                const v =
                  d[c.campo];

                return v == null
                  ? "-"
                  : String(v)
                      .replace(
                        /\t/g,
                        " "
                      )
                      .replace(
                        /\r?\n/g,
                        " "
                      );
              }
            )
        );

      const contenido = [
        encabezados,
        ...filas,
      ]
        .map(
          (fila) =>
            fila.join("\t")
        )
        .join("\n");

      const blob = new Blob(
        [contenido],
        {
          type:
            "application/vnd.ms-excel",
        }
      );

      const url =
        URL.createObjectURL(
          blob
        );

      const a =
        document.createElement(
          "a"
        );

      a.href = url;

      a.download =
        `${exportFilename}.xls`;

      document.body.appendChild(
        a
      );

      a.click();

      document.body.removeChild(
        a
      );

      URL.revokeObjectURL(
        url
      );
    }, [
      datosOrdenados,
      columnas,
      enableExport,
      exportFilename,
    ]);


  // =========================================================
  // FECHA
  // =========================================================

  const formatearFecha = useCallback(
    (valor) => {
      if (!valor) {
        return "-";
      }

      try {
        const fecha =
          new Date(valor);

        if (
          Number.isNaN(
            fecha.getTime()
          )
        ) {
          return String(valor);
        }

        return fecha.toLocaleString(
          "es-ES",
          {
            dateStyle: "short",
            timeStyle: "short",
          }
        );
      } catch {
        return String(valor);
      }
    },
    []
  );


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="space-y-5"
    >

      {/* =====================================================
          CABECERA TABLA
      ===================================================== */}

      <section
        className="relative
 overflow-hidden

 

 
 

 

 

 

 p-5
 sm:p-6"
      >
        <div
          className="absolute
 top-0
 left-0
 right-0

 h-px"
        />

        <div
          className="relative
 z-10"
        >
          <div
            className="flex
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between

 gap-3"
          >
            <div>
              <h2
               
              >
                {titulo}
              </h2>

              {descripcion && (
                <p
                  className="mt-1"
                >
                  {descripcion}
                </p>
              )}
            </div>

            <div
              className="inline-flex
 items-center
 gap-2

 

 

 
 

 px-3
 py-1.5"
            >
              <span
                className="w-2
 h-2"
              />

              {datosOrdenados.length} registros
            </div>
          </div>
        </div>
      </section>


      {/* =====================================================
          FILTROS
      ===================================================== */}

      {(enableSearch ||
        enableDateFilter ||
        enableExport) && (
        <section
          className="p-4"
        >
          <div
            className="flex
 flex-col
 lg:flex-row

 gap-3

 items-stretch
 lg:items-center"
          >

            {/* BÚSQUEDA */}

            {enableSearch && (
              <div
                className="relative
 flex-1"
              >
                <span
                  className="absolute

 left-3.5
 top-1/2

 

 

 pointer-events-none"
                  aria-hidden="true"
                >
                  🔎
                </span>

                <input
                  type="text"
                  className="w-full

 

 
 

 

 px-4
 py-2.5
 pl-10"
                  placeholder="Buscar en los logs..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(
                      e.target.value
                    );
                    setPagina(0);
                  }}
                />
              </div>
            )}


            {/* FECHA */}

            {enableDateFilter && (
              <div
                className="relative"
              >
                <input
                  type="date"
                  className="w-full
 lg:w-auto

 

 
 

 

 px-4
 py-2.5"
                  value={filtroFecha}
                  onChange={(e) => {
                    setFiltroFecha(
                      e.target.value
                    );
                    setPagina(0);
                  }}
                />
              </div>
            )}


            {/* EXPORTAR */}

            {enableExport && (
              <button
                type="button"
                onClick={
                  descargarExcel
                }
               
              >
                <span
                  aria-hidden="true"
                >
                  📊
                </span>

                Descargar Excel
              </button>
            )}

          </div>
        </section>
      )}


      {/* =====================================================
          TABLA
      ===================================================== */}

      <section
        className="overflow-hidden"
      >
        <div
          className="overflow-x-auto"
        >
          <table
            className="w-full
 min-w-[760px]"
          >
            <thead>
              <tr
               
              >
                {columnas.map(
                  (col) => {
                    const activo =
                      orden.campo ===
                      col.campo;

                    return (
                      <th
                        key={
                          col.campo
                        }
                        scope="col"
                        className="p-4

 

 

 

 whitespace-nowrap"
                        onClick={() =>
                          ordenar(
                            col.campo
                          )
                        }
                      >
                        <div
                          className="flex
 items-center
 gap-2"
                        >
                          <span>
                            {col.titulo}
                          </span>

                          <span
                            className={`${
 activo
 ? ""
 : ""
 }`}
                          >
                            {activo
                              ? orden.asc
                                ? "▲"
                                : "▼"
                              : "↕"}
                          </span>
                        </div>
                      </th>
                    );
                  }
                )}
              </tr>
            </thead>


            <tbody>
              {datosPaginados.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      columnas.length
                    }
                    className="p-10"
                  >
                    <div
                      className="flex
 flex-col
 items-center
 gap-2"
                    >
                      <span
                       
                        aria-hidden="true"
                      >
                        📋
                      </span>

                      <span
                       
                      >
                        No hay registros
                      </span>

                      <span
                       
                      >
                        No se encontraron
                        logs con los
                        filtros actuales.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                datosPaginados.map(
                  (d, idx) => (
                    <tr
                      key={
                        String(
                          d.id ??
                            `${pagina}-${idx}`
                        )
                      }
                     
                    >
                      {columnas.map(
                        (col) => {
                          const valor =
                            d[
                              col.campo
                            ];

                          let contenido =
                            valor == null
                              ? "-"
                              : String(
                                  valor
                                );

                          if (
                            col.esFecha &&
                            valor
                          ) {
                            contenido =
                              formatearFecha(
                                valor
                              );
                          }

                          if (
                            col.esEvento &&
                            valor
                          ) {
                            const icono =
                              iconosEvento[
                                valor
                              ] ||
                              iconosEvento.default ||
                              "📄";

                            return (
                              <td
                                key={
                                  col.campo
                                }
                                className="p-4"
                              >
                                <span
                                  className="inline-flex
 items-center
 gap-2"
                                >
                                  <span
                                    className="flex
 items-center
 justify-center

 w-7
 h-7"
                                  >
                                    {icono}
                                  </span>

                                  <span
                                   
                                  >
                                    {contenido}
                                  </span>
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={
                                col.campo
                              }
                              className="p-4"
                            >
                              {contenido}
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


      {/* =====================================================
          PAGINACIÓN
      ===================================================== */}

      <div
        className="flex
 flex-col
 sm:flex-row

 items-center

 gap-3

 

 
 

 

 

 

 p-3"
      >

        <button
          type="button"
          disabled={
            pagina === 0
          }
          onClick={() =>
            setPagina(
              (p) => p - 1
            )
          }
          className="w-full
 sm:w-auto

 inline-flex
 items-center
 justify-center
 gap-2

 

 
 

 

 px-4
 py-2"
        >
          ← Anterior
        </button>


        <span
          className="inline-flex
 items-center

 

 

 
 

 px-3
 py-1.5"
        >
          Página{" "}
          {Math.min(
            pagina + 1,
            totalPaginas
          )}{" "}
          de{" "}
          {totalPaginas}
        </span>


        <button
          type="button"
          disabled={
            pagina + 1 >=
            totalPaginas
          }
          onClick={() =>
            setPagina(
              (p) => p + 1
            )
          }
          className="w-full
 sm:w-auto

 inline-flex
 items-center
 justify-center
 gap-2

 

 
 

 

 px-4
 py-2"
        >
          Siguiente →
        </button>


        <span
          className="sm:ml-auto"
        >
          Mostrando{" "}
          <strong
           
          >
            {datosPaginados.length}
          </strong>{" "}
          de{" "}
          <strong
           
          >
            {datosOrdenados.length}
          </strong>{" "}
          registros
        </span>

      </div>
    </div>
  );
}

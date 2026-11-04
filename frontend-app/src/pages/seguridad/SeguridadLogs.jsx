import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import {
  useMemo,
  useState,
  useCallback,
} from "react";

import { useSeguridad } from "../../hooks/useSeguridad";


/**
 * ============================================================
 * LOGS TÉCNICOS
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Este componente NO ejecuta cargarTodo().
 *
 * La carga general de Seguridad debe realizarse únicamente
 * desde el componente padre de Seguridad.
 * ============================================================
 */


// ============================================================
// ICONO
// ============================================================

const Icono = ({
  name,
  className = "w-5 h-5",
}) => (

  <svg
    className={`${className} flex-shrink-0`}
    aria-hidden="true"
  >

    <use
      href={`/icons/icons.svg#${name}`}
    />

  </svg>

);


// ============================================================
// ICONOS EVENTO
// ============================================================

const ICONOS_EVENTO = {

  login: "lock",

  login_error: "shield",

  acceso: "folder",

  update: "edit",

  delete: "trash",

  permiso: "shield",

  modulo: "folder",

  error: "shield",

  warning: "shield",

  create: "clipboard",

  logout: "lock",

  default: "clipboard",

};


// ============================================================
// NIVEL
// ============================================================

function obtenerNivel(log) {

  if (
    !log ||
    typeof log !== "object"
  ) {
    return "INFO";
  }


  const nivel =
    log.nivel ??
    log.level ??
    log.severidad ??
    log.tipo ??
    "INFO";


  const valor =
    String(nivel)
      .trim()
      .toUpperCase();


  if (
    valor === "CRITICAL" ||
    valor === "CRITICO" ||
    valor === "CRÍTICO"
  ) {
    return "CRITICAL";
  }


  if (
    valor === "ERROR" ||
    valor === "ERR"
  ) {
    return "ERROR";
  }


  if (
    valor === "WARNING" ||
    valor === "WARN" ||
    valor === "AVISO"
  ) {
    return "WARNING";
  }


  return "INFO";

}


// ============================================================
// NIVELES
// ============================================================

const NIVELES = {

  INFO: {

    label: "INFO",

    icon: "clipboard",

  },


  WARNING: {

    label: "WARNING",

    icon: "shield",

  },


  ERROR: {

    label: "ERROR",

    icon: "shield",

  },


  CRITICAL: {

    label: "CRITICAL",

    icon: "shield",

  },

};


// ============================================================
// BADGE NIVEL
// ============================================================

function NivelBadge({
  nivel,
}) {

  const configuracion =
    NIVELES[nivel] ||
    NIVELES.INFO;


  return (

    <span
      className={`inline-flex
 items-center
 gap-1.5
 px-2.5
 py-1
 
 
 
 
 whitespace-nowrap
 `}
    >

      <Icono
        name={configuracion.icon}
        className="w-3.5 h-3.5"
      />

      {configuracion.label}

    </span>

  );

}


// ============================================================
// BADGE EVENTO
// ============================================================

function EventoBadge({
  evento,
}) {

  const valor =
    String(
      evento ??
      "default"
    )
      .trim()
      .toLowerCase();


  const icon =
    ICONOS_EVENTO[valor] ||
    ICONOS_EVENTO.default;


  return (

    <span
      className="inline-flex
 items-center
 gap-2
 px-2.5
 py-1
 
 
 
 
 
 
 
 whitespace-nowrap"
    >

      <Icono
        name={icon}
        className="w-3.5 h-3.5"
      />

      {evento || "Evento"}

    </span>

  );

}


// ============================================================
// CABECERA ORDENABLE
// ============================================================

function CabeceraOrden({
  campo,
  titulo,
  orden,
  onOrdenar,
}) {

  const activa =
    orden.campo === campo;


  return (

    <th
      scope="col"
      className="px-4
 py-3
 
 
 
 uppercase
 
 
 whitespace-nowrap"
    >

      <button
        type="button"
        onClick={() =>
          onOrdenar(campo)
        }
        className="inline-flex
 items-center
 gap-2"
      >

        {titulo}

        <span
          className={`${
 activa
 ? ""
 : ""
 }`}
        >

          {activa
            ? orden.asc
              ? "▲"
              : "▼"
            : "↕"}

        </span>

      </button>

    </th>

  );

}


// ============================================================
// COMPONENTE
// ============================================================

export default function SeguridadLogs() {

  const {
    logs = [],
  } = useSeguridad();


  // ==========================================================
  // ESTADO
  // ==========================================================

  const [
    pagina,
    setPagina,
  ] = useState(0);

  const pageSize = 20;


  const [
    busqueda,
    setBusqueda,
  ] = useState("");


  const [
    filtroFecha,
    setFiltroFecha,
  ] = useState("");


  const [
    filtroNivel,
    setFiltroNivel,
  ] = useState("");


  const [
    filtroEvento,
    setFiltroEvento,
  ] = useState("");


  const [
    orden,
    setOrden,
  ] = useState({
    campo: "fecha",
    asc: false,
  });


  // ==========================================================
  // NORMALIZAR LOGS
  // ==========================================================

  const logsSeguros =
    useMemo(() => {

      if (!Array.isArray(logs)) {
        return [];
      }


      return logs

        .filter(
          (log) =>
            log &&
            typeof log === "object"
        )

        .map(
          (log) => ({

            ...log,

            fecha:
              String(
                log.fecha ??
                log.created_at ??
                log.fecha_creacion ??
                ""
              ),

            evento:
              String(
                log.evento ??
                log.event ??
                log.accion ??
                ""
              ),

            detalle:
              String(
                log.detalle ??
                log.descripcion ??
                log.message ??
                log.mensaje ??
                ""
              ),

            ip:
              String(
                log.ip ??
                log.ip_address ??
                ""
              ),

            usuario:
              String(
                log.usuario ??
                log.username ??
                ""
              ),

            modulo:
              String(
                log.modulo ??
                log.module ??
                ""
              ),

            nivel:
              obtenerNivel(log),

          })
        );

    }, [logs]);


  // ==========================================================
  // EVENTOS
  // ==========================================================

  const eventosDisponibles =
    useMemo(() => {

      const valores =
        logsSeguros
          .map(
            (log) =>
              log.evento
          )
          .filter(Boolean);


      return [
        ...new Set(valores),
      ].sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es"
          )
      );

    }, [logsSeguros]);


  // ==========================================================
  // FILTRADO
  // ==========================================================

  const logsFiltrados =
    useMemo(() => {

      const texto =
        busqueda
          .toLowerCase()
          .trim();


      return logsSeguros.filter(
        (log) => {

          const coincideBusqueda =
            !texto ||

            log.fecha
              .toLowerCase()
              .includes(texto) ||

            log.evento
              .toLowerCase()
              .includes(texto) ||

            log.detalle
              .toLowerCase()
              .includes(texto) ||

            log.ip
              .toLowerCase()
              .includes(texto) ||

            log.usuario
              .toLowerCase()
              .includes(texto) ||

            log.modulo
              .toLowerCase()
              .includes(texto);


          const coincideFecha =
            filtroFecha
              ? log.fecha.startsWith(
                  filtroFecha
                )
              : true;


          const coincideNivel =
            filtroNivel
              ? log.nivel ===
                filtroNivel
              : true;


          const coincideEvento =
            filtroEvento
              ? log.evento ===
                filtroEvento
              : true;


          return (
            coincideBusqueda &&
            coincideFecha &&
            coincideNivel &&
            coincideEvento
          );

        }
      );

    }, [
      logsSeguros,
      busqueda,
      filtroFecha,
      filtroNivel,
      filtroEvento,
    ]);


  // ==========================================================
  // ORDENACIÓN
  // ==========================================================

  const logsOrdenados =
    useMemo(() => {

      const {
        campo,
        asc,
      } = orden;


      const direccion =
        asc ? 1 : -1;


      return [
        ...logsFiltrados,
      ].sort(
        (a, b) => {

          const va =
            String(
              a?.[campo] ??
              ""
            ).toLowerCase();


          const vb =
            String(
              b?.[campo] ??
              ""
            ).toLowerCase();


          if (va < vb) {
            return -1 *
              direccion;
          }


          if (va > vb) {
            return 1 *
              direccion;
          }


          return 0;

        }
      );

    }, [
      logsFiltrados,
      orden,
    ]);


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        logsOrdenados.length /
        pageSize
      )
    );


  const paginaSegura =
    Math.min(
      pagina,
      totalPaginas - 1
    );


  const logsPaginados =
    useMemo(() => {

      const inicio =
        paginaSegura *
        pageSize;


      return logsOrdenados.slice(
        inicio,
        inicio +
        pageSize
      );

    }, [
      logsOrdenados,
      paginaSegura,
    ]);


  // ==========================================================
  // CONTADORES
  // ==========================================================

  const totalErrores =
    useMemo(
      () =>
        logsSeguros.filter(
          (log) =>
            log.nivel === "ERROR" ||
            log.nivel === "CRITICAL"
        ).length,
      [logsSeguros]
    );


  const totalWarnings =
    useMemo(
      () =>
        logsSeguros.filter(
          (log) =>
            log.nivel ===
            "WARNING"
        ).length,
      [logsSeguros]
    );


  // ==========================================================
  // ORDENAR
  // ==========================================================

  const ordenar =
    useCallback(
      (campo) => {

        setOrden(
          (prev) => ({

            campo,

            asc:
              prev.campo === campo
                ? !prev.asc
                : true,

          })
        );


        setPagina(0);

      },
      []
    );


  // ==========================================================
  // EXPORTAR
  // ==========================================================

  const descargarExcel =
    useCallback(() => {

      const encabezados = [

        "Fecha",

        "Nivel",

        "Evento",

        "Usuario",

        "Módulo",

        "Detalle",

        "IP",

      ];


      const filas =
        logsOrdenados.map(
          (log) => [

            log.fecha,

            log.nivel,

            log.evento,

            log.usuario,

            log.modulo,

            log.detalle,

            log.ip,

          ]
        );


      const contenido = [

        encabezados,

        ...filas,

      ]

        .map(
          (fila) =>
            fila

              .map(
                (valor) =>
                  `"${String(
                    valor ?? ""
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )

              .join("\t")
        )

        .join("\n");


      const blob =
        new Blob(
          [contenido],
          {
            type:
              "application/vnd.ms-excel;charset=utf-8",
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const enlace =
        document.createElement(
          "a"
        );


      enlace.href =
        url;


      enlace.download =
        "logs_seguridad.xls";


      document.body.appendChild(
        enlace
      );


      enlace.click();


      enlace.remove();


      URL.revokeObjectURL(
        url
      );

    }, [
      logsOrdenados,
    ]);


  // ==========================================================
  // LIMPIAR
  // ==========================================================

  const limpiarFiltros =
    useCallback(() => {

      setBusqueda("");
      setFiltroFecha("");
      setFiltroNivel("");
      setFiltroEvento("");
      setPagina(0);

    }, []);


  const hayFiltros =
    Boolean(
      busqueda ||
      filtroFecha ||
      filtroNivel ||
      filtroEvento
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="erp-page space-y-6">


      <MolsanPageHeader mark="SE" title="Logs técnicos" description="Monitorización técnica y trazabilidad de eventos del ERP." />
      <div className="flex justify-end"><span className="molsan-panel px-3 py-2 text-sm">Monitor técnico activo</span></div>

      {/* ====================================================
          RESUMEN
      ==================================================== */}

      <div
        className="grid
 grid-cols-1
 sm:grid-cols-2
 lg:grid-cols-4
 gap-4"
      >

        <div
          className="p-5"
        >

          <p className="uppercase">
            Eventos
          </p>


          <p className="mt-1">
            {logsOrdenados.length}
          </p>

        </div>


        <div
          className="p-5"
        >

          <p className="uppercase">
            Errores críticos
          </p>


          <p className="mt-1">
            {totalErrores}
          </p>

        </div>


        <div
          className="p-5"
        >

          <p className="uppercase">
            Avisos
          </p>


          <p className="mt-1">
            {totalWarnings}
          </p>

        </div>


        <div
          className="p-5"
        >

          <p className="uppercase">
            Estado
          </p>


          <p className="mt-1">
            Monitor activo
          </p>

        </div>

      </div>


      {/* ====================================================
          FILTROS
      ==================================================== */}

      <section
        className="p-5"
      >

        <div
          className="grid
 grid-cols-1
 lg:grid-cols-12
 gap-4
 items-end"
        >

          <div className="lg:col-span-5">

            <label
              className="block
 
 
 
 mb-1.5"
            >
              Buscar
            </label>


            <div className="relative">

              <Icono
                name="search"
                className="absolute
 left-3
 top-1/2
 
 w-4
 h-4"
              />


              <input
                type="text"
                value={busqueda}
                placeholder="Evento, usuario, módulo, detalle o IP..."
                onChange={(e) => {

                  setBusqueda(
                    e.target.value
                  );

                  setPagina(0);

                }}
                className="w-full
 h-11
 pl-10
 pr-4"
              />

            </div>

          </div>


          <div className="lg:col-span-2">

            <label
              className="block
 
 
 
 mb-1.5"
            >
              Fecha
            </label>


            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => {

                setFiltroFecha(
                  e.target.value
                );

                setPagina(0);

              }}
              className="w-full
 h-11
 px-3"
            />

          </div>


          <div className="lg:col-span-2">

            <label
              className="block
 
 
 
 mb-1.5"
            >
              Nivel
            </label>


            <select
              value={filtroNivel}
              onChange={(e) => {

                setFiltroNivel(
                  e.target.value
                );

                setPagina(0);

              }}
              className="w-full
 h-11
 px-3"
            >

              <option value="">
                Todos
              </option>

              <option value="INFO">
                INFO
              </option>

              <option value="WARNING">
                WARNING
              </option>

              <option value="ERROR">
                ERROR
              </option>

              <option value="CRITICAL">
                CRITICAL
              </option>

            </select>

          </div>


          <div className="lg:col-span-2">

            <label
              className="block
 
 
 
 mb-1.5"
            >
              Evento
            </label>


            <select
              value={filtroEvento}
              onChange={(e) => {

                setFiltroEvento(
                  e.target.value
                );

                setPagina(0);

              }}
              className="w-full
 h-11
 px-3"
            >

              <option value="">
                Todos
              </option>

              {eventosDisponibles.map(
                (evento) => (

                  <option
                    key={evento}
                    value={evento}
                  >
                    {evento}
                  </option>

                )
              )}

            </select>

          </div>


          <div className="lg:col-span-1">

            <button
              type="button"
              disabled={!hayFiltros}
              onClick={
                limpiarFiltros
              }
              className="w-full
 h-11
 px-3"
            >
              Limpiar
            </button>

          </div>

        </div>

      </section>


      {/* ====================================================
          TABLA
      ==================================================== */}

      <section
        className="overflow-hidden"
      >

        <div
          className="px-5
 py-4
 
 
 flex
 items-center
 justify-between
 gap-3"
        >

          <div>

            <h2
             
            >
              Eventos técnicos
            </h2>


            <p
              className="mt-0.5"
            >
              {logsOrdenados.length} eventos encontrados
            </p>

          </div>


          <button
            type="button"
            onClick={
              descargarExcel
            }
           
          >

            <Icono
              name="download"
              className="w-4 h-4"
            />

            Exportar

          </button>

        </div>


        <div className="overflow-x-auto">

          <table
            className="w-full
 min-w-[1050px]"
          >

            <thead
             
            >

              <tr>

                <CabeceraOrden
                  campo="fecha"
                  titulo="Fecha"
                  orden={orden}
                  onOrdenar={ordenar}
                />

                <CabeceraOrden
                  campo="nivel"
                  titulo="Nivel"
                  orden={orden}
                  onOrdenar={ordenar}
                />

                <CabeceraOrden
                  campo="evento"
                  titulo="Evento"
                  orden={orden}
                  onOrdenar={ordenar}
                />

                <CabeceraOrden
                  campo="usuario"
                  titulo="Usuario"
                  orden={orden}
                  onOrdenar={ordenar}
                />

                <CabeceraOrden
                  campo="modulo"
                  titulo="Módulo"
                  orden={orden}
                  onOrdenar={ordenar}
                />

                <th
                  scope="col"
                  className="px-4
 py-3
 
 
 
 uppercase"
                >
                  Detalle
                </th>


                <th
                  scope="col"
                  className="px-4
 py-3
 
 
 
 uppercase"
                >
                  IP
                </th>

              </tr>

            </thead>


            <tbody>

              {logsPaginados.map(
                (log, indice) => (

                  <tr
                    key={
                      String(
                        log.id ??
                        `${log.fecha}-${log.evento}-${indice}`
                      )
                    }
                   
                  >

                    <td
                      className="px-4
 py-3.5
 
 whitespace-nowrap"
                    >
                      {log.fecha || "—"}
                    </td>


                    <td
                      className="px-4
 py-3.5"
                    >
                      <NivelBadge
                        nivel={log.nivel}
                      />
                    </td>


                    <td
                      className="px-4
 py-3.5"
                    >
                      <EventoBadge
                        evento={log.evento}
                      />
                    </td>


                    <td
                      className="px-4
 py-3.5
 
 
 whitespace-nowrap"
                    >
                      {log.usuario || "—"}
                    </td>


                    <td
                      className="px-4
 py-3.5"
                    >
                      {log.modulo || "—"}
                    </td>


                    <td
                      className="px-4
 py-3.5
 
 max-w-[500px]"
                    >

                      <div
                        className="truncate"
                        title={log.detalle}
                      >
                        {log.detalle || "—"}
                      </div>

                    </td>


                    <td
                      className="px-4
 py-3.5
 
 
 
 whitespace-nowrap"
                    >
                      {log.ip || "—"}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>


        {logsPaginados.length === 0 && (

          <div
            className="py-14
 px-6"
          >

            <div
              className="w-12
 h-12
 
 
 
 flex
 items-center
 justify-center
 mx-auto
 mb-3"
            >

              <Icono
                name="search"
                className="w-5 h-5"
              />

            </div>


            <h3
             
            >
              No se encontraron eventos
            </h3>


            <p
              className="mt-1"
            >
              Prueba a modificar los filtros de búsqueda.
            </p>

          </div>

        )}

      </section>


      {/* ====================================================
          PAGINACIÓN
      ==================================================== */}

      <div
        className="flex
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-3"
      >

        <p
         
        >

          Página{" "}

          <span
           
          >
            {paginaSegura + 1}
          </span>

          {" "}de{" "}

          <span
           
          >
            {totalPaginas}
          </span>

        </p>


        <div
          className="flex
 items-center
 gap-2"
        >

          <button
            type="button"
            disabled={paginaSegura === 0}
            onClick={() =>
              setPagina(
                (prev) =>
                  Math.max(
                    0,
                    prev - 1
                  )
              )
            }
            className="px-4
 py-2"
          >
            Anterior
          </button>


          <button
            type="button"
            disabled={
              paginaSegura >=
              totalPaginas - 1
            }
            onClick={() =>
              setPagina(
                (prev) =>
                  Math.min(
                    totalPaginas - 1,
                    prev + 1
                  )
              )
            }
            className="px-4
 py-2"
          >
            Siguiente
          </button>

        </div>

      </div>

    </div>

  );

}

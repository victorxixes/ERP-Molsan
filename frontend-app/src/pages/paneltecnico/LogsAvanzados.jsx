import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getLogs } from "../../api/logs";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

/**
 * ============================================================
 * LOGS TÉCNICOS
 * ============================================================
 *
 * - Buscador
 * - Diseño integrado con ERP
 * - Sin modificar la lógica de API
 * ============================================================
 */

export default function LogsAvanzados() {
  const [logs, setLogs] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // ============================================================
  // CARGAR LOGS
  // ============================================================

  useEffect(() => {
    getLogs().then((res) => {
      setLogs(res.data || []);
    });
  }, []);

  // ============================================================
  // FILTRADO
  // ============================================================

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return logs.filter((l) => {
      const texto = `${l.evento || ""} ${l.detalle || ""} ${
        l.ip || ""
      }`.toLowerCase();

      return texto.includes(q);
    });
  }, [logs, busqueda]);
  const ordenFiltrados = useSortableData(filtrados);

  // ============================================================
  // BUSCADOR
  // ============================================================

  const handleBusqueda = useCallback((e) => {
    setBusqueda(e.target.value);
  }, []);

  // ============================================================
  // FORMATEAR FECHA
  // ============================================================

  const formatearFecha = (fecha) => {
    if (!fecha) return "—";

    try {
      return new Date(fecha).toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="erp-page space-y-6">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="molsan-subpage-header flex flex-col
 lg:flex-row
 lg:items-center
 lg:justify-between
 gap-4"
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
              <svg className="w-5 h-5">
                <use href="/icons/icons.svg#clipboard" />
              </svg>
            </div>

            <div>
              <h1
               
              >
                Logs Técnicos
              </h1>

              <p
                className="mt-0.5"
              >
                Registro de actividad técnica del sistema
              </p>
            </div>
          </div>
        </div>

        {/* CONTADOR */}

        <div
          className="inline-flex
 items-center
 gap-2
 px-4
 py-2
 
 
 
 
 
 w-fit"
        >
          <span
            className="w-2
 h-2"
          />

          <span
           
          >
            {filtrados.length}
          </span>

          <span
           
          >
            registros
          </span>
        </div>
      </div>


      {/* ======================================================
          BUSCADOR
          ====================================================== */}

      <section
        className="p-4"
      >
        <div
          className="flex
 items-center
 gap-3
 
 
 
 
 px-4
 h-11"
        >
          <svg
            className="w-4
 h-4
 
 flex-shrink-0"
          >
            <use href="/icons/icons.svg#search" />
          </svg>

          <input
            type="text"
            placeholder="Buscar por evento, detalle o dirección IP..."
            className="w-full"
            value={busqueda}
            onChange={handleBusqueda}
          />

          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
             
              title="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
      </section>


      {/* ======================================================
          TABLA
          ====================================================== */}

      <section
        className="overflow-hidden"
      >

        {/* CABECERA TABLA */}

        <div
          className="px-5
 py-4
 
 
 flex
 items-center
 justify-between
 gap-4"
        >
          <div>
            <h2
             
            >
              Últimos registros
            </h2>

            <p
              className="mt-1"
            >
              Actividad técnica registrada en el sistema
            </p>
          </div>

          <div
            className="hidden
 sm:flex
 items-center
 gap-2"
          >
            <span
              className="w-2
 h-2"
            />

            Sistema operativo
          </div>
        </div>


        {/* CONTENEDOR SCROLL */}

        <div className="overflow-x-auto">

          <table
            className="w-full"
          >

            <thead>
              <tr><MolsanSortableTh label="Fecha" sortKey="fecha" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /><MolsanSortableTh label="Evento" sortKey="evento" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /><MolsanSortableTh label="Detalle" sortKey="detalle" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 min-w-[360px]" /><MolsanSortableTh label="Dirección IP" sortKey="ip" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /></tr>
            </thead>


            <tbody>

              {ordenFiltrados.items.map((l) => (

                <tr
                  key={l.id}
                 
                >

                  {/* FECHA */}

                  <td
                    className="px-5
 py-3.5
 
 whitespace-nowrap"
                  >
                    {formatearFecha(l.fecha)}
                  </td>


                  {/* EVENTO */}

                  <td className="px-5 py-3.5">

                    <span
                      className="inline-flex
 items-center
 px-2.5
 py-1
 
 
 
 
 
 
 
 whitespace-nowrap"
                    >
                      {l.evento || "Sin evento"}
                    </span>

                  </td>


                  {/* DETALLE */}

                  <td
                    className="px-5
 py-3.5
 
 max-w-[600px]"
                  >
                    <div
                      className="truncate
 max-w-[600px]"
                      title={l.detalle || ""}
                    >
                      {l.detalle || "—"}
                    </div>
                  </td>


                  {/* IP */}

                  <td className="px-5 py-3.5">

                    <span
                      className="inline-flex
 items-center
 px-2.5
 py-1
 
 
 
 
 
 
 
 whitespace-nowrap"
                    >
                      {l.ip || "—"}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* ESTADO VACÍO */}

        {filtrados.length === 0 && (

          <div
            className="px-6
 py-14"
          >

            <div
              className="mx-auto
 w-12
 h-12
 
 
 
 
 flex
 items-center
 justify-center
 mb-4"
            >
              <svg
                className="w-5
 h-5"
              >
                <use href="/icons/icons.svg#clipboard" />
              </svg>
            </div>

            <h3
             
            >
              No hay registros
            </h3>

            <p
              className="mt-1"
            >
              {busqueda
                ? "No se encontraron logs que coincidan con la búsqueda."
                : "Todavía no existen registros técnicos."}
            </p>

          </div>

        )}

      </section>

    </div>
  );
}

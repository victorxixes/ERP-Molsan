import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useEffect, useState, useMemo, useCallback } from "react";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";
import {
  getAuditoria,
  getAuditoriaMetricas,
} from "../../api/auditoria";

/**
 * ============================================================
 * AUDITORÍA AVANZADA
 * ============================================================
 *
 * - Métricas técnicas
 * - Buscador
 * - Tabla de auditoría
 * - Diseño integrado con ERP
 * - Sin modificar la lógica de API
 * ============================================================
 */

export default function AuditoriaAvanzada() {
  const [registros, setRegistros] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  // ============================================================
  // CARGAR DATOS
  // ============================================================

  useEffect(() => {
    getAuditoria().then((res) => {
      setRegistros(res.data || []);
    });

    getAuditoriaMetricas().then((res) => {
      setMetricas(res.data || null);
    });
  }, []);

  // ============================================================
  // FILTRADO
  // ============================================================

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();

    return registros.filter((r) => {
      const texto = `
        ${r.usuario || ""}
        ${r.modulo || ""}
        ${r.accion || ""}
        ${r.descripcion || ""}
        ${r.ip || ""}
      `.toLowerCase();

      return texto.includes(q);
    });
  }, [registros, busqueda]);
  const ordenFiltrados = useSortableData(filtrados);

  // ============================================================
  // BUSCADOR
  // ============================================================

  const handleBusqueda = useCallback((e) => {
    setBusqueda(e.target.value);
  }, []);

  // ============================================================
  // FECHAS
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
        className="molsan-subpage-header flex
 flex-col
 lg:flex-row
 lg:items-center
 lg:justify-between
 gap-4"
      >

        <div className="flex items-center gap-3">

          <div
            className="w-11
 h-11
 
 
 
 
 
 flex
 items-center
 justify-center"
          >
            <svg className="w-5 h-5">
              <use href="/icons/icons.svg#shield" />
            </svg>
          </div>

          <div>

            <h1
             
            >
              Auditoría Avanzada
            </h1>

            <p
              className="mt-0.5"
            >
              Control y trazabilidad de la actividad del sistema
            </p>

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
          MÉTRICAS
          ====================================================== */}

      {metricas && (

        <section
          className="overflow-hidden"
        >

          {/* CABECERA MÉTRICAS */}

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
                Métricas de auditoría
              </h2>

              <p
                className="mt-1"
              >
                Resumen de actividad registrada
              </p>

            </div>

            <div
              className="w-9
 h-9
 
 
 
 flex
 items-center
 justify-center"
            >
              <svg className="w-4 h-4">
                <use href="/icons/icons.svg#clipboard" />
              </svg>
            </div>

          </div>


          <div className="p-5 space-y-5">

            {/* TOTAL */}

            <div
              className="px-5
 py-4
 flex
 items-center
 justify-between"
            >

              <div>

                <p
                  className="uppercase"
                >
                  Total registros
                </p>

                <p
                  className="mt-1"
                >
                  {metricas.total_registros ?? 0}
                </p>

              </div>

              <div
                className="w-12
 h-12
 
 
 
 flex
 items-center
 justify-center"
              >
                <svg className="w-5 h-5">
                  <use href="/icons/icons.svg#clipboard" />
                </svg>
              </div>

            </div>


            {/* MÓDULOS + ACCIONES */}

            <div
              className="grid
 grid-cols-1
 lg:grid-cols-2
 gap-4"
            >

              {/* POR MÓDULO */}

              <div
                className="p-4"
              >

                <div className="flex items-center justify-between mb-3">

                  <h3
                   
                  >
                    Actividad por módulo
                  </h3>

                  <span
                   
                  >
                    Módulos
                  </span>

                </div>

                <div className="space-y-2">

                  {(metricas.por_modulo || []).map((m, i) => (

                    <div
                      key={i}
                      className="flex
 items-center
 justify-between
 gap-3
 px-3
 py-2.5"
                    >

                      <span
                        className="truncate"
                      >
                        {m.modulo || "Sin módulo"}
                      </span>

                      <span
                        className="min-w-[32px]
 h-7
 px-2
 
 
 
 
 
 flex
 items-center
 justify-center"
                      >
                        {m.cantidad ?? 0}
                      </span>

                    </div>

                  ))}

                </div>

              </div>


              {/* POR ACCIÓN */}

              <div
                className="p-4"
              >

                <div className="flex items-center justify-between mb-3">

                  <h3
                   
                  >
                    Actividad por acción
                  </h3>

                  <span
                   
                  >
                    Acciones
                  </span>

                </div>

                <div className="space-y-2">

                  {(metricas.por_accion || []).map((a, i) => (

                    <div
                      key={i}
                      className="flex
 items-center
 justify-between
 gap-3
 px-3
 py-2.5"
                    >

                      <span
                        className="truncate"
                      >
                        {a.accion || "Sin acción"}
                      </span>

                      <span
                        className="min-w-[32px]
 h-7
 px-2
 
 
 
 
 
 flex
 items-center
 justify-center"
                      >
                        {a.cantidad ?? 0}
                      </span>

                    </div>

                  ))}

                </div>

              </div>

            </div>


            {/* ÚLTIMOS LOGINS */}

            <div
              className="p-4"
            >

              <div className="flex items-center justify-between mb-3">

                <div>

                  <h3
                   
                  >
                    Últimos accesos
                  </h3>

                  <p
                    className="mt-1"
                  >
                    Actividad reciente de usuarios
                  </p>

                </div>

                <svg
                  className="w-4
 h-4"
                >
                  <use href="/icons/icons.svg#user" />
                </svg>

              </div>

              <div className="space-y-2">

                {(metricas.ultimos_logins || []).map((l, i) => (

                  <div
                    key={i}
                    className="flex
 flex-col
 sm:flex-row
 sm:items-center
 sm:justify-between
 gap-2
 px-3
 py-2.5"
                  >

                    <div className="flex items-center gap-2">

                      <span
                        className="w-2
 h-2"
                      />

                      <span
                       
                      >
                        {l.usuario || "Usuario"}
                      </span>

                    </div>

                    <span
                     
                    >
                      {formatearFecha(l.fecha)}
                    </span>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </section>

      )}


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
            placeholder="Buscar por usuario, módulo, acción, descripción o IP..."
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
          TABLA AUDITORÍA
          ====================================================== */}

      <section
        className="overflow-hidden"
      >

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
              Trazabilidad detallada de las operaciones
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

            Auditoría activa
          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr><MolsanSortableTh label="Fecha" sortKey="fecha" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /><MolsanSortableTh label="Usuario" sortKey="usuario" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /><MolsanSortableTh label="Módulo" sortKey="modulo" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /><MolsanSortableTh label="Acción" sortKey="accion" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /><MolsanSortableTh label="Descripción" sortKey="descripcion" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 min-w-[360px]" /><MolsanSortableTh label="IP" sortKey="ip" sortConfig={ordenFiltrados.sortConfig} onSort={ordenFiltrados.requestSort} className="px-5 py-3 whitespace-nowrap" /></tr>

            </thead>


            <tbody>

              {ordenFiltrados.items.map((r) => (

                <tr
                  key={r.id}
                 
                >

                  {/* FECHA */}

                  <td
                    className="px-5
 py-3.5
 
 whitespace-nowrap"
                  >
                    {formatearFecha(r.fecha)}
                  </td>


                  {/* USUARIO */}

                  <td className="px-5 py-3.5">

                    <span
                      className="inline-flex
 items-center
 gap-2"
                    >

                      <span
                        className="w-7
 h-7
 
 
 
 flex
 items-center
 justify-center"
                      >
                        <svg className="w-3.5 h-3.5">
                          <use href="/icons/icons.svg#user" />
                        </svg>
                      </span>

                      {r.usuario || "—"}

                    </span>

                  </td>


                  {/* MÓDULO */}

                  <td className="px-5 py-3.5">

                    <span
                      className="inline-flex
 px-2.5
 py-1
 
 
 
 
 
 
 
 whitespace-nowrap"
                    >
                      {r.modulo || "—"}
                    </span>

                  </td>


                  {/* ACCIÓN */}

                  <td className="px-5 py-3.5">

                    <span
                      className="inline-flex
 px-2.5
 py-1
 
 
 
 
 
 
 
 whitespace-nowrap"
                    >
                      {r.accion || "—"}
                    </span>

                  </td>


                  {/* DESCRIPCIÓN */}

                  <td
                    className="px-5
 py-3.5
 
 max-w-[600px]"
                  >

                    <div
                      className="truncate max-w-[600px]"
                      title={r.descripcion || ""}
                    >
                      {r.descripcion || "—"}
                    </div>

                  </td>


                  {/* IP */}

                  <td className="px-5 py-3.5">

                    <span
                      className="inline-flex
 px-2.5
 py-1
 
 
 
 
 
 
 
 whitespace-nowrap"
                    >
                      {r.ip || "—"}
                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* ====================================================
            SIN RESULTADOS
            ==================================================== */}

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
                <use href="/icons/icons.svg#shield" />
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
                ? "No se encontraron registros que coincidan con la búsqueda."
                : "Todavía no existen registros de auditoría."}
            </p>

          </div>

        )}

      </section>

    </div>
  );
}

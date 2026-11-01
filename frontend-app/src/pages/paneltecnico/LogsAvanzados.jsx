import { useEffect, useState, useMemo, useCallback } from "react";
import { getLogs } from "../../api/logs";
import "./PanelTecnicoSubmodulos.css";

/**
 * ============================================================
 * LOGS TÉCNICOS — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * - Buscador
 * - Tabla técnica premium
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
    <div className="molsan-page-stack logs-avanzados-premium panel-tecnico-submodulo-premium animate-fade-in">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="
          flex flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
        "
      >
        <div>
          <div
            className="molsan-page-header 
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
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
                border
                border-[var(--erp-border)]
              "
            >
              <svg className="w-5 h-5">
                <use href="/icons/icons.svg#clipboard" />
              </svg>
            </div>

            <div>
              <h1
                className="
                  text-2xl
                  font-bold
                  text-[var(--erp-text)]
                "
              >
                Logs Técnicos
              </h1>

              <p
                className="
                  text-sm
                  text-[var(--erp-text-soft)]
                  mt-0.5
                "
              >
                Registro de actividad técnica del sistema
              </p>
            </div>
          </div>
        </div>

        {/* CONTADOR */}

        <div
          className="
            inline-flex
            items-center
            gap-2
            px-4
            py-2
            rounded-xl
            bg-[var(--erp-surface)]
            border
            border-[var(--erp-border)]
            shadow-sm
            w-fit
          "
        >
          <span
            className="
              w-2
              h-2
              rounded-full
              bg-[var(--erp-primary)]
            "
          />

          <span
            className="
              text-sm
              font-medium
              text-[var(--erp-text)]
            "
          >
            {filtrados.length}
          </span>

          <span
            className="
              text-sm
              text-[var(--erp-text-soft)]
            "
          >
            registros
          </span>
        </div>
      </div>


      {/* ======================================================
          BUSCADOR
          ====================================================== */}

      <section
        className="
          bg-[var(--erp-surface)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          p-4
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
            bg-[var(--erp-surface-soft)]
            border
            border-[var(--erp-border)]
            rounded-xl
            px-4
            h-11
            focus-within:border-[var(--erp-primary)]
            focus-within:ring-2
            focus-within:ring-[var(--erp-primary-soft)]
            transition
          "
        >
          <svg
            className="
              w-4
              h-4
              text-[var(--erp-text-soft)]
              flex-shrink-0
            "
          >
            <use href="/icons/icons.svg#search" />
          </svg>

          <input
            type="text"
            placeholder="Buscar por evento, detalle o dirección IP..."
            className="
              w-full
              bg-transparent
              outline-none
              border-none
              text-sm
              text-[var(--erp-text)]
              placeholder:text-[var(--erp-text-soft)]
            "
            value={busqueda}
            onChange={handleBusqueda}
          />

          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="
                text-[var(--erp-text-soft)]
                hover:text-[var(--erp-text)]
                transition
                text-lg
                leading-none
              "
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
        className="
          bg-[var(--erp-surface)]
          border
          border-[var(--erp-border)]
          rounded-2xl
          shadow-sm
          overflow-hidden
        "
      >

        {/* CABECERA TABLA */}

        <div
          className="
            px-5
            py-4
            border-b
            border-[var(--erp-border)]
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div>
            <h2
              className="
                text-base
                font-semibold
                text-[var(--erp-text)]
              "
            >
              Últimos registros
            </h2>

            <p
              className="
                text-xs
                text-[var(--erp-text-soft)]
                mt-1
              "
            >
              Actividad técnica registrada en el sistema
            </p>
          </div>

          <div
            className="
              hidden
              sm:flex
              items-center
              gap-2
              text-xs
              text-[var(--erp-text-soft)]
            "
          >
            <span
              className="
                w-2
                h-2
                rounded-full
                bg-green-500
              "
            />

            Sistema operativo
          </div>
        </div>


        {/* CONTENEDOR SCROLL */}

        <div className="overflow-x-auto">

          <table
            className="
              w-full
              text-sm
              text-left
            "
          >

            <thead>
              <tr
                className="
                  bg-[var(--erp-surface-soft)]
                  border-b
                  border-[var(--erp-border)]
                "
              >
                <th
                  className="
                    px-5
                    py-3
                    font-semibold
                    text-[var(--erp-text-soft)]
                    whitespace-nowrap
                  "
                >
                  Fecha
                </th>

                <th
                  className="
                    px-5
                    py-3
                    font-semibold
                    text-[var(--erp-text-soft)]
                    whitespace-nowrap
                  "
                >
                  Evento
                </th>

                <th
                  className="
                    px-5
                    py-3
                    font-semibold
                    text-[var(--erp-text-soft)]
                    min-w-[360px]
                  "
                >
                  Detalle
                </th>

                <th
                  className="
                    px-5
                    py-3
                    font-semibold
                    text-[var(--erp-text-soft)]
                    whitespace-nowrap
                  "
                >
                  Dirección IP
                </th>
              </tr>
            </thead>


            <tbody>

              {filtrados.map((l) => (

                <tr
                  key={l.id}
                  className="
                    border-b
                    border-[var(--erp-border)]
                    last:border-b-0
                    hover:bg-[var(--erp-primary-soft)]
                    transition-colors
                  "
                >

                  {/* FECHA */}

                  <td
                    className="
                      px-5
                      py-3.5
                      text-[var(--erp-text-soft)]
                      whitespace-nowrap
                    "
                  >
                    {formatearFecha(l.fecha)}
                  </td>


                  {/* EVENTO */}

                  <td className="px-5 py-3.5">

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
                        font-semibold
                        text-[var(--erp-primary)]
                        whitespace-nowrap
                      "
                    >
                      {l.evento || "Sin evento"}
                    </span>

                  </td>


                  {/* DETALLE */}

                  <td
                    className="
                      px-5
                      py-3.5
                      text-[var(--erp-text)]
                      max-w-[600px]
                    "
                  >
                    <div
                      className="
                        truncate
                        max-w-[600px]
                      "
                      title={l.detalle || ""}
                    >
                      {l.detalle || "—"}
                    </div>
                  </td>


                  {/* IP */}

                  <td className="px-5 py-3.5">

                    <span
                      className="
                        inline-flex
                        items-center
                        px-2.5
                        py-1
                        rounded-lg
                        bg-[var(--erp-surface-soft)]
                        border
                        border-[var(--erp-border)]
                        text-xs
                        font-mono
                        text-[var(--erp-text-soft)]
                        whitespace-nowrap
                      "
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
            className="
              px-6
              py-14
              text-center
            "
          >

            <div
              className="
                mx-auto
                w-12
                h-12
                rounded-2xl
                bg-[var(--erp-surface-soft)]
                border
                border-[var(--erp-border)]
                flex
                items-center
                justify-center
                mb-4
              "
            >
              <svg
                className="
                  w-5
                  h-5
                  text-[var(--erp-text-soft)]
                "
              >
                <use href="/icons/icons.svg#clipboard" />
              </svg>
            </div>

            <h3
              className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              "
            >
              No hay registros
            </h3>

            <p
              className="
                text-sm
                text-[var(--erp-text-soft)]
                mt-1
              "
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

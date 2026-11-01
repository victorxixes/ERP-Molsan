import { useEffect, useState, useMemo, useCallback } from "react";
import {
  getAuditoria,
  getAuditoriaMetricas,
} from "../../api/auditoria";
import "./PanelTecnicoSubmodulos.css";

/**
 * ============================================================
 * AUDITORÍA AVANZADA — MOLSAN ERP PREMIUM 2027
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
    <div className="auditoria-avanzada-premium panel-tecnico-submodulo-premium space-y-6 animate-fade-in">

      {/* ======================================================
          CABECERA
          ====================================================== */}

      <div
        className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          lg:justify-between
          gap-4
        "
      >

        <div className="molsan-page-header flex items-center gap-3">

          <div
            className="
              w-11
              h-11
              rounded-2xl
              bg-[var(--erp-primary-soft)]
              text-[var(--erp-primary)]
              border
              border-[var(--erp-border)]
              flex
              items-center
              justify-center
            "
          >
            <svg className="w-5 h-5">
              <use href="/icons/icons.svg#shield" />
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
              Auditoría Avanzada
            </h1>

            <p
              className="
                text-sm
                text-[var(--erp-text-soft)]
                mt-0.5
              "
            >
              Control y trazabilidad de la actividad del sistema
            </p>

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
              font-semibold
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
          MÉTRICAS
          ====================================================== */}

      {metricas && (

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

          {/* CABECERA MÉTRICAS */}

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
                Métricas de auditoría
              </h2>

              <p
                className="
                  text-xs
                  text-[var(--erp-text-soft)]
                  mt-1
                "
              >
                Resumen de actividad registrada
              </p>

            </div>

            <div
              className="
                w-9
                h-9
                rounded-xl
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
                flex
                items-center
                justify-center
              "
            >
              <svg className="w-4 h-4">
                <use href="/icons/icons.svg#clipboard" />
              </svg>
            </div>

          </div>


          <div className="p-5 space-y-5">

            {/* TOTAL */}

            <div
              className="
                rounded-xl
                bg-[var(--erp-surface-soft)]
                border
                border-[var(--erp-border)]
                px-5
                py-4
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    font-medium
                    uppercase
                    tracking-wide
                    text-[var(--erp-text-soft)]
                  "
                >
                  Total registros
                </p>

                <p
                  className="
                    text-3xl
                    font-bold
                    text-[var(--erp-text)]
                    mt-1
                  "
                >
                  {metricas.total_registros ?? 0}
                </p>

              </div>

              <div
                className="
                  w-12
                  h-12
                  rounded-xl
                  bg-[var(--erp-primary)]
                  text-white
                  flex
                  items-center
                  justify-center
                  shadow-sm
                "
              >
                <svg className="w-5 h-5">
                  <use href="/icons/icons.svg#clipboard" />
                </svg>
              </div>

            </div>


            {/* MÓDULOS + ACCIONES */}

            <div
              className="
                grid
                grid-cols-1
                lg:grid-cols-2
                gap-4
              "
            >

              {/* POR MÓDULO */}

              <div
                className="
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface-soft)]
                  p-4
                "
              >

                <div className="flex items-center justify-between mb-3">

                  <h3
                    className="
                      text-sm
                      font-semibold
                      text-[var(--erp-text)]
                    "
                  >
                    Actividad por módulo
                  </h3>

                  <span
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Módulos
                  </span>

                </div>

                <div className="space-y-2">

                  {(metricas.por_modulo || []).map((m, i) => (

                    <div
                      key={i}
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        px-3
                        py-2.5
                        rounded-lg
                        bg-[var(--erp-surface)]
                        border
                        border-[var(--erp-border)]
                      "
                    >

                      <span
                        className="
                          text-sm
                          text-[var(--erp-text)]
                          truncate
                        "
                      >
                        {m.modulo || "Sin módulo"}
                      </span>

                      <span
                        className="
                          min-w-[32px]
                          h-7
                          px-2
                          rounded-lg
                          bg-[var(--erp-primary-soft)]
                          text-[var(--erp-primary)]
                          text-xs
                          font-bold
                          flex
                          items-center
                          justify-center
                        "
                      >
                        {m.cantidad ?? 0}
                      </span>

                    </div>

                  ))}

                </div>

              </div>


              {/* POR ACCIÓN */}

              <div
                className="
                  rounded-xl
                  border
                  border-[var(--erp-border)]
                  bg-[var(--erp-surface-soft)]
                  p-4
                "
              >

                <div className="flex items-center justify-between mb-3">

                  <h3
                    className="
                      text-sm
                      font-semibold
                      text-[var(--erp-text)]
                    "
                  >
                    Actividad por acción
                  </h3>

                  <span
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                    "
                  >
                    Acciones
                  </span>

                </div>

                <div className="space-y-2">

                  {(metricas.por_accion || []).map((a, i) => (

                    <div
                      key={i}
                      className="
                        flex
                        items-center
                        justify-between
                        gap-3
                        px-3
                        py-2.5
                        rounded-lg
                        bg-[var(--erp-surface)]
                        border
                        border-[var(--erp-border)]
                      "
                    >

                      <span
                        className="
                          text-sm
                          text-[var(--erp-text)]
                          truncate
                        "
                      >
                        {a.accion || "Sin acción"}
                      </span>

                      <span
                        className="
                          min-w-[32px]
                          h-7
                          px-2
                          rounded-lg
                          bg-[var(--erp-primary-soft)]
                          text-[var(--erp-primary)]
                          text-xs
                          font-bold
                          flex
                          items-center
                          justify-center
                        "
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
              className="
                rounded-xl
                border
                border-[var(--erp-border)]
                bg-[var(--erp-surface-soft)]
                p-4
              "
            >

              <div className="flex items-center justify-between mb-3">

                <div>

                  <h3
                    className="
                      text-sm
                      font-semibold
                      text-[var(--erp-text)]
                    "
                  >
                    Últimos accesos
                  </h3>

                  <p
                    className="
                      text-xs
                      text-[var(--erp-text-soft)]
                      mt-1
                    "
                  >
                    Actividad reciente de usuarios
                  </p>

                </div>

                <svg
                  className="
                    w-4
                    h-4
                    text-[var(--erp-text-soft)]
                  "
                >
                  <use href="/icons/icons.svg#user" />
                </svg>

              </div>

              <div className="space-y-2">

                {(metricas.ultimos_logins || []).map((l, i) => (

                  <div
                    key={i}
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      gap-2
                      px-3
                      py-2.5
                      rounded-lg
                      bg-[var(--erp-surface)]
                      border
                      border-[var(--erp-border)]
                    "
                  >

                    <div className="flex items-center gap-2">

                      <span
                        className="
                          w-2
                          h-2
                          rounded-full
                          bg-green-500
                        "
                      />

                      <span
                        className="
                          text-sm
                          font-medium
                          text-[var(--erp-text)]
                        "
                      >
                        {l.usuario || "Usuario"}
                      </span>

                    </div>

                    <span
                      className="
                        text-xs
                        text-[var(--erp-text-soft)]
                      "
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
            placeholder="Buscar por usuario, módulo, acción, descripción o IP..."
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
          TABLA AUDITORÍA
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
              Trazabilidad detallada de las operaciones
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

            Auditoría activa
          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-sm text-left">

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
                  Usuario
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
                  Módulo
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
                  Acción
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
                  Descripción
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
                  IP
                </th>

              </tr>

            </thead>


            <tbody>

              {filtrados.map((r) => (

                <tr
                  key={r.id}
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
                    {formatearFecha(r.fecha)}
                  </td>


                  {/* USUARIO */}

                  <td className="px-5 py-3.5">

                    <span
                      className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-medium
                        text-[var(--erp-text)]
                      "
                    >

                      <span
                        className="
                          w-7
                          h-7
                          rounded-lg
                          bg-[var(--erp-primary-soft)]
                          text-[var(--erp-primary)]
                          flex
                          items-center
                          justify-center
                        "
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
                      className="
                        inline-flex
                        px-2.5
                        py-1
                        rounded-lg
                        bg-[var(--erp-surface-soft)]
                        border
                        border-[var(--erp-border)]
                        text-xs
                        font-medium
                        text-[var(--erp-text-soft)]
                        whitespace-nowrap
                      "
                    >
                      {r.modulo || "—"}
                    </span>

                  </td>


                  {/* ACCIÓN */}

                  <td className="px-5 py-3.5">

                    <span
                      className="
                        inline-flex
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
                      {r.accion || "—"}
                    </span>

                  </td>


                  {/* DESCRIPCIÓN */}

                  <td
                    className="
                      px-5
                      py-3.5
                      text-[var(--erp-text)]
                      max-w-[600px]
                    "
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
                      className="
                        inline-flex
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
                <use href="/icons/icons.svg#shield" />
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
                ? "No se encontraron registros que coincidan con la búsqueda."
                : "Todavía no existen registros de auditoría."}
            </p>

          </div>

        )}

      </section>

    </div>
  );
}

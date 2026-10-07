// ============================================================
// ERP MOLSAN — DASHBOARD EXPEDIENTES
// PREMIUM 2027 — MISMO ESTILO QUE EXPEDIENTES
// ============================================================

import { useDashboard } from "../../hooks/useDashboard";

// ============================================================
// ACTIVIDADES
// ============================================================

const ACTIVIDADES = [
  {
    key: "documentacion_previa",
    nombre: "Documentación previa",
    descripcion: "Preparación y revisión inicial del expediente",
    icono: "📄",
  },
  {
    key: "sede_notarial",
    nombre: "Sede notarial",
    descripcion: "Expedientes enviados al notario pendientes de firma",
    icono: "🏛️",
  },
  {
    key: "sede_notarial_con_protocolo",
    nombre: "Sede notarial con protocolo",
    descripcion: "Expedientes firmados con protocolo asignado",
    icono: "✍️",
  },
  {
    key: "liquidacion_impuestos",
    nombre: "Liquidación de impuestos",
    descripcion: "Presentación y liquidación tributaria",
    icono: "💶",
  },
  {
    key: "tramitacion_inscripcion",
    nombre: "Tramitación inscripción",
    descripcion: "Presentación y seguimiento registral",
    icono: "📚",
  },
  {
    key: "defectos_registrales",
    nombre: "Defectos registrales",
    descripcion: "Gestión de defectos y subsanaciones",
    icono: "⚠️",
  },
  {
    key: "facturacion_cierre",
    nombre: "Facturación y cierre",
    descripcion: "Facturación, cierre y archivo del expediente",
    icono: "✅",
  },
];

// ============================================================
// HELPERS
// ============================================================

function numero(valor) {
  return Number(valor || 0).toLocaleString("es-ES");
}

function decimal(valor, decimales = 1) {
  if (valor == null || Number.isNaN(Number(valor))) {
    return "—";
  }

  return Number(valor).toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

function porcentaje(valor) {
  if (valor == null || Number.isNaN(Number(valor))) {
    return "0 %";
  }

  return `${Number(valor).toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

// ============================================================
// COMPONENTES VISUALES
// ============================================================

function IconoRefresh({ spinning = false }) {
  return (
    <svg
      className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 20v-5h-5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.5 15a7 7 0 0011.9 1.9L20 14"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.5 9a7 7 0 00-11.9-1.9L4 10"
      />
    </svg>
  );
}

function KpiCard({
  icono,
  titulo,
  valor,
  descripcion,
}) {
  return (
    <div className="erp-card group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--erp-text-soft)" }}
          >
            {titulo}
          </div>

          <div
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--erp-text)" }}
          >
            {valor}
          </div>

          {descripcion && (
            <div
              className="mt-1 text-sm"
              style={{ color: "var(--erp-text-soft)" }}
            >
              {descripcion}
            </div>
          )}
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{
            background: "var(--erp-primary-soft)",
            color: "var(--erp-primary)",
          }}
        >
          {icono}
        </div>
      </div>
    </div>
  );
}

function ActividadCard({
  actividad,
  total,
}) {
  return (
    <div className="erp-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{
            background: "var(--erp-primary-soft)",
          }}
        >
          {actividad.icono}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-semibold"
            style={{ color: "var(--erp-text)" }}
          >
            {actividad.nombre}
          </div>

          <div
            className="mt-0.5 truncate text-xs"
            style={{ color: "var(--erp-text-soft)" }}
          >
            {actividad.descripcion}
          </div>
        </div>

        <div
          className="text-xl font-bold"
          style={{ color: "var(--erp-primary)" }}
        >
          {numero(total)}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FIRMA CARD
// ============================================================

function FirmaCard({
  icono,
  titulo,
  total,
  porcentajeValor,
}) {
  return (
    <div className="erp-card p-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{
            background: "var(--erp-primary-soft)",
          }}
        >
          {icono}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="text-sm font-semibold"
            style={{ color: "var(--erp-text)" }}
          >
            {titulo}
          </div>

          <div
            className="mt-1 text-xs"
            style={{ color: "var(--erp-text-soft)" }}
          >
            Firmas realizadas
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--erp-text)" }}
          >
            {numero(total)}
          </div>

          <div
            className="text-xs font-medium"
            style={{ color: "var(--erp-primary)" }}
          >
            {porcentaje(porcentajeValor)}
          </div>
        </div>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full"
        style={{
          background: "var(--erp-surface-soft)",
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(
              Math.max(Number(porcentajeValor || 0), 0),
              100
            )}%`,
            background: "var(--erp-primary)",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const {
    totalExpedientes,
    expedientesPorActividad,
    mediaFirmaPorTipoOperacion,
    loading,
    error,
    cargarDashboard,
  } = useDashboard();

  // ----------------------------------------------------------
  // ACTIVIDADES
  // ----------------------------------------------------------

  const actividadesMap = {};

  if (Array.isArray(expedientesPorActividad)) {
    expedientesPorActividad.forEach((actividad) => {
      actividadesMap[actividad.key] = Number(
        actividad.total || 0
      );
    });
  }

  const actividades = ACTIVIDADES.map((actividad) => ({
    ...actividad,
    total: actividadesMap[actividad.key] || 0,
  }));

  // ----------------------------------------------------------
  // CIRCUITO
  // ----------------------------------------------------------

  const enCircuito = actividades.reduce(
    (total, actividad) => total + actividad.total,
    0
  );

  // ----------------------------------------------------------
  // MEDIA GENERAL DE FIRMA
  // ----------------------------------------------------------

  let mediaGeneral = null;

  if (
    Array.isArray(mediaFirmaPorTipoOperacion) &&
    mediaFirmaPorTipoOperacion.length > 0
  ) {
    let totalDias = 0;
    let totalFirmados = 0;

    mediaFirmaPorTipoOperacion.forEach((fila) => {
      const firmados = Number(
        fila?.expedientes_firmados || 0
      );

      const mediaDias =
        fila?.media_dias == null
          ? null
          : Number(fila.media_dias);

      if (
        firmados > 0 &&
        mediaDias != null &&
        !Number.isNaN(mediaDias)
      ) {
        totalDias += firmados * mediaDias;
        totalFirmados += firmados;
      }
    });

    if (totalFirmados > 0) {
      mediaGeneral = totalDias / totalFirmados;
    }
  }

  // ----------------------------------------------------------
  // FIRMAS
  //
  // IMPORTANTE:
  // El backend todavía no dispone de tipo_firma.
  //
  // Cuando implementemos la ventana de encargo al notario,
  // el expediente guardará:
  //
  //   tipo_firma = "Presencial"
  //   tipo_firma = "Videoconferencia"
  //
  // El endpoint del dashboard podrá devolver:
  //
  //   firmas_realizadas: {
  //      total: 120,
  //      presencial: 80,
  //      videoconferencia: 40
  //   }
  //
  // Hasta entonces NO inventamos valores.
  // ----------------------------------------------------------

  const firmasRealizadas =
    useDashboard.firmasRealizadas || null;

  const totalFirmas = Number(
    firmasRealizadas?.total || 0
  );

  const firmasPresenciales = Number(
    firmasRealizadas?.presencial || 0
  );

  const firmasVideoconferencia = Number(
    firmasRealizadas?.videoconferencia || 0
  );

  const porcentajePresencial =
    totalFirmas > 0
      ? (firmasPresenciales / totalFirmas) * 100
      : 0;

  const porcentajeVideoconferencia =
    totalFirmas > 0
      ? (firmasVideoconferencia / totalFirmas) * 100
      : 0;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="erp-page w-full">
      {/* ======================================================
          CABECERA
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--erp-text)" }}
          >
            Dashboard de Expedientes
          </div>

          <div
            className="mt-1 text-sm"
            style={{ color: "var(--erp-text-soft)" }}
          >
            Visión general del circuito de expedientes
          </div>
        </div>

        <button
          type="button"
          onClick={cargarDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            borderColor: "var(--erp-border)",
            background: "var(--erp-surface)",
            color: "var(--erp-text)",
          }}
        >
          <IconoRefresh spinning={loading} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "#fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
          }}
        >
          <strong className="font-semibold">
            No se ha podido cargar el Dashboard.
          </strong>

          <div className="mt-1">
            {error}
          </div>
        </div>
      )}

      {/* ======================================================
          KPIs PRINCIPALES
      ====================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icono="📁"
          titulo="Total expedientes"
          valor={numero(totalExpedientes)}
          descripcion="Expedientes registrados"
        />

        <KpiCard
          icono="🔄"
          titulo="Actividades"
          valor="7"
          descripcion="Etapas del circuito"
        />

        <KpiCard
          icono="📊"
          titulo="En circuito"
          valor={numero(enCircuito)}
          descripcion="Expedientes por actividad"
        />

        <KpiCard
          icono="⏱️"
          titulo="Media hasta firma"
          valor={
            mediaGeneral == null
              ? "—"
              : `${decimal(mediaGeneral, 1)} días`
          }
          descripcion="Desde envío hasta firma"
        />
      </div>

      {/* ======================================================
          FIRMAS REALIZADAS
      ====================================================== */}

      <section className="mb-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--erp-text)" }}
          >
            Firmas realizadas
          </h2>

          <p
            className="text-sm"
            style={{ color: "var(--erp-text-soft)" }}
          >
            Distribución de las firmas realizadas según la
            modalidad seleccionada en el encargo al notario.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <KpiCard
            icono="✍️"
            titulo="Total firmas"
            valor={numero(totalFirmas)}
            descripcion="Firmas realizadas"
          />

          <FirmaCard
            icono="🏛️"
            titulo="Presencial"
            total={firmasPresenciales}
            porcentajeValor={porcentajePresencial}
          />

          <FirmaCard
            icono="💻"
            titulo="Videoconferencia"
            total={firmasVideoconferencia}
            porcentajeValor={porcentajeVideoconferencia}
          />
        </div>
      </section>

      {/* ======================================================
          ACTIVIDADES
      ====================================================== */}

      <section className="mb-6">
        <div className="mb-4">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--erp-text)" }}
          >
            Expedientes por actividad
          </h2>

          <p
            className="mt-1 text-sm"
            style={{ color: "var(--erp-text-soft)" }}
          >
            Situación actual de los expedientes dentro del
            circuito de trabajo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actividades.map((actividad) => (
            <ActividadCard
              key={actividad.key}
              actividad={actividad}
              total={actividad.total}
            />
          ))}
        </div>
      </section>

      {/* ======================================================
          MEDIA DE FIRMA POR TIPO DE OPERACIÓN
      ====================================================== */}

      <section className="mb-6">
        <div className="mb-4">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--erp-text)" }}
          >
            Tiempo medio hasta firma
          </h2>

          <p
            className="mt-1 text-sm"
            style={{ color: "var(--erp-text-soft)" }}
          >
            Tiempo medio desde la fecha de envío hasta la
            firma, agrupado por tipo de operación.
          </p>
        </div>

        <div className="erp-card overflow-hidden">
          {Array.isArray(mediaFirmaPorTipoOperacion) &&
          mediaFirmaPorTipoOperacion.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      borderColor: "var(--erp-border)",
                      background:
                        "var(--erp-surface-soft)",
                    }}
                  >
                    <th
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color:
                          "var(--erp-text-soft)",
                      }}
                    >
                      Tipo de operación
                    </th>

                    <th
                      className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color:
                          "var(--erp-text-soft)",
                      }}
                    >
                      Expedientes firmados
                    </th>

                    <th
                      className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                      style={{
                        color:
                          "var(--erp-text-soft)",
                      }}
                    >
                      Media
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {mediaFirmaPorTipoOperacion.map(
                    (fila, indice) => (
                      <tr
                        key={`${fila?.tipo_operacion || "sin-tipo"}-${indice}`}
                        className="border-b last:border-b-0"
                        style={{
                          borderColor:
                            "var(--erp-border)",
                        }}
                      >
                        <td
                          className="px-5 py-4 font-medium"
                          style={{
                            color:
                              "var(--erp-text)",
                          }}
                        >
                          {fila?.tipo_operacion ||
                            "Sin tipo de operación"}
                        </td>

                        <td
                          className="px-5 py-4 text-right font-semibold"
                          style={{
                            color:
                              "var(--erp-text)",
                          }}
                        >
                          {numero(
                            fila?.expedientes_firmados
                          )}
                        </td>

                        <td
                          className="px-5 py-4 text-right"
                          style={{
                            color:
                              "var(--erp-primary)",
                          }}
                        >
                          {fila?.media_dias == null
                            ? "—"
                            : `${decimal(
                                fila.media_dias,
                                1
                              )} días`}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mb-2 text-3xl">
                📊
              </div>

              <div
                className="text-sm font-medium"
                style={{
                  color: "var(--erp-text)",
                }}
              >
                Todavía no hay datos de firmas por
                tipo de operación.
              </div>

              <div
                className="mt-1 text-xs"
                style={{
                  color:
                    "var(--erp-text-soft)",
                }}
              >
                Los datos aparecerán cuando existan
                expedientes con fecha de envío y fecha
                de firma.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================
          DISTRIBUCIÓN VISUAL
      ====================================================== */}

      <section>
        <div className="mb-4">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--erp-text)" }}
          >
            Distribución del circuito
          </h2>

          <p
            className="mt-1 text-sm"
            style={{ color: "var(--erp-text-soft)" }}
          >
            Representación visual de los expedientes por
            actividad.
          </p>
        </div>

        <div className="erp-card p-5">
          <div className="space-y-4">
            {actividades.map((actividad) => {
              const total =
                Number(actividad.total || 0);

              const porcentajeActividad =
                totalExpedientes > 0
                  ? (total / totalExpedientes) * 100
                  : 0;

              return (
                <div key={actividad.key}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-base">
                        {actividad.icono}
                      </span>

                      <span
                        className="truncate text-sm font-medium"
                        style={{
                          color:
                            "var(--erp-text)",
                        }}
                      >
                        {actividad.nombre}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            "var(--erp-text)",
                        }}
                      >
                        {numero(total)}
                      </span>

                      <span
                        className="w-14 text-right text-xs"
                        style={{
                          color:
                            "var(--erp-text-soft)",
                        }}
                      >
                        {porcentaje(
                          porcentajeActividad
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    className="h-2 overflow-hidden rounded-full"
                    style={{
                      background:
                        "var(--erp-surface-soft)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          Math.max(
                            porcentajeActividad,
                            0
                          ),
                          100
                        )}%`,
                        background:
                          "var(--erp-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================
          NOTA TÉCNICA
      ====================================================== */}

      {!firmasRealizadas && (
        <div
          className="mt-6 rounded-xl border px-4 py-3 text-xs"
          style={{
            borderColor: "var(--erp-border)",
            background:
              "var(--erp-surface-soft)",
            color: "var(--erp-text-soft)",
          }}
        >
          <strong
            style={{
              color: "var(--erp-text)",
            }}
          >
            Firmas presenciales / videoconferencia:
          </strong>{" "}
          esta información quedará disponible cuando
          implementemos la ventana de encargo al notario y
          guardemos en el expediente la modalidad de firma
          seleccionada.
        </div>
      )}
    </div>
  );
}

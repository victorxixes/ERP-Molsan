import { useDashboard } from "../../hooks/useDashboard";


/* ============================================================
   DASHBOARD EXPEDIENTES
   MOLSAN ERP SAAS PREMIUM 2027
============================================================ */

const ACTIVIDADES = [
  {
    key: "documentacion_previa",
    nombre: "Documentación previa",
    icono: "📄",
  },
  {
    key: "sede_notarial",
    nombre: "Sede notarial",
    icono: "🏛️",
  },
  {
    key: "sede_notarial_con_protocolo",
    nombre: "Sede notarial con protocolo",
    icono: "📜",
  },
  {
    key: "liquidacion_impuestos",
    nombre: "Liquidación de impuestos",
    icono: "💶",
  },
  {
    key: "tramitacion_inscripcion",
    nombre: "Tramitación inscripción",
    icono: "🏢",
  },
  {
    key: "defectos_registrales",
    nombre: "Defectos registrales",
    icono: "⚠️",
  },
  {
    key: "facturacion_cierre",
    nombre: "Facturación y cierre",
    icono: "✅",
  },
];


/* ============================================================
   HELPERS
============================================================ */

function numero(valor) {
  return Number(valor ?? 0).toLocaleString("es-ES");
}


function dias(valor) {
  if (valor == null || Number.isNaN(Number(valor))) {
    return "—";
  }

  return `${Number(valor).toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} días`;
}


/* ============================================================
   TARJETA KPI
============================================================ */

function KpiCard({
  titulo,
  valor,
  descripcion,
  icono,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-xl">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-[var(--erp-muted)]">
            {titulo}
          </p>

          <div className="mt-2 text-3xl font-bold tracking-tight">
            {valor}
          </div>

          {descripcion && (
            <p className="mt-1 text-xs text-[var(--erp-muted)]">
              {descripcion}
            </p>
          )}

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl">
          {icono}
        </div>

      </div>

    </div>
  );
}


/* ============================================================
   ACTIVIDAD
============================================================ */

function ActividadCard({
  actividad,
  total,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07]">

      <div className="flex items-center justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
            {actividad.icono}
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-semibold">
              {actividad.nombre}
            </p>

            <p className="mt-1 text-xs text-[var(--erp-muted)]">
              Expedientes en actividad
            </p>

          </div>

        </div>

        <div className="shrink-0 text-2xl font-bold">
          {numero(total)}
        </div>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">

        <div
          className="h-full rounded-full bg-current opacity-70"
          style={{
            width: "100%",
          }}
        />

      </div>

    </div>
  );
}


/* ============================================================
   LOADING
============================================================ */

function DashboardLoading() {
  return (
    <div className="space-y-6">

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

        <div className="h-7 w-72 animate-pulse rounded bg-white/10" />

        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-white/10" />

      </div>


      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}

      </div>


      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}

      </div>

    </div>
  );
}


/* ============================================================
   DASHBOARD
============================================================ */

export default function Dashboard() {

  const {
    totalExpedientes,
    expedientesPorActividad,
    mediaFirmaPorTipoOperacion,
    loading,
    error,
    cargarDashboard,
  } = useDashboard();


  /* ----------------------------------------------------------
     MAPA ACTIVIDADES
  ---------------------------------------------------------- */

  const actividades = ACTIVIDADES.map((actividad) => {

    const encontrada =
      expedientesPorActividad.find(
        (item) =>
          item?.key === actividad.key
      );

    return {
      ...actividad,
      total: encontrada?.total ?? 0,
    };

  });


  /* ----------------------------------------------------------
     TOTAL EN ACTIVIDADES
  ---------------------------------------------------------- */

  const totalActividades =
    actividades.reduce(
      (total, actividad) =>
        total + Number(actividad.total || 0),
      0
    );


  /* ----------------------------------------------------------
     MEDIA GENERAL
  ---------------------------------------------------------- */

  const mediasValidas =
    mediaFirmaPorTipoOperacion.filter(
      (item) =>
        item?.media_dias != null &&
        !Number.isNaN(
          Number(item.media_dias)
        )
    );


  const mediaGeneral =
    mediasValidas.length > 0
      ? mediasValidas.reduce(
          (suma, item) =>
            suma + Number(item.media_dias),
          0
        ) / mediasValidas.length
      : null;


  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  if (loading && totalExpedientes === 0) {
    return <DashboardLoading />;
  }


  return (
    <div className="w-full space-y-6">

      {/* ======================================================
          CABECERA
      ====================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
                📊
              </div>

              <div>

                <h1 className="text-2xl font-bold tracking-tight">
                  Dashboard de Expedientes
                </h1>

                <p className="mt-1 text-sm text-[var(--erp-muted)]">
                  Visión general del circuito y evolución de los expedientes
                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            onClick={cargarDashboard}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "↻ Actualizar"}
          </button>

        </div>

      </section>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">

          <div className="flex items-start gap-3">

            <div className="text-xl">
              ⚠️
            </div>

            <div>

              <p className="font-semibold">
                No se ha podido cargar el Dashboard
              </p>

              <p className="mt-1 text-sm text-[var(--erp-muted)]">
                {error}
              </p>

            </div>

          </div>

        </div>
      )}


      {/* ======================================================
          KPIs
      ====================================================== */}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          titulo="Total expedientes"
          valor={numero(totalExpedientes)}
          descripcion="Total registrado en el sistema"
          icono="📁"
        />

        <KpiCard
          titulo="Actividades"
          valor={numero(actividades.length)}
          descripcion="Etapas del circuito"
          icono="🔄"
        />

        <KpiCard
          titulo="Expedientes en circuito"
          valor={numero(totalActividades)}
          descripcion="Distribuidos entre actividades"
          icono="📋"
        />

        <KpiCard
          titulo="Media hasta firma"
          valor={dias(mediaGeneral)}
          descripcion="Media de todos los tipos de operación"
          icono="✍️"
        />

      </section>


      {/* ======================================================
          EXPEDIENTES POR ACTIVIDAD
      ====================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl">

        <div className="mb-5">

          <h2 className="text-lg font-bold">
            Expedientes por actividad
          </h2>

          <p className="mt-1 text-sm text-[var(--erp-muted)]">
            Distribución actual de los expedientes dentro del circuito
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
          MEDIA DE FIRMA
      ====================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl">

        <div className="mb-5">

          <h2 className="text-lg font-bold">
            Media de días hasta firma
          </h2>

          <p className="mt-1 text-sm text-[var(--erp-muted)]">
            Tiempo medio entre el inicio de actividad y la fecha de firma,
            agrupado por tipo de operación
          </p>

        </div>


        {mediaFirmaPorTipoOperacion.length === 0 ? (

          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">

            <div className="text-3xl">
              📈
            </div>

            <p className="mt-3 font-semibold">
              Todavía no hay datos de firma
            </p>

            <p className="mt-1 text-sm text-[var(--erp-muted)]">
              Se mostrarán aquí los tiempos medios cuando existan
              expedientes con fecha de inicio y fecha de firma.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px] border-collapse">

              <thead>

                <tr className="border-b border-white/10">

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--erp-muted)]">
                    Tipo de operación
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--erp-muted)]">
                    Expedientes firmados
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--erp-muted)]">
                    Media
                  </th>

                </tr>

              </thead>


              <tbody>

                {mediaFirmaPorTipoOperacion.map(
                  (fila, indice) => (

                    <tr
                      key={`${fila.tipo_operacion}-${indice}`}
                      className="border-b border-white/5 last:border-b-0"
                    >

                      <td className="px-4 py-4">

                        <span className="font-medium">
                          {fila.tipo_operacion ||
                            "Sin tipo de operación"}
                        </span>

                      </td>


                      <td className="px-4 py-4 text-center">

                        <span className="inline-flex rounded-lg bg-white/10 px-3 py-1 text-sm font-semibold">
                          {numero(
                            fila.expedientes_firmados
                          )}
                        </span>

                      </td>


                      <td className="px-4 py-4 text-right">

                        <span className="text-lg font-bold">
                          {dias(fila.media_dias)}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ======================================================
          RESUMEN DEL CIRCUITO
      ====================================================== */}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl">

        <div className="mb-5">

          <h2 className="text-lg font-bold">
            Resumen del circuito
          </h2>

          <p className="mt-1 text-sm text-[var(--erp-muted)]">
            Estado actual de las principales etapas de trabajo
          </p>

        </div>


        <div className="space-y-4">

          {actividades.map((actividad) => {

            const porcentaje =
              totalExpedientes > 0
                ? Math.min(
                    100,
                    (actividad.total /
                      totalExpedientes) *
                      100
                  )
                : 0;

            return (
              <div
                key={actividad.key}
                className="grid grid-cols-[minmax(180px,280px)_1fr_70px] items-center gap-4"
              >

                <div className="flex min-w-0 items-center gap-2">

                  <span>
                    {actividad.icono}
                  </span>

                  <span className="truncate text-sm font-medium">
                    {actividad.nombre}
                  </span>

                </div>


                <div className="h-3 overflow-hidden rounded-full bg-white/10">

                  <div
                    className="h-full rounded-full bg-current opacity-70 transition-all duration-500"
                    style={{
                      width: `${porcentaje}%`,
                    }}
                  />

                </div>


                <div className="text-right text-sm font-bold">
                  {numero(actividad.total)}
                </div>

              </div>
            );

          })}

        </div>

      </section>


      {/* ======================================================
          PIE
      ====================================================== */}

      <div className="pb-4 text-center text-xs text-[var(--erp-muted)]">
        Dashboard de Expedientes · MOLSAN ERP
      </div>

    </div>
  );
}

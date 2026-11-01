// ============================================================
// ERP MOLSAN — DASHBOARD EXPEDIENTES
// PREMIUM 2027 — MISMO ESTILO QUE EXPEDIENTES
// ============================================================

import { useDashboard } from "../../hooks/useDashboard";
import { useNavigate } from "react-router-dom";
import MolsanIcon from "../../components/ui/MolsanIcon";
import "../../css/DashboardCancelagest.css";

// ============================================================
// ACTIVIDADES
// ============================================================

const ACTIVIDADES = [
  {
    key: "documentacion_previa",
    nombre: "Documentación previa",
    descripcion: "Preparación y revisión inicial del expediente",
    icono: "file",
  },
  {
    key: "sede_notarial",
    nombre: "Sede notarial",
    descripcion: "Expedientes enviados al notario pendientes de firma",
    icono: "courthouse",
  },
  {
    key: "sede_notarial_con_protocolo",
    nombre: "Sede notarial con protocolo",
    descripcion: "Expedientes firmados con protocolo asignado",
    icono: "pen",
  },
  {
    key: "gestion_economica",
    nombre: "Gestión económica",
    descripcion: "Revisión y gestión de los datos económicos del expediente",
    icono: "briefcase",
  },
  {
    key: "liquidacion_impuestos",
    nombre: "Liquidación de impuestos",
    descripcion: "Presentación y liquidación tributaria",
    icono: "euro",
  },
  {
    key: "tramitacion_inscripcion",
    nombre: "Tramitación inscripción",
    descripcion: "Presentación y seguimiento registral",
    icono: "book",
  },
  {
    key: "defectos_registrales",
    nombre: "Defectos registrales",
    descripcion: "Gestión de defectos y subsanaciones",
    icono: "alert",
  },
  {
    key: "facturacion_cierre",
    nombre: "Facturación y cierre",
    descripcion: "Facturación, cierre y archivo del expediente",
    icono: "check",
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
    return "—";
  }

  return `${Number(valor).toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}

// ============================================================
// COMPONENTES VISUALES
// ============================================================

function KpiCard({ icono, titulo, valor, descripcion }) {
  return (
    <div className="erp-card dashboard-kpi group relative overflow-hidden p-4 transition-all duration-150">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--erp-text-soft)" }}>
            {titulo}
          </div>
          <div className="dashboard-kpi__value text-3xl font-bold tracking-tight" style={{ color: "var(--erp-text)" }}>
            {valor}
          </div>
          {descripcion && (
            <div className="mt-1 text-sm" style={{ color: "var(--erp-text-soft)" }}>
              {descripcion}
            </div>
          )}
        </div>
        <MolsanIcon name={icono} size={42} tone="ocean" />
      </div>
    </div>
  );
}

function ActividadCard({ actividad, total, porcentajeValor }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0 transition-colors duration-150 hover:bg-[var(--erp-surface-soft)]" style={{ borderColor: "var(--erp-border)" }}>
      <MolsanIcon name={actividad.icono} size={42} tone="ocean" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: "var(--erp-text)" }}>
          {actividad.nombre}
        </div>
        <div className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--erp-text-soft)" }}>
          {actividad.descripcion}
        </div>
      </div>
      <div className="min-w-12 rounded-lg px-3 py-1 text-right text-lg font-bold tabular-nums" style={{ color: "var(--erp-primary)", background: "var(--erp-primary-soft)" }}>
        {numero(total)}
      </div>
      <div className="dashboard-activity-inline" aria-label={actividad.nombre + ': ' + porcentaje(porcentajeValor) + ' del total'}>
        <div className="dashboard-activity-track h-1.5 overflow-hidden rounded-full" style={{ background: "var(--erp-surface-soft)" }}>
          <div className="dashboard-activity-bar h-full rounded-full" style={{ width: Math.min(Math.max(Number(porcentajeValor || 0), 0), 100) + "%", background: "var(--erp-primary)" }} />
        </div>
        <span className="text-xs tabular-nums" style={{ color: "var(--erp-text-soft)" }}>{porcentaje(porcentajeValor)}</span>
      </div>
    </div>
  );
}

// ============================================================
// FIRMA CARD
// ============================================================

function FirmaCard({ icono, titulo, total, porcentajeValor }) {
  return (
    <div className="erp-card p-5">
      <div className="flex items-center gap-4">
        <MolsanIcon name={icono} size={48} tone="ocean" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold" style={{ color: "var(--erp-text)" }}>
            {titulo}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--erp-text-soft)" }}>
            Firmas realizadas
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: "var(--erp-text)" }}>
            {numero(total)}
          </div>
          <div className="text-xs font-medium" style={{ color: "var(--erp-primary)" }}>
            {porcentaje(porcentajeValor)}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "var(--erp-surface-soft)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(Number(porcentajeValor || 0), 0), 100)}%`, background: "var(--erp-primary)" }} />
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const fechaActual = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const {
    totalExpedientes,
    expedientesPorActividad,
    mediaFirmaPorTipoOperacion,
    firmasRealizadas,
    errorFirmas,
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
      actividadesMap[actividad.key] = Number(actividad.total || 0);
    });
  }

  const actividades = ACTIVIDADES.map((actividad) => ({
    ...actividad,
    total: actividadesMap[actividad.key] || 0,
  }));

  // ----------------------------------------------------------
  // CIRCUITO
  // ----------------------------------------------------------

  const enCircuito = actividades.reduce((total, actividad) => total + actividad.total, 0);

  // ----------------------------------------------------------
  // MEDIA GENERAL DE FIRMA
  // ----------------------------------------------------------

  let mediaGeneral = null;

  if (Array.isArray(mediaFirmaPorTipoOperacion) && mediaFirmaPorTipoOperacion.length > 0) {
    let totalDias = 0;
    let totalFirmados = 0;

    mediaFirmaPorTipoOperacion.forEach((fila) => {
      const firmados = Number(fila?.expedientes_firmados || 0);
      const mediaDias = fila?.media_dias == null ? null : Number(fila.media_dias);

      if (firmados > 0 && mediaDias != null && !Number.isNaN(mediaDias)) {
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
  // ----------------------------------------------------------

  const totalFirmas = firmasRealizadas == null ? null : Number(firmasRealizadas.total || 0);
  const firmasPresenciales = firmasRealizadas == null ? null : Number(firmasRealizadas.presencial || 0);
  const firmasVideoconferencia = firmasRealizadas == null ? null : Number(firmasRealizadas.videoconferencia || 0);
  const porcentajePresencial = totalFirmas > 0 ? (firmasPresenciales / totalFirmas) * 100 : firmasRealizadas == null ? null : 0;
  const porcentajeVideoconferencia = totalFirmas > 0 ? (firmasVideoconferencia / totalFirmas) * 100 : firmasRealizadas == null ? null : 0;

  return (
    <div className="erp-page w-full dashboard-cancelagest molsan-page" aria-busy={loading}>
      {/* CABECERA UNIFICADA CON APODERAGEST Y NOTARGEST */}
      <header className="ag-hero molsan-page-header dashboard-header" style={{ "--ag-muted": "var(--molsan-text-muted)", "--ag-ink": "var(--molsan-text)" }}>
        <div className="ag-hero-identidad molsan-page-header__identity">
          <div className="ag-marca cg-marca-cancelagest molsan-page-header__mark" aria-label="CancelaGest">CG</div>
          <div>
            <div className="ag-eyebrow molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</div>
            <h1 className="molsan-page-header__title">Dashboard</h1>
            <p className="molsan-page-header__description">Resumen operativo de expedientes, actividad del circuito y firmas realizadas.</p>
          </div>
        </div>
      </header>

      {/* ERRORES DE CARGA */}
      {error && (
        <div role="alert" aria-live="assertive" className="mb-6 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c" }}>
          <strong className="font-semibold">No se ha podido cargar el Dashboard.</strong>
          <div className="mt-1">{error}</div>
        </div>
      )}
      {errorFirmas && (
        <div role="alert" aria-live="assertive" className="mb-6 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#fed7aa", background: "#fff7ed", color: "#9a3412" }}>
          <strong className="font-semibold">No se han podido cargar las firmas reales.</strong>
          <div className="mt-1">{errorFirmas}</div>
        </div>
      )}

      {/* KPIs PRINCIPALES */}
      <div className="dashboard-kpis mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icono="folder" titulo="Total expedientes" valor={numero(totalExpedientes)} descripcion="Expedientes registrados" />
        <KpiCard icono="refresh" titulo="Actividades" valor="7" descripcion="Etapas del circuito" />
        <KpiCard icono="chart" titulo="En circuito" valor={numero(enCircuito)} descripcion="Expedientes por actividad" />
        <KpiCard icono="timer" titulo="Media hasta firma" valor={mediaGeneral == null ? "—" : `${decimal(mediaGeneral, 1)} días`} descripcion="Desde envío hasta firma" />
      </div>

      {/* ACTIVIDADES + TIEMPO MEDIO HASTA FIRMA */}
      <div className="dashboard-main-grid mb-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ACTIVIDADES */}
      <section className="dashboard-section-panel min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--erp-text)" }}>Expedientes por actividad</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--erp-text-soft)" }}>
            Situación actual de los expedientes dentro del circuito de trabajo.
          </p>
        </div>
        <div className="erp-card min-w-0 overflow-hidden p-0">
          {actividades.map((actividad) => (
            <ActividadCard key={actividad.key} actividad={actividad} total={actividad.total} porcentajeValor={totalExpedientes > 0 ? (actividad.total / totalExpedientes) * 100 : 0} />
          ))}
        </div>
      </section>


      {/* ======================================================
          TIEMPO MEDIO HASTA FIRMA
          La distribución de firmas aparece debajo de la tabla.
      ====================================================== */}
      <div className="min-w-0">
        {/* MEDIA DE FIRMA POR TIPO DE OPERACIÓN */}
        <section className="dashboard-section-panel min-w-0">
          <div className="mb-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--erp-text)" }}>
              Tiempo medio hasta firma
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--erp-text-soft)" }}>
              Tiempo medio desde la fecha de envío hasta la firma, agrupado por tipo de operación.
            </p>
          </div>

          <div className="erp-card min-w-0 overflow-hidden">
            {Array.isArray(mediaFirmaPorTipoOperacion) && mediaFirmaPorTipoOperacion.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--erp-border)", background: "var(--erp-surface-soft)" }}>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--erp-text-soft)" }}>
                        Tipo de operación
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--erp-text-soft)" }}>
                        Expedientes firmados
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--erp-text-soft)" }}>
                        Media
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaFirmaPorTipoOperacion.map((fila, indice) => (
                      <tr
                        key={`${fila?.tipo_operacion || "sin-tipo"}-${indice}`}
                        className="border-b last:border-b-0"
                        style={{ borderColor: "var(--erp-border)" }}
                      >
                        <td className="px-4 py-4 font-medium" style={{ color: "var(--erp-text)" }}>
                          {fila?.tipo_operacion || "Sin tipo de operación"}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold" style={{ color: "var(--erp-text)" }}>
                          {numero(fila?.expedientes_firmados)}
                        </td>
                        <td className="px-4 py-4 text-right" style={{ color: "var(--erp-primary)" }}>
                          {fila?.media_dias == null ? "—" : `${decimal(fila.media_dias, 1)} días`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="mb-2 flex justify-center"><MolsanIcon name="chart" size={44} /></div>
                <div className="text-sm font-medium" style={{ color: "var(--erp-text)" }}>
                  Todavía no hay datos de firmas por tipo de operación.
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--erp-text-soft)" }}>
                  Los datos aparecerán cuando existan expedientes con fecha de envío y fecha de firma.
                </div>
              </div>
            )}
          </div>
        </section>

      {/* FIRMAS REALIZADAS */}
      <section className="dashboard-section-panel min-w-0">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-bold" style={{ color: "var(--erp-text)" }}>Firmas realizadas</h2>
          <p className="text-sm" style={{ color: "var(--erp-text-soft)" }}>
            Distribución de las firmas realizadas según la modalidad seleccionada en el encargo al notario.
          </p>
        </div>
        <div className="dashboard-firmas-grid grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard icono="pen" titulo="Total firmas" valor={numero(totalFirmas)} descripcion="Firmas realizadas" />
          <FirmaCard icono="courthouse" titulo="Presencial" total={firmasPresenciales} porcentajeValor={porcentajePresencial} />
          <FirmaCard icono="monitor" titulo="Videoconferencia" total={firmasVideoconferencia} porcentajeValor={porcentajeVideoconferencia} />
        </div>
      </section>

      </div>
      </div>

      {/* NOTA TÉCNICA */}
      {!firmasRealizadas && (
        <div className="mt-6 rounded-xl border px-4 py-3 text-xs" style={{ borderColor: "var(--erp-border)", background: "var(--erp-surface-soft)", color: "var(--erp-text-soft)" }}>
          <strong style={{ color: "var(--erp-text)" }}>Firmas presenciales / videoconferencia:</strong>{" "}
          esta información quedará disponible cuando implementemos la ventana de encargo al notario y guardemos en el expediente la modalidad de firma seleccionada.
        </div>
      )}
    </div>
  );
}

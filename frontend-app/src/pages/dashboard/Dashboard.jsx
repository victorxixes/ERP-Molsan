// ============================================================
// ERP MOLSAN — DASHBOARD DE EXPEDIENTES
// Resumen operativo
// ============================================================

import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useDashboard } from "../../hooks/useDashboard";
import { useNavigate } from "react-router-dom";

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
    key: "gestion_economica",
    nombre: "Gestión económica",
    descripcion: "Revisión y gestión de los datos económicos del expediente",
    icono: "💼",
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
    <div className="erp-card dashboard-kpi group relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 uppercase" >
            {titulo}
          </div>
          <div className="dashboard-kpi__value" >
            {valor}
          </div>
          {descripcion && (
            <div className="mt-1" >
              {descripcion}
            </div>
          )}
        </div>
        <div className="dashboard-kpi__icon flex h-10 w-10 shrink-0 items-center justify-center" >
          {icono}
        </div>
      </div>
    </div>
  );
}

function ActividadCard({ actividad, total, porcentajeValor }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center" >
        {actividad.icono}
      </div>
      <div className="min-w-0 flex-1">
        <div >
          {actividad.nombre}
        </div>
        <div className="mt-0.5" >
          {actividad.descripcion}
        </div>
      </div>
      <div className="min-w-12 px-3 py-1 tabular-nums" >
        {numero(total)}
      </div>
      <div className="dashboard-activity-inline" aria-label={actividad.nombre + ': ' + porcentaje(porcentajeValor) + ' del total'}>
        <div className="dashboard-activity-track h-1.5 overflow-hidden" >
          <div className="dashboard-activity-bar h-full" style={{ width: Math.min(Math.max(Number(porcentajeValor || 0), 0), 100) + "%" }}/>
        </div>
        <span className="tabular-nums" >{porcentaje(porcentajeValor)}</span>
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center" >
          {icono}
        </div>
        <div className="min-w-0 flex-1">
          <div >
            {titulo}
          </div>
          <div className="mt-1" >
            Firmas realizadas
          </div>
        </div>
        <div>
          <div >
            {numero(total)}
          </div>
          <div >
            {porcentaje(porcentajeValor)}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden" >
        <div className="h-full" style={{ width: `${Math.min(Math.max(Number(porcentajeValor || 0), 0), 100)}%` }}/>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();
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
      <MolsanPageHeader mark="DB" title="Dashboard" description="Resumen operativo de expedientes, actividad del circuito y firmas realizadas." />

      {/* ERRORES DE CARGA */}
      {error && (
        <div role="alert" aria-live="assertive" className="mb-6 px-4 py-3" >
          <strong>No se ha podido cargar el Dashboard.</strong>
          <div className="mt-1">{error}</div>
        </div>
      )}
      {errorFirmas && (
        <div role="alert" aria-live="assertive" className="mb-6 px-4 py-3" >
          <strong>No se han podido cargar las firmas reales.</strong>
          <div className="mt-1">{errorFirmas}</div>
        </div>
      )}

      {/* KPIs PRINCIPALES */}
      <div className="dashboard-kpis mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icono="📁" titulo="Total expedientes" valor={numero(totalExpedientes)} descripcion="Expedientes registrados" />
        <KpiCard icono="🔄" titulo="Actividades" valor="7" descripcion="Etapas del circuito" />
        <KpiCard icono="📊" titulo="En circuito" valor={numero(enCircuito)} descripcion="Expedientes por actividad" />
        <KpiCard icono="⏱️" titulo="Media hasta firma" valor={mediaGeneral == null ? "—" : `${decimal(mediaGeneral, 1)} días`} descripcion="Desde envío hasta firma" />
      </div>

      {/* ACTIVIDADES + TIEMPO MEDIO HASTA FIRMA */}
      <div className="dashboard-main-grid mb-6 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ACTIVIDADES */}
      <section className="min-w-0">
        <div className="mb-4">
          <h2 >Expedientes por actividad</h2>
          <p className="mt-1" >
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
        <section className="min-w-0">
          <div className="mb-4">
            <h2 >
              Tiempo medio hasta firma
            </h2>
            <p className="mt-1" >
              Tiempo medio desde la fecha de envío hasta la firma, agrupado por tipo de operación.
            </p>
          </div>

          <div className="erp-card min-w-0 overflow-hidden">
            {Array.isArray(mediaFirmaPorTipoOperacion) && mediaFirmaPorTipoOperacion.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr >
                      <th className="px-4 py-3 uppercase" >
                        Tipo de operación
                      </th>
                      <th className="px-4 py-3 uppercase" >
                        Expedientes firmados
                      </th>
                      <th className="px-4 py-3 uppercase" >
                        Media
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaFirmaPorTipoOperacion.map((fila, indice) => (
                      <tr
                        key={`${fila?.tipo_operacion || "sin-tipo"}-${indice}`}
                       
                        
                      >
                        <td className="px-4 py-4" >
                          {fila?.tipo_operacion || "Sin tipo de operación"}
                        </td>
                        <td className="px-4 py-4" >
                          {numero(fila?.expedientes_firmados)}
                        </td>
                        <td className="px-4 py-4" >
                          {fila?.media_dias == null ? "—" : `${decimal(fila.media_dias, 1)} días`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10">
                <div className="mb-2">📊</div>
                <div >
                  Todavía no hay datos de firmas por tipo de operación.
                </div>
                <div className="mt-1" >
                  Los datos aparecerán cuando existan expedientes con fecha de envío y fecha de firma.
                </div>
              </div>
            )}
          </div>
        </section>

      </div>

      </div>

      {/* FIRMAS REALIZADAS + DISTRIBUCIÓN DEL CIRCUITO */}
      <div className="dashboard-signatures-wrap mb-6">
      {/* FIRMAS REALIZADAS */}
      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-1">
          <h2 >Firmas realizadas</h2>
          <p >
            Distribución de las firmas realizadas según la modalidad seleccionada en el encargo al notario.
          </p>
        </div>
        <div className="dashboard-firmas-grid grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard icono="✍️" titulo="Total firmas" valor={numero(totalFirmas)} descripcion="Firmas realizadas" />
          <FirmaCard icono="🏛️" titulo="Presencial" total={firmasPresenciales} porcentajeValor={porcentajePresencial} />
          <FirmaCard icono="💻" titulo="Videoconferencia" total={firmasVideoconferencia} porcentajeValor={porcentajeVideoconferencia} />
        </div>
      </section>

      </div>

      {/* NOTA TÉCNICA */}
      {!firmasRealizadas && (
        <div className="mt-6 px-4 py-3" >
          <strong >Firmas presenciales / videoconferencia:</strong>{" "}
          esta información quedará disponible cuando implementemos la ventana de encargo al notario y guardemos en el expediente la modalidad de firma seleccionada.
        </div>
      )}
    </div>
  );
}

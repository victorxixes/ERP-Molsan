import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
function fecha(valor) {
  if (!valor) return "—";
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [y, m, d] = texto.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(valor);
  return Number.isNaN(parsed.getTime()) ? texto : parsed.toLocaleDateString("es-ES");
}

function euros(valor) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(valor) || 0);
}

function coincide(item, texto) {
  if (!texto.trim()) return true;
  const busqueda = texto.trim().toLocaleLowerCase("es-ES");
  return [
    item.expediente_id, item.documento, item.gestor, item.concepto,
    item.solicitante, item.imputable_a, item.id,
  ].some((valor) => String(valor ?? "").toLocaleLowerCase("es-ES").includes(busqueda));
}

export default function PPAD() {
  const [items, setItems] = useState([]);
  const [resumen, setResumen] = useState({
    pendientes_total: 0, pendientes_importe: 0,
    compensados_total: 0, compensados_importe: 0, total: 0,
  });
  const [busquedaPendientes, setBusquedaPendientes] = useState("");
  const [busquedaCompensados, setBusquedaCompensados] = useState("");
  const [cargando, setCargando] = useState(true);
  const [accionId, setAccionId] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await axios.get("/utilidades/ppad");
      const datos = Array.isArray(respuesta.data?.items) ? respuesta.data.items : [];
      setItems(datos);
      setResumen(respuesta.data?.resumen || {
        pendientes_total: datos.filter((x) => !x.compensado).length,
        pendientes_importe: datos.filter((x) => !x.compensado).reduce((s, x) => s + Number(x.importe || 0), 0),
        compensados_total: datos.filter((x) => x.compensado).length,
        compensados_importe: datos.filter((x) => x.compensado).reduce((s, x) => s + Number(x.importe || 0), 0),
        total: datos.length,
      });
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo cargar el control de PPAD.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = useMemo(
    () => items.filter((item) => !item.compensado && coincide(item, busquedaPendientes)),
    [items, busquedaPendientes],
  );
  const compensados = useMemo(
    () => items.filter((item) => item.compensado && coincide(item, busquedaCompensados)),
    [items, busquedaCompensados],
  );

  async function compensar(item) {
    if (!window.confirm(`¿Confirmas que el PPAD ${item.documento} del expediente ${item.expediente_id} ya está compensado?`)) return;
    setAccionId(item.id);
    setError("");
    setMensaje("");
    try {
      await axios.post(`/expedientes/${encodeURIComponent(item.expediente_id)}/ppad/${item.id}/compensar`);
      setMensaje(`El PPAD ${item.documento} se ha marcado como compensado.`);
      await cargar();
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo registrar la compensación.");
    } finally {
      setAccionId(null);
    }
  }

  async function descargarExcel(estado, q) {
    setError("");
    try {
      const respuesta = await axios.get("/utilidades/ppad/exportar/excel", {
        params: { estado, q },
        responseType: "blob",
      });
      const url = URL.createObjectURL(respuesta.data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `ppad_${estado}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo descargar el Excel.");
    }
  }

  return (
    <div className="herramienta-operativa-premium herramientas-subpagina-premium min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <MolsanPageHeader mark="PP" title="Control de PPAD" description="Seguimiento de importes pendientes de compensar y compensados." actions={<Link to="/herramientas/utilidades" className="self-start rounded-xl border border-[var(--molsan-border)] px-4 py-2 text-sm font-bold text-[var(--molsan-text-secondary)] hover:bg-[var(--molsan-surface-soft)]"><MolsanIcon name="arrowLeft" size={14} bare /> Volver a Utilidades</Link>}/>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica titulo="PPAD pendientes" valor={resumen.pendientes_total} detalle="Registros por compensar" />
        <Metrica titulo="Importe pendiente" valor={euros(resumen.pendientes_importe)} detalle="Total pendiente de compensar" />
        <Metrica titulo="PPAD compensados" valor={resumen.compensados_total} detalle="Registros compensados" positivo />
        <Metrica titulo="Importe compensado" valor={euros(resumen.compensados_importe)} detalle="Total ya compensado" positivo />
      </div>

      <TablaPPAD titulo="PPAD pendientes de compensar" lista={pendientes} tipo="pendiente" busqueda={busquedaPendientes} setBusqueda={setBusquedaPendientes} compensar={compensar} accionId={accionId} descargarExcel={descargarExcel} cargando={cargando} />
      <TablaPPAD titulo="PPAD compensados" lista={compensados} tipo="compensado" busqueda={busquedaCompensados} setBusqueda={setBusquedaCompensados} compensar={compensar} accionId={accionId} descargarExcel={descargarExcel} cargando={cargando} />
      {cargando && <p className="text-center text-xs text-[var(--molsan-text-secondary)]">Actualizando datos PPAD…</p>}
    </div>
  );
}

function TablaPPAD({ titulo, lista, tipo, busqueda, setBusqueda, compensar, accionId, descargarExcel, cargando }) {
    const esPendiente = tipo === "pendiente";
    return (
      <section className="overflow-hidden rounded-2xl border border-[var(--molsan-border)] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--molsan-primary)]">{titulo}</h2>
            <p className="mt-1 text-xs text-[var(--molsan-text-secondary)]">{lista.length} registros en la búsqueda · importe {euros(lista.reduce((s, x) => s + Number(x.importe || 0), 0))}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar expediente, gestor, concepto…"
              aria-label={`Buscar en ${titulo}`}
              className="min-w-0 rounded-xl border border-[var(--molsan-border-strong)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--molsan-border-strong)] focus:ring-2 focus:ring-[var(--molsan-primary-soft)] sm:w-72"
            />
            <button type="button" onClick={() => descargarExcel(tipo, busqueda)} className="rounded-xl border border-[var(--molsan-border-strong)] bg-[var(--molsan-primary-soft)] px-3 py-2 text-sm font-bold text-[var(--molsan-primary)] hover:bg-[var(--molsan-primary-soft)]">
              <MolsanIcon name="download" size={14} bare /> Descargar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead className="bg-white text-[10px] uppercase tracking-wide text-[var(--molsan-text-secondary)]">
              <tr>
                {["Expediente", "Documento", "Fecha alta", ...(esPendiente ? [] : ["Fecha compensación"]), "Gestor", "Concepto", "Solicitante", "Importe", ...(esPendiente ? ["Compensar"] : [])].map((col) => (
                  <th key={col} className="border-b border-[var(--molsan-border)] px-3 py-3 font-extrabold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => (
                <tr key={item.id} className="border-b border-[var(--molsan-border-light)] last:border-0 hover:bg-[var(--molsan-surface-soft)]">
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-[var(--molsan-primary)]">
                    <Link to={`/expedientes/${encodeURIComponent(item.expediente_id)}`} className="hover:underline">{item.expediente_id || "—"}</Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--molsan-text)]">{item.documento || `PPAD-${item.id}`}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[var(--molsan-text-secondary)]">{fecha(item.fecha_alta)}</td>
                  {!esPendiente && <td className="whitespace-nowrap px-3 py-3 text-[var(--molsan-text-secondary)]">{fecha(item.fecha_compensacion)}</td>}
                  <td className="px-3 py-3 text-[var(--molsan-text)]">{item.gestor || "—"}</td>
                  <td className="max-w-[260px] px-3 py-3 text-[var(--molsan-text)]">{item.concepto || "—"}</td>
                  <td className="px-3 py-3 text-[var(--molsan-text)]">{item.solicitante || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-extrabold tabular-nums text-[var(--molsan-primary)]">{euros(item.importe)}</td>
                  {esPendiente && (
                    <td className="whitespace-nowrap px-3 py-3">
                      <button type="button" onClick={() => compensar(item)} disabled={accionId === item.id || !item.fecha_firma} title={!item.fecha_firma ? "Disponible cuando el expediente tenga fecha de firma." : "Registrar compensación"} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {accionId === item.id ? "Guardando…" : <><MolsanIcon name="check" size={13} bare /> Compensar</>}
                      </button>
                      {!item.fecha_firma && <span className="ml-2 text-[10px] text-[var(--molsan-text-secondary)]">Pendiente de fecha de firma</span>}
                    </td>
                  )}
                </tr>
              ))}
              {!lista.length && (
                <tr><td colSpan={esPendiente ? 8 : 8} className="px-5 py-12 text-center text-sm text-[var(--molsan-text-secondary)]">
                  {cargando ? "Cargando PPAD…" : "No hay registros que coincidan con la búsqueda."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

function Metrica({ titulo, valor, detalle, positivo = false }) {
  return (
    <div className={`rounded-2xl border p-5 ${positivo ? "border-emerald-200 bg-emerald-50/60" : "border-[var(--molsan-border)] bg-white"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">{titulo}</p>
      <p className={`mt-2 text-2xl font-extrabold ${positivo ? "text-emerald-800" : "text-[var(--molsan-primary)]"}`}>{valor}</p>
      <p className="mt-1 text-xs text-[var(--molsan-text-secondary)]">{detalle}</p>
    </div>
  );
}

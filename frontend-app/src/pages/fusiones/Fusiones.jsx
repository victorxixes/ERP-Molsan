import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanStatCard from "../../components/ui/MolsanStatCard";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
const ESTADOS = ["Pendiente", "En curso", "Aceptada", "Desestimada", "Facturadas"];

function normalizarEstado(valor) {
  const e = String(valor || "Pendiente").trim().toLowerCase();
  if (["pendiente", "nueva", "nuevo"].includes(e)) return "Pendiente";
  if (["en curso", "en_curso", "presentada", "en tramitación", "en tramitacion"].includes(e)) return "En curso";
  if (["aceptada", "completada", "completado"].includes(e)) return "Aceptada";
  if (["desestimada", "incidencia", "rechazada"].includes(e)) return "Desestimada";
  if (["facturada", "facturadas"].includes(e)) return "Facturadas";
  return valor || "Pendiente";
}
function fechaCorta(valor) {
  if (!valor) return "—";
  const f = new Date(valor);
  return Number.isNaN(f.getTime()) ? "—" : f.toLocaleDateString("es-ES");
}
function euros(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = Number(valor);
  return Number.isFinite(n) ? n.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "—";
}
function BadgeEstado({ estado }) {
  const e = normalizarEstado(estado);
  const tone = ({ "Pendiente": "border-amber-200 bg-amber-50 text-amber-800", "En curso": "border-blue-200 bg-blue-50 text-blue-800", "Aceptada": "border-emerald-200 bg-emerald-50 text-emerald-800", "Desestimada": "border-rose-200 bg-rose-50 text-rose-800", "Facturadas": "border-violet-200 bg-violet-50 text-violet-800" })[e] || "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold " + tone}><span className="h-1.5 w-1.5 rounded-full bg-current" />{e}</span>;
}
export default function Fusiones() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("Todos");

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const response = await axios.get("/fusiones/solicitudes");
      const items = Array.isArray(response?.data?.items) ? response.data.items : [];
      setSolicitudes(items.map((item) => ({ ...item, estadoNormalizado: normalizarEstado(item.estado) })));
    } catch (err) {
      setError(typeof err?.response?.data?.detail === "string" ? err.response.data.detail : "No se han podido cargar las solicitudes. Comprueba la conexión con la API e inténtalo de nuevo.");
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargarSolicitudes(); }, [cargarSolicitudes]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    return solicitudes.filter((item) => {
      const matchEstado = estado === "Todos" || (estado === "Facturadas" ? /factura/i.test(String(item.tipo_factura || "")) || item.estadoNormalizado === "Facturadas" : item.estadoNormalizado === estado);
      const haystack = [item.id, item.numero_expediente, item.registro, item.numero_entrada, item.serie_numero_factura, item.nif_registrador, item.entidad_origen, item.tipo_factura, item.estado, item.comentarios_observaciones].join(" ").toLocaleLowerCase("es");
      return matchEstado && (!q || haystack.includes(q));
    });
  }, [solicitudes, busqueda, estado]);

  const contar = (value) => solicitudes.filter((item) => value === "Todos" || (value === "Facturadas" ? /factura/i.test(String(item.tipo_factura || "")) || item.estadoNormalizado === "Facturadas" : item.estadoNormalizado === value)).length;
  const limpiar = () => { setBusqueda(""); setEstado("Todos"); };
  const indicadores = [
    ["Total solicitudes", solicitudes.length, "Solicitudes registradas", "slate", "Todos"],
    ["Pendiente", contar("Pendiente"), "Pendientes de revisión", "amber", "Pendiente"],
    ["En curso", contar("En curso"), "En tramitación", "blue", "En curso"],
    ["Aceptada", contar("Aceptada"), "Aceptadas o completadas", "green", "Aceptada"],
    ["Desestimada", contar("Desestimada"), "Desestimadas o con incidencia", "red", "Desestimada"],
    ["Facturadas", contar("Facturadas"), "Con factura o pre-factura indicada", "violet", "Facturadas"]
  ];

  return <main className="erp-page min-h-full space-y-6 p-4 text-[var(--erp-text)] sm:p-6 lg:p-8">
    <MolsanPageHeader
      mark="FUS"
      title="Gestión de fusiones"
      description="Consulta y seguimiento de solicitudes de fusión recibidas desde la gestión de expedientes."
      className="fusiones-page-header"
    />

    {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">No se han podido cargar las solicitudes</p><p className="mt-1 leading-5">{error}</p></div><button type="button" onClick={cargarSolicitudes} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100">Reintentar</button></div>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {indicadores.map(([titulo, valor, detalle, tono, filtro]) => <MolsanStatCard key={titulo} title={titulo} value={valor} description={detalle} tone={tono === "green" ? "emerald" : tono === "blue" ? "ocean" : tono === "red" ? "rose" : tono} icon={({ "Total solicitudes": "file", "Pendiente": "clock", "En curso": "timer", "Aceptada": "check", "Desestimada": "alert", "Facturadas": "receipt" })[titulo]} className={estado === filtro ? "is-active" : ""} onClick={() => setEstado(estado === filtro && filtro !== "Todos" ? "Todos" : filtro)} />)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface,var(--erp-card,#fff))] shadow-sm">
      <div className="border-b border-[var(--erp-border)] p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-base font-bold">Solicitudes de fusión</h2><p className="mt-1 text-sm text-[var(--erp-text-soft)]">Busca por expediente, registro, entrada, factura o registrador.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-80"><span className="sr-only">Buscar solicitudes</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-soft)]"><MolsanIcon name="search" size={17} /></span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar solicitudes…" className="min-h-10 w-full rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg,#fff)] py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70" /></label>
        <label><span className="sr-only">Filtrar por estado</span><select value={estado} onChange={(e) => setEstado(e.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg,#fff)] px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70 sm:w-44"><option value="Todos">Todos los estados</option>{ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {(busqueda || estado !== "Todos") && <button type="button" onClick={limpiar} className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--erp-text-soft)] hover:bg-[var(--erp-bg,#f8fafc)]">Limpiar</button>}</div>
      </div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1000px] border-collapse text-left text-sm"><thead className="bg-[var(--erp-bg,#f8fafc)] text-xs uppercase tracking-wide text-[var(--erp-text-soft)]"><tr>
        {["ID", "Expediente", "Registro", "N.º entrada", "Factura", "Fecha factura", "Importe", "Estado"].map((label, index) => <th key={label} className={"px-4 py-3 font-semibold " + (index === 6 ? "text-right" : "")}>{label}</th>)}
      </tr></thead><tbody>
        {cargando && solicitudes.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--erp-text-soft)]"><span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />Cargando solicitudes reales…</span></td></tr>
        : filtradas.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--erp-bg,#f8fafc)] text-[var(--erp-text-soft)]"><MolsanIcon name="file" size={21} /></div><p className="mt-3 font-semibold">{error ? "No hay datos disponibles" : solicitudes.length ? "No hay resultados para estos filtros" : "Todavía no hay solicitudes de fusión"}</p><p className="mt-1 text-sm text-[var(--erp-text-soft)]">{error ? "Revisa la conexión con el servidor y vuelve a intentarlo." : solicitudes.length ? "Prueba otra búsqueda o limpia los filtros." : "Las solicitudes enviadas desde CancelaGest aparecerán aquí."}</p>{(busqueda || estado !== "Todos") && <button type="button" onClick={limpiar} className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Limpiar filtros</button>}</td></tr>
        : filtradas.map((item) => <tr key={item.id} className="border-t border-[var(--erp-border)] transition-colors hover:bg-blue-50/40">
          <td className="whitespace-nowrap px-4 py-3 font-semibold text-[var(--erp-text-soft)]">#{item.id}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{item.numero_expediente || "—"}</td><td className="max-w-[250px] px-4 py-3"><span className="block truncate" title={item.registro || ""}>{item.registro || "—"}</span></td><td className="whitespace-nowrap px-4 py-3">{item.numero_entrada || "—"}</td><td className="max-w-[230px] px-4 py-3"><span className="block truncate" title={item.serie_numero_factura || item.tipo_factura || ""}>{item.serie_numero_factura || item.tipo_factura || "—"}</span></td><td className="whitespace-nowrap px-4 py-3">{fechaCorta(item.fecha_factura || item.creado_en)}</td><td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{euros(item.importe)}</td><td className="whitespace-nowrap px-4 py-3"><BadgeEstado estado={item.estado} /></td>
        </tr>)}
      </tbody></table></div>
      <footer className="flex flex-col gap-1 border-t border-[var(--erp-border)] bg-[var(--erp-bg,#f8fafc)] px-4 py-3 text-xs text-[var(--erp-text-soft)] sm:flex-row sm:items-center sm:justify-between"><span>Mostrando <strong className="text-[var(--erp-text)]">{filtradas.length}</strong> de <strong className="text-[var(--erp-text)]">{solicitudes.length}</strong> solicitudes</span><span>Datos conectados a la API de Fusiones</span></footer>
    </section>
  </main>;
}

import MolsanIcon from "../../components/ui/MolsanIcon";
import MolsanDataTable from "../../components/ui/MolsanDataTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { formatEuro as euros } from "../../utils/formatters";

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


function BadgeEstado({ estado }) {
  const e = normalizarEstado(estado);
  const tone = ({ "Pendiente": "border-amber-200 bg-amber-50 text-amber-800", "En curso": "border-blue-200 bg-blue-50 text-blue-800", "Aceptada": "border-emerald-200 bg-emerald-50 text-emerald-800", "Desestimada": "border-rose-200 bg-rose-50 text-rose-800", "Facturadas": "border-violet-200 bg-violet-50 text-violet-800" })[e] || "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold " + tone}><span className="h-1.5 w-1.5 rounded-full bg-current" />{e}</span>;
}
function Indicador({ titulo, valor, detalle, tono, activo, onClick }) {
  const colors = { slate: "bg-slate-100 text-slate-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", red: "bg-rose-50 text-rose-700", violet: "bg-violet-50 text-violet-700" };
  return <button type="button" onClick={onClick} className={"group erp-card min-w-0 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 " + (activo ? "border-blue-300 bg-blue-50/60 shadow-sm ring-2 ring-blue-100" : "border-[var(--erp-border)] bg-[var(--erp-surface,var(--erp-card,#fff))] hover:border-blue-200")}>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-[var(--erp-text-soft)]">{titulo}</p><p className="mt-2 text-3xl font-bold tracking-tight text-[var(--erp-text)] tabular-nums">{valor}</p></div><span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " + (colors[tono] || colors.slate)}><MolsanIcon name={titulo === "Total solicitudes" ? "file" : "clock"} size={38} tone={({ slate: "ocean", amber: "amber", blue: "cyan", green: "emerald", red: "amber", violet: "violet" })[tono] || "ocean"} /></span></div>
    <p className="mt-2 text-xs text-[var(--erp-text-soft)]">{detalle}</p>
  </button>;
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

  return <main className="molsan-page-stack erp-page min-h-full text-[var(--erp-text)]">
    <section className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true"><MolsanIcon name="merge" size={42} bare /></div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
          <h1 className="molsan-page-header__title">Gestión de fusiones</h1>
          <p className="molsan-page-header__description">Consulta y seguimiento de solicitudes de fusión recibidas desde la gestión de expedientes.</p>
        </div>
      </div>
      <div className="molsan-page-header__actions">
        <button type="button" onClick={cargarSolicitudes} disabled={cargando} className="molsan-btn molsan-btn--secondary"><MolsanIcon name="refresh" size={18} bare />{cargando ? "Actualizando…" : "Actualizar datos"}</button>
      </div>
    </section>

    {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">No se han podido cargar las solicitudes</p><p className="mt-1 leading-5">{error}</p></div><button type="button" onClick={cargarSolicitudes} className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-rose-100">Reintentar</button></div>}

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {indicadores.map(([titulo, valor, detalle, tono, filtro]) => <Indicador key={titulo} titulo={titulo} valor={valor} detalle={detalle} tono={tono} activo={estado === filtro} onClick={() => setEstado(estado === filtro && filtro !== "Todos" ? "Todos" : filtro)} />)}
    </section>

    <section className="erp-card overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface,var(--erp-card,#fff))] shadow-sm">
      <div className="border-b border-[var(--erp-border)] p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-base font-bold">Solicitudes de fusión</h2><p className="mt-1 text-sm text-[var(--erp-text-soft)]">Busca por expediente, registro, entrada, factura o registrador.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-80"><span className="sr-only">Buscar solicitudes</span><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-soft)]"><MolsanIcon name="search" size={18} bare /></span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar solicitudes…" className="min-h-10 w-full rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg,#fff)] py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70" /></label>
        <label><span className="sr-only">Filtrar por estado</span><select value={estado} onChange={(e) => setEstado(e.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--erp-border)] bg-[var(--erp-bg,#fff)] px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70 sm:w-44"><option value="Todos">Todos los estados</option>{ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {(busqueda || estado !== "Todos") && <button type="button" onClick={limpiar} className="min-h-10 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--erp-text-soft)] hover:bg-[var(--erp-bg,#f8fafc)]">Limpiar</button>}</div>
      </div></div>
      <MolsanDataTable
        rows={filtradas}
          pagination
          pageSize={25}

        rowKey="id"
        minWidth="1100px"
        initialSort={{ key: "id", direction: "desc" }}
        emptyText={cargando && solicitudes.length === 0 ? "Cargando solicitudes reales…" : error ? "No hay datos disponibles. Revisa la conexión con el servidor y vuelve a intentarlo." : solicitudes.length ? "No hay resultados para estos filtros. Prueba otra búsqueda o limpia los filtros." : "Todavía no hay solicitudes de fusión. Las solicitudes enviadas desde CancelaGest aparecerán aquí."}
        columns={[
          { key: "id", header: "ID", accessor: "id", sortType: "number", render: (value) => <span className="font-semibold text-[var(--erp-text-soft)]">#{value}</span> },
          { key: "numero_expediente", header: "Expediente", accessor: "numero_expediente", sortType: "text", render: (value) => <strong>{value || "—"}</strong> },
          { key: "registro", header: "Registro", accessor: "registro", sortType: "text", render: (value) => <span className="block max-w-[250px] truncate" title={value || ""}>{value || "—"}</span> },
          { key: "numero_entrada", header: "N.º entrada", accessor: "numero_entrada", sortType: "text", render: (value) => value || "—" },
          { key: "factura", header: "Factura", accessor: (item) => item.serie_numero_factura || item.tipo_factura, sortType: "text", render: (value) => <span className="block max-w-[230px] truncate" title={value || ""}>{value || "—"}</span> },
          { key: "fecha_factura", header: "Fecha factura", accessor: (item) => item.fecha_factura || item.creado_en, sortType: "date", render: (value) => fechaCorta(value) },
          { key: "importe", header: "Importe", accessor: "importe", sortType: "currency", align: "right", render: (value) => <strong className="tabular-nums">{euros(value)}</strong> },
          { key: "estado", header: "Estado", accessor: "estado", sortType: "text", render: (value) => <BadgeEstado estado={value} /> },
        ]}
      />
      <footer className="flex flex-col gap-1 border-t border-[var(--erp-border)] bg-[var(--erp-bg,#f8fafc)] px-4 py-3 text-xs text-[var(--erp-text-soft)] sm:flex-row sm:items-center sm:justify-between"><span>Mostrando <strong className="text-[var(--erp-text)]">{filtradas.length}</strong> de <strong className="text-[var(--erp-text)]">{solicitudes.length}</strong> solicitudes</span><span>Datos conectados a la API de Fusiones</span></footer>
    </section>
  </main>;
}

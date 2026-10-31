import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
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
function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "merge") return <svg {...p}><path d="M7 3v5c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V3" /><path d="M7 21v-5c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v5" /><path d="M4 3h6M14 21h6" /></svg>;
  if (name === "search") return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
  if (name === "refresh") return <svg {...p}><path d="M20 11a8 8 0 0 0-14.8-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14.8 4L20 15M20 20v-5h-5" /></svg>;
  if (name === "file") return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" /></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>;
}
function BadgeEstado({ estado }) {
  const e = normalizarEstado(estado);
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1">{e}</span>;
}
function Indicador({ titulo, valor, detalle, tono, activo, onClick }) {
  return <button type="button" onClick={onClick} className={`molsan-stat-card molsan-dashboard-card group min-w-0 p-4 sm:p-5 ${activo ? "is-active" : ""}`} aria-pressed={activo}>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="uppercase">{titulo}</p><p className="mt-2 tabular-nums">{valor}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center"><Icon name={titulo === "Total solicitudes" ? "file" : "clock"} size={19} /></span></div>
    <p className="mt-2">{detalle}</p>
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

  return <main className="erp-page min-h-full min-w-0 space-y-6">
    <MolsanPageHeader mark="FU" title="Gestión de fusiones" description="Consulta y seguimiento de solicitudes de fusión recibidas desde la gestión de expedientes." />
    <div className="flex justify-end"><button type="button" onClick={cargarSolicitudes} disabled={cargando} className="molsan-btn molsan-btn--secondary inline-flex min-h-10 shrink-0 items-center justify-center gap-2"><Icon name="refresh" size={17} />{cargando ? "Actualizando…" : "Actualizar datos"}</button></div>

    {error && <div role="alert" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p>No se han podido cargar las solicitudes</p><p className="mt-1">{error}</p></div><button type="button" onClick={cargarSolicitudes} className="molsan-btn molsan-btn--secondary shrink-0">Reintentar</button></div>}

    <section className="molsan-stat-grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {indicadores.map(([titulo, valor, detalle, tono, filtro]) => <Indicador key={titulo} titulo={titulo} valor={valor} detalle={detalle} tono={tono} activo={estado === filtro} onClick={() => setEstado(estado === filtro && filtro !== "Todos" ? "Todos" : filtro)} />)}
    </section>

    <section className="erp-card overflow-hidden">
      <div className="molsan-filter-bar p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2>Solicitudes de fusión</h2><p className="mt-1">Busca por expediente, registro, entrada, factura o registrador.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative block min-w-0 sm:w-80"><span className="sr-only">Buscar solicitudes</span><span className="pointer-events-none absolute left-3 top-1/2"><Icon name="search" size={17} /></span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar solicitudes…" className="min-h-10 w-full py-2 pl-10 pr-3" /></label>
        <label><span className="sr-only">Filtrar por estado</span><select value={estado} onChange={(e) => setEstado(e.target.value)} className="min-h-10 w-full px-3 py-2 sm:w-44"><option value="Todos">Todos los estados</option>{ESTADOS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {(busqueda || estado !== "Todos") && <button type="button" onClick={limpiar} className="molsan-btn molsan-btn--secondary min-h-10">Limpiar</button>}</div>
      </div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1000px]"><thead className="uppercase"><tr>
        {["ID", "Expediente", "Registro", "N.º entrada", "Factura", "Fecha factura", "Importe", "Estado"].map((label, index) => <th key={label} className={"px-4 py-3" + (index === 6 ? "" : "")}>{label}</th>)}
      </tr></thead><tbody>
        {cargando && solicitudes.length === 0 ? <tr><td colSpan={8} className="px-4 py-12"><span className="inline-flex items-center gap-2"><span className="h-4 w-4" />Cargando solicitudes reales…</span></td></tr>
        : filtradas.length === 0 ? <tr><td colSpan={8} className="px-4 py-12"><div className="mx-auto flex h-11 w-11 items-center justify-center"><Icon name="file" size={21} /></div><p className="mt-3">{error ? "No hay datos disponibles" : solicitudes.length ? "No hay resultados para estos filtros" : "Todavía no hay solicitudes de fusión"}</p><p className="mt-1">{error ? "Revisa la conexión con el servidor y vuelve a intentarlo." : solicitudes.length ? "Prueba otra búsqueda o limpia los filtros." : "Las solicitudes enviadas desde CancelaGest aparecerán aquí."}</p>{(busqueda || estado !== "Todos") && <button type="button" onClick={limpiar} className="mt-3 px-3 py-2">Limpiar filtros</button>}</td></tr>
        : filtradas.map((item) => <tr key={item.id}>
          <td className="whitespace-nowrap px-4 py-3">#{item.id}</td><td className="whitespace-nowrap px-4 py-3">{item.numero_expediente || "—"}</td><td className="max-w-[250px] px-4 py-3"><span className="block truncate" title={item.registro || ""}>{item.registro || "—"}</span></td><td className="whitespace-nowrap px-4 py-3">{item.numero_entrada || "—"}</td><td className="max-w-[230px] px-4 py-3"><span className="block truncate" title={item.serie_numero_factura || item.tipo_factura || ""}>{item.serie_numero_factura || item.tipo_factura || "—"}</span></td><td className="whitespace-nowrap px-4 py-3">{fechaCorta(item.fecha_factura || item.creado_en)}</td><td className="whitespace-nowrap px-4 py-3 tabular-nums">{euros(item.importe)}</td><td className="whitespace-nowrap px-4 py-3"><BadgeEstado estado={item.estado} /></td>
        </tr>)}
      </tbody></table></div>
      <footer className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span>Mostrando <strong>{filtradas.length}</strong> de <strong>{solicitudes.length}</strong> solicitudes</span><span>Datos conectados a la API de Fusiones</span></footer>
    </section>
  </main>;
}

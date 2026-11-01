import MolsanIcon from "../../components/ui/MolsanIcon";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/ModalesHerramientasPremium.css";
import "../../css/CatalogosMaestrosPremium.css";

const euroFecha = (v) => {
  if (!v) return "—";
  const s = String(v).replace("T", " ").slice(0, 16);
  const p = s.split(" ");
  return (p[0] || "").split("-").reverse().join("/") + (p[1] ? " " + p[1] : "");
};

export default function ProcesoAbsis() {
  const [actividades, setActividades] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [accionando, setAccionando] = useState(null);

  const cargarActividades = useCallback(async () => {
    try {
      const { data } = await axios.get("/proceso-absis/actividades");
      const lista = Array.isArray(data) ? data : [];
      setActividades(lista);
      setTipoSeleccionado((actual) => actual && lista.some((x) => x.tipo === actual) ? actual : (lista[0]?.tipo || ""));
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar las actividades ABSIS.");
    }
  }, []);

  const cargarItems = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (tipoSeleccionado) params.tipo = tipoSeleccionado;
      if (busqueda.trim()) params.q = busqueda.trim();
      const { data } = await axios.get("/proceso-absis/envios", { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar el listado de envíos ABSIS.");
    } finally {
      setCargando(false);
    }
  }, [tipoSeleccionado, busqueda]);

  useEffect(() => { cargarActividades(); }, [cargarActividades]);
  useEffect(() => { cargarItems(); }, [cargarItems]);

  const totalEnvios = useMemo(() => actividades.reduce((s, x) => s + Number(x.enviados || 0), 0), [actividades]);
  const totalErrores = useMemo(() => actividades.reduce((s, x) => s + Number(x.errores || 0), 0), [actividades]);

  async function accion(id, tipoAccion) {
    const etiquetas = { eliminar: "eliminar este registro de envío", reintentar: "marcar el envío para reintento", pasado: "dar este envío como pasado" };
    if (tipoAccion === "eliminar" && !window.confirm("¿Seguro que quieres eliminar este registro de envío ABSIS?")) return;
    setAccionando(`${id}-${tipoAccion}`); setError("");
    try {
      if (tipoAccion === "eliminar") await axios.delete(`/proceso-absis/envios/${id}`);
      else await axios.post(`/proceso-absis/envios/${id}/${tipoAccion}`);
      await Promise.all([cargarActividades(), cargarItems()]);
    } catch (e) {
      setError(e?.response?.data?.detail || `No se pudo ${etiquetas[tipoAccion] || "actualizar el envío"}.`);
    } finally { setAccionando(null); }
  }

  async function exportarExcel() {
    setExportando(true); setError("");
    try {
      const params = {};
      if (tipoSeleccionado) params.tipo = tipoSeleccionado;
      if (busqueda.trim()) params.q = busqueda.trim();
      const response = await axios.get("/proceso-absis/envios/exportar/excel", { params, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a"); a.href = url; a.download = "envios_absis.xlsx";
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo descargar el Excel.");
    } finally { setExportando(false); }
  }

  return <main className="molsan-page-stack herramienta-operativa-premium herramientas-subpagina-premium min-h-full">
    <header className="molsan-page-header">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
      <Link to="/herramientas/utilidades" className="text-xs font-bold text-blue-700 hover:underline">← Volver a Utilidades</Link>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Proceso de ABSIS</h1><p className="mt-1 text-sm text-slate-500">Seguimiento de expedientes enviados, incidencias y acciones de envío.</p></div>
        <button onClick={() => Promise.all([cargarActividades(), cargarItems()])} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">↻ Actualizar</button>
      </div>
    </header>

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Kpi titulo="Expedientes enviados al ABSIS" valor={totalEnvios} icono="↗" />
      <Kpi titulo="Errores detectados" valor={totalErrores} icono="!" alerta />
      <Kpi titulo="Tipos de actividad" valor={actividades.length} icono="▤" />
    </section>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

    <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.8fr)]">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 p-5"><h2 className="text-lg font-extrabold text-slate-900">Expedientes enviados al ABSIS</h2><p className="mt-1 text-xs text-slate-500">Selecciona una actividad para consultar sus envíos.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[430px] text-left text-sm">
            <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="border-b px-4 py-3 font-extrabold">Tipo de actividad</th><th className="border-b px-3 py-3 text-right font-extrabold">Expedientes enviados</th><th className="border-b px-4 py-3 text-right font-extrabold">Errores detectados</th></tr></thead>
            <tbody>
              {actividades.length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-xs text-slate-500">No hay actividades registradas.</td></tr> : actividades.map((act) => <tr key={act.tipo} onClick={() => setTipoSeleccionado(act.tipo)} className={`cursor-pointer border-b border-slate-100 last:border-0 transition ${tipoSeleccionado === act.tipo ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50"}`}>
                <td className="px-4 py-4"><span className="font-bold text-slate-800">{act.tipo || "Sin tipo"}</span><span className="mt-1 block text-[10px] font-semibold text-blue-700">Ver listado →</span></td>
                <td className="px-3 py-4 text-right font-extrabold tabular-nums text-slate-800">{act.enviados || 0}</td>
                <td className="px-4 py-4 text-right"><span className={`inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ${Number(act.errores || 0) ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{act.errores || 0}</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div><p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">Listado de actividad</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">{tipoSeleccionado || "Todos los envíos"}</h2><p className="mt-1 text-xs text-slate-500">Filtra, revisa incidencias y gestiona cada envío.</p></div>
            <button onClick={exportarExcel} disabled={exportando} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{exportando ? "Preparando…" : "↓ Descargar Excel"}</button>
          </div>
          <label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Buscar en el listado</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Expediente, ID, IDAbsis, tipo o incidencia…" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-xs">
          <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500"><tr>{["Expediente","Fecha de envío","ID","IDAbsis","Tipo","Fecha de creación","Fecha de incidencia","Tipo de incidencia","Acciones del envío"].map((h) => <th key={h} className="border-b border-slate-200 px-3 py-3 font-extrabold">{h}</th>)}</tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">Cargando envíos…</td></tr>
            : items.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center"><div className="text-3xl"><MolsanIcon name="archive" size={20} /></div><p className="mt-2 font-bold text-slate-700">No hay envíos para mostrar</p><p className="mt-1 text-xs text-slate-500">Los registros aparecerán aquí cuando se registren envíos o incidencias ABSIS.</p></td></tr>
            : items.map((item) => <tr key={item.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/70">
              <td className="px-3 py-3 font-bold text-blue-700">{item.expediente || "—"}</td><td className="whitespace-nowrap px-3 py-3 text-slate-600">{euroFecha(item.fecha_envio)}</td><td className="px-3 py-3 text-slate-600">{item.id}</td><td className="px-3 py-3 text-slate-600">{item.id_absis || "—"}</td><td className="px-3 py-3 text-slate-700">{item.tipo || "—"}</td><td className="whitespace-nowrap px-3 py-3 text-slate-600">{euroFecha(item.fecha_creacion)}</td><td className="whitespace-nowrap px-3 py-3 text-slate-600">{euroFecha(item.fecha_incidencia)}</td><td className="max-w-[220px] px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 font-semibold ${item.tipo_incidencia ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{item.tipo_incidencia || "Sin incidencia"}</span></td>
              <td className="px-3 py-3"><div className="flex min-w-[290px] flex-wrap gap-1.5"><button disabled={accionando !== null} onClick={() => accion(item.id,"eliminar")} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 font-bold text-rose-700 disabled:opacity-50">{accionando === `${item.id}-eliminar` ? "…" : "Eliminar"}</button><button disabled={accionando !== null} onClick={() => accion(item.id,"reintentar")} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 font-bold text-blue-700 disabled:opacity-50">{accionando === `${item.id}-reintentar` ? "…" : "Reintentar"}</button><button disabled={accionando !== null || item.estado === "Pasado"} onClick={() => accion(item.id,"pasado")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 font-bold text-emerald-700 disabled:opacity-50">{item.estado === "Pasado" ? "Dado por pasado" : "Dar por pasado"}</button></div></td>
            </tr>)}
          </tbody>
        </table></div>
        <footer className="border-t border-slate-200 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">{items.length} envío(s) en el resultado actual</footer>
      </div>
    </section>
  </main>;
}

function Kpi({ titulo, valor, icono, alerta = false }) {
  return <div className={`rounded-2xl border p-4 shadow-sm ${alerta ? "border-rose-200 bg-rose-50/70" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-lg font-extrabold text-slate-600 shadow-sm">{icono}</span></div><p className="mt-3 text-2xl font-extrabold text-slate-900">{valor}</p></div>;
}

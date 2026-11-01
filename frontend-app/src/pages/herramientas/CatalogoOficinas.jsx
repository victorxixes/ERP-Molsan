import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import "../../css/HerramientasPremium.css";

const COLUMNAS = [
  ["oficina", "Oficina"], ["nombre", "Nombre"], ["direccion", "Dirección"],
  ["poblacion", "Población"], ["cod_postal", "Cod. Postal"],
  ["cod_provincia", "Cod. Provincia"], ["provincia", "Provincia"],
  ["cod_dt", "Cod. DT"], ["dt", "DT"], ["cod_dg", "Cod. DG"],
  ["dg", "DG"], ["cod_dan", "Cod. DAN"], ["dan", "DAN"],
];

const API = "/oficinas-catalogo";

export default function CatalogoOficinas() {
  const [busqueda, setBusqueda] = useState("");
  const [oficinas, setOficinas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [previsualizacion, setPrevisualizacion] = useState(null);
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);
  const limite = 50;

  const cargarOficinas = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await axios.get(API, { params: { q: busqueda, limit: limite, offset: pagina * limite } });
      setOficinas(respuesta.data.items || []);
      setTotal(Number(respuesta.data.total || 0));
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido cargar el catálogo de oficinas.");
    } finally {
      setCargando(false);
    }
  }, [busqueda, pagina, recarga]);

  useEffect(() => { cargarOficinas(); }, [cargarOficinas]);

  const columnasVisibles = useMemo(() => COLUMNAS, []);
  const seleccionarArchivo = (evento) => {
    setArchivo(evento.target.files?.[0] || null);
    setPrevisualizacion(null);
    setMensaje("");
    setError("");
  };

  const previsualizar = async () => {
    if (!archivo) return;
    setCargando(true);
    setMensaje("");
    setError("");
    const datos = new FormData();
    datos.append("archivo", archivo);
    try {
      const respuesta = await axios.post(`${API}/previsualizar`, datos);
      setPrevisualizacion(respuesta.data);
      if (respuesta.data.errores?.length) {
        setError("La previsualización detecta errores. Corrige el Excel antes de importar.");
      }
    } catch (e) {
      const detalle = e?.response?.data?.detail;
      setError(typeof detalle === "string" ? detalle : detalle?.mensaje || "No se ha podido validar el Excel.");
    } finally {
      setCargando(false);
    }
  };

  const importar = async () => {
    if (!archivo || !previsualizacion || previsualizacion.errores?.length) return;
    setImportando(true);
    setMensaje("");
    setError("");
    const datos = new FormData();
    datos.append("archivo", archivo);
    try {
      const respuesta = await axios.post(`${API}/importar`, datos);
      setMensaje(respuesta.data.mensaje || "Importación completada.");
      setArchivo(null);
      setPrevisualizacion(null);
      const selector = document.getElementById("catalogo-oficinas-excel");
      if (selector) selector.value = "";
      setPagina(0);
      setRecarga((valor) => valor + 1);
    } catch (e) {
      const detalle = e?.response?.data?.detail;
      setError(typeof detalle === "string" ? detalle : detalle?.mensaje || "No se ha podido importar el Excel.");
    } finally {
      setImportando(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  return (
    <main className="molsan-page-stack catalogos-premium-page min-h-full animate-fadeIn">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true">▦</div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · DATOS TERRITORIALES</p>
            <h1 className="molsan-page-header__title">Catálogo de oficinas</h1>
            <p className="molsan-page-header__description">Busca y administra únicamente las oficinas que importes desde tus archivos Excel.</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Importar desde Excel</h2>
            <p className="text-sm text-slate-500">Se admiten .xlsx y .xls. El archivo debe contener las 13 columnas del catálogo.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Solo datos importados por ti</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block text-sm font-medium text-slate-700">
            Archivo Excel
            <input id="catalogo-oficinas-excel" type="file" accept=".xlsx,.xls" onChange={seleccionarArchivo} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
          </label>
          <button type="button" onClick={previsualizar} disabled={!archivo || cargando || importando} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50">
            {cargando ? "Validando…" : "Validar y previsualizar"}
          </button>
          <button type="button" onClick={importar} disabled={!archivo || !previsualizacion || !!previsualizacion.errores?.length || importando} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {importando ? "Importando…" : "Importar oficinas"}
          </button>
        </div>
        {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{Array.isArray(error) ? error.join(" · ") : error}</div>}
        {previsualizacion && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-800">Resultado de la previsualización · {previsualizacion.archivo}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Filas válidas", previsualizacion.oficinas_validas], ["Oficinas nuevas", previsualizacion.nuevas], ["Se actualizarán", previsualizacion.actualizaciones], ["Errores", previsualizacion.errores?.length || 0]].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">{etiqueta}</p>
                  <p className="mt-1 text-xl font-bold text-slate-800">{valor}</p>
                </div>
              ))}
            </div>
            {previsualizacion.errores?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-rose-700">{previsualizacion.errores.slice(0, 20).map((item, indice) => <li key={indice}>{item}</li>)}</ul>}
            {previsualizacion.muestra?.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-[1100px] w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600"><tr>{columnasVisibles.map(([campo, titulo]) => <th key={campo} className="whitespace-nowrap px-3 py-2 font-semibold">{titulo}</th>)}</tr></thead>
                  <tbody>{previsualizacion.muestra.slice(0, 5).map((fila, indice) => <tr key={indice} className="border-t border-slate-100">{columnasVisibles.map(([campo]) => <td key={campo} className="max-w-56 truncate px-3 py-2 text-slate-700" title={fila[campo]}>{fila[campo] || "—"}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {!previsualizacion.errores?.length && <p className="text-sm font-medium text-emerald-700">El archivo está validado. Puedes importarlo; los códigos existentes se actualizarán y no se duplicarán.</p>}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Buscar oficinas</h2>
            <p className="text-sm text-slate-500">{total.toLocaleString("es-ES")} oficinas en el catálogo · búsqueda en los 13 campos</p>
          </div>
          <label className="block w-full md:max-w-xl">
            <span className="sr-only">Buscar por código, nombre, dirección, población o datos territoriales</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <span aria-hidden="true">⌕</span>
              <input value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(0); }} placeholder="Código, nombre, dirección, población, provincia, DT, DG o DAN…" className="w-full bg-transparent text-sm outline-none" />
              {busqueda && <button type="button" onClick={() => { setBusqueda(""); setPagina(0); }} className="text-xs font-semibold text-blue-700">Limpiar</button>}
            </div>
          </label>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600"><tr>{columnasVisibles.map(([campo, titulo]) => <th key={campo} className="whitespace-nowrap px-3 py-3 font-semibold">{titulo}</th>)}</tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan={COLUMNAS.length} className="px-4 py-10 text-center text-slate-500">Cargando catálogo…</td></tr>
                : oficinas.length ? oficinas.map((fila) => <tr key={fila.id} className="border-t border-slate-100 hover:bg-blue-50/50">{columnasVisibles.map(([campo]) => <td key={campo} className="max-w-64 truncate px-3 py-3 text-slate-700" title={fila[campo]}>{fila[campo] || "—"}</td>)}</tr>)
                : <tr><td colSpan={COLUMNAS.length} className="px-4 py-10 text-center text-slate-500">No hay oficinas que mostrar. Importa tu Excel para comenzar.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Mostrando {total ? pagina * limite + 1 : 0}–{Math.min((pagina + 1) * limite, total)} de {total}</p>
          <div className="flex gap-2">
            <button type="button" disabled={pagina === 0 || cargando} onClick={() => setPagina((valor) => Math.max(0, valor - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40">Anterior</button>
            <span className="px-2 py-2 text-sm text-slate-500">Página {pagina + 1} de {totalPaginas}</span>
            <button type="button" disabled={(pagina + 1) * limite >= total || cargando} onClick={() => setPagina((valor) => valor + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  );
}

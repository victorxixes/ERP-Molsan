import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

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
  const [orden, setOrden] = useState({ campo: "oficina", direccion: "asc" });
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
      const respuesta = await axios.get(API, { params: { q: busqueda, limit: limite, offset: pagina * limite, sort_by: orden.campo, sort_dir: orden.direccion } });
      setOficinas(respuesta.data.items || []);
      setTotal(Number(respuesta.data.total || 0));
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido cargar el catálogo de oficinas.");
    } finally {
      setCargando(false);
    }
  }, [busqueda, pagina, recarga, orden]);

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
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="OF" title="Catálogo de oficinas" description="Busca y administra las oficinas que importes desde tus archivos Excel." />

      <section className="erp-card p-5 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2>Importar desde Excel</h2>
            <p>Se admiten .xlsx y .xls. El archivo debe contener las 13 columnas del catálogo.</p>
          </div>
          <span className="px-3 py-1">Solo datos importados por ti</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block">
            Archivo Excel
            <input id="catalogo-oficinas-excel" type="file" accept=".xlsx,.xls" onChange={seleccionarArchivo} className="mt-2 block w-full px-3 py-2 file:mr-3 file:px-3 file:py-2" />
          </label>
          <button type="button" onClick={previsualizar} disabled={!archivo || cargando || importando} className="px-4 py-3">
            {cargando ? "Validando…" : "Validar y previsualizar"}
          </button>
          <button type="button" onClick={importar} disabled={!archivo || !previsualizacion || !!previsualizacion.errores?.length || importando} className="px-4 py-3">
            {importando ? "Importando…" : "Importar oficinas"}
          </button>
        </div>
        {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}
        {error && <div role="alert" className="px-4 py-3">{Array.isArray(error) ? error.join(" · ") : error}</div>}
        {previsualizacion && (
          <div className="space-y-3 p-4">
            <h3>Resultado de la previsualización · {previsualizacion.archivo}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Filas válidas", previsualizacion.oficinas_validas], ["Oficinas nuevas", previsualizacion.nuevas], ["Se actualizarán", previsualizacion.actualizaciones], ["Errores", previsualizacion.errores?.length || 0]].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="p-3">
                  <p>{etiqueta}</p>
                  <p className="mt-1">{valor}</p>
                </div>
              ))}
            </div>
            {previsualizacion.errores?.length > 0 && <ul className="list-disc space-y-1 pl-5">{previsualizacion.errores.slice(0, 20).map((item, indice) => <li key={indice}>{item}</li>)}</ul>}
            {previsualizacion.muestra?.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full">
                  <thead><tr>{columnasVisibles.map(([campo, titulo]) => <th key={campo} className="whitespace-nowrap px-3 py-2">{titulo}</th>)}</tr></thead>
                  <tbody>{previsualizacion.muestra.slice(0, 5).map((fila, indice) => <tr key={indice}>{columnasVisibles.map(([campo]) => <td key={campo} className="max-w-56 truncate px-3 py-2" title={fila[campo]}>{fila[campo] || "—"}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {!previsualizacion.errores?.length && <p>El archivo está validado. Puedes importarlo; los códigos existentes se actualizarán y no se duplicarán.</p>}
          </div>
        )}
      </section>

      <section className="p-5 space-y-4">
        <div className="molsan-filter-bar flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2>Buscar oficinas</h2>
            <p>{total.toLocaleString("es-ES")} oficinas en el catálogo · búsqueda en los 13 campos</p>
          </div>
          <label className="block w-full md:max-w-xl">
            <span className="sr-only">Buscar por código, nombre, dirección, población o datos territoriales</span>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span aria-hidden="true">⌕</span>
              <input value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); setPagina(0); }} placeholder="Código, nombre, dirección, población, provincia, DT, DG o DAN…" className="w-full" />
              {busqueda && <button type="button" onClick={() => { setBusqueda(""); setPagina(0); }}>Limpiar</button>}
            </div>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full">
            <thead className="uppercase"><tr>{columnasVisibles.map(([campo, titulo]) => <MolsanSortableTh key={campo} label={titulo} sortKey={campo} sortConfig={{ key: orden.campo, direction: orden.direccion }} onSort={(key) => { setOrden((actual) => ({ campo: key, direccion: actual.campo === key && actual.direccion === "asc" ? "desc" : "asc" })); setPagina(0); }} className="whitespace-nowrap px-3 py-3" />)}</tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan={COLUMNAS.length} className="px-4 py-10">Cargando catálogo…</td></tr>
                : oficinas.length ? oficinas.map((fila) => <tr key={fila.id}>{columnasVisibles.map(([campo]) => <td key={campo} className="max-w-64 truncate px-3 py-3" title={fila[campo]}>{fila[campo] || "—"}</td>)}</tr>)
                : <tr><td colSpan={COLUMNAS.length} className="px-4 py-10">No hay oficinas que mostrar. Importa tu Excel para comenzar.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Mostrando {total ? pagina * limite + 1 : 0}–{Math.min((pagina + 1) * limite, total)} de {total}</p>
          <div className="flex gap-2">
            <button type="button" disabled={pagina === 0 || cargando} onClick={() => setPagina((valor) => Math.max(0, valor - 1))} className="px-3 py-2">Anterior</button>
            <span className="px-2 py-2">Página {pagina + 1} de {totalPaginas}</span>
            <button type="button" disabled={(pagina + 1) * limite >= total || cargando} onClick={() => setPagina((valor) => valor + 1)} className="px-3 py-2">Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  );
}

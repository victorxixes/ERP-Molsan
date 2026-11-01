import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { API_BASE } from "../../api/config";

const API_URL = `${API_BASE}/catalogos-absis`;

const CATEGORIAS = [
  "Estados expedientes",
  "ESTADO",
  "ESTADOJUSTIFICANTE",
  "TIPOCONCEPTO",
  "CONCEPTOGASTO",
  "Producto GTG",
  "Actividad Actual",
  "Estado Actividad",
  "Tipo Provision",
  "Tipo de operación",
  "Subtipo operación",
  "Tipos de errores de defecto",
];

const VACIO = { categoria: CATEGORIAS[0], codigo: "", valor: "", descripcion: "", activo: true };

async function respuesta(response) {
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.detail || raw || `Error HTTP ${response.status}`);
  return data;
}

export default function CatalogoAbsis() {
  const token = useAuthStore((state) => state.token);
  const [filas, setFilas] = useState([]);
  const [categorias, setCategorias] = useState(CATEGORIAS);
  const [modalNuevaLista, setModalNuevaLista] = useState(false);
  const [nombreNuevaLista, setNombreNuevaLista] = useState("");
  const [creandoLista, setCreandoLista] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [modal, setModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const headers = useMemo(() => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const data = await respuesta(await fetch(API_URL, { headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }));
      setFilas(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(`No se ha podido cargar el catálogo: ${e.message}`);
    } finally {
      setCargando(false);
    }
  }, [token]);

  const cargarCategorias = useCallback(async () => {
    try {
      const data = await respuesta(await fetch(`${API_URL}/categorias`, {
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }));
      if (Array.isArray(data)) {
        setCategorias([...new Set([...CATEGORIAS, ...data])].sort((a, b) => a.localeCompare(b, "es")));
      }
    } catch (e) {
      // Se mantienen las categorías conocidas si el endpoint no está disponible.
      console.warn("No se han podido cargar las listas ABSIS", e);
    }
  }, [token]);

  useEffect(() => { cargar(); cargarCategorias(); }, [cargar, cargarCategorias]);

  const visibles = filas.filter((fila) => fila.categoria === categoria && [
    fila.codigo, fila.valor, fila.descripcion
  ].some((dato) => String(dato || "").toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es"))));

  async function crearLista(event) {
    event.preventDefault();
    const nombre = nombreNuevaLista.trim();
    if (!nombre) return;
    setCreandoLista(true);
    setError("");
    setMensaje("");
    try {
      const data = await respuesta(await fetch(`${API_URL}/categorias`, {
        method: "POST",
        headers,
        body: JSON.stringify({ categoria: nombre }),
      }));
      const actualizadas = [...new Set([...categorias, data.categoria])].sort((a, b) => a.localeCompare(b, "es"));
      setCategorias(actualizadas);
      setCategoria(data.categoria);
      setBusqueda("");
      setNombreNuevaLista("");
      setModalNuevaLista(false);
      setMensaje(`Lista «${data.categoria}» creada. Ya puedes añadirle entradas.`);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreandoLista(false);
    }
  }

  function abrirNuevo() {
    setEditando(null);
    setFormulario({ ...VACIO, categoria });
    setError("");
    setMensaje("");
    setModal(true);
  }

  function abrirEdicion(fila) {
    setEditando(fila.id);
    setFormulario({ categoria: fila.categoria, codigo: fila.codigo || "", valor: fila.valor || "", descripcion: fila.descripcion || "", activo: fila.activo });
    setError("");
    setMensaje("");
    setModal(true);
  }

  async function guardar(event) {
    event.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      await respuesta(await fetch(editando ? `${API_URL}/${editando}` : API_URL, {
        method: editando ? "PUT" : "POST",
        headers,
        body: JSON.stringify({ ...formulario, codigo: formulario.codigo.trim() || null }),
      }));
      setModal(false);
      setMensaje(editando ? "Entrada actualizada." : "Entrada añadida.");
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(fila) {
    if (!window.confirm(`¿Eliminar "${fila.valor || fila.codigo}" de ${fila.categoria}?`)) return;
    setError("");
    setMensaje("");
    try {
      await respuesta(await fetch(`${API_URL}/${fila.id}`, { method: "DELETE", headers }));
      setMensaje("Entrada eliminada.");
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="molsan-page-stack catalogos-premium-page min-h-full animate-fadeIn">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true">▦</div>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · DATOS ABSIS</p>
            <h1 className="molsan-page-header__title">Catálogo ABSIS</h1>
            <p className="molsan-page-header__description">Gestiona en una única pantalla los estados y listas auxiliares que utiliza la integración ABSIS. Cada lista se mantiene por separado y sus cambios quedan guardados en el servidor.</p>
          </div>
        </div>
        <div className="molsan-page-header__actions">
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right">
            <p className="text-2xl font-bold text-white">{filas.filter((f) => f.activo).length}</p>
            <p className="text-xs font-medium text-blue-100">entradas activas</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="absis-categoria">Lista que quieres gestionar</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select id="absis-categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setBusqueda(""); setMensaje(""); }} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100">
            {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => { setNombreNuevaLista(""); setError(""); setModalNuevaLista(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-indigo-100">+ Crear lista</button>
          <button type="button" onClick={abrirNuevo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200">
            <span aria-hidden="true" className="text-lg leading-none">+</span> Añadir entrada
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar código, valor o descripción…" aria-label="Buscar en el catálogo seleccionado" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 sm:max-w-md" />
          <p className="text-sm text-slate-500">{visibles.length} entradas en esta lista</p>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {mensaje && !modal && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 className="font-bold text-slate-800">{categoria}</h2><p className="mt-1 text-xs text-slate-500">Listado editable · datos persistentes</p></div>
          <button type="button" onClick={cargar} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Actualizar</button>
        </div>
        {cargando ? <div className="p-10 text-center text-sm text-slate-500">Cargando listado…</div> :
          visibles.length === 0 ? <div className="p-10 text-center"><p className="font-semibold text-slate-700">Todavía no hay entradas en esta lista</p><p className="mt-1 text-sm text-slate-500">Usa «Añadir entrada» para incorporar el primer valor.</p></div> :
          <MolsanDataTable
            rows={visibles}
            rowKey="id"
            minWidth="680px"
            columns={[
              { key: "codigo", header: "Código", accessor: "codigo", sortType: "text" },
              { key: "valor", header: "Valor", accessor: "valor", sortType: "text" },
              { key: "descripcion", header: "Descripción", accessor: "descripcion", sortType: "text" },
              { key: "activo", header: "Estado", accessor: "activo", sortType: "boolean", render: (value) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{value ? "Activo" : "Inactivo"}</span> },
              { key: "acciones", header: "Acciones", sortable: false, align: "right", accessor: (fila) => fila.id, render: (_, fila) => <div className="flex justify-end gap-1"><button type="button" onClick={() => abrirEdicion(fila)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Editar</button><button type="button" onClick={() => eliminar(fila)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Eliminar</button></div> },
            ]}
          />
        }
      </section>

      {modalNuevaLista && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !creandoLista) setModalNuevaLista(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="absis-nueva-lista-titulo" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <form onSubmit={crearLista}>
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 id="absis-nueva-lista-titulo" className="text-lg font-bold text-slate-900">Crear nueva lista ABSIS</h2>
              <p className="mt-1 text-sm text-slate-500">Ponle un nombre único. Después podrás añadir todos los valores que necesites.</p>
            </div>
            <div className="space-y-3 p-6">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Nombre de la lista
                <input autoFocus value={nombreNuevaLista} onChange={(e) => setNombreNuevaLista(e.target.value)} maxLength={100} required placeholder="Ej. TIPOFACTURA" className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              </label>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" disabled={creandoLista} onClick={() => setModalNuevaLista(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button>
              <button type="submit" disabled={creandoLista || !nombreNuevaLista.trim()} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creandoLista ? "Creando…" : "Crear lista"}</button>
            </div>
          </form>
        </section>
      </div>}

      {modal && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="absis-modal-titulo" className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
          <form onSubmit={guardar}>
            <div className="border-b border-slate-200 px-6 py-5"><h2 id="absis-modal-titulo" className="text-lg font-bold text-slate-900">{editando ? "Editar entrada" : "Añadir entrada"} · {categoria}</h2><p className="mt-1 text-sm text-slate-500">Elige la lista y rellena los datos. El código es opcional.</p></div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Lista
                <select value={formulario.categoria} onChange={(e) => setFormulario((f) => ({ ...f, categoria: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5" required>{categorias.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Código
                <input value={formulario.codigo} onChange={(e) => setFormulario((f) => ({ ...f, codigo: e.target.value }))} maxLength={40} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Ej. 118" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">Valor
                <input value={formulario.valor} onChange={(e) => setFormulario((f) => ({ ...f, valor: e.target.value }))} maxLength={300} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Nombre del valor" required={!formulario.codigo} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">Descripción
                <textarea value={formulario.descripcion} onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value }))} rows={3} maxLength={2000} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Descripción (opcional)" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={formulario.activo} onChange={(e) => setFormulario((f) => ({ ...f, activo: e.target.checked }))} /> Entrada activa</label>
              {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4"><button type="button" onClick={() => setModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancelar</button><button type="submit" disabled={guardando} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar entrada"}</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}

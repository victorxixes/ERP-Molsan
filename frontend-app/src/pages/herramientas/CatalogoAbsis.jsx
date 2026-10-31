import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { API_BASE } from "../../api/config";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

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
  const nuevaListaDialogRef = useRef(null);
  const entradaDialogRef = useRef(null);
  useAccessibleDialog({ open: modalNuevaLista, onClose: () => { if (!creandoLista) setModalNuevaLista(false); }, dialogRef: nuevaListaDialogRef });
  useAccessibleDialog({ open: modal, onClose: () => { if (!guardando) setModal(false); }, dialogRef: entradaDialogRef });
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
  const ordenVisibles = useSortableData(visibles);

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
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="AB" title="Catálogo ABSIS" description="Gestiona los estados y listas auxiliares utilizados por la integración ABSIS. Los cambios se guardan en el servidor." />

      <section className="erp-card molsan-filter-bar p-4 sm:p-5">
        <label className="mb-2 block" htmlFor="absis-categoria">Lista que quieres gestionar</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select id="absis-categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value); setBusqueda(""); setMensaje(""); }} className="min-w-0 flex-1 px-3 py-3">
            {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={() => { setNombreNuevaLista(""); setError(""); setModalNuevaLista(true); }} className="inline-flex items-center justify-center gap-2 px-4 py-3">+ Crear lista</button>
          <button type="button" onClick={abrirNuevo} className="inline-flex items-center justify-center gap-2 px-5 py-3">
            <span aria-hidden="true">+</span> Añadir entrada
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar código, valor o descripción…" aria-label="Buscar en el catálogo seleccionado" className="w-full px-3 py-2.5 sm:max-w-md" />
          <p>{visibles.length} entradas en esta lista</p>
        </div>
      </section>

      {error && <div role="alert" className="px-4 py-3">{error}</div>}
      {mensaje && !modal && <div role="status" className="px-4 py-3">{mensaje}</div>}

      <section className="erp-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div><h2>{categoria}</h2><p className="mt-1">Listado editable · datos persistentes</p></div>
          <button type="button" onClick={cargar} className="px-3 py-2">Actualizar</button>
        </div>
        {cargando ? <div className="p-10">Cargando listado…</div> :
          visibles.length === 0 ? <div className="p-10"><p>Todavía no hay entradas en esta lista</p><p className="mt-1">Usa «Añadir entrada» para incorporar el primer valor.</p></div> :
          <div className="overflow-x-auto"><table className="w-full min-w-[680px]">
            <thead className="uppercase"><tr>
              <MolsanSortableTh label="Código" sortKey="codigo" sortConfig={ordenVisibles.sortConfig} onSort={ordenVisibles.requestSort} className="px-5 py-3" />
              <MolsanSortableTh label="Valor" sortKey="valor" sortConfig={ordenVisibles.sortConfig} onSort={ordenVisibles.requestSort} className="px-5 py-3" />
              <MolsanSortableTh label="Descripción" sortKey="descripcion" sortConfig={ordenVisibles.sortConfig} onSort={ordenVisibles.requestSort} className="px-5 py-3" />
              <MolsanSortableTh label="Estado" sortKey="activo" sortConfig={ordenVisibles.sortConfig} onSort={ordenVisibles.requestSort} className="px-5 py-3" />
              <th className="px-5 py-3">Acciones</th>
            </tr></thead>
            <tbody>{ordenVisibles.items.map((fila) => <tr key={fila.id}>
              <td className="whitespace-nowrap px-5 py-3">{fila.codigo || "—"}</td>
              <td className="px-5 py-3">{fila.valor || "—"}</td>
              <td className="max-w-xl px-5 py-3">{fila.descripcion || "—"}</td>
              <td className="px-5 py-3"><span className={`px-2.5 py-1 ${fila.activo ? "" : ""}`}>{fila.activo ? "Activo" : "Inactivo"}</span></td>
              <td className="whitespace-nowrap px-5 py-3"><button type="button" onClick={() => abrirEdicion(fila)} className="px-2 py-1.5">Editar</button><button type="button" onClick={() => eliminar(fila)} className="ml-1 px-2 py-1.5">Eliminar</button></td>
            </tr>)}</tbody>
          </table></div>
        }
      </section>

      {modalNuevaLista && <div className="molsan-modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !creandoLista) setModalNuevaLista(false); }}>
        <section ref={nuevaListaDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="absis-nueva-lista-titulo" className="molsan-modal__panel w-full max-w-lg">
          <form onSubmit={crearLista}>
            <div className="px-6 py-5">
              <h2 id="absis-nueva-lista-titulo">Crear nueva lista ABSIS</h2>
              <p className="mt-1">Ponle un nombre único. Después podrás añadir todos los valores que necesites.</p>
            </div>
            <div className="space-y-3 p-6">
              <label className="flex flex-col gap-1.5">Nombre de la lista
                <input autoFocus value={nombreNuevaLista} onChange={(e) => setNombreNuevaLista(e.target.value)} maxLength={100} required placeholder="Ej. TIPOFACTURA" className="px-3 py-2.5" />
              </label>
              {error && <p role="alert">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4">
              <button type="button" disabled={creandoLista} onClick={() => setModalNuevaLista(false)} className="px-4 py-2.5">Cancelar</button>
              <button type="submit" disabled={creandoLista || !nombreNuevaLista.trim()} className="px-5 py-2.5">{creandoLista ? "Creando…" : "Crear lista"}</button>
            </div>
          </form>
        </section>
      </div>}

      {modal && <div className="molsan-modal-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) setModal(false); }}>
        <section ref={entradaDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="absis-modal-titulo" className="molsan-modal__panel my-auto w-full max-w-2xl">
          <form onSubmit={guardar}>
            <div className="px-6 py-5"><h2 id="absis-modal-titulo">{editando ? "Editar entrada" : "Añadir entrada"} · {categoria}</h2><p className="mt-1">Elige la lista y rellena los datos. El código es opcional.</p></div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">Lista
                <select value={formulario.categoria} onChange={(e) => setFormulario((f) => ({ ...f, categoria: e.target.value }))} className="px-3 py-2.5" required>{categorias.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="flex flex-col gap-1.5">Código
                <input value={formulario.codigo} onChange={(e) => setFormulario((f) => ({ ...f, codigo: e.target.value }))} maxLength={40} className="px-3 py-2.5" placeholder="Ej. 118" />
              </label>
              <label className="flex flex-col gap-1.5">Valor
                <input value={formulario.valor} onChange={(e) => setFormulario((f) => ({ ...f, valor: e.target.value }))} maxLength={300} className="px-3 py-2.5" placeholder="Nombre del valor" required={!formulario.codigo} />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">Descripción
                <textarea value={formulario.descripcion} onChange={(e) => setFormulario((f) => ({ ...f, descripcion: e.target.value }))} rows={3} maxLength={2000} className="px-3 py-2.5" placeholder="Descripción (opcional)" />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={formulario.activo} onChange={(e) => setFormulario((f) => ({ ...f, activo: e.target.checked }))} /> Entrada activa</label>
              {error && <p role="alert" className="sm:col-span-2">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4"><button type="button" disabled={guardando} onClick={() => setModal(false)} className="px-4 py-2.5">Cancelar</button><button type="submit" disabled={guardando} className="px-5 py-2.5">{guardando ? "Guardando…" : "Guardar entrada"}</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}

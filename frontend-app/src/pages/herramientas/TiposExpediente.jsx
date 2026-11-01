import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../api/axios";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import useSortableData from "../../hooks/useSortableData";
import MolsanSortableTh from "../../components/ui/MolsanSortableTh";

const API = "/tipos-expediente";
const CAMPO = "w-full px-3 py-2.5";

export default function TiposExpediente() {
  const [tipos, setTipos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState("Tipos de expediente");
  const [activo, setActivo] = useState(true);
  const dialogRef = useRef(null);
  useAccessibleDialog({ open: mostrarModal, onClose: cerrarModal, dialogRef });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await axios.get(API);
      setTipos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar el catálogo de tipos de expediente.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const tiposFiltrados = useMemo(() => tipos.filter((tipo) => {
    const coincideTexto = !busqueda.trim() || tipo.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) || String(tipo.id).includes(busqueda.trim());
    const coincideGrupo = grupoFiltro === "todos" || tipo.grupo === grupoFiltro;
    return coincideTexto && coincideGrupo;
  }), [tipos, busqueda, grupoFiltro]);
  const ordenTipos = useSortableData(tiposFiltrados);

  function abrirNuevo() {
    setEditando(null); setNombre(""); setGrupo("Tipos de expediente"); setActivo(true);
    setError(""); setMensaje("");
    setMostrarModal(true);
  }

  function abrirEditar(tipo) {
    setEditando(tipo); setNombre(tipo.nombre); setGrupo(tipo.grupo); setActivo(tipo.activo !== false);
    setError(""); setMensaje("");
    setMostrarModal(true);
  }

  function cerrarModal() {
    if (guardando) return;
    setMostrarModal(false);
    setEditando(null);
    setNombre("");
    setGrupo("Tipos de expediente");
    setActivo(true);
    setError("");
  }

  async function guardar(event) {
    event.preventDefault();
    if (!nombre.trim() || guardando) return;
    setGuardando(true); setError(""); setMensaje("");
    try {
      const payload = { nombre: nombre.trim(), grupo, activo };
      if (editando) await axios.put(`${API}/${editando.id}`, payload);
      else await axios.post(API, payload);
      setMensaje(editando ? "Tipo de expediente actualizado." : "Tipo de expediente creado.");
      setMostrarModal(false);
      setEditando(null);
      setNombre("");
      setGrupo("Tipos de expediente");
      setActivo(true);
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar el tipo de expediente.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(tipo) {
    if (!window.confirm(`¿Eliminar el tipo «${tipo.nombre}» (ID ${tipo.id})?`)) return;
    setError(""); setMensaje("");
    try {
      await axios.delete(`${API}/${tipo.id}`);
      setMensaje("Tipo de expediente eliminado.");
      if (editando?.id === tipo.id) cerrarModal();
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo eliminar el tipo de expediente.");
    }
  }

  const total = tipos.length;
  const activos = tipos.filter((t) => t.activo !== false).length;

  return (
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="TE" title="Tipos de expediente" description="Catálogo maestro de tipos de expediente. Conserva referencias históricas y configura los tipos disponibles para nuevas altas." />

      <section className="molsan-stat-grid">
        <div className="molsan-stat-card"><div><span className="molsan-stat-label">Tipos registrados</span><strong>{total}</strong></div></div>
        <div className="molsan-stat-card"><div><span className="molsan-stat-label">Tipos activos</span><strong>{activos}</strong></div></div>
        <div className="molsan-stat-card"><div><span className="molsan-stat-label">Altas disponibles</span><strong>Crear y mantener</strong></div></div>
      </section>

      {(error || mensaje) && <div role="status" className={`px-4 py-3 ${error ? "" : ""}`}>{error || mensaje}</div>}

      {mostrarModal && <div className="molsan-modal-overlay fixed inset-0 z-[1000] flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="tipo-expediente-modal-title" className="molsan-modal__panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6">
        <div className="molsan-modal__header flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><h2 id="tipo-expediente-modal-title">{editando ? "Editar tipo de expediente" : "Nuevo tipo de expediente"}</h2><p className="mt-1">Los identificadores históricos se conservan; las nuevas altas reciben un ID automático.</p></div>
          <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar ventana" className="px-4 py-2">Cerrar ✕</button>
        </div>
        <form onSubmit={guardar} className="molsan-form mt-5 grid grid-cols-1 gap-4 md:grid-cols-12">
          <label className="md:col-span-5">Descripción
            <input className={`${CAMPO} mt-2`} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={250} required placeholder="Nombre del tipo de expediente" />
          </label>
          <label className="md:col-span-4">Grupo
            <select className={`${CAMPO} mt-2`} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option>Tipos de expediente</option><option>Provisiones fuera circuito GTG</option>
            </select>
          </label>
          <label className="flex items-center gap-3 px-4 py-3 md:col-span-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo
          </label>
          <div className="flex items-end md:col-span-1"><button disabled={guardando || !nombre.trim()} className="w-full px-4 py-3" type="submit">{guardando ? "..." : editando ? "Guardar" : "Añadir"}</button></div>
        </form>
      </div></div>}

      <section className="erp-card overflow-hidden">
        <div className="molsan-filter-bar flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2>Tabla de tipos de expediente</h2><p className="mt-1">{tiposFiltrados.length} registros mostrados</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={CAMPO} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por ID o descripción" />
            <select className={CAMPO} value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}><option value="todos">Todos los grupos</option><option>Tipos de expediente</option><option>Provisiones fuera circuito GTG</option></select>
            <button type="button" onClick={cargar} className="px-4 py-2">Actualizar</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="uppercase"><tr>
              <MolsanSortableTh label="ID" sortKey="id" sortConfig={ordenTipos.sortConfig} onSort={ordenTipos.requestSort} className="px-5 py-3" />
              <MolsanSortableTh label="Descripción" sortKey="nombre" sortConfig={ordenTipos.sortConfig} onSort={ordenTipos.requestSort} className="px-5 py-3" />
              <MolsanSortableTh label="Grupo" sortKey="grupo" sortConfig={ordenTipos.sortConfig} onSort={ordenTipos.requestSort} className="px-5 py-3" />
              <MolsanSortableTh label="Estado" sortKey="activo" sortConfig={ordenTipos.sortConfig} onSort={ordenTipos.requestSort} className="px-5 py-3" />
              <th className="px-5 py-3">Acciones</th>
            </tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan="5" className="px-5 py-10">Cargando catálogo…</td></tr> : tiposFiltrados.length === 0 ? <tr><td colSpan="5" className="px-5 py-10">No hay tipos que coincidan con la búsqueda.</td></tr> : ordenTipos.items.map((tipo) => <tr key={tipo.id}>
                <td className="px-5 py-3">{tipo.id}</td><td className="px-5 py-3">{tipo.nombre}</td><td className="px-5 py-3">{tipo.grupo}</td><td className="px-5 py-3"><span className={`px-2.5 py-1 ${tipo.activo ? "" : ""}`}>{tipo.activo ? "Activo" : "Inactivo"}</span></td><td className="px-5 py-3"><div className="flex justify-end gap-2"><button type="button" onClick={() => abrirEditar(tipo)} className="px-3 py-1.5">Editar</button><button type="button" onClick={() => eliminar(tipo)} className="px-3 py-1.5">Eliminar</button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

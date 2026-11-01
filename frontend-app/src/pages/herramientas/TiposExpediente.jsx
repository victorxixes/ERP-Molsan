import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import MolsanDataTable from "../../components/ui/MolsanDataTable";
import MolsanButton from "../../components/ui/MolsanButton";
import "../../css/CatalogosMaestrosPremium.css";

const API = "/tipos-expediente";
const CAMPO = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

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
    <main className="molsan-page-stack catalogos-premium-page min-h-full animate-fadeIn">
      <header className="molsan-page-header">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">MOLSAN ERP PREMIUM 2027</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-800 sm:text-3xl">Tipos de expediente</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Catálogo maestro de tipos de expediente. Incluye los registros históricos de provisiones fuera del circuito GTG y los tipos para nuevas altas manuales.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Tipos registrados</p><p className="mt-1 text-2xl font-bold text-slate-800">{total}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Tipos activos</p><p className="mt-1 text-2xl font-bold text-emerald-700">{activos}</p></div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm text-blue-700">Altas disponibles</p><p className="mt-1 text-sm font-semibold text-blue-900">Crear, editar y eliminar tipos</p></div>
      </section>

      {(error || mensaje) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || mensaje}</div>}

      {mostrarModal && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="tipo-expediente-modal-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><h2 id="tipo-expediente-modal-title" className="text-lg font-bold text-slate-800">{editando ? "Editar tipo de expediente" : "Nuevo tipo de expediente"}</h2><p className="mt-1 text-sm text-slate-500">Los identificadores históricos se conservan; las nuevas altas reciben un ID automático.</p></div>
          <button type="button" onClick={cerrarModal} disabled={guardando} aria-label="Cerrar ventana" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cerrar ✕</button>
        </div>
        <form onSubmit={guardar} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-12">
          <label className="text-sm font-semibold text-slate-700 md:col-span-5">Descripción
            <input className={`${CAMPO} mt-2`} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={250} required placeholder="Nombre del tipo de expediente" />
          </label>
          <label className="text-sm font-semibold text-slate-700 md:col-span-4">Grupo
            <select className={`${CAMPO} mt-2`} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option>Tipos de expediente</option><option>Provisiones fuera circuito GTG</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo
          </label>
          <div className="flex items-end md:col-span-1"><MolsanButton type="submit" icon={editando ? "check" : "plus"} variant="primary" className="w-full" disabled={guardando || !nombre.trim()} loading={guardando}>{editando ? "Guardar" : "Añadir"}</MolsanButton></div>
        </form>
      </div></div>}

      <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-lg font-bold text-slate-800">Tabla de tipos de expediente</h2><p className="mt-1 text-sm text-slate-500">{tiposFiltrados.length} registros mostrados</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className={CAMPO} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por ID o descripción" />
            <select className={CAMPO} value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}><option value="todos">Todos los grupos</option><option>Tipos de expediente</option><option>Provisiones fuera circuito GTG</option></select>
            <button type="button" onClick={cargar} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Actualizar</button>
          </div>
        </div>
        <MolsanDataTable
          rows={tiposFiltrados}
          rowKey="id"
          minWidth="760px"
          emptyText="No hay tipos que coincidan con la búsqueda."
          columns={[
            { key: "id", header: "ID", accessor: "id", sortType: "number" },
            { key: "nombre", header: "Descripción", accessor: "nombre", sortType: "text" },
            { key: "grupo", header: "Grupo", accessor: "grupo", sortType: "text" },
            { key: "activo", header: "Estado", accessor: "activo", sortType: "boolean", render: (value) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${value ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{value ? "Activo" : "Inactivo"}</span> },
            { key: "acciones", header: "Acciones", sortable: false, align: "right", accessor: (tipo) => tipo.id, render: (_, tipo) => <div className="flex justify-end gap-2"><button type="button" onClick={() => abrirEditar(tipo)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">Editar</button><button type="button" onClick={() => eliminar(tipo)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Eliminar</button></div> },
          ]}
        />
      </section>
    </main>
  );
}

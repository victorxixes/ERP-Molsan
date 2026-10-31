import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

const VACIO = { nombre: "", categoria: "impuesto", impuesto: "IVA", porcentaje: "", territorio: "Territorio común", descripcion: "", activo: true };
const fmt = (n) => n === null || n === undefined || n === "" ? "—" : `${Number(n).toLocaleString("es-ES", { maximumFractionDigits: 3 })}%`;

export default function TiposImpositivos() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [editando, setEditando] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await axios.get("/tipos-impositivos", { params: { activos: !mostrarInactivos } });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar el catálogo de tipos impositivos.");
    } finally {
      setCargando(false);
    }
  }, [mostrarInactivos]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => items.filter((x) => categoriaFiltro === "todos" || x.categoria === categoriaFiltro), [items, categoriaFiltro]);
  const nuevo = () => { setEditando(null); setForm(VACIO); setError(""); setMensaje(""); };
  const editar = (x) => {
    setEditando(x.id);
    setForm({ nombre: x.nombre || "", categoria: x.categoria || "impuesto", impuesto: x.impuesto || "IVA", porcentaje: x.porcentaje ?? "", territorio: x.territorio || "España", descripcion: x.descripcion || "", activo: Boolean(x.activo) });
    setError(""); setMensaje("");
    document.getElementById("formulario-tipo-impositivo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    const payload = { ...form, porcentaje: form.porcentaje === "" ? null : Number(form.porcentaje), nombre: form.nombre.trim(), impuesto: form.impuesto.trim(), territorio: form.territorio.trim() || "España", descripcion: form.descripcion.trim() || null };
    try {
      if (editando) await axios.put(`/tipos-impositivos/${editando}`, payload);
      else await axios.post("/tipos-impositivos", payload);
      setMensaje(editando ? "Tipo impositivo actualizado." : "Tipo impositivo creado.");
      setForm(VACIO); setEditando(null);
      await cargar();
    } catch (e2) {
      setError(e2?.response?.data?.detail || "No se pudo guardar el tipo impositivo.");
    } finally { setGuardando(false); }
  };
  const desactivar = async (x) => {
    if (!window.confirm(`¿Desactivar «${x.nombre}»? Se conservará para no alterar los registros históricos.`)) return;
    setError(""); setMensaje("");
    try {
      await axios.delete(`/tipos-impositivos/${x.id}`);
      setMensaje("Tipo desactivado. Los registros históricos se conservan.");
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo desactivar el tipo."); }
  };

  return (
    <main className="erp-page min-w-0 space-y-6">
      <MolsanPageHeader mark="TI" title="Tipos impositivos" description="Catálogo de impuestos y retenciones utilizados en pagos, gastos y operaciones económicas." />

      <div className="px-4 py-3">
        Los tipos son referencias configurables: la aplicación del porcentaje correcto depende de la operación, el territorio, la fecha de devengo y los requisitos legales. Comprueba la factura antes de confirmar un pago.
      </div>

      <section id="formulario-tipo-impositivo" className="erp-card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2>{editando ? "Editar tipo impositivo" : "Crear tipo impositivo"}</h2><p className="mt-1">Los tipos desactivados no aparecerán en los desplegables nuevos.</p></div>
          {editando && <button type="button" onClick={nuevo} className="px-3 py-2">Cancelar edición</button>}
        </div>
        <form onSubmit={guardar} className="molsan-form grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label>Nombre visible *
            <input required maxLength={160} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. IVA general 21%" className="mt-1.5 w-full px-3 py-2.5" />
          </label>
          <label>Categoría *
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value, impuesto: e.target.value === "retencion" ? "IRPF" : "IVA", territorio: e.target.value === "retencion" ? "España" : "Territorio común" })} className="mt-1.5 w-full px-3 py-2.5"><option value="impuesto">Impuesto</option><option value="retencion">Retención</option></select>
          </label>
          <label>Tributo *
            <select value={form.impuesto} onChange={(e) => setForm({ ...form, impuesto: e.target.value })} className="mt-1.5 w-full px-3 py-2.5">
              {(form.categoria === "impuesto" ? ["IVA", "IGIC", "IPSI", "ITP", "AJD", "IS", "Otro"] : ["IRPF", "IS", "IRNR", "Otro"]).map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Porcentaje (%)
            <input type="number" min="0" max="100" step="0.001" value={form.porcentaje} onChange={(e) => setForm({ ...form, porcentaje: e.target.value })} placeholder="Vacío si no aplica" className="mt-1.5 w-full px-3 py-2.5" />
          </label>
          <label>Territorio *
            <input required maxLength={80} value={form.territorio} onChange={(e) => setForm({ ...form, territorio: e.target.value })} placeholder="España, Canarias…" className="mt-1.5 w-full px-3 py-2.5" />
          </label>
          <label className="sm:col-span-2 xl:col-span-1">Descripción
            <input maxLength={500} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Notas de uso y aplicación" className="mt-1.5 w-full px-3 py-2.5" />
          </label>
          {editando && <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />Activo y disponible en desplegables</label>}
          <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-3">
            <button disabled={guardando} type="submit" className="px-5 py-2.5">{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear tipo impositivo"}</button>
            <button type="button" onClick={nuevo} className="px-5 py-2.5">Limpiar</button>
          </div>
        </form>
      </section>

      {error && <div role="alert" className="px-4 py-3">{error}</div>}
      {mensaje && <div role="status" className="px-4 py-3">{mensaje}</div>}

      <section className="erp-card overflow-hidden">
        <div className="molsan-filter-bar flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div><h2>Catálogo configurado</h2><p>{filtrados.length} registro(s) mostrados</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filtrar por categoría" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="px-3 py-2"><option value="todos">Todos</option><option value="impuesto">Impuestos</option><option value="retencion">Retenciones</option></select>
            <label className="flex items-center gap-2"><input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />Mostrar inactivos</label>
            <button type="button" onClick={cargar} className="px-3 py-2">Actualizar</button>
          </div>
        </div>
        {cargando ? <p className="p-8">Cargando catálogo…</p> : filtrados.length === 0 ? <p className="p-8">No hay tipos para este filtro.</p> : (
          <div className="overflow-x-auto"><table className="min-w-full">
            <thead className="uppercase"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Tributo</th><th className="px-4 py-3">Porcentaje</th><th className="px-4 py-3">Territorio</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody>{filtrados.map((x) => <tr key={x.id}>
              <td className="px-4 py-3"><div>{x.nombre}</div>{x.descripcion && <div className="mt-1 max-w-sm">{x.descripcion}</div>}</td>
              <td className="px-4 py-3">{x.categoria === "retencion" ? "Retención" : "Impuesto"}</td><td className="px-4 py-3">{x.impuesto}</td><td className="px-4 py-3 tabular-nums">{fmt(x.porcentaje)}</td><td className="px-4 py-3">{x.territorio}</td>
              <td className="px-4 py-3"><span className={x.activo ? "px-2.5 py-1" : "px-2.5 py-1"}>{x.activo ? "Activo" : "Inactivo"}</span></td>
              <td className="px-4 py-3 whitespace-nowrap"><button type="button" onClick={() => editar(x)} className="mr-2 px-3 py-1.5">Editar</button>{x.activo && <button type="button" onClick={() => desactivar(x)} className="px-3 py-1.5">Eliminar</button>}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </main>
  );
}

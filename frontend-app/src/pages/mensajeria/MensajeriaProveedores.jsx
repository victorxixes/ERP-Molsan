import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const inputClass = "w-full rounded-xl border border-[var(--molsan-border)] bg-white px-3 py-2.5 text-sm text-[var(--molsan-primary)] outline-none focus:border-[var(--molsan-border-strong)] focus:ring-2 focus:ring-[var(--molsan-primary-soft)]";
const initial = { nombre: "", contacto: "", email: "", telefono: "", codigo_cliente: "", url_portal: "", notas: "", principal: false, activo: true };

export default function MensajeriaProveedores() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try { const r = await axios.get("/mensajeria/proveedores"); setItems(r.data || []); setError(""); }
    catch (e) { setError(e?.response?.data?.detail || "No se pudieron cargar los proveedores."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cambiar = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const editar = (item) => { setEditId(item.id); setForm({ ...initial, ...item }); setAviso(""); };
  const cancelar = () => { setEditId(null); setForm(initial); };

  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    if (!editId && items.length >= 2) {
      setError("El catálogo admite como máximo dos empresas de mensajería. Edita una existente para cambiar sus datos.");
      setGuardando(false); return;
    }
    try {
      const payload = { ...form, nombre: form.nombre.trim() };
      if (editId) await axios.patch(`/mensajeria/proveedores/${editId}`, payload);
      else await axios.post("/mensajeria/proveedores", payload);
      setAviso(editId ? "Proveedor actualizado." : "Proveedor dado de alta.");
      cancelar(); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo guardar el proveedor."); }
    finally { setGuardando(false); }
  };

  return <section className="space-y-4 rounded-2xl border border-[var(--molsan-border)] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[var(--molsan-primary)]">Proveedores de mensajería</h2><p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">Alta y mantenimiento de una o dos empresas. Los datos de API se configurarán cuando el proveedor facilite su documentación técnica.</p></div><span className="rounded-full border border-[var(--molsan-border)] bg-[var(--molsan-surface-soft)] px-3 py-1 text-xs font-bold text-[var(--molsan-text-secondary)]">{items.length}/2 empresas</span></div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {aviso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</div>}
    <div className="grid gap-3 md:grid-cols-2">{items.map(item=><article key={item.id} className="rounded-xl border border-[var(--molsan-border)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[var(--molsan-primary)]">{item.nombre}</h3><p className="mt-1 text-sm text-[var(--molsan-text-secondary)]">{item.contacto||"Sin contacto asignado"}</p></div><div className="flex flex-wrap gap-1">{item.principal&&<span className="rounded-full bg-[var(--molsan-primary-soft)] px-2 py-1 text-[11px] font-bold text-[var(--molsan-primary)]">Principal</span>}<span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.activo?"bg-emerald-50 text-emerald-700":"bg-[var(--molsan-table-head)] text-[var(--molsan-text-secondary)]"}`}>{item.activo?"Activo":"Inactivo"}</span></div></div><div className="mt-3 space-y-1 text-sm text-[var(--molsan-text-secondary)]"><p>{item.email||"Sin email"} · {item.telefono||"Sin teléfono"}</p>{item.codigo_cliente&&<p>Código de cliente: {item.codigo_cliente}</p>}{item.url_portal&&<p className="truncate">Portal: {item.url_portal}</p>}{item.notas&&<p className="whitespace-pre-wrap">{item.notas}</p>}</div><button onClick={()=>editar(item)} className="mt-3 rounded-lg border border-[var(--molsan-border)] px-3 py-1.5 text-sm font-bold text-[var(--molsan-primary)]">Editar proveedor</button></article>)}</div>
    {!items.length&&!cargando&&<p className="rounded-xl bg-[var(--molsan-surface-soft)] p-4 text-sm text-[var(--molsan-text-secondary)]">Todavía no se han dado de alta empresas de mensajería.</p>}
    <form onSubmit={guardar} className="space-y-4 border-t border-[var(--molsan-border-light)] pt-4">
      <div><h3 className="font-bold text-[var(--molsan-primary)]">{editId?"Editar empresa":"Alta de proveedor"}</h3><p className="mt-1 text-xs text-[var(--molsan-text-secondary)]">No introduzcas contraseñas ni claves secretas aquí. Las credenciales API se configurarán de forma segura en una fase posterior.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Nombre de la empresa *<input className={inputClass+" mt-1.5"} value={form.nombre} onChange={e=>cambiar("nombre",e.target.value)} required /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Persona de contacto<input className={inputClass+" mt-1.5"} value={form.contacto||""} onChange={e=>cambiar("contacto",e.target.value)} /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Correo de contacto<input className={inputClass+" mt-1.5"} type="email" value={form.email||""} onChange={e=>cambiar("email",e.target.value)} /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Teléfono<input className={inputClass+" mt-1.5"} value={form.telefono||""} onChange={e=>cambiar("telefono",e.target.value)} /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Código de cliente / cuenta<input className={inputClass+" mt-1.5"} value={form.codigo_cliente||""} onChange={e=>cambiar("codigo_cliente",e.target.value)} /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)]">Portal web<input className={inputClass+" mt-1.5"} type="url" value={form.url_portal||""} onChange={e=>cambiar("url_portal",e.target.value)} placeholder="https://" /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-[var(--molsan-text-secondary)] sm:col-span-2 lg:col-span-3">Notas internas<textarea className={inputClass+" mt-1.5"} rows="2" value={form.notas||""} onChange={e=>cambiar("notas",e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm text-[var(--molsan-text)]"><input type="checkbox" checked={!!form.principal} onChange={e=>cambiar("principal",e.target.checked)} /> Proveedor principal</label><label className="flex items-center gap-2 text-sm text-[var(--molsan-text)]"><input type="checkbox" checked={!!form.activo} onChange={e=>cambiar("activo",e.target.checked)} /> Empresa activa</label></div>
      <div className="flex flex-wrap gap-2"><button disabled={guardando||(!editId&&items.length>=2)} className="rounded-xl bg-[var(--molsan-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando?"Guardando…":editId?"Guardar cambios":"Dar de alta proveedor"}</button>{editId&&<button type="button" onClick={cancelar} className="rounded-xl border border-[var(--molsan-border)] px-4 py-2.5 text-sm font-bold text-[var(--molsan-text-secondary)]">Cancelar edición</button>}</div>
    </form>
  </section>;
}

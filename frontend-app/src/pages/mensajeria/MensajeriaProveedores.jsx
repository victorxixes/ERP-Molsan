import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const inputClass = "w-full px-3 py-2.5 ";
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

  return <section className="erp-card space-y-4 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2>Proveedores de mensajería</h2><p className="mt-1">Alta y mantenimiento de una o dos empresas. Los datos de API se configurarán cuando el proveedor facilite su documentación técnica.</p></div><span className="px-3 py-1">{items.length}/2 empresas</span></div>
    {error && <div role="alert" className="p-3">{error}</div>}
    {aviso && <div role="status" className="p-3">{aviso}</div>}
    <div className="grid gap-3 md:grid-cols-2">{items.map(item=><article key={item.id} className="molsan-summary-card"><div className="flex items-start justify-between gap-3"><div><h3>{item.nombre}</h3><p className="mt-1">{item.contacto||"Sin contacto asignado"}</p></div><div className="flex flex-wrap gap-1">{item.principal&&<span className="px-2 py-1">Principal</span>}<span className={`px-2 py-1 ${item.activo?"":""}`}>{item.activo?"Activo":"Inactivo"}</span></div></div><div className="mt-3 space-y-1"><p>{item.email||"Sin email"} · {item.telefono||"Sin teléfono"}</p>{item.codigo_cliente&&<p>Código de cliente: {item.codigo_cliente}</p>}{item.url_portal&&<p className="truncate">Portal: {item.url_portal}</p>}{item.notas&&<p className="whitespace-pre-wrap">{item.notas}</p>}</div><button type="button" onClick={()=>editar(item)} className="molsan-btn molsan-btn--secondary molsan-btn--compact mt-3 px-3 py-1.5">Editar proveedor</button></article>)}</div>
    {!items.length&&!cargando&&<p className="p-4">Todavía no se han dado de alta empresas de mensajería.</p>}
    <form onSubmit={guardar} className="molsan-form-section molsan-form space-y-4 pt-4">
      <div><h3>{editId?"Editar empresa":"Alta de proveedor"}</h3><p className="mt-1">No introduzcas contraseñas ni claves secretas aquí. Las credenciales API se configurarán de forma segura en una fase posterior.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block uppercase">Nombre de la empresa *<input className={inputClass+"mt-1.5"} value={form.nombre} onChange={e=>cambiar("nombre",e.target.value)} required /></label>
        <label className="block uppercase">Persona de contacto<input className={inputClass+"mt-1.5"} value={form.contacto||""} onChange={e=>cambiar("contacto",e.target.value)} /></label>
        <label className="block uppercase">Correo de contacto<input className={inputClass+"mt-1.5"} type="email" value={form.email||""} onChange={e=>cambiar("email",e.target.value)} /></label>
        <label className="block uppercase">Teléfono<input className={inputClass+"mt-1.5"} value={form.telefono||""} onChange={e=>cambiar("telefono",e.target.value)} /></label>
        <label className="block uppercase">Código de cliente / cuenta<input className={inputClass+"mt-1.5"} value={form.codigo_cliente||""} onChange={e=>cambiar("codigo_cliente",e.target.value)} /></label>
        <label className="block uppercase">Portal web<input className={inputClass+"mt-1.5"} type="url" value={form.url_portal||""} onChange={e=>cambiar("url_portal",e.target.value)} placeholder="https://" /></label>
        <label className="block uppercase sm:col-span-2 lg:col-span-3">Notas internas<textarea className={inputClass+"mt-1.5"} rows="2" value={form.notas||""} onChange={e=>cambiar("notas",e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.principal} onChange={e=>cambiar("principal",e.target.checked)} /> Proveedor principal</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.activo} onChange={e=>cambiar("activo",e.target.checked)} /> Empresa activa</label></div>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={guardando||(!editId&&items.length>=2)} className="molsan-btn molsan-btn--primary px-4 py-2.5">{guardando?"Guardando…":editId?"Guardar cambios":"Dar de alta proveedor"}</button>{editId&&<button type="button" onClick={cancelar} className="molsan-btn molsan-btn--secondary px-4 py-2.5">Cancelar edición</button>}</div>
    </form>
  </section>;
}

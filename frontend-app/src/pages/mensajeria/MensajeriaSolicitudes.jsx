import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import "../../css/HerramientasPremium.css";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const estadoColor = (estado) => estado === "Entregada" ? "bg-emerald-50 text-emerald-700" : estado === "Incidencia" ? "bg-rose-50 text-rose-700" : estado === "Cancelada" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700";

export default function MensajeriaSolicitudes() {
  const empleado = useAuthStore((s) => s.empleado);
  const [solicitudes, setSolicitudes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [comunicaciones, setComunicaciones] = useState([]);
  const [mensajeChat, setMensajeChat] = useState("");
  const [form, setForm] = useState({ origen: "", destino: "", fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_destino: "", servicio_id: "" });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [s, c] = await Promise.all([axios.get("/mensajeria/mis-solicitudes"), axios.get("/mensajeria/servicios")]);
      setSolicitudes(s.data || []);
      setServicios((c.data || []).filter((item) => item.activo));
    } catch (e) { setError(e?.response?.data?.detail || "No se pudieron cargar tus solicitudes."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirSeguimiento = async (item) => {
    setSeleccionada(item);
    setMensajeChat("");
    try {
      const r = await axios.get(`/mensajeria/solicitudes/${item.id}/comunicaciones`);
      setComunicaciones(r.data || []);
    } catch { setComunicaciones([]); }
  };

  const crearSolicitud = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    try {
      const payload = { ...form, solicitante_nombre: [empleado?.nombre, empleado?.apellidos].filter(Boolean).join(" ") || "Empleado", solicitante_id: empleado?.id ?? null, servicio_id: form.servicio_id ? Number(form.servicio_id) : null };
      await axios.post("/mensajeria/mis-solicitudes", payload);
      setForm({ origen: "", destino: "", fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_destino: "", servicio_id: "" });
      setAviso("Solicitud enviada a Mensajería Gestión.");
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo enviar la solicitud."); }
    finally { setGuardando(false); }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault(); if (!seleccionada || !mensajeChat.trim()) return;
    setGuardando(true); setError("");
    try {
      const r = await axios.post(`/mensajeria/solicitudes/${seleccionada.id}/comunicaciones`, { mensaje: mensajeChat.trim() });
      setComunicaciones((old) => [...old, r.data]); setMensajeChat("");
      setAviso("Mensaje enviado a Mensajería Gestión.");
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo enviar el mensaje."); }
    finally { setGuardando(false); }
  };

  return <main className="catalogos-premium-page min-h-full space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
    <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">MOLSAN ERP PREMIUM 2027</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Mensajería</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-500">Solicita envíos y recogidas, consulta el estado de tus encargos y mantén la comunicación con la responsable desde aquí.</p>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {aviso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</div>}
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form onSubmit={crearSolicitud} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-bold text-slate-800">Nueva solicitud</h2><p className="mt-1 text-sm text-slate-500">Completa los datos del envío. La solicitud quedará pendiente de revisión.</p></div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Origen / recogida *<input className={inputClass+" mt-1.5"} value={form.origen} onChange={e=>setForm({...form,origen:e.target.value})} required /></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Destino / entrega *<input className={inputClass+" mt-1.5"} value={form.destino} onChange={e=>setForm({...form,destino:e.target.value})} required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Fecha deseada<input className={inputClass+" mt-1.5"} type="date" value={form.fecha_solicitada} onChange={e=>setForm({...form,fecha_solicitada:e.target.value})} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Prioridad<select className={inputClass+" mt-1.5"} value={form.prioridad} onChange={e=>setForm({...form,prioridad:e.target.value})}><option>Normal</option><option>Alta</option></select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Contacto de origen<input className={inputClass+" mt-1.5"} value={form.contacto_origen} onChange={e=>setForm({...form,contacto_origen:e.target.value})} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Contacto de destino<input className={inputClass+" mt-1.5"} value={form.contacto_destino} onChange={e=>setForm({...form,contacto_destino:e.target.value})} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Teléfono de destino<input className={inputClass+" mt-1.5"} value={form.telefono_destino} onChange={e=>setForm({...form,telefono_destino:e.target.value})} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Expediente relacionado<input className={inputClass+" mt-1.5"} value={form.expediente_id} onChange={e=>setForm({...form,expediente_id:e.target.value})} placeholder="Opcional" /></label>
        </div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Servicio<select className={inputClass+" mt-1.5"} value={form.servicio_id} onChange={e=>setForm({...form,servicio_id:e.target.value})}><option value="">Sin especificar</option>{servicios.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Instrucciones<textarea className={inputClass+" mt-1.5"} rows="3" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Contenido, horario, indicaciones de recogida o entrega…" /></label>
        <button disabled={guardando} className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{guardando?"Enviando…":"Enviar solicitud"}</button>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-800">Mis solicitudes</h2><p className="mt-1 text-sm text-slate-500">Solo aparecen las solicitudes vinculadas a tu usuario.</p></div>
        {cargando ? <p className="p-5 text-sm text-slate-500">Cargando solicitudes…</p> : !solicitudes.length ? <p className="p-8 text-center text-sm text-slate-500">Todavía no has realizado solicitudes de mensajería.</p> : <div className="divide-y divide-slate-100">{solicitudes.map(s=><button key={s.id} onClick={()=>abrirSeguimiento(s)} className="block w-full p-5 text-left transition hover:bg-slate-50"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-blue-700">{s.referencia}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estadoColor(s.estado)}`}>{s.estado}</span></div><p className="mt-2 text-sm font-semibold text-slate-800">{s.origen} → {s.destino}</p><p className="mt-1 text-xs text-slate-500">Fecha solicitada: {s.fecha_solicitada||"Sin fecha"} · Prioridad: {s.prioridad}</p><p className="mt-2 text-xs font-semibold text-blue-700">Ver estado y comunicación →</p></button>)}</div>}
      </section>
    </section>
    {seleccionada && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true"><section className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Seguimiento de solicitud</p><h2 className="mt-1 text-xl font-bold text-slate-800">{seleccionada.referencia}</h2><p className="mt-1 text-sm text-slate-500">{seleccionada.origen} → {seleccionada.destino}</p></div><button onClick={()=>setSeleccionada(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Cerrar</button></div><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><b>Estado:</b> <span className={`ml-2 rounded-full px-2.5 py-1 text-xs font-bold ${estadoColor(seleccionada.estado)}`}>{seleccionada.estado}</span><p className="mt-3"><b>Seguimiento del proveedor:</b> {seleccionada.estado_proveedor||"Todavía sin actualización"}</p>{seleccionada.incidencia&&<p className="mt-2 text-rose-700"><b>Incidencia:</b> {seleccionada.incidencia}</p>}<p className="mt-2"><b>Instrucciones:</b> {seleccionada.descripcion||"—"}</p></div><h3 className="mt-5 font-bold text-slate-800">Comunicación con Mensajería Gestión</h3><div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{comunicaciones.map(m=><div key={m.id} className={`rounded-xl border p-3 ${m.autor_tipo==="empleado"?"border-blue-100 bg-blue-50":"border-slate-200 bg-white"}`}><div className="flex justify-between gap-2 text-xs"><b>{m.autor_nombre}</b><span className="text-slate-500">{m.creado_en?new Date(m.creado_en).toLocaleString("es-ES"):""}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.mensaje}</p></div>)}{!comunicaciones.length&&<p className="text-sm text-slate-500">Todavía no hay mensajes. Puedes escribir a la responsable debajo.</p>}</div><form onSubmit={enviarMensaje} className="mt-3 space-y-2"><textarea className={inputClass} rows="3" value={mensajeChat} onChange={e=>setMensajeChat(e.target.value)} placeholder="Escribe una consulta o aporta información adicional…" required/><button disabled={guardando||!mensajeChat.trim()} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Enviar mensaje</button></form></section></div>}
  </main>;
}

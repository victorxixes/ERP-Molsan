import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import "../../css/HerramientasPremium.css";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const estadoColor = (estado) => estado === "Entregada" ? "bg-emerald-50 text-emerald-700" : estado === "Incidencia" ? "bg-rose-50 text-rose-700" : estado === "Cancelada" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700";
const nuevaUbicacion = () => ({ tipo: "Otros", busqueda: "", referencia_id: "", direccion: "", codigo_postal: "", poblacion: "", provincia: "", mapa: "" });
const textoDireccion = (u) => [u.direccion, u.codigo_postal, u.poblacion, u.provincia].filter(Boolean).join(", ");
const urlMapa = (u) => {
  const destino = textoDireccion(u);
  return destino ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}` : "";
};

function SelectorUbicacion({ titulo, valor, onChange, notarias, registros, municipios }) {
  const [busqueda, setBusqueda] = useState("");
  const opciones = valor.tipo === "Notaria" ? notarias : valor.tipo === "Registro" ? registros : [];
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase("es");
    if (!q) return opciones.slice(0, 80);
    return opciones.filter((item) => {
      const nombre = valor.tipo === "Notaria"
        ? [item.nombre_completo, item.nombre, item.apellidos, item.nif, item.codigo, item.municipio].filter(Boolean).join(" ")
        : [item.registro_propiedad, item.nombre_registrador, item.poblacion, item.provincia].filter(Boolean).join(" ");
      return nombre.toLocaleLowerCase("es").includes(q);
    }).slice(0, 80);
  }, [opciones, busqueda, valor.tipo]);

  const cambiar = (campo, dato) => onChange({ ...valor, [campo]: dato });
  const elegir = (item) => {
    if (!item) return;
    const siguiente = valor.tipo === "Notaria"
      ? { ...valor, referencia_id: String(item.id), busqueda: [item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(" "), item.nif ? `NIF ${item.nif}` : ""].filter(Boolean).join(" · "), direccion: item.direccion || "", codigo_postal: item.cp || item.codigo_postal || "", poblacion: item.municipio || item.poblacion || "", provincia: item.provincia || "" }
      : { ...valor, referencia_id: String(item.id), busqueda: item.registro_propiedad || "", direccion: item.direccion || "", codigo_postal: item.codigo_postal || "", poblacion: item.poblacion || "", provincia: item.provincia || "" };
    onChange(siguiente);
    setBusqueda("");
  };
  const municipiosFiltrados = useMemo(() => {
    const q = valor.poblacion.trim().toLocaleLowerCase("es");
    if (!q) return [];
    return municipios.filter((m) => m.municipio.toLocaleLowerCase("es").includes(q)).slice(0, 10);
  }, [municipios, valor.poblacion]);

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-extrabold text-slate-800">{titulo}</h3>
      {urlMapa(valor) && <a href={urlMapa(valor)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">⌖ Ver en Google Maps ↗</a>}
    </div>
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de ubicación
      <select className={inputClass + " mt-1.5"} value={valor.tipo} onChange={(e) => { setBusqueda(""); onChange({ ...nuevaUbicacion(), tipo: e.target.value }); }}>
        <option>Notaria</option><option>Registro</option><option>Otros</option>
      </select>
    </label>
    {valor.tipo !== "Otros" && <>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">{valor.tipo === "Notaria" ? "Buscar notario / notaría (CTN)" : "Buscar Registro de la Propiedad"}
        <input className={inputClass + " mt-1.5"} value={busqueda || valor.busqueda} onChange={(e) => { setBusqueda(e.target.value); cambiar("busqueda", e.target.value); cambiar("referencia_id", ""); }} placeholder={valor.tipo === "Notaria" ? "Nombre, apellidos, NIF, código o población…" : "Nombre del registro, registrador o población…"} />
      </label>
      {busqueda && <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">{filtradas.map((item) => <button type="button" key={item.id} onClick={() => elegir(item)} className="block w-full border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-blue-50"><span className="block font-semibold text-slate-800">{valor.tipo === "Notaria" ? (item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(" ")) : item.registro_propiedad}</span><span className="block text-xs text-slate-500">{[item.direccion, item.cp || item.codigo_postal, item.municipio || item.poblacion, item.provincia].filter(Boolean).join(" · ") || "Sin dirección en el catálogo"}</span></button>)}{!filtradas.length && <p className="p-3 text-sm text-slate-500">No hay coincidencias en el catálogo.</p>}</div>}
      {valor.referencia_id && <p className="text-xs font-semibold text-emerald-700">✓ Datos cargados desde el catálogo. Puedes revisar la dirección.</p>}
    </>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">Dirección
        <input className={inputClass + " mt-1.5"} value={valor.direccion} onChange={(e) => cambiar("direccion", e.target.value)} placeholder="Calle, número, planta…" />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Código postal
        <input className={inputClass + " mt-1.5"} value={valor.codigo_postal} onChange={(e) => cambiar("codigo_postal", e.target.value)} />
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Población
        <input className={inputClass + " mt-1.5"} value={valor.poblacion} onChange={(e) => cambiar("poblacion", e.target.value)} list={`municipios-${titulo.replace(/[^a-z]/gi, "").toLowerCase()}`} placeholder="Busca un municipio…" />
        <datalist id={`municipios-${titulo.replace(/[^a-z]/gi, "").toLowerCase()}`}>{municipiosFiltrados.map((m) => <option key={m.id} value={m.municipio}>{m.provincia}</option>)}</datalist>
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Provincia
        <input className={inputClass + " mt-1.5"} value={valor.provincia} onChange={(e) => cambiar("provincia", e.target.value)} />
      </label>
    </div>
    {valor.tipo === "Otros" && <p className="text-xs text-slate-500">Introduce dirección, CP y provincia manualmente. La población se puede elegir del catálogo de municipios.</p>}
  </section>;
}

export default function MensajeriaSolicitudes() {
  const empleado = useAuthStore((s) => s.empleado);
  const [solicitudes, setSolicitudes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [notarias, setNotarias] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [origen, setOrigen] = useState(nuevaUbicacion);
  const [destino, setDestino] = useState(nuevaUbicacion);
  const [seleccionada, setSeleccionada] = useState(null);
  const [comunicaciones, setComunicaciones] = useState([]);
  const [mensajeChat, setMensajeChat] = useState("");
  const [form, setForm] = useState({ fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_destino: "", servicio_id: "" });
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

  useEffect(() => {
    let activo = true;
    Promise.allSettled([
      axios.get("/ctn/notarias", { params: { page: 1, page_size: 200 } }),
      axios.get("/registros-propiedad"),
      axios.get("/municipios"),
    ]).then(([n, r, m]) => {
      if (!activo) return;
      if (n.status === "fulfilled") setNotarias(n.value.data?.items || (Array.isArray(n.value.data) ? n.value.data : []));
      if (r.status === "fulfilled") setRegistros(Array.isArray(r.value.data) ? r.value.data.filter((x) => x.activo !== false) : []);
      if (m.status === "fulfilled") setMunicipios(Array.isArray(m.value.data) ? m.value.data.filter((x) => x.activo !== false) : []);
    });
    return () => { activo = false; };
  }, []);

  const abrirSeguimiento = async (item) => {
    setSeleccionada(item); setMensajeChat("");
    try { const r = await axios.get(`/mensajeria/solicitudes/${item.id}/comunicaciones`); setComunicaciones(r.data || []); }
    catch { setComunicaciones([]); }
  };

  const crearSolicitud = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setAviso("");
    if (!textoDireccion(origen) || !textoDireccion(destino)) {
      setError("Completa al menos la dirección o la población del origen y del destino.");
      setGuardando(false); return;
    }
    try {
      const payload = {
        ...form,
        origen: `[${origen.tipo}] ${origen.busqueda ? origen.busqueda + " — " : ""}${textoDireccion(origen)}`,
        destino: `[${destino.tipo}] ${destino.busqueda ? destino.busqueda + " — " : ""}${textoDireccion(destino)}`,
        solicitante_nombre: [empleado?.nombre, empleado?.apellidos].filter(Boolean).join(" ") || "Empleado",
        solicitante_id: empleado?.id ?? null,
        servicio_id: form.servicio_id ? Number(form.servicio_id) : null,
      };
      await axios.post("/mensajeria/mis-solicitudes", payload);
      setForm({ fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_destino: "", servicio_id: "" });
      setOrigen(nuevaUbicacion()); setDestino(nuevaUbicacion());
      setAviso("Encargo creado y enviado a Mensajería Gestión.");
      await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo enviar la solicitud."); }
    finally { setGuardando(false); }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault(); if (!seleccionada || !mensajeChat.trim()) return;
    setGuardando(true); setError("");
    try {
      const r = await axios.post(`/mensajeria/solicitudes/${seleccionada.id}/comunicaciones`, { mensaje: mensajeChat.trim() });
      setComunicaciones((old) => [...old, r.data]); setMensajeChat(""); setAviso("Mensaje enviado a Mensajería Gestión.");
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
        <div><h2 className="text-lg font-bold text-slate-800">Nuevo encargo de mensajería</h2><p className="mt-1 text-sm text-slate-500">Selecciona el origen y el destino. Las ubicaciones de notaría y registro se completan desde sus catálogos.</p></div>
        <SelectorUbicacion titulo="Origen / recogida" valor={origen} onChange={setOrigen} notarias={notarias} registros={registros} municipios={municipios} />
        <SelectorUbicacion titulo="Destino / entrega" valor={destino} onChange={setDestino} notarias={notarias} registros={registros} municipios={municipios} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Fecha deseada<input className={inputClass + " mt-1.5"} type="date" value={form.fecha_solicitada} onChange={(e) => setForm({ ...form, fecha_solicitada: e.target.value })} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Prioridad<select className={inputClass + " mt-1.5"} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}><option>Normal</option><option>Alta</option></select></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Contacto de origen<input className={inputClass + " mt-1.5"} value={form.contacto_origen} onChange={(e) => setForm({ ...form, contacto_origen: e.target.value })} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Contacto de destino<input className={inputClass + " mt-1.5"} value={form.contacto_destino} onChange={(e) => setForm({ ...form, contacto_destino: e.target.value })} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Teléfono de destino<input className={inputClass + " mt-1.5"} value={form.telefono_destino} onChange={(e) => setForm({ ...form, telefono_destino: e.target.value })} /></label>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Expediente relacionado<input className={inputClass + " mt-1.5"} value={form.expediente_id} onChange={(e) => setForm({ ...form, expediente_id: e.target.value })} placeholder="Opcional" /></label>
        </div>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Servicio<select className={inputClass + " mt-1.5"} value={form.servicio_id} onChange={(e) => setForm({ ...form, servicio_id: e.target.value })}><option value="">Sin especificar</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Instrucciones<textarea className={inputClass + " mt-1.5"} rows="3" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Contenido, horario, indicaciones de recogida o entrega…" /></label>
        <button disabled={guardando} className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Creando encargo…" : "Crear encargo"}</button>
      </form>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-bold text-slate-800">Mis encargos</h2><p className="mt-1 text-sm text-slate-500">Cada encargo recibe una referencia única automáticamente.</p></div>
        {cargando ? <p className="p-5 text-sm text-slate-500">Cargando encargos…</p> : !solicitudes.length ? <p className="p-8 text-center text-sm text-slate-500">Todavía no has creado encargos de mensajería.</p> : <div className="divide-y divide-slate-100">{solicitudes.map((s) => <button key={s.id} onClick={() => abrirSeguimiento(s)} className="block w-full p-5 text-left transition hover:bg-slate-50"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-blue-700">{s.referencia}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estadoColor(s.estado)}`}>{s.estado}</span></div><p className="mt-2 text-sm font-semibold text-slate-800">{s.origen} → {s.destino}</p><p className="mt-1 text-xs text-slate-500">Fecha solicitada: {s.fecha_solicitada || "Sin fecha"} · Prioridad: {s.prioridad}</p><p className="mt-2 text-xs font-semibold text-blue-700">Ver estado y comunicación →</p></button>)}</div>}
      </section>
    </section>
    {seleccionada && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true"><section className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Seguimiento del encargo</p><h2 className="mt-1 text-xl font-bold text-slate-800">{seleccionada.referencia}</h2><p className="mt-1 text-sm text-slate-500">{seleccionada.origen} → {seleccionada.destino}</p></div><button onClick={() => setSeleccionada(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Cerrar</button></div><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><b>Estado:</b> <span className={`ml-2 rounded-full px-2.5 py-1 text-xs font-bold ${estadoColor(seleccionada.estado)}`}>{seleccionada.estado}</span><p className="mt-3"><b>Seguimiento del proveedor:</b> {seleccionada.estado_proveedor || "Todavía sin actualización"}</p>{seleccionada.incidencia && <p className="mt-2 text-rose-700"><b>Incidencia:</b> {seleccionada.incidencia}</p>}<p className="mt-2"><b>Instrucciones:</b> {seleccionada.descripcion || "—"}</p></div><h3 className="mt-5 font-bold text-slate-800">Comunicación con Mensajería Gestión</h3><div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{comunicaciones.map((m) => <div key={m.id} className={`rounded-xl border p-3 ${m.autor_tipo === "empleado" ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex justify-between gap-2 text-xs"><b>{m.autor_nombre}</b><span className="text-slate-500">{m.creado_en ? new Date(m.creado_en).toLocaleString("es-ES") : ""}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.mensaje}</p></div>)}{!comunicaciones.length && <p className="text-sm text-slate-500">Todavía no hay mensajes. Puedes escribir a la responsable debajo.</p>}</div><form onSubmit={enviarMensaje} className="mt-3 space-y-2"><textarea className={inputClass} rows="3" value={mensajeChat} onChange={(e) => setMensajeChat(e.target.value)} placeholder="Escribe una consulta o aporta información adicional…" required /><button disabled={guardando || !mensajeChat.trim()} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Enviar mensaje</button></form></section></div>}
  </main>;
}

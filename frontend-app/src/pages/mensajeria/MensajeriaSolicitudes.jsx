import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "../../api/axios";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import { listarNotarios } from "../../api/notarios";
import { useAuthStore } from "../../store/authStore";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

const inputClass = "w-full px-3 py-2.5 ";
const nuevaUbicacion = () => ({ tipo: "Otros", busqueda: "", referencia_id: "", direccion: "", codigo_postal: "", poblacion: "", provincia: "", contacto: "", telefono: "", mapa: "" });
const textoDireccion = (u) => [u.direccion, u.codigo_postal, u.poblacion, u.provincia].filter(Boolean).join(", ");
const mensajeError = (error, fallback) => {
  const detalle = error?.response?.data?.detail;
  if (typeof detalle === "string") return detalle;
  if (Array.isArray(detalle)) {
    return detalle.map((item) => {
      const campo = Array.isArray(item?.loc) ? item.loc.filter((x) => x !== "body").join(" · ") : "";
      const mensaje = item?.msg || item?.message || "Dato no válido";
      return campo ? `${campo}: ${mensaje}` : mensaje;
    }).join(" | ");
  }
  if (detalle && typeof detalle === "object") {
    return detalle.msg || detalle.message || fallback;
  }
  return fallback;
};

const urlMapa = (u) => {
  const destino = textoDireccion(u);
  return destino ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}` : "";
};
const desglosarUbicacion = (valor) => {
  const texto = String(valor || "").trim();
  const coincidencia = texto.match(/^\[([^\]]+)\]\s*(.*)$/);
  const contenido = coincidencia?.[2] || texto || "Ubicación pendiente";
  const partes = contenido.split(" — ");
  return {
    tipo: coincidencia?.[1] || "Ubicación",
    nombre: partes.length > 1 ? partes.slice(0, -1).join(" — ") : "",
    direccion: partes.length > 1 ? partes[partes.length - 1] : contenido,
  };
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
  const telefonoCatalogo = (item) => item.telefono || item.telefono_contacto || item.telefono_fijo || item.telefono_oficina || item.telefono_notaria || item.telefono_registro || item.telefono1 || item.telefono_1 || "";
  const elegir = (item) => {
    if (!item) return;
    const siguiente = valor.tipo === "Notaria"
      ? { ...valor, referencia_id: String(item.id), busqueda: [item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(" "), item.nif ? `NIF ${item.nif}` : ""].filter(Boolean).join(" · "), direccion: item.direccion || "", codigo_postal: item.cp || item.codigo_postal || "", poblacion: item.municipio || item.poblacion || "", provincia: item.provincia || "", contacto: (item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(" ") || item.nombre_registrador || item.registrador || item.registro_propiedad || ""), telefono: telefonoCatalogo(item) }
      : { ...valor, referencia_id: String(item.id), busqueda: item.registro_propiedad || "", direccion: item.direccion || "", codigo_postal: item.codigo_postal || "", poblacion: item.poblacion || "", provincia: item.provincia || "", contacto: (item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(" ") || item.nombre_registrador || item.registrador || ""), telefono: telefonoCatalogo(item) };
    onChange(siguiente);
    setBusqueda("");
  };
  const municipiosFiltrados = useMemo(() => {
    const q = valor.poblacion.trim().toLocaleLowerCase("es");
    if (!q) return [];
    return municipios.filter((m) => m.municipio.toLocaleLowerCase("es").includes(q)).slice(0, 10);
  }, [municipios, valor.poblacion]);

  return <section className="molsan-form-section space-y-3 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3>{titulo}</h3>
      {urlMapa(valor) && <a href={urlMapa(valor)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5">⌖ Abrir mapa ↗</a>}
    </div>
    <label className="block uppercase">Tipo de ubicación
      <select className={inputClass + "mt-1.5"} value={valor.tipo} onChange={(e) => { setBusqueda(""); onChange({ ...nuevaUbicacion(), tipo: e.target.value }); }}>
        <option>Notaria</option><option>Registro</option><option>Otros</option>
      </select>
    </label>
    {valor.tipo !== "Otros" && <>
      <label className="block uppercase">{valor.tipo === "Notaria" ? "Buscar notario / notaría (CTN)" : "Buscar Registro de la Propiedad"}
        <input className={inputClass + "mt-1.5"} value={busqueda || valor.busqueda} onChange={(e) => { const texto = e.target.value; setBusqueda(texto); onChange({ ...valor, busqueda: texto, referencia_id: "" }); }} placeholder={valor.tipo === "Notaria" ? "Nombre, apellidos, NIF, código o población…" : "Nombre del registro, registrador o población…"} />
      </label>
      {busqueda && <div className="max-h-44 overflow-y-auto">{filtradas.map((item) => <button type="button" key={item.id} onClick={() => elegir(item)} className="block w-full px-3 py-2.5"><span className="block">{valor.tipo === "Notaria" ? (item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(" ")) : item.registro_propiedad}</span><span className="block">{[item.direccion, item.cp || item.codigo_postal, item.municipio || item.poblacion, item.provincia].filter(Boolean).join(" · ") || "Sin dirección en el catálogo"}</span></button>)}{!filtradas.length && <p className="p-3">No hay coincidencias en el catálogo.</p>}</div>}
      {valor.referencia_id && <p>✓ Datos cargados desde el catálogo. Puedes revisar la dirección.</p>}
    </>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block uppercase sm:col-span-2">Dirección
        <input className={inputClass + "mt-1.5"} value={valor.direccion} onChange={(e) => cambiar("direccion", e.target.value)} placeholder="Calle, número, planta…" />
      </label>
      <label className="block uppercase">Código postal
        <input className={inputClass + "mt-1.5"} value={valor.codigo_postal} onChange={(e) => cambiar("codigo_postal", e.target.value)} />
      </label>
      <label className="block uppercase">Población
        <input className={inputClass + "mt-1.5"} value={valor.poblacion} onChange={(e) => { const poblacion = e.target.value; const coincidencias = municipios.filter((m) => m.municipio.toLocaleLowerCase("es") === poblacion.trim().toLocaleLowerCase("es")); onChange({ ...valor, poblacion, ...(valor.tipo === "Otros" && coincidencias.length === 1 ? { provincia: coincidencias[0].provincia } : {}) }); }} list={`municipios-${titulo.replace(/[^a-z]/gi, "").toLowerCase()}`} placeholder="Busca un municipio…" />
        <datalist id={`municipios-${titulo.replace(/[^a-z]/gi, "").toLowerCase()}`}>{municipiosFiltrados.map((m) => <option key={m.id} value={m.municipio}>{m.provincia}</option>)}</datalist>
      </label>
      <label className="block uppercase">Provincia
        <input className={inputClass + "mt-1.5"} value={valor.provincia} onChange={(e) => cambiar("provincia", e.target.value)} />
      </label>
      <label className="block uppercase">Contacto de {titulo.toLowerCase()}
        <input className={inputClass + "mt-1.5"} value={valor.contacto} onChange={(e) => cambiar("contacto", e.target.value)} placeholder="Persona de contacto" />
      </label>
      <label className="block uppercase">Teléfono de {titulo.toLowerCase()}
        <input className={inputClass + "mt-1.5"} value={valor.telefono} onChange={(e) => cambiar("telefono", e.target.value)} placeholder="Teléfono de contacto" />
      </label>
    </div>
    {urlMapa(valor) && <iframe title={`Mapa de ${titulo}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(textoDireccion(valor))}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-44 w-full" />}
    {valor.tipo === "Otros" && <p>Introduce dirección, CP y provincia manualmente. La población se puede elegir del catálogo de municipios.</p>}
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
  const dialogRef = useRef(null);

  const [comunicaciones, setComunicaciones] = useState([]);
  const [mensajeChat, setMensajeChat] = useState("");
  const [form, setForm] = useState({ fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_recogida: "", telefono_entrega: "", telefono_destino: "", servicio_id: "" });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const cerrarSeguimiento = () => { if (!guardando) setSeleccionada(null); };
  useAccessibleDialog({ open: Boolean(seleccionada), onClose: cerrarSeguimiento, dialogRef });
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [s, c] = await Promise.all([axios.get("/mensajeria/mis-solicitudes"), axios.get("/mensajeria/servicios")]);
      setSolicitudes(s.data || []);
      setServicios((c.data || []).filter((item) => item.activo));
    } catch (e) { setError(mensajeError(e, "No se pudieron cargar tus solicitudes.")); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    let activo = true;
    Promise.allSettled([
      listarNotarios(),
      axios.get("/registros-propiedad"),
      axios.get("/municipios"),
    ]).then(([n, r, m]) => {
      if (!activo) return;
      if (n.status === "fulfilled") setNotarias(Array.isArray(n.value.data) ? n.value.data : (n.value.data?.items || []));
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
        contacto_origen: origen.contacto || null,
        contacto_destino: destino.contacto || null,
        telefono_recogida: origen.telefono || null,
        telefono_entrega: destino.telefono || null,
        // Pydantic espera una fecha ISO o null; la cadena vacía provoca HTTP 422.
        fecha_solicitada: form.fecha_solicitada || null,
        origen: `[${origen.tipo}] ${origen.busqueda ? origen.busqueda + " — " : ""}${textoDireccion(origen)}`,
        destino: `[${destino.tipo}] ${destino.busqueda ? destino.busqueda + " — " : ""}${textoDireccion(destino)}`,
        solicitante_nombre: [empleado?.nombre, empleado?.apellidos].filter(Boolean).join(" ") || "Empleado",
        solicitante_id: empleado?.id ?? null,
        servicio_id: form.servicio_id ? Number(form.servicio_id) : null,
      };
      await axios.post("/mensajeria/mis-solicitudes", payload);
      setForm({ fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_recogida: "", telefono_entrega: "", telefono_destino: "", servicio_id: "" });
      setOrigen(nuevaUbicacion()); setDestino(nuevaUbicacion());
      setAviso("Encargo creado y enviado a Mensajería Gestión.");
      await cargar();
    } catch (e) { setError(mensajeError(e, "No se pudo enviar la solicitud.")); }
    finally { setGuardando(false); }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault(); if (!seleccionada || !mensajeChat.trim()) return;
    setGuardando(true); setError("");
    try {
      const r = await axios.post(`/mensajeria/solicitudes/${seleccionada.id}/comunicaciones`, { mensaje: mensajeChat.trim() });
      setComunicaciones((old) => [...old, r.data]); setMensajeChat(""); setAviso("Mensaje enviado a Mensajería Gestión.");
    } catch (e) { setError(mensajeError(e, "No se pudo enviar el mensaje.")); }
    finally { setGuardando(false); }
  };

  return <div className="erp-page w-full min-w-0 space-y-5">
    <MolsanPageHeader mark="ME" title="Mensajería" description="Solicita envíos y recogidas, consulta el estado de tus encargos y mantén la comunicación con la responsable." />
    {error && <div role="alert" className="p-3">{error}</div>}
    {aviso && <div role="status" className="p-3">{aviso}</div>}
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form onSubmit={crearSolicitud} className="erp-card molsan-form space-y-4 p-5">
        <div><h2>Nuevo encargo de mensajería</h2><p className="mt-1">Selecciona el origen y el destino. Las ubicaciones de notaría y registro se completan desde sus catálogos.</p></div>
        <SelectorUbicacion titulo="Origen / recogida" valor={origen} onChange={setOrigen} notarias={notarias} registros={registros} municipios={municipios} />
        <SelectorUbicacion titulo="Destino / entrega" valor={destino} onChange={setDestino} notarias={notarias} registros={registros} municipios={municipios} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block uppercase">Fecha deseada<input className={inputClass + "mt-1.5"} type="date" value={form.fecha_solicitada} onChange={(e) => setForm({ ...form, fecha_solicitada: e.target.value })} /></label>
          <label className="block uppercase">Prioridad<select className={inputClass + "mt-1.5"} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}><option>Normal</option><option>Alta</option></select></label>
          <label className="block uppercase">Expediente relacionado<input className={inputClass + "mt-1.5"} value={form.expediente_id} onChange={(e) => setForm({ ...form, expediente_id: e.target.value })} placeholder="Opcional" /></label>
        </div>
        <label className="block uppercase">Servicio<select className={inputClass + "mt-1.5"} value={form.servicio_id} onChange={(e) => setForm({ ...form, servicio_id: e.target.value })}><option value="">Sin especificar</option>{servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
        <label className="block uppercase">Instrucciones<textarea className={inputClass + "mt-1.5"} rows="3" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Contenido, horario, indicaciones de recogida o entrega…" /></label>
        <button type="submit" disabled={guardando} className="molsan-btn molsan-btn--primary w-full px-5 py-3">{guardando ? "Creando encargo…" : "Crear encargo"}</button>
      </form>
      <section className="erp-card overflow-hidden">
        <div className="p-5"><h2>Mis encargos</h2><p className="mt-1">El sistema genera automáticamente un ID único para cada encargo.</p></div>
        {cargando ? <p className="p-5">Cargando encargos…</p> : !solicitudes.length ? <p className="p-8">Todavía no has creado encargos de mensajería.</p> : <div>{solicitudes.map((s) => {
          const origenFicha = desglosarUbicacion(s.origen);
          const destinoFicha = desglosarUbicacion(s.destino);
          return <button type="button" key={s.id} onClick={() => abrirSeguimiento(s)} className="molsan-request-card group block w-full p-4 sm:p-5">
            <div className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="uppercase">Encargo de mensajería</p><h3 className="mt-1">{s.referencia || `Encargo #${s.id}`}</h3></div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 `}><span className="h-1.5 w-1.5" />{s.estado || "Pendiente"}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="molsan-panel p-3.5">
                  <p className="uppercase">Origen · Recogida</p>
                  <p className="mt-1.5">{origenFicha.nombre || origenFicha.tipo}</p>
                  {origenFicha.nombre && <p className="mt-1">{origenFicha.tipo}</p>}
                  <p className="mt-2">{origenFicha.direccion}</p>
                </div>
                <div className="p-3.5">
                  <p className="uppercase">Destino · Entrega</p>
                  <p className="mt-1.5">{destinoFicha.nombre || destinoFicha.tipo}</p>
                  {destinoFicha.nombre && <p className="mt-1">{destinoFicha.tipo}</p>}
                  <p className="mt-2">{destinoFicha.direccion}</p>
                </div>
              </div>
              <div className="molsan-panel mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5">
                <span><span>Fecha solicitada:</span> {s.fecha_solicitada ? new Date(s.fecha_solicitada).toLocaleDateString("es-ES") : "Sin fecha"}</span>
                <span><span>Prioridad:</span> {s.prioridad || "Normal"}</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span>Ver estado y comunicación</span><span className="flex h-8 w-8 items-center justify-center">→</span>
              </div>
            </div>
          </button>;
        })}</div>}
      </section>
    </section>
    {seleccionada && <div className="molsan-modal-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4" role="presentation"><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Seguimiento del encargo" className="molsan-modal__panel my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7"><div className="molsan-modal__header flex items-start justify-between gap-3"><div><p className="uppercase">Seguimiento del encargo</p><h2 className="mt-1">ID encargo: {seleccionada.referencia}</h2><p className="mt-1">{seleccionada.origen} → {seleccionada.destino}</p></div><button type="button" onClick={cerrarSeguimiento} disabled={guardando} className="molsan-btn molsan-btn--secondary px-3 py-1.5">Cerrar</button></div><div className="molsan-modal__body mt-4 p-4"><b>Estado:</b> <span className={`ml-2 px-2.5 py-1 `}>{seleccionada.estado}</span><p className="mt-3"><b>Seguimiento del proveedor:</b> {seleccionada.estado_proveedor || "Todavía sin actualización"}</p>{seleccionada.incidencia && <p className="mt-2"><b>Incidencia:</b> {seleccionada.incidencia}</p>}<p className="mt-2"><b>Instrucciones:</b> {seleccionada.descripcion || "—"}</p></div><h3 className="mt-5">Comunicación con Mensajería Gestión</h3><div className="mt-3 max-h-56 space-y-2 overflow-y-auto p-3">{comunicaciones.map((m) => <div key={m.id} className={`p-3 ${m.autor_tipo === "empleado" ? "" : ""}`}><div className="flex justify-between gap-2"><b>{m.autor_nombre}</b><span>{m.creado_en ? new Date(m.creado_en).toLocaleString("es-ES") : ""}</span></div><p className="mt-1 whitespace-pre-wrap">{m.mensaje}</p></div>)}{!comunicaciones.length && <p>Todavía no hay mensajes. Puedes escribir a la responsable debajo.</p>}</div><form onSubmit={enviarMensaje} className="molsan-form mt-3 space-y-2"><textarea className={inputClass} rows="3" value={mensajeChat} onChange={(e) => setMensajeChat(e.target.value)} placeholder="Escribe una consulta o aporta información adicional…" required /><button type="submit" disabled={guardando || !mensajeChat.trim()} className="molsan-btn molsan-btn--primary px-4 py-2.5">Enviar mensaje</button></form></section></div>}
  </div>;
}

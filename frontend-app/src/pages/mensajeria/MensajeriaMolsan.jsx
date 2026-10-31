import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";
import useAccessibleDialog from "../../components/ui/useAccessibleDialog";
import { useAuthStore } from "../../store/authStore";
import MensajeriaProveedores from "./MensajeriaProveedores.jsx";

const TABS = [
  ["solicitudes", "Solicitudes"],
  ["control", "Control de servicios"],
  ["albaranes", "Albaranes"],
  ["facturas", "Facturas"],
];
const inputClass = "w-full px-3 py-2.5 ";
const labelClass = "block uppercase";
const initialSolicitud = { solicitante_nombre: "", origen: "", destino: "", fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_recogida: "", telefono_entrega: "", telefono_destino: "", servicio_id: "", responsable: "", estado: "Pendiente", estado_proveedor: "", incidencia: "", coste_previsto: "" };
const initialServicio = { codigo: "", nombre: "", descripcion: "", modalidad: "", tarifa_base: "", suplemento: "0", tipo_impuesto: "", porcentaje_impuesto: "", codigo_proveedor: "", condiciones: "", vigente_desde: "", vigente_hasta: "", activo: true };
const initialAlbaran = { numero_interno: "", numero_proveedor: "", proveedor: "", fecha: "", solicitud_id: "", servicio_id: "", importe: "", entregado: false, fecha_entrega: "", observaciones: "", documento_url: "" };
const initialFactura = { proveedor: "", numero: "", fecha_emision: "", fecha_vencimiento: "", base_imponible: "", tipo_impuesto: "", importe_impuesto: "", total: "", estado_revision: "Pendiente de revisión", estado_pago: "Pendiente de pago", fecha_pago: "", observaciones: "", documento_url: "", albaran_ids: [] };
const clean = (obj) => Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, v === "" ? null : v]));
const money = (v) => v == null || v === "" ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v));

export default function MensajeriaMolsan({ vistaCatalogo = false, vistaGestion = false }) {
  const empleado = useAuthStore((s) => s.empleado);
  const [tab, setTab] = useState(vistaCatalogo ? "control" : "solicitudes");
  const [solicitudes, setSolicitudes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [albaranes, setAlbaranes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [resumen, setResumen] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modal, setModal] = useState("");
  const dialogRef = useRef(null);

  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const cerrarModal = () => { if (!guardando) setModal(""); };
  useAccessibleDialog({ open: Boolean(modal), onClose: cerrarModal, dialogRef });
  const [comunicaciones, setComunicaciones] = useState([]);
  const [mensajeChat, setMensajeChat] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [s,c,a,f,r] = await Promise.all([
        axios.get("/mensajeria/solicitudes"), axios.get("/mensajeria/servicios"),
        axios.get("/mensajeria/albaranes"), axios.get("/mensajeria/facturas"), axios.get("/mensajeria/resumen")
      ]);
      setSolicitudes(s.data || []); setServicios(c.data || []); setAlbaranes(a.data || []); setFacturas(f.data || []); setResumen(r.data || {});
    } catch (e) { setError(e?.response?.data?.detail || "No se han podido cargar los datos de mensajería."); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (modal === "solicitud" && editing) {
      axios.get(`/mensajeria/solicitudes/${editing}/comunicaciones`).then((r) => setComunicaciones(r.data || [])).catch(() => setComunicaciones([]));
    } else { setComunicaciones([]); setMensajeChat(""); }
  }, [modal, editing]);

  const enviarComunicacion = async (e) => {
    e.preventDefault(); if (!editing || !mensajeChat.trim()) return;
    setGuardando(true); setError("");
    try { const r = await axios.post(`/mensajeria/solicitudes/${editing}/comunicaciones`, { mensaje: mensajeChat.trim() }); setComunicaciones((old) => [...old, r.data]); setMensajeChat(""); setMensaje("Mensaje enviado."); }
    catch (e) { setError(e?.response?.data?.detail || "No se pudo enviar el mensaje."); }
    finally { setGuardando(false); }
  };

  const lista = useMemo(() => {
    const src = tab === "solicitudes" || tab === "control" ? solicitudes : tab === "albaranes" ? albaranes : facturas;
    const query = q.trim().toLowerCase();
    return src.filter((item) => !query || Object.values(item).some((v) => String(v ?? "").toLowerCase().includes(query)));
  }, [tab, solicitudes, albaranes, facturas, q]);

  const abrir = (tipo, item = null) => {
    setEditing(item?.id ?? null);
    setModal(tipo);
    const base = tipo === "solicitud" ? initialSolicitud : tipo === "servicio" ? initialServicio : tipo === "albaran" ? initialAlbaran : initialFactura;
    setForm(item ? { ...base, ...item, telefono_entrega: item.telefono_entrega ?? item.telefono_destino ?? "", servicio_id: item.servicio_id ?? "", solicitud_id: item.solicitud_id ?? "", albaran_ids: item.albaran_ids || [], fecha_solicitada: item.fecha_solicitada || "", fecha: item.fecha || "", fecha_entrega: item.fecha_entrega || "", fecha_emision: item.fecha_emision || "", fecha_vencimiento: item.fecha_vencimiento || "", fecha_pago: item.fecha_pago || "" } : { ...base, ...(tipo === "solicitud" ? { solicitante_nombre: empleado ? [empleado.nombre, empleado.apellidos].filter(Boolean).join(" ") : "", solicitante_id: empleado?.id ?? null } : {}) });
  };
  const change = (k,v) => setForm((old) => ({ ...old, [k]: v }));
  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true); setError(""); setMensaje("");
    try {
      const type = modal;
      const endpoint = type === "solicitud" ? "solicitudes" : type === "servicio" ? "servicios" : type === "albaran" ? "albaranes" : "facturas";
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
      ["servicio_id","solicitud_id","solicitante_id"].forEach((k) => { if (payload[k] === "") payload[k] = null; else if (payload[k] != null) payload[k] = Number(payload[k]); });
      ["tarifa_base","suplemento","porcentaje_impuesto","coste_previsto","importe","base_imponible","importe_impuesto","total"].forEach((k) => { if (payload[k] === "") payload[k] = null; });
      const url = editing ? `/mensajeria/${endpoint}/${editing}` : `/mensajeria/${endpoint}`;
      if (editing) await axios.patch(url, payload); else await axios.post(url, payload);
      setModal(""); setMensaje(editing ? "Cambios guardados." : "Registro creado correctamente."); await cargar();
    } catch (e) { setError(e?.response?.data?.detail || "No se pudo guardar el registro."); }
    finally { setGuardando(false); }
  };
  const Field = ({ label, name, type = "text", required = false, placeholder = "", full = false, options = null }) => (
    <label className={`${labelClass} ${full ? "md:col-span-2" : ""}`}>
      {label}
      <div className="mt-1.5">
        {options ? (
          name === "albaran_ids" ? (
            <select multiple className={inputClass + "min-h-28"} value={Array.isArray(form[name]) ? form[name].map(String) : []} onChange={(e) => change(name, Array.from(e.target.selectedOptions, (o) => Number(o.value)))}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <select className={inputClass} value={form[name] ?? ""} onChange={(e) => change(name, e.target.value)} required={required}>
              <option value="">— Seleccionar —</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )
        ) : type === "textarea" ? (
          <textarea className={inputClass} rows="3" value={form[name] ?? ""} onChange={(e) => change(name, e.target.value)} placeholder={placeholder} />
        ) : (
          <input className={inputClass} type={type} value={form[name] ?? ""} onChange={(e) => change(name, e.target.value)} placeholder={placeholder} required={required} />
        )}
      </div>
    </label>
  );

  const modalTitle = { solicitud: editing ? "Editar solicitud" : "Nueva solicitud de mensajería", servicio: editing ? "Editar servicio y tarifa" : "Nuevo servicio y tarifa", albaran: editing ? "Editar albarán" : "Registrar albarán", factura: editing ? "Editar factura" : "Registrar factura de mensajería" }[modal];

  return <div className="erp-page w-full min-w-0 space-y-5">
    <MolsanPageHeader
      mark="ME"
      title={vistaCatalogo ? "Mensajería · Servicios y tarifas" : vistaGestion ? "Mensajería Gestión" : "Mensajería"}
      description={vistaCatalogo ? "Catálogo interno de servicios, tarifas, suplementos e impuestos." : "Gestiona las solicitudes recibidas, los pedidos al proveedor, las incidencias, los albaranes y las facturas."}
    />
    <div className="flex justify-end"><button type="button" onClick={cargar} className="molsan-btn molsan-btn--secondary px-4 py-2">↻ Actualizar</button></div>
    {vistaGestion && <section className="erp-card p-4"><div className="flex items-start gap-3"><span>⚠️</span><div><b>Integración API con la empresa de mensajería pendiente.</b><p className="mt-1">La conexión automática todavía debe desarrollarse y validarse con la documentación técnica del proveedor. Mientras tanto, la gestión de solicitudes, estados y comunicaciones funciona dentro del ERP; no se envían pedidos reales al transportista desde esta pantalla.</p></div></div></section>}
    {error && <div role="alert" className="p-3">{error}</div>}
    {mensaje && <div role="status" className="p-3">{mensaje}</div>}
    {vistaGestion && <MensajeriaProveedores />}
    {!vistaCatalogo && <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Solicitudes", resumen.solicitudes ?? "—"],["En curso", resumen.pendientes ?? "—"],["Albaranes", resumen.albaranes ?? "—"],["Facturas por pagar", resumen.facturas_pendientes ?? "—"]].map(([label,value]) => <div key={label} className="molsan-summary-card"><p className="uppercase">{label}</p><p className="mt-2">{value}</p></div>)}
    </section>}
    {vistaCatalogo && <section className="grid grid-cols-2 gap-3"><div className="molsan-summary-card"><p className="uppercase">Servicios registrados</p><p className="mt-2">{servicios.length}</p></div><div className="molsan-summary-card"><p className="uppercase">Servicios activos</p><p className="mt-2">{servicios.filter(s=>s.activo).length}</p></div></section>}
    <section className="molsan-filter-bar flex flex-wrap gap-2">{(vistaCatalogo ? [TABS[1]] : TABS).map(([id,label]) => <button type="button" key={id} onClick={() => {setTab(id);setQ("");}} className={`molsan-btn ${tab===id?"molsan-btn--primary":"molsan-btn--secondary"}`}>{label}</button>)}</section>
    <section className="erp-card overflow-hidden">
      <div className="molsan-filter-bar flex flex-wrap items-center justify-between gap-3 p-4"><div><h2>{TABS.find(([id])=>id===tab)?.[1]}</h2><p>{lista.length} registro(s)</p></div><div className="flex flex-wrap gap-2"><input className={inputClass+"min-w-48"} value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar…" />{tab==="solicitudes" && <button type="button" onClick={()=>abrir("solicitud")} className="molsan-btn molsan-btn--primary px-4 py-2">+ Nueva solicitud</button>}{tab==="control" && <button type="button" onClick={()=>abrir("servicio")} className="molsan-btn molsan-btn--primary px-4 py-2">+ Servicio y tarifa</button>}{tab==="albaranes" && <button type="button" onClick={()=>abrir("albaran")} className="molsan-btn molsan-btn--primary px-4 py-2">+ Registrar albarán</button>}{tab==="facturas" && <button type="button" onClick={()=>abrir("factura")} className="molsan-btn molsan-btn--primary px-4 py-2">+ Registrar factura</button>}</div></div>
      {cargando ? <p className="p-6">Cargando mensajería…</p> : tab==="control" ? <div className="overflow-x-auto"><table className="w-full"><thead className="uppercase"><tr><th className="px-4 py-3">Servicio</th><th className="px-4 py-3">Tarifa base</th><th className="px-4 py-3">Suplemento</th><th className="px-4 py-3">Proveedor / código</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{servicios.map((s)=><tr key={s.id}><td className="px-4 py-3"><b>{s.nombre}</b><p>{s.codigo||"Sin código interno"}</p></td><td className="px-4 py-3">{money(s.tarifa_base)}</td><td className="px-4 py-3">{money(s.suplemento)}</td><td className="px-4 py-3">{s.codigo_proveedor||"Pendiente de configurar"}</td><td className="px-4 py-3">{s.activo?"Activo":"Inactivo"}</td><td className="px-4 py-3"><button type="button" onClick={()=>abrir("servicio",s)} className="molsan-btn molsan-btn--compact molsan-btn--secondary">Editar</button></td></tr>)}{!servicios.length&&<tr><td colSpan="6" className="p-8">Aún no hay servicios ni tarifas configurados. No se han inventado precios.</td></tr>}</tbody></table><div className="p-4">Los servicios y tarifas también se mantienen desde Catálogos → Mensajería · Servicios y tarifas.</div></div> : tab==="solicitudes" ? <div className="overflow-x-auto"><table className="w-full"><thead className="uppercase"><tr><th className="px-4 py-3">Referencia</th><th className="px-4 py-3">Solicitante</th><th className="px-4 py-3">Origen → destino</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Prioridad</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{lista.map((s)=><tr key={s.id}><td className="px-4 py-3">{s.referencia}</td><td className="px-4 py-3">{s.solicitante_nombre}</td><td className="px-4 py-3"><span className="block max-w-64 truncate">{s.origen}</span><span className="block max-w-64 truncate">→ {s.destino}</span></td><td className="px-4 py-3">{s.fecha_solicitada||"—"}</td><td className="px-4 py-3">{s.prioridad}</td><td className="px-4 py-3">{s.estado}</td><td className="px-4 py-3"><button type="button" onClick={()=>abrir("solicitud",s)} className="molsan-btn molsan-btn--compact molsan-btn--secondary">Gestionar</button></td></tr>)}{!lista.length&&<tr><td colSpan="7" className="p-8">No hay solicitudes. Crea la primera con «Nueva solicitud».</td></tr>}</tbody></table></div> : tab==="albaranes" ? <div className="overflow-x-auto"><table className="w-full"><thead className="uppercase"><tr><th className="px-4 py-3">Albarán interno / proveedor</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Solicitud</th><th className="px-4 py-3">Importe</th><th className="px-4 py-3">Entrega</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{lista.map((a)=><tr key={a.id}><td className="px-4 py-3">{a.numero_interno||"—"}<p>{a.numero_proveedor||"Sin número de proveedor"}</p></td><td className="px-4 py-3">{a.fecha||"—"}</td><td className="px-4 py-3">{a.solicitud_referencia||"Sin vincular"}</td><td className="px-4 py-3">{money(a.importe)}</td><td className="px-4 py-3">{a.entregado?"Entregado":"Pendiente"}</td><td className="px-4 py-3"><button type="button" onClick={()=>abrir("albaran",a)} className="molsan-btn molsan-btn--compact molsan-btn--secondary">Editar</button></td></tr>)}{!lista.length&&<tr><td colSpan="6" className="p-8">Todavía no hay albaranes registrados.</td></tr>}</tbody></table></div> : <div className="overflow-x-auto"><table className="w-full"><thead className="uppercase"><tr><th className="px-4 py-3">Factura</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Fechas</th><th className="px-4 py-3">Base / impuestos / total</th><th className="px-4 py-3">Revisión</th><th className="px-4 py-3">Pago</th><th className="px-4 py-3">Acción</th></tr></thead><tbody>{lista.map((f)=><tr key={f.id}><td className="px-4 py-3">{f.numero}</td><td className="px-4 py-3">{f.proveedor}</td><td className="px-4 py-3">{f.fecha_emision||"—"}<p>Vence: {f.fecha_vencimiento||"—"}</p></td><td className="px-4 py-3">{money(f.base_imponible)} / {money(f.importe_impuesto)} / <b>{money(f.total)}</b></td><td className="px-4 py-3">{f.estado_revision}</td><td className="px-4 py-3">{f.estado_pago}</td><td className="px-4 py-3"><button type="button" onClick={()=>abrir("factura",f)} className="molsan-btn molsan-btn--compact molsan-btn--secondary">Editar</button></td></tr>)}{!lista.length&&<tr><td colSpan="7" className="p-8">No hay facturas registradas.</td></tr>}</tbody></table></div>}
    </section>
    <section className="erp-card p-4"><b>Integración con proveedor: en construcción.</b> Hasta disponer del proveedor y su documentación técnica, las solicitudes, tarifas, albaranes y facturas se gestionan internamente. No se simulan envíos reales ni pagos.</section>
    {modal && <div className="panel-modal-premium molsan-modal-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4" role="presentation"><div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={modalTitle} className="molsan-modal__panel my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 sm:p-7"><div className="molsan-modal__header flex items-start justify-between gap-4"><div><h2>{modalTitle}</h2><p className="mt-1">Los datos de proveedor o tarifa pueden quedar pendientes hasta disponer de la información real.</p></div><button type="button" onClick={cerrarModal} disabled={guardando} className="molsan-btn molsan-btn--secondary px-3 py-1.5">Cerrar</button></div>
      <form onSubmit={guardar} className="molsan-modal__body molsan-form mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      {modal==="solicitud" && <><Field label="Empleado solicitante" name="solicitante_nombre" required /><Field label="Fecha solicitada" name="fecha_solicitada" type="date" /><Field label="Dirección de recogida / origen" name="origen" required full /><Field label="Dirección de entrega / destino" name="destino" required full /><Field label="Contacto en origen" name="contacto_origen" /><Field label="Contacto en destino" name="contacto_destino" /><Field label="Teléfono de recogida" name="telefono_recogida" /><Field label="Teléfono de entrega" name="telefono_entrega" /><Field label="Expediente relacionado (opcional)" name="expediente_id" /><Field label="Prioridad" name="prioridad" options={["Baja","Normal","Alta","Urgente"].map(v=>({value:v,label:v}))} /><Field label="Servicio / tarifa" name="servicio_id" options={servicios.filter(s=>s.activo).map(s=>({value:String(s.id),label:s.nombre+(s.tarifa_base==null?" · tarifa pendiente":` · ${money(s.tarifa_base)}`)}))} /><Field label="Coste previsto" name="coste_previsto" type="number" /><Field label="Estado" name="estado" options={["Pendiente","Aceptada","Preparando","En tránsito","Entregada","Incidencia","Cancelada"].map(v=>({value:v,label:v}))} /><Field label="Responsable" name="responsable" /><Field label="Estado del proveedor" name="estado_proveedor" /><Field label="Descripción / instrucciones" name="descripcion" type="textarea" full /><Field label="Incidencia" name="incidencia" type="textarea" full /></>}
      {modal==="servicio" && <><Field label="Código interno" name="codigo" /><Field label="Nombre del servicio" name="nombre" required /><Field label="Modalidad" name="modalidad" placeholder="Pendiente de definir" /><Field label="Código del proveedor" name="codigo_proveedor" /><Field label="Tarifa base (€)" name="tarifa_base" type="number" /><Field label="Suplemento (€)" name="suplemento" type="number" /><Field label="Tipo de impuesto" name="tipo_impuesto" options={["IVA","IGIC","Exento","Pendiente"].map(v=>({value:v,label:v}))} /><Field label="Porcentaje impuesto" name="porcentaje_impuesto" type="number" /><Field label="Vigente desde" name="vigente_desde" type="date" /><Field label="Vigente hasta" name="vigente_hasta" type="date" /><Field label="Condiciones y suplementos" name="condiciones" type="textarea" full /><Field label="Descripción" name="descripcion" type="textarea" full /><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.activo} onChange={e=>change("activo",e.target.checked)} /> Servicio activo</label></>}
      {modal==="albaran" && <><Field label="Número interno" name="numero_interno" /><Field label="Número de albarán proveedor" name="numero_proveedor" /><Field label="Proveedor" name="proveedor" /><Field label="Fecha" name="fecha" type="date" /><Field label="Solicitud relacionada" name="solicitud_id" options={solicitudes.map(s=>({value:String(s.id),label:s.referencia+" · "+s.destino}))} /><Field label="Servicio" name="servicio_id" options={servicios.map(s=>({value:String(s.id),label:s.nombre}))} /><Field label="Importe (€)" name="importe" type="number" /><Field label="Fecha de entrega" name="fecha_entrega" type="date" /><Field label="Documento / enlace" name="documento_url" placeholder="URL del documento" full /><Field label="Observaciones" name="observaciones" type="textarea" full /><label className="flex items-center gap-2"><input type="checkbox" checked={!!form.entregado} onChange={e=>change("entregado",e.target.checked)} /> Entrega confirmada</label></>}
      {modal==="factura" && <><Field label="Proveedor" name="proveedor" required /><Field label="Número de factura" name="numero" required /><Field label="Fecha de emisión" name="fecha_emision" type="date" /><Field label="Fecha de vencimiento" name="fecha_vencimiento" type="date" /><Field label="Base imponible (€)" name="base_imponible" type="number" /><Field label="Tipo de impuesto" name="tipo_impuesto" options={["IVA","IGIC","Exento","Pendiente"].map(v=>({value:v,label:v}))} /><Field label="Impuestos (€)" name="importe_impuesto" type="number" /><Field label="Total (€)" name="total" type="number" /><Field label="Estado de revisión" name="estado_revision" options={["Pendiente de revisión","Revisada","Con discrepancias","Rechazada"].map(v=>({value:v,label:v}))} /><Field label="Estado de pago" name="estado_pago" options={["Pendiente de pago","Programada","Pagada","Disputada"].map(v=>({value:v,label:v}))} /><Field label="Fecha de pago" name="fecha_pago" type="date" /><Field label="Albaranes asociados" name="albaran_ids" options={albaranes.map(a=>({value:String(a.id),label:(a.numero_proveedor||a.numero_interno||"Albarán "+a.id)+" · "+money(a.importe)}))} /><Field label="Documento / enlace" name="documento_url" placeholder="URL del documento" full /><Field label="Observaciones" name="observaciones" type="textarea" full /></>}
      <div className="molsan-modal__footer flex justify-end gap-3 pt-4 md:col-span-2"><button type="button" onClick={cerrarModal} disabled={guardando} className="px-4 py-2.5">Cancelar</button><button type="submit" disabled={guardando} className="px-5 py-2.5">{guardando?"Guardando…":"Guardar"}</button></div>
      </form>
      {modal === "solicitud" && editing && <section className="mt-5 pt-5"><h3>Comunicación con el empleado</h3><p className="mt-1">Los mensajes se comparten con el empleado que creó esta solicitud.</p><div className="mt-3 max-h-56 space-y-2 overflow-y-auto p-3">{comunicaciones.map((m)=><div key={m.id} className={`p-3 ${m.autor_tipo==="empleado"?"":""}`}><div className="flex justify-between gap-2"><b>{m.autor_nombre}</b><span>{m.creado_en?new Date(m.creado_en).toLocaleString("es-ES"):""}</span></div><p className="mt-1 whitespace-pre-wrap">{m.mensaje}</p></div>)}{!comunicaciones.length&&<p>Todavía no hay mensajes en esta solicitud.</p>}</div><form onSubmit={enviarComunicacion} className="mt-3 flex flex-col gap-2 sm:flex-row"><textarea className={inputClass+"min-h-12"} value={mensajeChat} onChange={e=>setMensajeChat(e.target.value)} placeholder="Escribe una actualización o respuesta al empleado…" required rows="2"/><button type="submit" disabled={guardando||!mensajeChat.trim()} className="px-4 py-2">Enviar mensaje</button></form></section>}
      </div></div>}
  </div>;
}

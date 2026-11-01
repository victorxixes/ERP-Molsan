import MolsanDataTable from "../../components/ui/MolsanDataTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import "../../css/HerramientasPremium.css";
import MensajeriaProveedores from "./MensajeriaProveedores.jsx";
import { formatEuro as money } from "../../utils/formatters";

const TABS = [
  ["solicitudes", "Solicitudes"],
  ["control", "Control de servicios"],
  ["albaranes", "Albaranes"],
  ["facturas", "Facturas"],
];
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const labelClass = "block text-xs font-bold uppercase tracking-wide text-slate-500";
const initialSolicitud = { solicitante_nombre: "", origen: "", destino: "", fecha_solicitada: "", prioridad: "Normal", descripcion: "", expediente_id: "", contacto_origen: "", contacto_destino: "", telefono_recogida: "", telefono_entrega: "", telefono_destino: "", servicio_id: "", responsable: "", estado: "Pendiente", estado_proveedor: "", incidencia: "", coste_previsto: "" };
const initialServicio = { codigo: "", nombre: "", descripcion: "", modalidad: "", tarifa_base: "", suplemento: "0", tipo_impuesto: "", porcentaje_impuesto: "", codigo_proveedor: "", condiciones: "", vigente_desde: "", vigente_hasta: "", activo: true };
const initialAlbaran = { numero_interno: "", numero_proveedor: "", proveedor: "", fecha: "", solicitud_id: "", servicio_id: "", importe: "", entregado: false, fecha_entrega: "", observaciones: "", documento_url: "" };
const initialFactura = { proveedor: "", numero: "", fecha_emision: "", fecha_vencimiento: "", base_imponible: "", tipo_impuesto: "", importe_impuesto: "", total: "", estado_revision: "Pendiente de revisión", estado_pago: "Pendiente de pago", fecha_pago: "", observaciones: "", documento_url: "", albaran_ids: [] };
const clean = (obj) => Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, v === "" ? null : v]));


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
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
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
            <select multiple className={inputClass + " min-h-28"} value={Array.isArray(form[name]) ? form[name].map(String) : []} onChange={(e) => change(name, Array.from(e.target.selectedOptions, (o) => Number(o.value)))}>
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

  return <main className="molsan-page-stack catalogos-premium-page min-h-full animate-fadeIn">
    <header className="molsan-page-header">
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">MS</div>
        <div className="min-w-0">
          <p className="molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
          <h1 className="molsan-page-header__title">{vistaCatalogo ? "Mensajería · Servicios y tarifas" : vistaGestion ? "Mensajería Gestión" : "Mensajería"}</h1>
          <p className="molsan-page-header__description">{vistaCatalogo ? "Catálogo interno de servicios, tarifas, suplementos e impuestos." : "Gestiona las solicitudes recibidas, los pedidos al proveedor, las incidencias, los albaranes y las facturas."}</p>
        </div>
      </div>
      <div className="molsan-page-header__actions">
        <button onClick={cargar} className="molsan-btn molsan-btn--secondary">↻ Actualizar</button>
      </div>
    </header>
    {vistaGestion && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-start gap-3"><span className="text-xl">⚠️</span><div><b>Integración API con la empresa de mensajería pendiente.</b><p className="mt-1">La conexión automática todavía debe desarrollarse y validarse con la documentación técnica del proveedor. Mientras tanto, la gestión de solicitudes, estados y comunicaciones funciona dentro del ERP; no se envían pedidos reales al transportista desde esta pantalla.</p></div></div></section>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>}
    {vistaGestion && <MensajeriaProveedores />}
    {!vistaCatalogo && <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Solicitudes", resumen.solicitudes ?? "—"],["En curso", resumen.pendientes ?? "—"],["Albaranes", resumen.albaranes ?? "—"],["Facturas por pagar", resumen.facturas_pendientes ?? "—"]].map(([label,value]) => <div key={label} className="erp-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-800">{value}</p></div>)}
    </section>}
    {vistaCatalogo && <section className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Servicios registrados</p><p className="mt-2 text-2xl font-bold text-slate-800">{servicios.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Servicios activos</p><p className="mt-2 text-2xl font-bold text-slate-800">{servicios.filter(s=>s.activo).length}</p></div></section>}
    <section className="flex flex-wrap gap-2">{(vistaCatalogo ? [TABS[1]] : TABS).map(([id,label]) => <button key={id} onClick={() => {setTab(id);setQ("");}} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab===id?"bg-blue-700 text-white shadow":"border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</section>
    <section className="erp-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h2 className="font-bold text-slate-800">{TABS.find(([id])=>id===tab)?.[1]}</h2><p className="text-xs text-slate-500">{lista.length} registro(s)</p></div><div className="flex flex-wrap gap-2"><input className={inputClass+" min-w-48"} value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar…" />{tab==="solicitudes" && <button onClick={()=>abrir("solicitud")} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Nueva solicitud</button>}{tab==="control" && <button onClick={()=>abrir("servicio")} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Servicio y tarifa</button>}{tab==="albaranes" && <button onClick={()=>abrir("albaran")} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Registrar albarán</button>}{tab==="facturas" && <button onClick={()=>abrir("factura")} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">+ Registrar factura</button>}</div></div>
      {cargando ? <p className="p-6 text-sm text-slate-500">Cargando mensajería…</p> : tab==="control" ? <MolsanDataTable
        rows={servicios}
          pagination
          pageSize={25}

        rowKey="id"
        initialSort={{ key: "nombre", direction: "asc" }}
        emptyText="Aún no hay servicios ni tarifas configurados. No se han inventado precios."
        columns={[
          { key: "nombre", header: "Servicio", accessor: "nombre", sortType: "text", render: (value, item) => <><b>{value}</b><p className="text-xs text-slate-500">{item.codigo || "Sin código interno"}</p></> },
          { key: "tarifa_base", header: "Tarifa base", accessor: "tarifa_base", sortType: "currency", align: "right", render: (value) => money(value) },
          { key: "suplemento", header: "Suplemento", accessor: "suplemento", sortType: "currency", align: "right", render: (value) => money(value) },
          { key: "codigo_proveedor", header: "Proveedor / código", accessor: "codigo_proveedor", sortType: "text", render: (value) => value || "Pendiente de configurar" },
          { key: "activo", header: "Estado", accessor: "activo", sortType: "boolean", render: (value) => value ? "Activo" : "Inactivo" },
          { key: "acciones", header: "Acción", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" onClick={() => abrir("servicio", item)} className="font-bold text-blue-700">Editar</button> },
        ]}
      /> : tab==="solicitudes" ? <MolsanDataTable
        rows={lista}
          pagination
          pageSize={25}

        rowKey="id"
        initialSort={{ key: "fecha", direction: "desc" }}
        emptyText="No hay solicitudes. Crea la primera con «Nueva solicitud»."
        columns={[
          { key: "referencia", header: "Referencia", accessor: "referencia", sortType: "text", render: (value) => <span className="font-bold text-blue-700">{value}</span> },
          { key: "solicitante", header: "Solicitante", accessor: "solicitante_nombre", sortType: "text" },
          { key: "destino", header: "Origen → destino", accessor: (item) => [item.origen, item.destino].filter(Boolean).join(" → "), sortType: "text", render: (_, item) => <><span className="block max-w-64 truncate">{item.origen}</span><span className="block max-w-64 truncate text-slate-500">→ {item.destino}</span></> },
          { key: "fecha", header: "Fecha", accessor: "fecha_solicitada", sortType: "date" },
          { key: "prioridad", header: "Prioridad", accessor: "prioridad", sortType: "text" },
          { key: "estado", header: "Estado", accessor: "estado", sortType: "text" },
          { key: "acciones", header: "Acción", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" onClick={() => abrir("solicitud", item)} className="font-bold text-blue-700">Gestionar</button> },
        ]}
      /> : tab==="albaranes" ? <MolsanDataTable
        rows={lista}
          pagination
          pageSize={25}

        rowKey="id"
        initialSort={{ key: "fecha", direction: "desc" }}
        emptyText="Todavía no hay albaranes registrados."
        columns={[
          { key: "numero", header: "Albarán interno / proveedor", accessor: (item) => item.numero_interno || item.numero_proveedor || "", sortType: "text", render: (_, item) => <><span className="font-semibold">{item.numero_interno || "—"}</span><p className="text-xs text-slate-500">{item.numero_proveedor || "Sin número de proveedor"}</p></> },
          { key: "fecha", header: "Fecha", accessor: "fecha", sortType: "date" },
          { key: "solicitud", header: "Solicitud", accessor: "solicitud_referencia", sortType: "text", render: (value) => value || "Sin vincular" },
          { key: "importe", header: "Importe", accessor: "importe", sortType: "currency", align: "right", render: (value) => money(value) },
          { key: "entregado", header: "Entrega", accessor: "entregado", sortType: "boolean", render: (value) => value ? "Entregado" : "Pendiente" },
          { key: "acciones", header: "Acción", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" onClick={() => abrir("albaran", item)} className="font-bold text-blue-700">Editar</button> },
        ]}
      /> : <MolsanDataTable
        rows={lista}
          pagination
          pageSize={25}

        rowKey="id"
        initialSort={{ key: "fecha", direction: "desc" }}
        emptyText="No hay facturas registradas."
        columns={[
          { key: "numero", header: "Factura", accessor: "numero", sortType: "text" },
          { key: "proveedor", header: "Proveedor", accessor: "proveedor", sortType: "text" },
          { key: "fecha", header: "Fechas", accessor: "fecha_emision", sortType: "date", render: (_, item) => <>{item.fecha_emision || "—"}<p className="text-xs text-slate-500">Vence: {item.fecha_vencimiento || "—"}</p></> },
          { key: "total", header: "Base / impuestos / total", accessor: "total", sortType: "currency", align: "right", render: (_, item) => <>{money(item.base_imponible)} / {money(item.importe_impuesto)} / <b>{money(item.total)}</b></> },
          { key: "revision", header: "Revisión", accessor: "estado_revision", sortType: "text" },
          { key: "pago", header: "Pago", accessor: "estado_pago", sortType: "text" },
          { key: "acciones", header: "Acción", sortable: false, accessor: (item) => item.id, render: (_, item) => <button type="button" onClick={() => abrir("factura", item)} className="font-bold text-blue-700">Editar</button> },
        ]}
      />}
    </section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900"><b>Integración con proveedor: en construcción.</b> Hasta disponer del proveedor y su documentación técnica, las solicitudes, tarifas, albaranes y facturas se gestionan internamente. No se simulan envíos reales ni pagos.</section>
    {modal && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-800">{modalTitle}</h2><p className="mt-1 text-sm text-slate-500">Los datos de proveedor o tarifa pueden quedar pendientes hasta disponer de la información real.</p></div><button onClick={()=>setModal("")} className="rounded-lg border px-3 py-1.5 text-slate-600">Cerrar</button></div>
      <form onSubmit={guardar} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
      {modal==="solicitud" && <><Field label="Empleado solicitante" name="solicitante_nombre" required /><Field label="Fecha solicitada" name="fecha_solicitada" type="date" /><Field label="Dirección de recogida / origen" name="origen" required full /><Field label="Dirección de entrega / destino" name="destino" required full /><Field label="Contacto en origen" name="contacto_origen" /><Field label="Contacto en destino" name="contacto_destino" /><Field label="Teléfono de recogida" name="telefono_recogida" /><Field label="Teléfono de entrega" name="telefono_entrega" /><Field label="Expediente relacionado (opcional)" name="expediente_id" /><Field label="Prioridad" name="prioridad" options={["Baja","Normal","Alta","Urgente"].map(v=>({value:v,label:v}))} /><Field label="Servicio / tarifa" name="servicio_id" options={servicios.filter(s=>s.activo).map(s=>({value:String(s.id),label:s.nombre+(s.tarifa_base==null?" · tarifa pendiente":` · ${money(s.tarifa_base)}`)}))} /><Field label="Coste previsto" name="coste_previsto" type="number" /><Field label="Estado" name="estado" options={["Pendiente","Aceptada","Preparando","En tránsito","Entregada","Incidencia","Cancelada"].map(v=>({value:v,label:v}))} /><Field label="Responsable" name="responsable" /><Field label="Estado del proveedor" name="estado_proveedor" /><Field label="Descripción / instrucciones" name="descripcion" type="textarea" full /><Field label="Incidencia" name="incidencia" type="textarea" full /></>}
      {modal==="servicio" && <><Field label="Código interno" name="codigo" /><Field label="Nombre del servicio" name="nombre" required /><Field label="Modalidad" name="modalidad" placeholder="Pendiente de definir" /><Field label="Código del proveedor" name="codigo_proveedor" /><Field label="Tarifa base (€)" name="tarifa_base" type="number" /><Field label="Suplemento (€)" name="suplemento" type="number" /><Field label="Tipo de impuesto" name="tipo_impuesto" options={["IVA","IGIC","Exento","Pendiente"].map(v=>({value:v,label:v}))} /><Field label="Porcentaje impuesto" name="porcentaje_impuesto" type="number" /><Field label="Vigente desde" name="vigente_desde" type="date" /><Field label="Vigente hasta" name="vigente_hasta" type="date" /><Field label="Condiciones y suplementos" name="condiciones" type="textarea" full /><Field label="Descripción" name="descripcion" type="textarea" full /><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.activo} onChange={e=>change("activo",e.target.checked)} /> Servicio activo</label></>}
      {modal==="albaran" && <><Field label="Número interno" name="numero_interno" /><Field label="Número de albarán proveedor" name="numero_proveedor" /><Field label="Proveedor" name="proveedor" /><Field label="Fecha" name="fecha" type="date" /><Field label="Solicitud relacionada" name="solicitud_id" options={solicitudes.map(s=>({value:String(s.id),label:s.referencia+" · "+s.destino}))} /><Field label="Servicio" name="servicio_id" options={servicios.map(s=>({value:String(s.id),label:s.nombre}))} /><Field label="Importe (€)" name="importe" type="number" /><Field label="Fecha de entrega" name="fecha_entrega" type="date" /><Field label="Documento / enlace" name="documento_url" placeholder="URL del documento" full /><Field label="Observaciones" name="observaciones" type="textarea" full /><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.entregado} onChange={e=>change("entregado",e.target.checked)} /> Entrega confirmada</label></>}
      {modal==="factura" && <><Field label="Proveedor" name="proveedor" required /><Field label="Número de factura" name="numero" required /><Field label="Fecha de emisión" name="fecha_emision" type="date" /><Field label="Fecha de vencimiento" name="fecha_vencimiento" type="date" /><Field label="Base imponible (€)" name="base_imponible" type="number" /><Field label="Tipo de impuesto" name="tipo_impuesto" options={["IVA","IGIC","Exento","Pendiente"].map(v=>({value:v,label:v}))} /><Field label="Impuestos (€)" name="importe_impuesto" type="number" /><Field label="Total (€)" name="total" type="number" /><Field label="Estado de revisión" name="estado_revision" options={["Pendiente de revisión","Revisada","Con discrepancias","Rechazada"].map(v=>({value:v,label:v}))} /><Field label="Estado de pago" name="estado_pago" options={["Pendiente de pago","Programada","Pagada","Disputada"].map(v=>({value:v,label:v}))} /><Field label="Fecha de pago" name="fecha_pago" type="date" /><Field label="Albaranes asociados" name="albaran_ids" options={albaranes.map(a=>({value:String(a.id),label:(a.numero_proveedor||a.numero_interno||"Albarán "+a.id)+" · "+money(a.importe)}))} /><Field label="Documento / enlace" name="documento_url" placeholder="URL del documento" full /><Field label="Observaciones" name="observaciones" type="textarea" full /></>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 md:col-span-2"><button type="button" onClick={()=>setModal("")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancelar</button><button disabled={guardando} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando?"Guardando…":"Guardar"}</button></div>
      </form>
      {modal === "solicitud" && editing && <section className="mt-5 border-t border-slate-100 pt-5"><h3 className="font-bold text-slate-800">Comunicación con el empleado</h3><p className="mt-1 text-xs text-slate-500">Los mensajes se comparten con el empleado que creó esta solicitud.</p><div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{comunicaciones.map((m)=><div key={m.id} className={`rounded-xl border p-3 ${m.autor_tipo==="empleado"?"border-blue-100 bg-blue-50":"border-slate-200 bg-white"}`}><div className="flex justify-between gap-2 text-xs"><b>{m.autor_nombre}</b><span className="text-slate-500">{m.creado_en?new Date(m.creado_en).toLocaleString("es-ES"):""}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.mensaje}</p></div>)}{!comunicaciones.length&&<p className="text-sm text-slate-500">Todavía no hay mensajes en esta solicitud.</p>}</div><form onSubmit={enviarComunicacion} className="mt-3 flex flex-col gap-2 sm:flex-row"><textarea className={inputClass+" min-h-12"} value={mensajeChat} onChange={e=>setMensajeChat(e.target.value)} placeholder="Escribe una actualización o respuesta al empleado…" required rows="2"/><button disabled={guardando||!mensajeChat.trim()} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Enviar mensaje</button></form></section>}
      </div></div>}
  </main>;
}
